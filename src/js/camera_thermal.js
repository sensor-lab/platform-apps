import {
  i2cReadHardwareOperation,
  i2cWriteHardwareOperation,
  constructNowEvent,
  postHardwareOperation
} from '@sensorsparks/platform-api'

const EEPROM_START = 0x2400
const EEPROM_WORDS = 832
const STATUS_ADDR = 0x8000
const CONTROL_ADDR = 0x800D
const FRAME_ADDR = 0x0400
const FRAME_WORDS = 0x0180
const AUX_DATA_START = 0x0580
const AUX_DATA_WORDS = 0x002B
const CONTROL_BLOCK_WORDS = 0x000E
const NUM_PIXELS = 192
const GRID_COLS = 16
const GRID_ROWS = 12
const I2C_SPEED_KHZ = 100
const MLX90641_I2C_ADDR = 51
const THERMAL_SDA_PIN_STORAGE_KEY = 'camera_thermal_sda_pin'
const OFFSET = 0.0
const REFRESH_RATE = 0x03
const SAMPLE_DELAY_MS = 300
const POR_DELAY_MS = SAMPLE_DELAY_MS * 2.0 * 1.2
const CAL_INT = -45.4209807273067
const CAL_SLOPE = 2.64896693658985
const NEW_DATA_TIMEOUT_MS = 1500
const NEW_DATA_POLL_MS = 50
const THERMAL_RANGES = {
  body: { min: 20, max: 45, label: '20.0 °C 到 45.0 °C' },
  environment: { min: -10, max: 50, label: '-10.0 °C 到 50.0 °C' },
  full: { min: -40, max: 300, label: '-40.0 °C 到 300.0 °C' }
}

let eepromData = []
let calibrationLoaded = false
let lastFrame = null
let isRotated = false
let deviceId = null
let shotTimerId = null
let shotInProgress = false
const CONTINUOUS_SHOT_INTERVAL_MS = SAMPLE_DELAY_MS
let sdaPin = -1
let sclPin = -1
let sensorConfigured = false

const thermalCanvas = document.getElementById('thermalMap')
const tempMinElem = document.getElementById('tempMin')
const tempMaxElem = document.getElementById('tempMax')
const tempCenterElem = document.getElementById('tempCenter')
const tempScaleElem = document.getElementById('tempScale')
const shotTimeElem = document.getElementById('shotTime')
const temperatureRangeElem = document.getElementById('temperatureRange')
const thermalLoadingElem = document.getElementById('thermalLoading')
const sdaPinElem = document.getElementById('sdaPinSelect')
const pinWarningElem = document.getElementById('pinWarning')

const mlx90641State = {
  vdd: 0,
  vdd25: 0,
  kVdd: 0,
  ta: 0,
  kgain: 0,
  pixOSRefSP0: Array(NUM_PIXELS).fill(0),
  pixOSRefSP1: Array(NUM_PIXELS).fill(0),
  alphaPixel: Array(NUM_PIXELS).fill(0),
  kta: Array(NUM_PIXELS).fill(0),
  kv: Array(NUM_PIXELS).fill(0),
  vIrCompensated: Array(NUM_PIXELS).fill(0),
  to: Array(NUM_PIXELS).fill(0),
  badPixels: Array(NUM_PIXELS).fill(false),
  ksTa: 0,
  ct: [-40, -20, 0, 80, 120, 0, 0, 0],
  ksTo: Array(8).fill(0),
  alphaCorrRange: Array(8).fill(0),
  alphaReferenceRows: Array(6).fill(0),
  emissivity: 1,
  alphaCP: 0,
  pixOSRefCP: 0,
  kvCP: 0,
  kTaCP: 0,
  tgc: 1,
  subpage: 0
}

function colorForNormalized(value) {
  const clamped = Math.max(0, Math.min(1, value))
  const stops = [
    [0.0, [11, 61, 145]],
    [0.25, [10, 139, 220]],
    [0.45, [53, 212, 212]],
    [0.7, [240, 228, 66]],
    [0.85, [243, 156, 18]],
    [1.0, [215, 25, 28]]
  ]

  for (let i = 0; i < stops.length - 1; i += 1) {
    const [p0, c0] = stops[i]
    const [p1, c1] = stops[i + 1]

    if (clamped >= p0 && clamped <= p1) {
      const t = (clamped - p0) / (p1 - p0 || 1)
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * t)
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * t)
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * t)
      return `rgb(${r},${g},${b})`
    }
  }

  return 'rgb(0,0,0)'
}

function getSelectedRange(frame = null) {
  const key = temperatureRangeElem ? temperatureRangeElem.value : 'body'

  if (key === 'auto') {
    if (!Array.isArray(frame)) {
      return { min: 0, max: 1, label: '自动（当前数据）' }
    }

    const values = frame.filter((value) => Number.isFinite(value))
    if (values.length === 0) {
      return { min: 0, max: 1, label: '自动（当前数据）' }
    }

    const min = Math.min(...values)
    const max = Math.max(...values)
    return {
      min,
      max,
      label: `${min.toFixed(1)} °C 到 ${max.toFixed(1)} °C（当前数据）`
    }
  }

  return THERMAL_RANGES[key] || THERMAL_RANGES.body
}

function renderHeatmap(frame) {
  if (!thermalCanvas || !frame || frame.length !== NUM_PIXELS) {
    return
  }

  const ctx = thermalCanvas.getContext('2d')
  if (!ctx) {
    return
  }

  const values = frame.filter((value) => Number.isFinite(value))
  if (values.length === 0) {
    return
  }

  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const selectedRange = getSelectedRange(frame)
  const scaleMin = selectedRange.min
  const scaleMax = selectedRange.max
  const span = Math.max(scaleMax - scaleMin, 1e-6)

  const cellWidth = thermalCanvas.width / GRID_COLS
  const cellHeight = thermalCanvas.height / GRID_ROWS

  ctx.clearRect(0, 0, thermalCanvas.width, thermalCanvas.height)

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const sourceCol = isRotated ? (GRID_COLS - 1 - col) : col
      const sourceRow = isRotated ? (GRID_ROWS - 1 - row) : row
      const index = sourceRow * GRID_COLS + sourceCol
      const value = frame[index]

      if (!Number.isFinite(value)) {
        ctx.fillStyle = '#111'
      } else {
        const normalized = (value - scaleMin) / span
        ctx.fillStyle = colorForNormalized(normalized)
      }

      ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)'
      ctx.lineWidth = 1
      ctx.strokeRect(col * cellWidth + 0.5, row * cellHeight + 0.5, cellWidth - 1, cellHeight - 1)
    }
  }

  if (tempMinElem) {
    tempMinElem.textContent = `最低: ${minValue.toFixed(1)} °C`
  }
  if (tempMaxElem) {
    tempMaxElem.textContent = `最高: ${maxValue.toFixed(1)} °C`
  }
  if (tempScaleElem) {
    tempScaleElem.textContent = `量程: ${selectedRange.label}`
  }

  const centerIndex = Math.floor(GRID_ROWS / 2) * GRID_COLS + Math.floor(GRID_COLS / 2)
  const centerTemp = frame[centerIndex]
  if (tempCenterElem) {
    tempCenterElem.textContent = Number.isFinite(centerTemp)
      ? `中心: ${centerTemp.toFixed(1)} °C`
      : '中心: --.- °C'
  }

  if (shotTimeElem) {
    shotTimeElem.textContent = `拍摄时间: ${new Date().toLocaleTimeString()}`
  }
}

function clearHeatmap() {
  if (!thermalCanvas) {
    return
  }

  const ctx = thermalCanvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, thermalCanvas.width, thermalCanvas.height)
  }

  if (tempMinElem) tempMinElem.textContent = '最低: --.- °C'
  if (tempMaxElem) tempMaxElem.textContent = '最高: --.- °C'
  if (tempCenterElem) tempCenterElem.textContent = '中心: --.- °C'
  if (tempScaleElem) tempScaleElem.textContent = `量程: ${getSelectedRange().label}`
  if (shotTimeElem) shotTimeElem.textContent = ''
}

function setThermalLoading(show) {
  if (!thermalLoadingElem) {
    return
  }

  if (show) {
    thermalLoadingElem.classList.remove('d-none')
  } else {
    thermalLoadingElem.classList.add('d-none')
  }
}

function setPinWarning(show, message = '请选择有效的 SDA 引脚（SCL 会自动使用 SDA+1）。') {
  if (!pinWarningElem) {
    return
  }

  pinWarningElem.textContent = message
  if (show) {
    pinWarningElem.classList.remove('d-none')
  } else {
    pinWarningElem.classList.add('d-none')
  }
}

function hasValidI2cPins() {
  return sdaPin >= 0 && sclPin === sdaPin + 1 && sclPin <= 19
}

function bytesToBigIntBE(bytes) {
  let v = 0n;
  for (const b of bytes) {
    v = (v << 8n) | BigInt(b);
  }
  return v;
}

function bytesToUint16BE(bytes) {
  if (bytes.length !== 2) {
    throw new Error(`expected 2 bytes, got ${bytes.length}`)
  }

  return (bytes[0] << 8) | bytes[1]
}

function uint16ToInt16(value) {
  return value > 0x7FFF ? value - 0x10000 : value
}

function decodeSignedBits(value, bits) {
  const signBit = 1 << (bits - 1)
  const fullScale = 1 << bits
  return value >= signBit ? value - fullScale : value
}

function twoToThe(n) {
  return 2 ** n
}

function fourthRoot(value) {
  return Math.sqrt(Math.sqrt(value))
}

function wordAddressToByteIndex(baseAddress, address) {
  return (address - baseAddress) * 2
}

function pixelAddressSubpage0(pixelIndex) {
  if (pixelIndex < 0 || pixelIndex >= NUM_PIXELS) {
    throw new Error(`bad pixel index ${pixelIndex}`)
  }

  return FRAME_ADDR + pixelIndex + 32 * Math.floor(pixelIndex / 32)
}

function pixelAddressSubpage1(pixelIndex) {
  if (pixelIndex < 0 || pixelIndex >= NUM_PIXELS) {
    throw new Error(`bad pixel index ${pixelIndex}`)
  }

  return 0x0420 + pixelIndex + 32 * Math.floor(pixelIndex / 32)
}

function alphaReferenceForPixel(pixelIndex) {
  return mlx90641State.alphaReferenceRows[Math.floor(pixelIndex / 32)]
}

function interpolateBadPixels() {
  for (let i = 0; i < NUM_PIXELS; i += 1) {
    if (!mlx90641State.badPixels[i]) {
      continue
    }

    let count = 0
    let total = 0

    const neighbors = []

    if (i === 0) {
      neighbors.push(i + 1, i + 16)
    } else if (i === 15) {
      neighbors.push(i - 1, i + 16)
    } else if (i === 176) {
      neighbors.push(i + 1, i - 16)
    } else if (i === 191) {
      neighbors.push(i - 1, i - 16)
    } else if (i > 0 && i < 15) {
      neighbors.push(i - 1, i + 1, i + 16)
    } else if (i > 176 && i < 191) {
      neighbors.push(i - 1, i + 1, i - 16)
    } else if (i > 0 && i < 176 && i % 16 === 0) {
      neighbors.push(i - 16, i + 1, i + 16)
    } else if (i > 15 && i < 191 && (i + 1) % 16 === 0) {
      neighbors.push(i - 16, i - 1, i + 16)
    } else {
      neighbors.push(i - 16, i - 1, i + 16, i + 1)
    }

    for (const neighbor of neighbors) {
      if (!mlx90641State.badPixels[neighbor]) {
        count += 1
        total += mlx90641State.to[neighbor]
      }
    }

    mlx90641State.to[i] = count > 0 ? total / count : 0
  }
}

async function mlx90641ReadRegister(regAddr, len) {
    if (!hasValidI2cPins()) {
      throw new Error('I2C pins are not configured')
    }

    const opers = [];
    i2cWriteHardwareOperation(
    opers,
    sdaPin,
    sclPin,
    I2C_SPEED_KHZ,
    MLX90641_I2C_ADDR,
    (regAddr >> 8) & 0xFF,
    regAddr & 0xFF,
    true,
    );
    i2cReadHardwareOperation(
    opers,
    sdaPin,
    sclPin,
    I2C_SPEED_KHZ,
    MLX90641_I2C_ADDR,
    -1,
    -1,
    true,
    len
    );
    const now_event = constructNowEvent(opers);
    const response = await postHardwareOperation(now_event);
    if (response["errorcode"] !== 0) {
       throw new Error(`read register error: ${response}`)
    }

    return response["result"][1] 
}

async function mlx90641WriteRegister(regAddr, value) {
    if (!hasValidI2cPins()) {
      throw new Error('I2C pins are not configured')
    }

    const opers = [];
    i2cWriteHardwareOperation(
    opers,
    sdaPin,
    sclPin,
    I2C_SPEED_KHZ,
    MLX90641_I2C_ADDR,
    (regAddr >> 8) & 0xFF,
    regAddr & 0xFF,
    true,
    (value >> 8) & 0xFF,
    value & 0xFF
    );
    const now_event = constructNowEvent(opers);
    const response = await postHardwareOperation(now_event);
    if (response["errorcode"] !== 0) {
       throw new Error(`write register error: ${response}`)
    }
}

async function mlx90641SetRefreshRate(rate) {
  if (rate < 0 || rate > 0x07) {
    throw new Error(`invalid refresh rate: ${rate}`)
  }

  const config = await mlx90641ReadAddrUnsigned(CONTROL_ADDR)
  const updatedConfig = (config & ~(0x07 << 7)) | ((rate & 0x07) << 7)
  await mlx90641WriteRegister(CONTROL_ADDR, updatedConfig)
}

async function mlx90641FetchEEProm() {
    const resp = await mlx90641ReadRegister(EEPROM_START, EEPROM_WORDS * 2)
    eepromData = resp
  calibrationLoaded = false
    console.log(`eeprom: ${resp}`)
}

function mlx90641GetEEPromData(address, len)
{
    if (address < EEPROM_START || address >= (EEPROM_START + EEPROM_WORDS)) {
        throw new Error(`bad eeprom address ${address}`)
    }
    if ((address + len) > (EEPROM_START + EEPROM_WORDS)) {
        throw new Error(`invalid length ${len} and address ${address}`)
    }

  const start = (address - EEPROM_START) * 2
  const end = start + len * 2
  return eepromData.slice(start, end)
}

function mlx90641ReadEEPromUnsigned(address) {
  return bytesToUint16BE(mlx90641GetEEPromData(address, 1))
}

function mlx90641ReadEEPromSigned(address) {
  return uint16ToInt16(mlx90641ReadEEPromUnsigned(address))
}

async function mlx90641ReadAddrUnsigned(address) {
  const resp = await mlx90641ReadRegister(address, 2)
  return bytesToUint16BE(resp)
}

async function mlx90641ReadAddrSigned(address) {
  return uint16ToInt16(await mlx90641ReadAddrUnsigned(address))
}

async function mlx90641ReadWordBlock(startAddress, wordCount) {
  const resp = await mlx90641ReadRegister(startAddress, wordCount * 2)
  const words = []

  for (let i = 0; i < resp.length; i += 2) {
    words.push(bytesToUint16BE(resp.slice(i, i + 2)))
  }

  return words
}

function mlx90641GetBlockWord(blockWords, blockStartAddress, address) {
  const wordIndex = address - blockStartAddress
  if (wordIndex < 0 || wordIndex >= blockWords.length) {
    throw new Error(`address ${address} outside block starting at ${blockStartAddress}`)
  }

  return blockWords[wordIndex]
}

function mlx90641GetSignedBlockWord(blockWords, blockStartAddress, address) {
  return uint16ToInt16(mlx90641GetBlockWord(blockWords, blockStartAddress, address))
}

async function mlx90641ReadRuntimeBlocks() {
  const controlWords = await mlx90641ReadWordBlock(STATUS_ADDR, CONTROL_BLOCK_WORDS)
  const auxWords = await mlx90641ReadWordBlock(AUX_DATA_START, AUX_DATA_WORDS)

  return { controlWords, auxWords }
}

async function mlx90641GetDeviceID() {
    const resp = await mlx90641ReadRegister(0x2407, 6)
    console.log(`raw device id: ${resp}`)
    return bytesToBigIntBE(resp)
}

async function mlx90641ReadVdd(runtimeBlocks) {
  if (eepromData.length === 0) {
    await mlx90641FetchEEProm()
  }

  const resolutionEE = (mlx90641ReadEEPromUnsigned(0x2433) & 0x0600) / 512
  const resolutionRegValue = runtimeBlocks
    ? mlx90641GetBlockWord(runtimeBlocks.controlWords, STATUS_ADDR, CONTROL_ADDR)
    : await mlx90641ReadAddrUnsigned(CONTROL_ADDR)
  const resolutionReg = (resolutionRegValue & 0x0C00) / 1024
  const resolutionCorr = (2 ** resolutionEE) / (2 ** resolutionReg)

  let kVdd = mlx90641ReadEEPromSigned(0x2427) & 0x07FF
  if (kVdd > 1023) {
    kVdd -= 2048
  }
  kVdd *= 32
  if (kVdd === 0) {
    throw new Error('invalid K_Vdd calibration value 0')
  }
  mlx90641State.kVdd = kVdd

  let vdd25 = mlx90641ReadEEPromSigned(0x2426) & 0x07FF
  if (vdd25 > 1023) {
    vdd25 -= 2048
  }
  vdd25 *= 32
  mlx90641State.vdd25 = vdd25

  const x = runtimeBlocks
    ? mlx90641GetSignedBlockWord(runtimeBlocks.auxWords, AUX_DATA_START, 0x05AA)
    : await mlx90641ReadAddrSigned(0x05AA)
  mlx90641State.vdd = ((resolutionCorr * x - vdd25) / kVdd) + 3.3
  return mlx90641State.vdd
}

async function mlx90641ReadTa(runtimeBlocks) {
  if (eepromData.length === 0) {
    await mlx90641FetchEEProm()
  }
  if (mlx90641State.kVdd === 0) {
    await mlx90641ReadVdd(runtimeBlocks)
  }

  let kvPTAT = mlx90641ReadEEPromSigned(0x242B) & 0x07FF
  if (kvPTAT > 1023) {
    kvPTAT -= 2048
  }
  const kvPTATFloat = kvPTAT / 4096.0

  let ktPTAT = mlx90641ReadEEPromSigned(0x242A) & 0x07FF
  if (ktPTAT > 1023) {
    ktPTAT -= 2048
  }
  const ktPTATFloat = ktPTAT / 8.0

  const vddReading = runtimeBlocks
    ? mlx90641GetSignedBlockWord(runtimeBlocks.auxWords, AUX_DATA_START, 0x05AA)
    : await mlx90641ReadAddrSigned(0x05AA)
  const dV = (vddReading - mlx90641State.vdd25) / mlx90641State.kVdd
  const vPTAT25 = 32 * (mlx90641ReadEEPromUnsigned(0x2428) & 0x07FF) + (mlx90641ReadEEPromUnsigned(0x2429) & 0x07FF)
  const vPTAT = runtimeBlocks
    ? mlx90641GetSignedBlockWord(runtimeBlocks.auxWords, AUX_DATA_START, 0x05A0)
    : await mlx90641ReadAddrSigned(0x05A0)
  const vBE = runtimeBlocks
    ? mlx90641GetSignedBlockWord(runtimeBlocks.auxWords, AUX_DATA_START, 0x0580)
    : await mlx90641ReadAddrSigned(0x0580)
  const alphaPTAT = (mlx90641ReadEEPromUnsigned(0x242C) & 0x07FF) / 128.0
  const vPTATArt = (vPTAT / (vPTAT * alphaPTAT + vBE)) * 262144.0

  mlx90641State.ta = ((vPTATArt / (1.0 + kvPTATFloat * dV) - vPTAT25) / ktPTATFloat) + 25.0
  return mlx90641State.ta
}

async function mlx90641ReadKgain(runtimeBlocks) {
  if (eepromData.length === 0) {
    await mlx90641FetchEEProm()
  }

  const gain = 32 * (mlx90641ReadEEPromUnsigned(0x2424) & 0x07FF) + (mlx90641ReadEEPromUnsigned(0x2425) & 0x07FF)
  const gainReading = runtimeBlocks
    ? mlx90641GetSignedBlockWord(runtimeBlocks.auxWords, AUX_DATA_START, 0x058A)
    : await mlx90641ReadAddrSigned(0x058A)
  mlx90641State.kgain = gain / gainReading
  return mlx90641State.kgain
}

function mlx90641ReadPixelOffset() {
  const offsetScale = (mlx90641ReadEEPromUnsigned(0x2410) & 0x07E0) / 32

  let offsetAverage = 32 * (mlx90641ReadEEPromSigned(0x2411) & 0x07FF) + (mlx90641ReadEEPromSigned(0x2412) & 0x07FF)
  if (offsetAverage > 32767) {
    offsetAverage -= 65536
  }

  for (let i = 0; i < NUM_PIXELS; i += 1) {
    let offsetSP0 = mlx90641ReadEEPromSigned(0x2440 + i) & 0x07FF
    if (offsetSP0 > 1023) {
      offsetSP0 -= 2048
    }

    let offsetSP1 = mlx90641ReadEEPromSigned(0x2680 + i) & 0x07FF
    if (offsetSP1 > 1023) {
      offsetSP1 -= 2048
    }

    mlx90641State.pixOSRefSP0[i] = offsetAverage + offsetSP0 * twoToThe(offsetScale)
    mlx90641State.pixOSRefSP1[i] = offsetAverage + offsetSP1 * twoToThe(offsetScale)
  }

  return mlx90641State.pixOSRefSP0
}

function mlx90641ReadAlpha() {
  mlx90641State.alphaReferenceRows[0] = (mlx90641ReadEEPromUnsigned(0x241C) & 0x07FF) / twoToThe(((mlx90641ReadEEPromUnsigned(0x2419) & 0x07E0) / 32) + 20)
  mlx90641State.alphaReferenceRows[1] = (mlx90641ReadEEPromUnsigned(0x241D) & 0x07FF) / twoToThe((mlx90641ReadEEPromUnsigned(0x2419) & 0x001F) + 20)
  mlx90641State.alphaReferenceRows[2] = (mlx90641ReadEEPromUnsigned(0x241E) & 0x07FF) / twoToThe(((mlx90641ReadEEPromUnsigned(0x241A) & 0x07E0) / 32) + 20)
  mlx90641State.alphaReferenceRows[3] = (mlx90641ReadEEPromUnsigned(0x241F) & 0x07FF) / twoToThe((mlx90641ReadEEPromUnsigned(0x241A) & 0x001F) + 20)
  mlx90641State.alphaReferenceRows[4] = (mlx90641ReadEEPromUnsigned(0x2420) & 0x07FF) / twoToThe(((mlx90641ReadEEPromUnsigned(0x241B) & 0x07E0) / 32) + 20)
  mlx90641State.alphaReferenceRows[5] = (mlx90641ReadEEPromUnsigned(0x2421) & 0x07FF) / twoToThe((mlx90641ReadEEPromUnsigned(0x241B) & 0x001F) + 20)

  for (let i = 0; i < NUM_PIXELS; i += 1) {
    mlx90641State.alphaPixel[i] = mlx90641ReadEEPromUnsigned(0x2550 + i) & 0x07FF
  }

  return mlx90641State.alphaPixel
}

function mlx90641ReadKta() {
  const ktaScale1 = (mlx90641ReadEEPromUnsigned(0x2416) & 0x07E0) / 32
  const ktaScale2 = mlx90641ReadEEPromUnsigned(0x2416) & 0x001F

  let ktaAverage = mlx90641ReadEEPromSigned(0x2415) & 0x07FF
  if (ktaAverage > 1023) {
    ktaAverage -= 2048
  }

  for (let i = 0; i < NUM_PIXELS; i += 1) {
    let ktaEE = (mlx90641ReadEEPromUnsigned(0x25C0 + i) & 0x07E0) / 32
    if (ktaEE > 31) {
      ktaEE -= 64
    }

    mlx90641State.kta[i] = (ktaEE * twoToThe(ktaScale2) + ktaAverage) / twoToThe(ktaScale1)
  }

  return mlx90641State.kta
}

function mlx90641ReadKv() {
  const kvScale1 = (mlx90641ReadEEPromUnsigned(0x2418) & 0x07E0) / 32
  const kvScale2 = mlx90641ReadEEPromUnsigned(0x2418) & 0x001F

  let kvAverage = mlx90641ReadEEPromSigned(0x2417) & 0x07FF
  if (kvAverage > 1023) {
    kvAverage -= 2048
  }

  for (let i = 0; i < NUM_PIXELS; i += 1) {
    let kvEE = mlx90641ReadEEPromUnsigned(0x25C0 + i) & 0x001F
    if (kvEE > 15) {
      kvEE -= 32
    }

    mlx90641State.kv[i] = (kvEE * twoToThe(kvScale2) + kvAverage) / twoToThe(kvScale1)
  }

  return mlx90641State.kv
}

function mlx90641ReadKsTa() {
  const ksTa = decodeSignedBits(mlx90641ReadEEPromUnsigned(0x2422) & 0x07FF, 11)
  mlx90641State.ksTa = ksTa / 32768.0
  return mlx90641State.ksTa
}

function mlx90641ReadCT() {
  mlx90641State.ct[0] = -40
  mlx90641State.ct[1] = -20
  mlx90641State.ct[2] = 0
  mlx90641State.ct[3] = 80
  mlx90641State.ct[4] = 120
  mlx90641State.ct[5] = mlx90641ReadEEPromUnsigned(0x243A) & 0x07FF
  mlx90641State.ct[6] = mlx90641ReadEEPromUnsigned(0x243C) & 0x07FF
  mlx90641State.ct[7] = mlx90641ReadEEPromUnsigned(0x243E) & 0x07FF
  return mlx90641State.ct
}

function mlx90641ReadKsTo() {
  const ksToScale = mlx90641ReadEEPromUnsigned(0x2434) & 0x07FF
  const addresses = [0x2435, 0x2436, 0x2437, 0x2438, 0x2439, 0x243B, 0x243D, 0x243F]

  for (let i = 0; i < addresses.length; i += 1) {
    const value = decodeSignedBits(mlx90641ReadEEPromUnsigned(addresses[i]) & 0x07FF, 11)
    mlx90641State.ksTo[i] = value / twoToThe(ksToScale)
  }

  return mlx90641State.ksTo
}

function mlx90641ReadAlphaCorrRange() {
  mlx90641State.alphaCorrRange[1] = 1.0 / (1.0 + mlx90641State.ksTo[1] * (mlx90641State.ct[2] - mlx90641State.ct[1]))
  mlx90641State.alphaCorrRange[0] = mlx90641State.alphaCorrRange[1] / (1.0 + mlx90641State.ksTo[0] * (mlx90641State.ct[1] - mlx90641State.ct[0]))
  mlx90641State.alphaCorrRange[2] = 1.0
  mlx90641State.alphaCorrRange[3] = 1.0 + mlx90641State.ksTo[2] * (mlx90641State.ct[3] - mlx90641State.ct[2])
  mlx90641State.alphaCorrRange[4] = (1.0 + mlx90641State.ksTo[3] * (mlx90641State.ct[4] - mlx90641State.ct[3])) * mlx90641State.alphaCorrRange[3]
  mlx90641State.alphaCorrRange[5] = (1.0 + mlx90641State.ksTo[4] * (mlx90641State.ct[5] - mlx90641State.ct[4])) * mlx90641State.alphaCorrRange[4]
  mlx90641State.alphaCorrRange[6] = (1.0 + mlx90641State.ksTo[5] * (mlx90641State.ct[6] - mlx90641State.ct[5])) * mlx90641State.alphaCorrRange[5]
  mlx90641State.alphaCorrRange[7] = (1.0 + mlx90641State.ksTo[6] * (mlx90641State.ct[7] - mlx90641State.ct[6])) * mlx90641State.alphaCorrRange[6]
  return mlx90641State.alphaCorrRange
}

function mlx90641ReadEmissivity() {
  const em = decodeSignedBits(mlx90641ReadEEPromUnsigned(0x2423) & 0x07FF, 11)
  mlx90641State.emissivity = em / 512.0
  return mlx90641State.emissivity
}

function mlx90641ReadAlphaCP() {
  const alphaScaleCP = mlx90641ReadEEPromUnsigned(0x242E) & 0x07FF
  const numerator = mlx90641ReadEEPromUnsigned(0x242D) & 0x07FF
  mlx90641State.alphaCP = numerator / twoToThe(alphaScaleCP)
  return mlx90641State.alphaCP
}

function mlx90641ReadOffCP() {
  let offCP = 32 * (mlx90641ReadEEPromSigned(0x242F) & 0x07FF) + (mlx90641ReadEEPromSigned(0x2430) & 0x07FF)
  if (offCP > 32767) {
    offCP -= 65536
  }
  mlx90641State.pixOSRefCP = offCP
  return mlx90641State.pixOSRefCP
}

function mlx90641ReadKvCP() {
  let kvCPEE = mlx90641ReadEEPromSigned(0x2432) & 0x003F
  if (kvCPEE > 31) {
    kvCPEE -= 64
  }
  const kvScale = (mlx90641ReadEEPromUnsigned(0x2432) & 0x07C0) / 64
  mlx90641State.kvCP = kvCPEE / twoToThe(kvScale)
  return mlx90641State.kvCP
}

function mlx90641ReadKTaCP() {
  let kTaCPEE = mlx90641ReadEEPromSigned(0x2431) & 0x003F
  if (kTaCPEE > 31) {
    kTaCPEE -= 64
  }
  const kTaScale = (mlx90641ReadEEPromUnsigned(0x2431) & 0x07C0) / 64
  mlx90641State.kTaCP = kTaCPEE / twoToThe(kTaScale)
  return mlx90641State.kTaCP
}

function mlx90641ReadTGC() {
  const tgc = decodeSignedBits(mlx90641ReadEEPromUnsigned(0x2433) & 0x01FF, 9)
  mlx90641State.tgc = tgc / 64.0
  return mlx90641State.tgc
}

async function mlx90641IsNewDataAvailable() {
  const status = await mlx90641ReadAddrUnsigned(STATUS_ADDR)
  return (status & (1 << 3)) !== 0
}

async function mlx90641ClearNewDataBit() {
  await mlx90641WriteRegister(STATUS_ADDR, 0xFFFF)
  return true
}

async function mlx90641WaitForNewData(timeoutMs = NEW_DATA_TIMEOUT_MS, pollMs = NEW_DATA_POLL_MS) {
  const start = Date.now()
  while ((Date.now() - start) < timeoutMs) {
    if (await mlx90641IsNewDataAvailable()) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs))
  }

  return false
}

async function mlx90641ReadTempC() {
  if (!calibrationLoaded) {
    await mlx90641Init()
  }

  const hasNewData = await mlx90641WaitForNewData()
  if (!hasNewData) {
    throw new Error('等待热成像新数据超时，请检查刷新率或连线')
  }

  await mlx90641ClearNewDataBit()
  const runtimeBlocks = await mlx90641ReadRuntimeBlocks()

  await mlx90641ReadKgain(runtimeBlocks)
  await mlx90641ReadVdd(runtimeBlocks)
  await mlx90641ReadTa(runtimeBlocks)

  mlx90641State.subpage = mlx90641GetBlockWord(runtimeBlocks.controlWords, STATUS_ADDR, STATUS_ADDR) & 0x01
  mlx90641State.badPixels.fill(false)

  const alphaComp = Array(NUM_PIXELS).fill(0)
  const cp = mlx90641GetSignedBlockWord(runtimeBlocks.auxWords, AUX_DATA_START, 0x0588)
  const cpPixGain = cp * mlx90641State.kgain
  const frameWords = await mlx90641ReadWordBlock(FRAME_ADDR, FRAME_WORDS)

  if (mlx90641State.subpage === 0) {
    const cpPixOS = cpPixGain - mlx90641State.pixOSRefCP * (1.0 + mlx90641State.kTaCP * (mlx90641State.ta - 25.0)) * (1.0 + mlx90641State.kvCP * (mlx90641State.vdd - 3.3))

    for (let i = 0; i < NUM_PIXELS; i += 1) {
      const pixelGain = uint16ToInt16(mlx90641GetBlockWord(frameWords, FRAME_ADDR, pixelAddressSubpage0(i))) * mlx90641State.kgain
      const pixelOS = pixelGain - mlx90641State.pixOSRefSP0[i] * (1.0 + mlx90641State.kta[i] * (mlx90641State.ta - 25.0)) * (1.0 + mlx90641State.kv[i] * (mlx90641State.vdd - 3.3))
      mlx90641State.vIrCompensated[i] = (pixelOS - mlx90641State.tgc * cpPixOS) / mlx90641State.emissivity
      const alphaScaled = alphaReferenceForPixel(i) * mlx90641State.alphaPixel[i] / 2047.0
      alphaComp[i] = (alphaScaled - mlx90641State.tgc * mlx90641State.alphaCP) * (1.0 + mlx90641State.ksTa * (mlx90641State.ta - 25.0))
    }
  } else {
    const cpPixOS = cpPixGain - mlx90641State.pixOSRefCP * (1.0 + mlx90641State.kTaCP * (mlx90641State.ta - 25.0)) * (1.0 + mlx90641State.kvCP * (mlx90641State.vdd - 3.3))

    for (let i = 0; i < NUM_PIXELS; i += 1) {
      const pixelGain = uint16ToInt16(mlx90641GetBlockWord(frameWords, FRAME_ADDR, pixelAddressSubpage1(i))) * mlx90641State.kgain
      const pixelOS = pixelGain - mlx90641State.pixOSRefSP1[i] * (1.0 + mlx90641State.kta[i] * (mlx90641State.ta - 25.0)) * (1.0 + mlx90641State.kv[i] * (mlx90641State.vdd - 3.3))
      mlx90641State.vIrCompensated[i] = (pixelOS - mlx90641State.tgc * cpPixOS) / mlx90641State.emissivity
      const alphaScaled = alphaReferenceForPixel(i) * mlx90641State.alphaPixel[i] / 2047.0
      alphaComp[i] = (alphaScaled - mlx90641State.tgc * mlx90641State.alphaCP) * (1.0 + mlx90641State.ksTa * (mlx90641State.ta - 25.0))
    }
  }

  const taK4 = Math.pow(mlx90641State.ta + 273.15, 4.0)
  const trK4 = Math.pow(mlx90641State.ta + 268.15, 4.0)
  const taR = trK4 - ((trK4 - taK4) / mlx90641State.emissivity)
  const ksTo3 = mlx90641State.ksTo[2]

  for (let i = 0; i < NUM_PIXELS; i += 1) {
    if (alphaComp[i] < 1.0e-6) {
      alphaComp[i] = 1.0e-6
    }

    const sx = ksTo3 * fourthRoot(Math.pow(alphaComp[i], 3.0) * mlx90641State.vIrCompensated[i] + Math.pow(alphaComp[i], 4.0) * taR)
    const inner = (mlx90641State.vIrCompensated[i] / (alphaComp[i] * (1.0 - ksTo3 * 273.15) + sx)) + taR

    if (inner < 0 || Number.isNaN(inner)) {
      mlx90641State.badPixels[i] = true
      mlx90641State.to[i] = 0
      continue
    }

    const rawTo = fourthRoot(inner) - 273.15
    mlx90641State.to[i] = rawTo * CAL_SLOPE + CAL_INT + OFFSET
  }

  interpolateBadPixels()
  return [...mlx90641State.to]
}

async function mlx90641Init() {
  if (eepromData.length === 0) {
    await mlx90641FetchEEProm()
  }

  if (!sensorConfigured) {
    await mlx90641SetRefreshRate(REFRESH_RATE)
    await new Promise((resolve) => setTimeout(resolve, POR_DELAY_MS))
    sensorConfigured = true
  }

  mlx90641ReadPixelOffset()
  mlx90641ReadAlpha()
  mlx90641ReadKta()
  mlx90641ReadKv()
  mlx90641ReadKsTa()
  mlx90641ReadCT()
  mlx90641ReadKsTo()
  mlx90641ReadAlphaCorrRange()
  mlx90641ReadEmissivity()
  mlx90641ReadAlphaCP()
  mlx90641ReadOffCP()
  mlx90641ReadKvCP()
  mlx90641ReadKTaCP()
  mlx90641ReadTGC()

  calibrationLoaded = true
  return mlx90641State
}

async function takeThermalShot() {
  if (!hasValidI2cPins()) {
    setPinWarning(true)
    return false
  }

  setPinWarning(false)

  if (shotInProgress) {
    return false
  }

  shotInProgress = true
  try {
    if (!deviceId) {
      deviceId = await mlx90641GetDeviceID()
      console.log(`device ID: ${deviceId}`)
    }

    await mlx90641Init()
    const temp = await mlx90641ReadTempC()
    console.log(`temperature: ${temp}`)
    lastFrame = temp
    renderHeatmap(temp)
    return true
  } catch (error) {
    console.error(error)
    return false
  } finally {
    shotInProgress = false
  }
}

if (sdaPinElem) {
  sdaPinElem.addEventListener('change', function (event) {
    sdaPin = Number(event.target.value)
    sclPin = sdaPin + 1
    sensorConfigured = false
    calibrationLoaded = false
    eepromData = []
    deviceId = null
    localStorage.setItem(THERMAL_SDA_PIN_STORAGE_KEY, String(event.target.value))
    if (hasValidI2cPins()) {
      setPinWarning(false)
    } else {
      setPinWarning(true)
    }
  })
}

if (sdaPinElem) {
  const cachedSdaPin = localStorage.getItem(THERMAL_SDA_PIN_STORAGE_KEY)
  if (cachedSdaPin !== null) {
    sdaPinElem.value = cachedSdaPin
    sdaPin = Number(cachedSdaPin)
    sclPin = sdaPin + 1
    if (!hasValidI2cPins()) {
      setPinWarning(true)
    }
  }
}

document
  .getElementById('cameraOneshot')
  .addEventListener('click', async function () {
   setThermalLoading(true)
   try {
     await takeThermalShot()
   } finally {
     setThermalLoading(false)
   }
  })

document
  .getElementById('cameraReset')
  .addEventListener('click', async function () {
    if (shotTimerId !== null) {
      return
    }

    const ok = await takeThermalShot()
    if (!ok) {
      return
    }

    shotTimerId = setInterval(() => {
      void takeThermalShot()
    }, CONTINUOUS_SHOT_INTERVAL_MS)
  })

document
  .getElementById('imageRotate')
  .addEventListener('click', function () {
    if (shotTimerId !== null) {
      clearInterval(shotTimerId)
      shotTimerId = null
    }
  })

if (temperatureRangeElem) {
  temperatureRangeElem.addEventListener('change', function () {
    if (lastFrame) {
      renderHeatmap(lastFrame)
    } else {
      clearHeatmap()
    }
  })
}

setPinWarning(false)
clearHeatmap()
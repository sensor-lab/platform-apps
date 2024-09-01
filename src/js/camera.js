import {
  spiHardwareOperation,
  i2cReadHardwareOperation,
  i2cWriteHardwareOperation,
  delayHardwareOperation,
  constructNowEvent,
  postHardwareOperation
} from './api'

// many hidden registers though....
// Register table - OV2640 DSP address
const CTRLI_REG = 0x50
const HSIZE_REG = 0x51
const VSIZE_REG = 0x52
const XOFFL_REG = 0x53
const YOFFL_REG = 0x54
const VHYX_REG = 0x55
const TEST_REG = 0x57
const ZMOW_REG = 0x5a
const ZMOH_REG = 0x5b
const ZMHH_REG = 0x5c
const CTRL2_REG = 0x86
const CTRL3_REG = 0x87
const HSIZE8_REG = 0xc0
const VSIZE8_REG = 0xc1
const RESET_REG = 0xe0
const RA_DLMT_REG = 0xff

// Register table - OV2640 Sensor address
const COM4_REG = 0x0d
const COM7_REG = 0x12
const HREFST_REG = 0x17
const HREFEND_REG = 0x18
const VSTRT_REG = 0x19
const VEND_REG = 0x1a
const REG32_REG = 0x32
const ARCOM2_REG = 0x34
const BD50_REG = 0x4f
const BD60_REG = 0x50

// Register table - Arducam SPI registers
const ARDUCAM_TEST_REG = 0x00
const ARDUCAM_CAPTURE_CTR_REG = 0x01
const ARDUCAM_SENSOR_INTERFACE_TIMING_REG = 0x03
const ARDUCAM_FIFO_CTR_REG = 0x04
const ARDUCAM_GPIO_DIR_REG = 0x05
const ARDUCAM_GPIO_WR_REG = 0x06
const ARDUCAM_BURST_FIFO_READ_REG = 0x3c
const ARDUCAM_SINGLE_FIFO_READ_REG = 0x3d
const ARDUCAM_CHIP_VER_REG = 0x40
const ARDUCAM_FIFO_DONE_REG = 0x41
const ARDUCAM_WRITE_FIFO_SIZE1_REG = 0x42
const ARDUCAM_WRITE_FIFO_SIZE2_REG = 0x43
const ARDUCAM_WRITE_FIFO_SIZE3_REG = 0x44
const ARDUCAM_GPIO_RD_REG = 0x45

var mosi_pin = 2
var miso_pin = 1
var sck_pin = 0
var cs_pin = 3
var sda_pin = 16
var scl_pin = 17

const DEVICE_I2C_ADDR = 0x60 >> 1

function writeArducamReg (opers, reg_addr, ...data) {
  const transmit_data = [reg_addr | 0x80, ...data]
  spiHardwareOperation(
    opers,
    0,
    mosi_pin,
    miso_pin,
    sck_pin,
    cs_pin,
    1000,
    0,
    0,
    0,
    ...transmit_data
  )
}

function readArducamReg (opers, reg_addr, len = 1) {
  spiHardwareOperation(
    opers,
    0,
    mosi_pin,
    miso_pin,
    sck_pin,
    cs_pin,
    1000,
    0,
    1,
    len
  )
}

function writeOvReg (opers, reg_addr, ...data) {
  i2cWriteHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    400,
    DEVICE_I2C_ADDR,
    reg_addr,
    -1,
    ...data
  )
}

function readOvReg (opers, reg_addr, read_len = 1) {
  i2cWriteHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    400,
    DEVICE_I2C_ADDR,
    reg_addr,
    -1
  )
  i2cReadHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    400,
    DEVICE_I2C_ADDR,
    -1,
    -1,
    read_len
  )
}

async function CameraInit () {
  const opers = []
  writeOvReg(opers, RA_DLMT_REG, 0x01)
  writeOvReg(opers, COM7_REG, 0x80)
  delayHardwareOperation(opers, 'ms', 100)
  writeOvReg()
}

document
  .getElementById('cameraOneshot')
  .addEventListener('click', async function () {
    const opers = []
    writeArducamReg(opers, 0, 55)
    readArducamReg(opers, 0)
    writeOvReg(opers, 255, 1)
    readOvReg(opers, 10)
    const now_event = constructNowEvent(opers)
    const ret = await postHardwareOperation(now_event, 'http://192.168.1.108')
    console.log(`${JSON.stringify(ret)}`)
  })

import {
  spiHardwareOperation,
  i2cReadHardwareOperation,
  i2cWriteHardwareOperation,
  delayHardwareOperation,
  constructNowEvent,
  postHardwareOperation
} from './api'

// Register table - OV2640 DSP address
// Register table - OV2640 Sensor address
// Register table - Arducam SPI registers

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

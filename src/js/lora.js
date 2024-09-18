import {
  spiHardwareOperation,
  delayHardwareOperation,
  constructNowEvent,
  postHardwareOperation,
} from "./api";

const BASE_REG_FIFO = 0x0;
const BASE_REG_OP_MODE = 0x1;
const OP_MODE_STANDBY_MODE = 0x1;
const OP_MODE_TRANSMITTER_MODE = 0x3;
const OP_MODE_RECEIVER_MODE = 0x5;
const OP_MODE_LORA_MODE = 0x80;
const BASE_REG_FREQ_MSB = 0x06;
const BASE_REG_FREQ_MID = 0x07;
const BASE_REG_FREQ_LSB = 0x08;
const BASE_REG_PA_POWER_CONFIG = 0x09;
const BASE_REG_PA_RAMP_TIME = 0x0a;
const BASE_REG_OVER_CURRENT_PROTECTION = 0x0b;
const BASE_REG_LNA_SET = 0x0c;
const BASE_REG_DIO_MAPPING_1 = 0x40;
const BASE_REG_DIO_MAPPING_2 = 0x41;
const BASE_REG_VERSION = 0x42;
const BASE_REG_TCXO = 0x4b;
const BASE_REG_PA_DAC = 0x4d;
const BASE_REG_FORMER_TEMPERATURE = 0x5b;
const BASE_REG_AGC_REF = 0x61;
const BASE_REG_AGC_THREASH1 = 0x62;
const BASE_REG_AGC_THREASH2 = 0x63;
const BASE_REG_AGC_THREASH3 = 0x64;

const LORA_REG_FIFO_ADDR_PTR = 0x0d;
const LORA_REG_FIFO_TX_BASE_ADDR = 0x0e;
const LORA_REG_FIFO_RX_BASE_ADDR = 0x0f;
const LORA_REG_FIFO_RX_CURRENT_ADDR = 0x10;
const LORA_REG_IRQ_FLAGS_MASK = 0x11;
const LORA_REG_IRQ_FLAGS = 0x12;
const LORA_REG_IRQ_TX_DONE_MASK = 0x08;
const LORA_REG_IRQ_RX_DONE_MASK = 0x40;
const LORA_REG_IRQ_VALID_HEADER_MASK = 0x10;
const LORA_REG_NUM_RX_BYTES = 0x13;
const LORA_REG_RX_HEADER_CNT_VALUE_MSB = 0x14;
const LORA_REG_RX_HEADER_CNT_VALUE_LSB = 0x15;
const LORA_REG_RX_PACKET_CNT_VALUE_MSB = 0x16;
const LORA_REG_RX_PACKET_CNT_VALUE_LSB = 0x17;
const LORA_REG_MODEM_STATUS = 0x18;
const LORA_REG_PACKET_SNR_VALUE = 0x19;
const LORA_REG_PACKET_RSSI_VALUE = 0x1a;
const LORA_REG_RSSI_VALUE = 0x1b;
const LORA_REG_HOP_CHANNEL = 0x1c;
const LORA_REG_MODULATION_CFG1 = 0x1d;
const LORA_REG_MODULATION_CFG2 = 0x1e;
const LORA_REG_SYMB_TIMEOUT_LSB = 0x1f;
const LORA_REG_PREAMBLE_MSB = 0x20;
const LORA_REG_PREAMBLE_LSB = 0x21;
const LORA_REG_PAYLOAD_LENGTH = 0x22;
const LORA_REG_MAX_PAYLOAD_LENGTH = 0x23;
const LORA_REG_HOP_PERIOD = 0x24;
const LORA_REG_FIFO_RX_BYTE_ADDR = 0x25;
const LORA_REG_MODULATION_CFG3 = 0x26;

var mosi_pin = 0;
var miso_pin = 1;
var sck_pin = 2;
var cs_pin = 3;

const SPI_SPEED = 1000; //kHz

async function registerRead(opers, reg, read_len = 1) {
  spiHardwareOperation(
    opers,
    0,
    mosi_pin,
    miso_pin,
    sck_pin,
    cs_pin,
    SPI_SPEED,
    0,
    1,
    read_len,
    ...[reg & 0x7f]
  );
}

async function registerWrite(opers, reg, ...write_data) {
  write_data.unshift(reg | 0x80);
  spiHardwareOperation(
    opers,
    0,
    mosi_pin,
    miso_pin,
    sck_pin,
    cs_pin,
    SPI_SPEED,
    0,
    0,
    0,
    ...write_data
  );
}

async function checkVersion() {
  let pass = false;
  const opers = [];
  registerRead(opers, BASE_REG_VERSION);
  const event = constructNowEvent(opers);
  const ret = await postHardwareOperation(event, "http://192.168.1.93");
  if (parseInt(ret["result"][0]) === 0x12) {
    pass = true;
  }
  return pass;
}

function setFrequency(opers, freq) {
  const big_int_val = (BigInt(freq) << 19n) / 32000000n; // have to declare this way, otherwise negative
  const msb = (parseInt(big_int_val) >> 16) & 0xff;
  const mid = (parseInt(big_int_val) >> 8) & 0xff;
  const lsb = parseInt(big_int_val) & 0xff;
  registerWrite(opers, BASE_REG_FREQ_MSB, msb);
  registerWrite(opers, BASE_REG_FREQ_MID, mid);
  registerWrite(opers, BASE_REG_FREQ_LSB, lsb);
  console.log(
    `${parseInt(big_int_val)}, msb: ${msb}, mid:  ${mid}, lsb: ${lsb}`
  );
}

async function getFrequency() {
  const opers = [];
  registerRead(opers, BASE_REG_FREQ_MSB, 3);
  const event = constructNowEvent(opers);
  const ret = await postHardwareOperation(event, "http://192.168.1.93");
  const freq =
    ((BigInt(ret["result"][0][0] << 16) +
      BigInt(ret["result"][0][1] << 8) +
      BigInt(ret["result"][0][2])) *
      32000000n) >>
    19n;
  console.log(`ret: ${JSON.stringify(ret)}`);
  return freq;
}

async function getLna() {
  const opers = [];
  registerRead(opers, BASE_REG_LNA_SET, 1);
  const event = constructNowEvent(opers);
  const ret = await postHardwareOperation(event, "http://192.168.1.93");
  const lna = ret["result"][0];
  return lna;
}

async function hasPendingRxPacket() {
  let rx_packet_len = 0;
  let opers = [];
  registerRead(opers, LORA_REG_IRQ_FLAGS);
  let event = constructNowEvent(opers);
  let ret = await postHardwareOperation(event, "http://192.168.1.93");
  console.log(`IRQ: ${JSON.stringify(ret)}`);
  if ((parseInt(ret["result"][0]) & LORA_REG_IRQ_RX_DONE_MASK) !== 0) {
    opers = [];
    if ((parseInt(ret["result"][0]) & LORA_REG_IRQ_VALID_HEADER_MASK) !== 0) {
      registerWrite(
        opers,
        LORA_REG_IRQ_FLAGS,
        LORA_REG_IRQ_RX_DONE_MASK | LORA_REG_IRQ_VALID_HEADER_MASK
      );
    } else {
      registerWrite(opers, LORA_REG_IRQ_FLAGS, LORA_REG_IRQ_RX_DONE_MASK);
    }
    registerRead(opers, LORA_REG_NUM_RX_BYTES);
    event = constructNowEvent(opers);
    ret = await postHardwareOperation(event, "http://192.168.1.93");
    rx_packet_len = parseInt(ret["result"][1]);
    console.log(`packet len: ${JSON.stringify(ret)}`);
  }
  return rx_packet_len;
}

async function readPacket(packet_len) {
  const opers = [];
  registerRead(opers, BASE_REG_FIFO, packet_len);
  let event = constructNowEvent(opers);
  let ret = await postHardwareOperation(event, "http://192.168.1.93");
  return ret["result"][0];
}

async function begin() {
  const FREQUENCY = 433000000;
  let opers = [];
  // set LORA mode
  registerWrite(opers, BASE_REG_OP_MODE, OP_MODE_LORA_MODE);
  // set frequency
  setFrequency(opers, FREQUENCY);
  registerWrite(opers, LORA_REG_FIFO_TX_BASE_ADDR, 0x0);
  registerWrite(opers, LORA_REG_FIFO_RX_BASE_ADDR, 0x0);
  let event = constructNowEvent(opers);
  await postHardwareOperation(event, "http://192.168.1.93");
  const freq = await getFrequency();
  if (freq != FREQUENCY) {
    console.log(`Warning! Frequency does not match: ${freq}`);
  }
  const lna = await getLna();
  opers = [];
  registerWrite(opers, BASE_REG_LNA_SET, lna | 0x3);
  registerWrite(opers, LORA_REG_MODULATION_CFG3, 0x4);
  registerWrite(opers, BASE_REG_PA_DAC, 0x84);
  //   registerWrite(opers, BASE_REG_OVER_CURRENT_PROTECTION, 100); need double check
  registerWrite(opers, BASE_REG_PA_POWER_CONFIG, 0x8f);
  registerWrite(
    opers,
    BASE_REG_OP_MODE,
    OP_MODE_LORA_MODE | OP_MODE_STANDBY_MODE
  );
  event = constructNowEvent(opers);
  await postHardwareOperation(event, "http://192.168.1.93");
}

async function transmitData(...data) {
  let opers = [];
  // start packet
  registerRead(opers, LORA_REG_MODULATION_CFG1);
  let event = constructNowEvent(opers);
  let ret = await postHardwareOperation(event, "http://192.168.1.93");
  opers = [];
  registerWrite(opers, LORA_REG_MODULATION_CFG1, ret["result"][0] & 0xfe);
  registerWrite(opers, LORA_REG_FIFO_ADDR_PTR, 0);
  registerWrite(opers, LORA_REG_PAYLOAD_LENGTH, 0);

  // transmit actual data
  opers = [];
  registerWrite(opers, BASE_REG_FIFO, ...data);
  registerWrite(opers, LORA_REG_PAYLOAD_LENGTH, data.length);
  registerWrite(
    opers,
    BASE_REG_OP_MODE,
    OP_MODE_LORA_MODE | OP_MODE_TRANSMITTER_MODE
  );
  event = constructNowEvent(opers);
  await postHardwareOperation(event, "http://192.168.1.93");

  // wait for data transmission completes.
  while (1) {
    opers = [];
    registerRead(opers, LORA_REG_IRQ_FLAGS);
    event = constructNowEvent(opers);
    ret = await postHardwareOperation(event, "http://192.168.1.93");
    if ((ret["result"][0] & LORA_REG_IRQ_TX_DONE_MASK) != 0) {
      console.log(`tx completed!`);
      break;
    }
  }
  opers = [];
  registerWrite(opers, LORA_REG_IRQ_FLAGS, LORA_REG_IRQ_TX_DONE_MASK);
  event = constructNowEvent(opers);
  ret = await postHardwareOperation(event, "http://192.168.1.93");
}

async function receiveData() {
  let opers = [];
  // set explicit header
  registerRead(opers, LORA_REG_MODULATION_CFG1);
  let event = constructNowEvent(opers);
  let ret = await postHardwareOperation(event, "http://192.168.1.93");
  opers = [];
  registerWrite(opers, LORA_REG_MODULATION_CFG1, ret["result"][0] & 0xfe);
  registerRead(opers, BASE_REG_OP_MODE);
  event = constructNowEvent(opers);
  ret = await postHardwareOperation(event, "http://192.168.1.93");

  if (
    parseInt(ret["result"][1]) !==
    (OP_MODE_LORA_MODE | OP_MODE_RECEIVER_MODE)
  ) {
    opers = [];
    registerWrite(
      opers,
      BASE_REG_OP_MODE,
      OP_MODE_LORA_MODE | OP_MODE_RECEIVER_MODE
    );
    registerWrite(opers, LORA_REG_FIFO_ADDR_PTR, 0);
    event = constructNowEvent(opers);
    await postHardwareOperation(event, "http://192.168.1.93");
  }

  let i = 0;
  while (i < 50) {
    const packet_len = await hasPendingRxPacket();
    if (packet_len > 0) {
      console.log("detected pending packet");
      const read_data = await readPacket(packet_len);
      console.log(`read_data: ${JSON.stringify(read_data)}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
    i++;
  }
}

var initialized = false;

document
  .getElementById("sendData")
  .addEventListener("click", async function () {
    const pass = await checkVersion();
    console.log(`pass: ${pass}`);
    if (pass) {
      if (!initialized) {
        await begin();
        initialized = true;
      }

      await transmitData(30, 31, 32, 33, 34, 35, 36, 37, 38, 39);
    }
  });

document
  .getElementById("receiveData")
  .addEventListener("click", async function () {
    const pass = await checkVersion();
    console.log(`pass: ${pass}`);
    if (pass) {
      if (!initialized) {
        await begin();
        initialized = true;
      }
      await receiveData();
    }
  });

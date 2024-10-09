import {
  spiHardwareOperation,
  delayHardwareOperation,
  constructNowEvent,
  postHardwareOperation,
  setTime,
} from "./api";

function addErrorMsg(message) {
  document.getElementById("errorMsg").innerHTML = message;
  document.getElementById("errorMsg").classList.remove("d-none");
}

function removeErrorMsg() {
  document.getElementById("errorMsg").classList.add("d-none");
}

function addStatusMsg(message) {
  document.getElementById("statusMsg").innerHTML = message;
  document.getElementById("statusMsg").classList.remove("d-none");
}

function removeStatusMsg() {
  document.getElementById("statusMsg").classList.add("d-none");
}

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

// Global state
const TX_SINGLE_STATE = 0;
const TX_CONTINUOUS_STATE = 1;
const RX_SINGLE_STATE = 2;
const RX_CONTINUOUS_STATE = 3;
const MODULE_STANDBY_STATE = 4;

var mosi_pin = undefined;
var miso_pin = undefined;
var sck_pin = undefined;
var cs_pin = undefined;
var state = undefined;
var receiver_timer = undefined;
var transmitter_timer = undefined;

const SPI_SPEED = 1000; //kHz

if (localStorage.getItem("lora_mosi_pin")) {
  mosi_pin = parseInt(localStorage.getItem("lora_mosi_pin"));
  miso_pin = mosi_pin + 1;
  sck_pin = mosi_pin + 2;
  cs_pin = mosi_pin + 3;
  document.getElementById("pinSelect").value = mosi_pin;
}

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
  const ret = await postHardwareOperation(event);
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
  const ret = await postHardwareOperation(event);
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
  const ret = await postHardwareOperation(event);
  const lna = ret["result"][0];
  return lna;
}

async function hasPendingRxPacket() {
  let rx_packet_len = 0;
  let opers = [];
  registerRead(opers, LORA_REG_IRQ_FLAGS);
  let event = constructNowEvent(opers);
  let ret = await postHardwareOperation(event);
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
    ret = await postHardwareOperation(event);
    rx_packet_len = parseInt(ret["result"][1]);
    console.log(`packet len: ${JSON.stringify(ret)}`);
  }
  return rx_packet_len;
}

async function readPacket(packet_len) {
  const opers = [];
  registerRead(opers, BASE_REG_FIFO, packet_len);
  let event = constructNowEvent(opers);
  let ret = await postHardwareOperation(event);
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
  await postHardwareOperation(event);
  const freq = await getFrequency();
  if (freq != FREQUENCY) {
    console.log(`Warning! Frequency does not match: ${freq}`);
  }
  const lna = await getLna();
  opers = [];
  registerWrite(opers, BASE_REG_LNA_SET, lna | 0x3);
  registerWrite(opers, LORA_REG_MODULATION_CFG3, 0x4);
  registerWrite(opers, BASE_REG_PA_DAC, 0x87);    // 0x87 for tx high power
  registerWrite(opers, LORA_REG_MODULATION_CFG2, 0xa0);     // set spread factor to 10
  //   registerWrite(opers, BASE_REG_OVER_CURRENT_PROTECTION, 100); need double check
  registerWrite(opers, BASE_REG_PA_POWER_CONFIG, 0x8f);
  event = constructNowEvent(opers);
  await postHardwareOperation(event);
  await setModuleState(OP_MODE_STANDBY_MODE);
}

async function transmitData(...data) {
  let opers = [];
  // start packet
  registerRead(opers, LORA_REG_MODULATION_CFG1);
  let event = constructNowEvent(opers);
  let ret = await postHardwareOperation(event);
  opers = [];
  registerWrite(opers, LORA_REG_MODULATION_CFG1, ret["result"][0] & 0xfe & 0x0f);   // use 7.8khz bandwidth with explicit header mode
  registerWrite(opers, LORA_REG_FIFO_ADDR_PTR, 0);
  registerWrite(opers, LORA_REG_PAYLOAD_LENGTH, 0);

  // transmit actual data
  opers = [];
  registerWrite(opers, BASE_REG_FIFO, ...data);
  registerWrite(opers, LORA_REG_PAYLOAD_LENGTH, data.length);
  event = constructNowEvent(opers);
  await postHardwareOperation(event);
  await setModuleState(OP_MODE_TRANSMITTER_MODE);

  // wait for data transmission completes.
  while (1) {
    opers = [];
    registerRead(opers, LORA_REG_IRQ_FLAGS);
    event = constructNowEvent(opers);
    ret = await postHardwareOperation(event);
    if ((ret["result"][0] & LORA_REG_IRQ_TX_DONE_MASK) != 0) {
      break;
    }
  }
  opers = [];
  registerWrite(opers, LORA_REG_IRQ_FLAGS, LORA_REG_IRQ_TX_DONE_MASK);
  event = constructNowEvent(opers);
  ret = await postHardwareOperation(event);
}

async function transmitDataWrapper(...data) {
  addStatusMsg("数据发送中");
  window.scrollTo(0, 0);
  await transmitData(...data);
  document.getElementById("txTimestamp").innerHTML = new Date(
    Date.now()
  ).toLocaleTimeString();
  removeErrorMsg();
  addStatusMsg("数据发送完成");
}

async function moduleInit() {
  const pass = await checkVersion();
  if (pass) {
    await begin();
  }
  return pass;
}

async function setModuleState(state) {
  const opers = [];
  registerWrite(opers, BASE_REG_OP_MODE, OP_MODE_LORA_MODE | state);
  registerWrite(opers, LORA_REG_FIFO_ADDR_PTR, 0);
  const event = constructNowEvent(opers);
  await postHardwareOperation(event);
}

async function resetModuleState() {
  if (mosi_pin == undefined) {
    window.scrollTo(0, 0);
    addErrorMsg("请选择正确的连接引脚");
    await new Promise((r) => setTimeout(r, 1000));
    state = undefined;
  } else if (state == undefined) {
    if (true == (await moduleInit())) {
      state = MODULE_STANDBY_STATE;
    }
  } else if (state == TX_SINGLE_STATE) {
    addErrorMsg("模块正在发送数据，请稍候");
  } else if (state == TX_CONTINUOUS_STATE) {
    clearTimeout(transmitter_timer);
    transmitter_timer = undefined;
    await setModuleState(OP_MODE_STANDBY_MODE);
    state = MODULE_STANDBY_STATE;
  } else if (state == RX_SINGLE_STATE) {
    clearTimeout(receiver_timer);
    receiver_timer = undefined;
    await setModuleState(OP_MODE_STANDBY_MODE);
    state = MODULE_STANDBY_STATE;
  } else if (state == RX_CONTINUOUS_STATE) {
    clearTimeout(receiver_timer);
    await setModuleState(OP_MODE_STANDBY_MODE);
    state = MODULE_STANDBY_STATE;
  }
}

async function loopTransmitData(...u8array) {
  await transmitDataWrapper(...u8array);
  transmitter_timer = setTimeout(async function () {
    console.log("loop transmit!");
    await loopTransmitData(...u8array);
  }, 1000);
}

async function loopReiveData(continuous) {
  addStatusMsg("数据等待中");
  const packet_len = await hasPendingRxPacket();
  if (packet_len > 0) {
    addStatusMsg("数据接收中");
    const read_data = await readPacket(packet_len);
    let utf8decoder = new TextDecoder();
    let u8arr = new Uint8Array(read_data);
    const rcv_data = utf8decoder.decode(u8arr);
    const cur_time = new Date(Date.now()).toLocaleTimeString();
    document.getElementById("rcvTimestamp").innerHTML = cur_time;
    document.getElementById("rcvContent").innerHTML = rcv_data;
    document.getElementById("rcvCard").style.display = "block";
    if (continuous) {
      // continuous mode, set back to receiver mode
      await setModuleState(OP_MODE_RECEIVER_MODE);
      receiver_timer = setTimeout(async function () {
        await loopReiveData(continuous);
      }, 1000);
    }
  } else {
    receiver_timer = setTimeout(async function () {
      await loopReiveData(continuous);
    }, 1000);
  }
}

async function receiveData(continuous = false) {
  let opers = [];
  // set explicit header
  registerRead(opers, LORA_REG_MODULATION_CFG1);
  let event = constructNowEvent(opers);
  let ret = await postHardwareOperation(event);
  opers = [];
  registerWrite(opers, LORA_REG_MODULATION_CFG1, ret["result"][0] & 0xfe & 0x0f); // use 7.8khz bandwidth with explicit header mode
  registerRead(opers, BASE_REG_OP_MODE);
  event = constructNowEvent(opers);
  ret = await postHardwareOperation(event);

  if (
    parseInt(ret["result"][1]) !==
    (OP_MODE_LORA_MODE | OP_MODE_RECEIVER_MODE)
  ) {
    await setModuleState(OP_MODE_RECEIVER_MODE);
  }

  await loopReiveData(continuous);
}

document
  .getElementById("sendDataSingle")
  .addEventListener("click", async function () {
    removeErrorMsg();
    removeStatusMsg();
    const text_input = document.getElementById("sendDataArea").value;
    if (text_input.length > 0) {
      await resetModuleState();

      if (state == MODULE_STANDBY_STATE) {
        const encoder = new TextEncoder();
        const u8array = new Uint8Array(text_input.length * 3);
        encoder.encodeInto(text_input, u8array);
        state = TX_SINGLE_STATE;
        await transmitDataWrapper(...u8array);
        state = MODULE_STANDBY_STATE;
      } else {
        addErrorMsg("请检查模块连接");
      }
    } else {
      addErrorMsg("请输入正确的发送内容。");
    }
  });

document
  .getElementById("sendDataContinuous")
  .addEventListener("click", async function () {
    removeErrorMsg();
    removeStatusMsg();
    const text_input = document.getElementById("sendDataArea").value;
    if (text_input.length > 0) {
      await resetModuleState();

      if (state == MODULE_STANDBY_STATE) {
        const encoder = new TextEncoder();
        const u8array = new Uint8Array(text_input.length * 3);
        encoder.encodeInto(text_input, u8array);
        await loopTransmitData(...u8array);
        state = TX_CONTINUOUS_STATE;
      } else {
        addErrorMsg("请检查模块连接");
      }
    } else {
      addErrorMsg("请输入正确的发送内容。");
    }
  });

document
  .getElementById("receiveDataSingle")
  .addEventListener("click", async function () {
    removeErrorMsg();
    removeStatusMsg();

    await resetModuleState();
    if (state == MODULE_STANDBY_STATE) {
      state = RX_SINGLE_STATE;
      await receiveData();
    }
  });

document
  .getElementById("receiveDataContinuous")
  .addEventListener("click", async function () {
    removeErrorMsg();
    removeStatusMsg();

    await resetModuleState();
    if (state == MODULE_STANDBY_STATE) {
      state = RX_CONTINUOUS_STATE;
      await receiveData(true);
    }
  });

document
  .getElementById("pinSelect")
  .addEventListener("change", function (event) {
    var ele = document.getElementById("pinSelect");
    if (ele.options[ele.selectedIndex].value == -1) {
      addErrorMsg("请选择正确的连接引脚");
    } else {
      mosi_pin = parseInt(ele.options[ele.selectedIndex].value);
      miso_pin = mosi_pin + 1;
      sck_pin = mosi_pin + 2;
      cs_pin = mosi_pin + 3;
      localStorage.setItem("lora_mosi_pin", mosi_pin);
    }
  });

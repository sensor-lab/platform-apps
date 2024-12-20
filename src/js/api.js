export async function setState(state) {
  let request = "/hardware/config";
  if (state != "normal" && state != "fwupdate" && state != "appupdate") {
    return -1;
  } else {
    try {
      const response = await fetch(request, {
        method: "post",
        body: JSON.stringify({
          state: state,
        }),
      });
      const ret = await response.json();
      return ret;
    } catch (error) {
      console.log("Error call API:", error);
    }
  }
  return -1;
}

export async function restartPlatform() {
  let request = "/hardware/restart";
  try {
    const response = await fetch(request, {
      method: "post",
    });
    const ret = await response.json();
    if (ret.hasOwnProperty("errorcode") == false) {
      return 0;
    } else {
      return -1;
    }
  } catch (error) {
    console.log("Error call API:", error);
  }
  return -1;
}

export async function sendRequest(payload) {
  let request = "/hardware/operation";
  try {
    const response = await fetch(request, {
      method: "post",
      body: payload,
    });
    const ret = await response.json();
    return ret;
  } catch (error) {
    console.log("Error call API:", error);
    return -1;
  }
}

export async function getConfig() {
  let request = "/hardware/config";
  try {
    const response = await fetch(request, {
      method: "get",
    });
    const ret = await response.json();
    if (ret.hasOwnProperty("errorcode") == false) {
      return ret;
    } else {
      return -1;
    }
  } catch (error) {
    console.log("Error call API:", error);
  }
  return -1;
}

export async function setConfig(config) {
  let request = "/hardware/config";
  try {
    const response = await fetch(request, {
      method: "post",
      body: JSON.stringify(config),
    });
    const ret = await response.json();
    return ret;
  } catch (error) {
    console.log("Error call API:", error);
  }
  return -1;
}

export async function getStatus() {
  let request = "/hardware/status";
  try {
    const response = await fetch(request, {
      method: "get",
    });
    const ret = await response.json();
    if (ret.hasOwnProperty("errorcode") == false) {
      return ret;
    } else {
      return -1;
    }
  } catch (error) {
    console.log("Error call API:", error);
  }
  return -1;
}

export async function setTime(timedate) {
  let request = "/hardware/timedate";
  var timedate_str =
    timedate.getFullYear() +
    "-" +
    (timedate.getMonth() + 1) +
    "-" +
    timedate.getDate() +
    "T" +
    timedate.getHours() +
    ":" +
    timedate.getMinutes() +
    ":" +
    timedate.getSeconds();

  var body = {
    value: timedate_str,
  };
  try {
    const response = await fetch(request, {
      method: "post",
      body: body,
    });
    const ret = await response.json();
    if (ret.hasOwnProperty("errorcode") == false) {
      return 0;
    } else {
      return -1;
    }
  } catch (error) {
    console.log("Error call API:", error);
  }
  return 0;
}

export async function getTime() {
  let request = "/hardware/timedate";
  try {
    const response = await fetch(request, {
      method: "get",
    });
    const ret = await response.json();
    if (ret.hasOwnProperty("errorcode") == false) {
      return ret.value;
    } else {
      return -1;
    }
  } catch (error) {
    console.log("Error call API:", error);
  }
}

export async function getCrc32(fn, external_url = undefined) {
  let request = `/hardware/getcrc32?fn=${fn}`;
  if (external_url !== undefined) {
    request = external_url + request;
  }
  try {
    const response = await fetch(request, {
      method: "get",
    });
    if (response.status === 404) {
      return -1;
    } else if (response.status === 200) {
      return await response.json();
    } else {
      // could be status code 400
      return -2;
    }
  } catch (error) {
    console.log("Error call API:", error);
  }
  return -3;
}

export async function gpio(pin_id, mode, level) {
  let request = "/hardware/operation";
  var body;
  if (mode == "input") {
    body = {
      event: "now",
      actions: [["gpio", pin_id, "input", 0]],
    };
  } else {
    body = {
      event: "now",
      actions: [["gpio", pin_id, "output", level]],
    };
  }

  try {
    const response = await fetch(request, {
      method: "post",
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (data.errorcode == 0) {
      ret_val = data.result[0][0];
      return ret_val;
    } else {
      console.log("API returns error code:", data.errorcode);
    }
  } catch (error) {
    console.log("Error call API:", error);
  }
}

export async function gpio_output_schedule(
  pin_id,
  level,
  start_time,
  interval,
  repeat
) {
  let request = "/hardware/operation";
  var start_time_str =
    start_time.getFullYear() +
    "-" +
    (start_time.getMonth() + 1) +
    "-" +
    start_time.getDate() +
    "T" +
    start_time.getHours() +
    ":" +
    start_time.getMinutes() +
    ":" +
    start_time.getSeconds();
  var body = {
    event: "schedule",
    start: start_time_str,
    repeat: repeat,
    actions: [["gpio", pin_id, "output", level]],
  };

  if (interval != null) {
    // if no interval, give it default 10d
    // not setting interval could result in the task get removed unexpectedly.
    body["interval"] = interval;
  }

  try {
    const response = await fetch(request, {
      method: "post",
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (data.errorcode == 0) {
      ret_val = data.result[0][0];
      return ret_val;
    } else {
      console.log("API returns error code:", data.errorcode);
    }
  } catch (error) {
    console.log("Error call API:", error);
  }
}

export async function readAdc(pin_id) {
  let request = "/hardware/operation";
  let body = {
    event: "now",
    actions: [["adc", pin_id, "3.1v"]],
  };

  try {
    const response = await fetch(request, {
      method: "post",
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (data.errorcode == 0) {
      adc_val = data.result[0][0];
      return adc_val;
    } else {
      console.log("API returns error code:", data.errorcode);
    }
  } catch (error) {
    console.log("Error call API:", error);
  }
}

export async function setupAdvanceOutput(
  pin_id,
  zero_total_duration_us,
  zero_high_duration_us,
  one_total_duration_us,
  one_high_duration_us
) {
  let request = "/hardware/operation";
  let body = {
    event: "now",
    actions: [
      [
        "advance_output",
        pin_id,
        "setup",
        "us",
        "zero",
        zero_total_duration_us,
        zero_high_duration_us,
        "one",
        one_total_duration_us,
        one_high_duration_us,
      ],
    ],
  };
  try {
    const response = await fetch(request, {
      method: "post",
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (data.errorcode != 0) {
      console.log("API returns error code:", data.errorcode);
    }
  } catch (error) {
    console.log("Error call API:", error);
  }
}

export async function startAdvanceOutput(pin_id, cycle, data) {
  let request = "/hardware/operation";
  let body = {
    event: "now",
    cycle: cycle,
    actions: [["advance_output", pin_id, "start", data.length, ...data]],
  };
  try {
    const response = await fetch(request, {
      method: "post",
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (data.errorcode != 0) {
      console.log("API returns error code:", data.errorcode);
    }
  } catch (error) {
    console.log("Error call API:", error);
  }
}

export async function syncPwmReq(pin_id, operations) {
  let request = "/hardware/operation";
  let body = {
    event: "now",
    actions: [],
  };
  for (let i = 0; i < operations.length; i++) {
    if (operations[i].frequency != 0) {
      body["actions"].push([
        "pwm",
        0,
        operations[i].frequency,
        operations[i].duration,
        "sync",
        parseInt(pin_id),
        512,
      ]);
    } else {
      body["actions"].push([
        "delay",
        0,
        "ms",
        Math.floor(operations[i].duration * 1000),
      ]);
    }
  }
  try {
    const response = await fetch(request, {
      method: "post",
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (data.errorcode != 0) {
      console.log("API returns error code:", data.errorcode);
    }
  } catch (error) {
    console.log("Error call API:", error);
  }
}

export function gpioHardwareOperation(opers, pin, dir, val) {
  let ret = 0;
  if (opers.constructor !== Array) {
    ret = -1;
  } else if (pin == undefined || pin < 0 || pin >= 20) {
    ret = -1;
  } else if (dir != "input" && dir != "output") {
    ret = -1;
  } else {
    if (dir === "input") {
      if (val != 0 && val != 1) {
        ret = -1;
      } else {
        opers.push(["gpio", pin, "input", val]);
      }
    } else {
      // output
      if (val != 0 && val != 1 && val != 2) {
        ret = -1;
      } else {
        opers.push(["gpio", pin, "output", val]);
      }
    }
  }
  return ret;
}

export function spiHardwareOperation(
  opers,
  spi_module_index,
  mosi_pin,
  miso_pin,
  clock_pin,
  cs_pin,
  speed_khz,
  mode,
  num_bytes_skip_rcv,
  num_bytes_rcv,
  ...transmit_data
) {
  let ret = 0;
  if (opers.constructor !== Array) {
    ret = -1;
  } else if (spi_module_index != 0) {
    ret = -1;
  } else if (mosi_pin == undefined || clock_pin == undefined) {
    ret = -1;
  } else if (!speed_khz || speed_khz > 1000 || speed_khz <= 0) {
    ret = -1;
  } else if (mode < 0 || mode > 3) {
    ret = -1;
  } else {
    if (miso_pin == undefined) {
      miso_pin = -1;
    }
    if (cs_pin == undefined) {
      cs_pin = -1;
    }
    let spi_oper = [
      "spi",
      spi_module_index,
      mosi_pin,
      miso_pin,
      clock_pin,
      cs_pin,
      speed_khz,
      mode,
      num_bytes_skip_rcv,
      num_bytes_rcv,
      transmit_data.length,
    ];
    spi_oper = spi_oper.concat(transmit_data);
    opers.push(spi_oper);
  }
  return ret;
}

export function i2cReadHardwareOperation(
  opers,
  sda_pin,
  scl_pin,
  speed_khz,
  device_addr,
  reg_addr1,
  reg_addr2 = -1,
  read_len = 0
) {
  let ret = 0;
  if (opers.constructor !== Array) {
    ret = -1;
  } else if (
    sda_pin === undefined ||
    scl_pin === undefined ||
    speed_khz === undefined ||
    device_addr === undefined ||
    reg_addr1 == undefined
  ) {
    ret = -1;
  } else if (device_addr >= 0x80) {
    ret = -1;
  } else if (reg_addr1 >= 256) {
    ret = -1;
  } else {
    let i2c_oper = [
      "i2c",
      0,
      "read",
      sda_pin,
      scl_pin,
      speed_khz,
      device_addr,
      reg_addr1,
      reg_addr2,
      read_len,
    ];
    opers.push(i2c_oper);
  }
  return ret;
}

export function i2cWriteHardwareOperation(
  opers,
  sda_pin,
  scl_pin,
  speed_khz,
  device_addr,
  reg_addr1,
  reg_addr2 = -1,
  ...write_data
) {
  let ret = 0;
  if (opers.constructor !== Array) {
    ret = -1;
  } else if (
    sda_pin === undefined ||
    scl_pin === undefined ||
    speed_khz === undefined ||
    device_addr === undefined ||
    reg_addr1 == undefined
  ) {
    ret = -1;
  } else if (device_addr >= 0x80) {
    ret = -1;
  } else if (reg_addr1 >= 256) {
    ret = -1;
  } else {
    let i2c_oper = [
      "i2c",
      0,
      "write",
      sda_pin,
      scl_pin,
      speed_khz,
      device_addr,
      reg_addr1,
      reg_addr2,
      write_data.length,
    ];
    i2c_oper = i2c_oper.concat(write_data);
    opers.push(i2c_oper);
  }
  return ret;
}

export function captureRegularHardwareOperation(
  opers,
  pin_id,
  max_data_bytes,
  time_unit,
  capture_condition,
  capture_time_duration
) {
  let ret = 0;
  if (opers.constructor !== Array) {
    ret = -1;
  } else if (pin_id == undefined || pin_id < 0 || pin_id >= 20) {
    ret = -1;
  } else if (max_data_bytes <= 0) {
    ret = -1;
  } else if (time_unit !== "ms" && time_unit !== "us") {
    ret = -1;
  } else if (
    capture_condition !== "positive" &&
    capture_condition !== "negative" &&
    capture_condition !== "change"
  ) {
    ret = -1;
  } else if (typeof capture_time_duration !== "number") {
    ret = -1;
  } else {
    const capture_oper = [
      "capture",
      pin_id,
      max_data_bytes,
      time_unit,
      capture_condition,
      capture_time_duration,
    ];
    opers.push(capture_oper);
  }
  return ret;
}

export function pwmAsyncHardwareOperation(
  opers,
  pwm_id,
  freq,
  duration,
  mode,
  pwm_1_pin,
  pwm_1_duty_cycle,
  pwm_2_pin,
  pwm_2_duty_cycle,
  pwm_3_pin,
  pwm_3_duty_cycle
) {
  let ret = 0;
  if (opers.constructor != Array) {
    ret = -1;
  } else if (pwm_id == undefined || pwm_id < 0 || pwm_id > 3) {
    ret = -1;
  } else if (freq < 1 || freq > 50000) {
    ret = -1;
  } else if (typeof duration !== "number") {
    ret = -1;
  } else if (mode !== "sync" && mode !== "async") {
    ret = -1;
  } else if (pwm_1_pin == undefined || pwm_1_pin < 0 || pwm_1_pin >= 20) {
    ret = -1;
  } else if (
    pwm_1_duty_cycle == undefined ||
    pwm_1_duty_cycle <= 0 ||
    pwm_1_duty_cycle >= 1024
  ) {
    ret = -1;
  } else {
    const pwm_oper = [
      "pwm",
      pwm_id,
      freq,
      duration,
      mode,
      pwm_1_pin,
      pwm_1_duty_cycle,
    ];
    if (pwm_2_pin !== undefined) {
      if (
        pwm_2_duty_cycle == undefined ||
        pwm_2_duty_cycle <= 0 ||
        pwm_2_duty_cycle >= 1024
      ) {
        ret = -1;
      } else {
        pwm_oper.push(pwm_2_pin, pwm_2_duty_cycle);
      }
    }

    if (pwm_3_pin !== undefined) {
      if (
        pwm_3_duty_cycle == undefined ||
        pwm_3_duty_cycle <= 0 ||
        pwm_3_duty_cycle >= 1024
      ) {
        ret = -1;
      } else {
        pwm_oper.push(pwm_3_pin, pwm_3_duty_cycle);
      }
    }

    if (ret == 0) {
      opers.push(pwm_oper);
    }
  }
  return ret;
}

export function delayHardwareOperation(opers, time_unit, delay_value) {
  let ret = 0;
  if (opers.constructor != Array) {
    ret = -1;
  } else if (time_unit != "s" && time_unit != "ms" && time_unit != "us") {
    ret = -1;
  } else if (delay_value <= 0 || delay_value > 65535) {
    ret = -1;
  } else {
    const delay_oper = ["delay", 0, time_unit, delay_value];
    opers.push(delay_oper);
  }
  return ret;
}

export function advanceOutputSetupHardwareOperation(
  opers,
  pin_id,
  time_unit,
  logic_0_duration,
  logic_0_duty,
  logic_1_duration,
  logic_1_duty
) {
  let ret = 0;
  if (opers.constructor != Array) {
    ret = -1;
  } else if (pin_id == undefined || pin_id < 0 || pin_id > 19) {
    ret = -1;
  } else if (time_unit != "ms" && time_unit != "us") {
    ret = -1;
  } else {
    const adv_setup = [
      "advance_output",
      pin_id,
      "setup",
      time_unit,
      "zero",
      logic_0_duration,
      logic_0_duty,
      "one",
      logic_1_duration,
      logic_1_duty,
    ];
    opers.push(adv_setup);
  }
  return ret;
}

export function advanceOutputStartHardwareOperation(opers, pin_id, data) {
  let ret = 0;
  if (opers.constructor != Array) {
    ret = -1;
  } else if (pin_id == undefined || pin_id < 0 || pin_id > 19) {
    ret = -1;
  } else {
    let adv_start = ["advance_output", pin_id, "start", data.length];
    adv_start = adv_start.concat(data);
    opers.push(adv_start);
  }
  return ret;
}

export function uartHardwareOperation(
  opers,
  tx_pin,
  rx_pin,
  wait_time,
  rcv_num_byte,
  transmit_data = [],
  speed = "9.6k",
  odd_even_bit = "disabled",
  stop_bit = 1,
  data_size = 8,
  uart_id = 0
) {
  let ret = 0;
  if (opers.constructor != Array) {
    ret = -1;
  } else if (tx_pin == undefined || tx_pin < 0 || tx_pin > 19) {
    ret = -1;
  } else if (rx_pin == undefined || rx_pin < 0 || rx_pin > 19) {
    ret = -1;
  } else if (Number.isInteger(wait_time) === false) {
    ret = -1;
  } else if (Number.isInteger(rcv_num_byte) === false) {
    ret = -1;
  } else if (transmit_data.constructor != Array) {
    ret = -1;
  } else if (speed !== "9.6k" && speed !== "38.4k" && speed !== "115.2k") {
    ret = -1;
  } else if (
    odd_even_bit !== "disabled" &&
    odd_even_bit !== "even" &&
    odd_even_bit !== "odd"
  ) {
    ret = -1;
  } else if (stop_bit !== 1 && stop_bit !== 2) {
    ret = -1;
  } else if (
    data_size !== 8 &&
    data_size !== 7 &&
    data_size !== 6 &&
    data_size !== 5
  ) {
    ret = -1;
  } else if (uart_id > 2) {
    ret = -1;
  } else {
    let uart_oper = [
      "uart",
      uart_id,
      tx_pin,
      rx_pin,
      speed,
      odd_even_bit,
      stop_bit,
      data_size,
      wait_time,
      rcv_num_byte,
      transmit_data.length,
      ...transmit_data,
    ];
    opers.push(uart_oper);
  }
  return ret;
}

export function constructNowEvent(opers, cycle = undefined) {
  let now_event;
  if (cycle === undefined) {
    now_event = {
      event: "now",
      actions: opers,
    };
  } else if (typeof cycle === "number") {
    now_event = {
      event: "now",
      actions: opers,
      cycle: cycle,
    };
  }
  return now_event;
}

export async function postHardwareOperation(event, external_url = undefined) {
  if (external_url == undefined) {
    let request = "/hardware/operation";
    try {
      const response = await fetch(request, {
        method: "post",
        body: JSON.stringify(event),
      });
      return await response.json();
    } catch (error) {
      console.log("Error call API:", error);
    }
  } else {
    // used in the testing mode
    let request = external_url + "/hardware/operation";
    try {
      const response = await fetch(request, {
        method: "post",
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        mode: "no-cors",
        body: JSON.stringify(event),
      });
      return await response.json();
    } catch (error) {
      console.log("Error call API:", error);
    }
  }
}

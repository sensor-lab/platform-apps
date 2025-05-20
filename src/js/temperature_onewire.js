import {
  delayHardwareOperation,
  onewireHardwareOperation,
  constructNowEvent,
  postHardwareOperation,
} from "./api";

const ENVIRONMENT_UPDATE_SEC = 3;

var pin_id = undefined;
var timer_id = undefined;

async function getDs18b20Sensor() {
  const opers = [];
  onewireHardwareOperation(opers, pin_id, "reset");
  onewireHardwareOperation(opers, pin_id, "write", 2, [204, 68]);
  delayHardwareOperation(opers, "ms", 500);
  onewireHardwareOperation(opers, pin_id, "reset");
  onewireHardwareOperation(opers, pin_id, "write", 2, [204, 190]);
  onewireHardwareOperation(opers, pin_id, "read", 9);
  const now_event = constructNowEvent(opers);
  const response = await postHardwareOperation(now_event);
  let reg_data = response["result"][5][0] + (response["result"][5][1] << 8);
  let negative = 0;
  if (reg_data > 2048) {
    negative = 1;
  }

  const temperature = negative
    ? -((((~reg_data & 0xffff) + 1) >> 4) + (reg_data & 0xf) * 0.0625)
    : ((reg_data & 0x7f0) >> 4) + (reg_data & 0xf) * 0.0625;

  document.getElementById("temp_value").innerHTML = temperature;
}

const search_devices = async () => {
  const opers = [];
  onewireHardwareOperation(opers, pin_id, "search");
  const now_event = constructNowEvent(opers);
  const response = await postHardwareOperation(now_event);
  const num_of_devices = response["result"][0][0];
  const card_body = document.getElementById("cardBody");
  card_body.innerHTML = "";
  document.getElementById("deviceCard").classList.remove("d-none");
  if (num_of_devices > 0) {
    const divs = [];
    const div = document.createElement("div");
    div.classList.add("card-title");
    div.innerHTML = `共检测到${num_of_devices}个设备，设备地址：`;
    divs.push(div);
    for (let i = 0; i < num_of_devices; i++) {
      const addr =
        BigInt(response["result"][0][1 + i * 8]) +
        (BigInt(response["result"][0][1 + i * 8 + 1]) << 8n) +
        (BigInt(response["result"][0][1 + i * 8 + 2]) << 16n) +
        (BigInt(response["result"][0][1 + i * 8 + 3]) << 24n) +
        (BigInt(response["result"][0][1 + i * 8 + 4]) << 32n) +
        (BigInt(response["result"][0][1 + i * 8 + 5]) << 40n) +
        (BigInt(response["result"][0][1 + i * 8 + 6]) << 48n) +
        (BigInt(response["result"][0][1 + i * 8 + 7]) << 56n);
      const addr_div = document.createElement("div");
      addr_div.classList.add("card-text");
      addr_div.innerHTML = addr.toString(16);
      divs.push(addr_div);
    }
    card_body.append(...divs);
    await getDs18b20Sensor();
    timer_id = setInterval(getDs18b20Sensor, ENVIRONMENT_UPDATE_SEC * 1000);
  } else {
    const div = document.createElement("div");
    div.classList.add("card-title");
    div.innerHTML = "未检测到设备，请检查引脚和连接";
    card_body.append(div);
    if (timer_id !== undefined) {
      clearInterval(timer_id);
      timer_id = undefined;
    }
    document.getElementById("temp_value").innerHTML = "---";
  }
};

document
  .getElementById("connectedPin")
  .addEventListener("change", async function (event) {
    if (event.target.value !== -1) {
      pin_id = parseInt(event.target.value);
      await search_devices();
    }
  });

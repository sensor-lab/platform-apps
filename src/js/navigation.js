import {
  uartHardwareOperation,
  constructNowEvent,
  postHardwareOperation,
} from 'sensorsparks.api';

const EXPECT_NUM_BYTES_RCV = 800;
const WAITING_TIME_SEC = 3;

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

function utcTimeConstructor(date, time) {
  const year = (parseInt(date) % 100) + 2000;
  const monthIndex = parseInt(date / 100) & (100 - 1);
  const day = parseInt(date / 10000) % 100;
  const hour = parseInt(time / 10000);
  const minute = parseInt(time / 100) % 100;
  const second = parseInt(time) % 100;
  return new Date(Date.UTC(year, monthIndex, day, hour, minute, second));
}

function formatDateToChinese(date) {
  const year = date.getUTCFullYear(); // Get UTC year
  const month = date.getUTCMonth() + 1; // Get UTC month (0-indexed, so add 1)
  const day = date.getUTCDate(); // Get UTC day

  const hour = date.getUTCHours(); // Get UTC hour
  const minute = date.getUTCMinutes(); // Get UTC minute
  const second = date.getUTCSeconds(); // Get UTC second

  // Format the date with Chinese characters
  return `${year}年${month}月${day}日 ${hour}时${minute}分${second}秒 UTC`;
}

function constructLatitude(latitude, n_s_indicator) {
  const degrees = parseInt(latitude / 100);
  const minutes = (latitude - degrees * 100) / 60;
  const final_val =
    n_s_indicator.toUpperCase() === "S"
      ? -degrees - minutes
      : degrees + minutes;
  return final_val;
}

function constructLongitude(longitude, e_w_indicator) {
  const degrees = parseInt(longitude / 100);
  const minutes = (longitude - degrees * 100) / 60;
  const final_val =
    e_w_indicator.toUpperCase() === "W"
      ? -degrees - minutes
      : degrees + minutes;
  return final_val;
}

function convertKnotsToKmHour(knots) {
  const CONVERSION_PARAM = 1.852;
  return CONVERSION_PARAM * knots;
}

function convertKnotsToMilesHour(knots) {
  const CONVERSIOn_PARAM = 1.15078;
  return CONVERSIOn_PARAM * knots;
}

class ProtocolParser {
  constructor(name, parser) {
    this.name = name;
    this.parser = parser;
  }
}

const protocol_parsers = [
  new ProtocolParser("GGA", ggaProtocolParser),
  new ProtocolParser("RMC", rmcProtocolParser),
];

function ggaProtocolParser(data) {
  console.log(`gga parser: ${data}`);
}

function rmcProtocolParser(data) {
  const rmc_data = data.split(",");
  if (rmc_data.length == 13) {
    // a valid rmc data
    const utc_time = rmc_data[1];
    const status = rmc_data[2];
    const latitude = rmc_data[3];
    const n_s_indicator = rmc_data[4];
    const longitude = rmc_data[5];
    const e_w_indicator = rmc_data[6];
    const speed_over_ground = rmc_data[7];
    const course_over_ground = rmc_data[8];
    const utc_date = rmc_data[9];
    if (status === "A") {
      //   console.log(
      //     `utc_time: ${utc_time}, status: ${status}, latitude: ${latitude}, n_s_indicator: ${n_s_indicator}, longitude: ${longitude},e_w_indicator: ${e_w_indicator}, speed_over_ground: ${speed_over_ground}, course_over_ground: ${course_over_ground}, utc_date: ${utc_date}`
      //   );
      document.getElementById("statusVal").innerHTML = "正常";
      document.getElementById("positionDetails").style.display = "block";
      document.getElementById("positionDisplay").style.display = "block";
      document.getElementById("utcTimeVal").innerHTML = formatDateToChinese(
        utcTimeConstructor(utc_date, utc_time)
      );
      document.getElementById("latitudeVal").innerHTML = constructLatitude(
        latitude,
        n_s_indicator
      );

      document.getElementById("longitudeVal").innerHTML = constructLongitude(
        longitude,
        e_w_indicator
      );

      document.getElementById("speedVal").innerHTML = `${convertKnotsToKmHour(
        speed_over_ground
      )}千米/小时，${convertKnotsToMilesHour(speed_over_ground)}迈/小时`;

      if (course_over_ground) {
        if (course_over_ground < 45 || course_over_ground > 315) {
          // head to north
          document.getElementById("longitudeVal").innerHTML += "，向北前进";
        } else if (course_over_ground < 135) {
          // head to east
          document.getElementById("longitudeVal").innerHTML += "，向东前进";
        } else if (course_over_ground < 225) {
          // head to south
          document.getElementById("longitudeVal").innerHTML += "，向南前进";
        } else {
          // head to west
          document.getElementById("longitudeVal").innerHTML += "，向西前进";
        }
      }
    } else {
      addStatusMsg("导航模块尚未准备好，请等待一段时候后重试。");
      window.scrollTo(0, 0);
      document.getElementById("statusVal").innerHTML = "警告";
      document.getElementById("positionDetails").style.display = "none";
      document.getElementById("positionDisplay").style.display = "block";
    }
  }
}

function parseNmeaMessage(data) {
  for (let i = 0; i < protocol_parsers.length; i++) {
    const reg_exp = new RegExp(`^\\$..${protocol_parsers[i].name}(.*)`);
    if (data.search(reg_exp) !== -1) {
      protocol_parsers[i].parser(data);
    }
  }
}

var tx_pin = -1;
var rx_pin = -1;

if (localStorage.getItem("navigation_tx_pin")) {
  tx_pin = parseInt(localStorage.getItem("navigation_tx_pin"));
  rx_pin = tx_pin + 1;
  document.getElementById("pinSelect").value = tx_pin;
  document.getElementById("txpin").innerHTML = tx_pin;
  document.getElementById("rxpin").innerHTML = rx_pin;
  document.getElementById("pinDisplay").style.display = "block";
}

async function fetchNavigationInfo() {
  const opers = [];
  uartHardwareOperation(
    opers,
    rx_pin,
    tx_pin,
    WAITING_TIME_SEC,
    EXPECT_NUM_BYTES_RCV
  );
  const event = constructNowEvent(opers);
  const ret = await postHardwareOperation(event);
  const nmea_array = ret["result"][0];
  if (nmea_array.length == 2 && nmea_array[0] === "failed") {
    addErrorMsg("未收到导航模块信息，请检查连接！");
  } else {
    const str = String.fromCharCode(...nmea_array);
    const nmea_messages = str.split("\r\n");
    for (let i = 0; i < nmea_messages.length; i++) {
      parseNmeaMessage(nmea_messages[i]);
    }
  }
}

document
  .getElementById("pinSelect")
  .addEventListener("change", function (element) {
    tx_pin = parseInt(
      element.target.options[element.target.selectedIndex].value
    );
    if (tx_pin == -1) {
      addErrorMsg("请选择正确的连接引脚");
      document.getElementById("pinDisplay").style.display = "none";
    } else {
      rx_pin = tx_pin + 1;
      document.getElementById("txpin").innerHTML = tx_pin;
      document.getElementById("rxpin").innerHTML = rx_pin;
      document.getElementById("pinDisplay").style.display = "block";
      removeErrorMsg();
      localStorage.setItem("navigation_tx_pin", tx_pin);
    }
  });

document
  .getElementById("singleReadNmeaData")
  .addEventListener("click", async function () {
    await fetchNavigationInfo();
  });

document
  .getElementById("countinuousReadNmeaData")
  .addEventListener("click", async function () {
    setInterval(async function () {
      await fetchNavigationInfo();
    }, 5000);
  });

import {
  gpioHardwareOperation,
  spiHardwareOperation,
  constructNowEvent,
  postHardwareOperation,
} from 'sensorsparks.api';

var home_ser_pin = undefined;
var home_srclk_pin = undefined;
var home_rclk_pin = undefined;
var home_srclr_pin = undefined;
var away_ser_pin = undefined;
var away_srclk_pin = undefined;
var away_rclk_pin = undefined;
var away_srclr_pin = undefined;

if (localStorage.getItem("homeserpin") && localStorage.getItem("awayserpin")) {
  home_ser_pin = parseInt(localStorage.getItem("homeserpin"));
  home_srclk_pin = home_ser_pin + 1;
  home_rclk_pin = home_ser_pin + 2;
  home_srclr_pin = home_ser_pin + 3;

  away_ser_pin = parseInt(localStorage.getItem("awayserpin"));
  away_srclk_pin = away_ser_pin + 1;
  away_rclk_pin = away_ser_pin + 2;
  away_srclr_pin = away_ser_pin + 3;

  document.getElementById("homeSegmentPinSelect").value = home_ser_pin;
  document.getElementById("awaySegmentPinSelect").value = away_ser_pin;
}

//Selector
let home_score_ele = document.querySelector(".homeScore");
let away_score_ele = document.querySelector(".awayScore");
var start_display = 0;

//Initialize
home_score_ele.innerHTML = 0;
away_score_ele.innerHTML = 0;
var app_scores = [
  Number(home_score_ele.innerHTML),
  Number(away_score_ele.innerHTML),
];

const DISPLAY_ZERO = 129;
const DISPLAY_ONE = 237;
const DISPLAY_TWO = 67;
const DISPLAY_THREE = 73;
const DISPLAY_FOUR = 45;
const DISPLAY_FIVE = 25;
const DISPLAY_SIX = 17;
const DISPLAY_SEVEN = 205;
const DISPLAY_EIGHT = 1;
const DISPLAY_NINE = 9;
const MAX_NUMBER = 1000;
const DIGITS_PER_NUMBER = 3;
const SEVEN_SEGMENTS_TURN_OFF_VAL = 255;

function push_number_digit(number, action) {
  switch (number) {
    default:
    case 0:
      action.push(DISPLAY_ZERO);
      break;
    case 1:
      action.push(DISPLAY_ONE);
      break;
    case 2:
      action.push(DISPLAY_TWO);
      break;
    case 3:
      action.push(DISPLAY_THREE);
      break;
    case 4:
      action.push(DISPLAY_FOUR);
      break;
    case 5:
      action.push(DISPLAY_FIVE);
      break;
    case 6:
      action.push(DISPLAY_SIX);
      break;
    case 7:
      action.push(DISPLAY_SEVEN);
      break;
    case 8:
      action.push(DISPLAY_EIGHT);
      break;
    case 9:
      action.push(DISPLAY_NINE);
      break;
  }
}

function addErrorMsg(message) {
  document.getElementById("errorMsg").innerHTML = message;
  document.getElementById("errorMsg").classList.remove("d-none");
}

function removeErrorMsg() {
  document.getElementById("errorMsg").classList.add("d-none");
}

async function seven_segment_display(numbers) {
  var hardware_opers = [];
  const home_score = numbers[1];
  const away_score = numbers[0];

  if (
    home_score >= MAX_NUMBER ||
    home_score < 0 ||
    away_score >= MAX_NUMBER ||
    away_score < 0
  ) {
    throw "分数不能大于" + MAX_NUMBER + "，且不能小于0";
  }

  if (home_ser_pin === away_ser_pin) {
    // home segment display and away segment display serial connected on the same platform header
    let spi_transmit_data = [];
    numbers.forEach((number) => {
      let high_digit = parseInt(number / 100);
      let mid_digit = parseInt((number / 10) % 10);
      let low_digit = parseInt(number % 10);
      push_number_digit(low_digit, spi_transmit_data);
      if (high_digit != 0) {
        push_number_digit(mid_digit, spi_transmit_data);
        push_number_digit(high_digit, spi_transmit_data);
      } else if (mid_digit != 0) {
        push_number_digit(mid_digit, spi_transmit_data);
        spi_transmit_data.push(SEVEN_SEGMENTS_TURN_OFF_VAL);
      } else {
        spi_transmit_data.push(SEVEN_SEGMENTS_TURN_OFF_VAL);
        spi_transmit_data.push(SEVEN_SEGMENTS_TURN_OFF_VAL);
      }
    });
    gpioHardwareOperation(hardware_opers, home_srclr_pin, "output", 0);
    gpioHardwareOperation(hardware_opers, home_srclr_pin, "output", 1);
    spiHardwareOperation(
      hardware_opers,
      0,
      home_ser_pin,
      undefined,
      home_srclk_pin,
      undefined,
      500,
      0,
      0,
      0,
      ...spi_transmit_data
    );
    gpioHardwareOperation(hardware_opers, home_rclk_pin, "output", 1);
    gpioHardwareOperation(hardware_opers, home_rclk_pin, "output", 0);

    const event = constructNowEvent(hardware_opers);
    await postHardwareOperation(event);
    // console.log(JSON.stringify(event));
  } else {
    let spi_transmit_data = [];
    let high_digit = parseInt(home_score / 100);
    let mid_digit = parseInt((home_score / 10) % 10);
    let low_digit = parseInt(home_score % 10);
    push_number_digit(low_digit, spi_transmit_data);
    if (high_digit != 0) {
      push_number_digit(mid_digit, spi_transmit_data);
      push_number_digit(high_digit, spi_transmit_data);
    } else if (mid_digit != 0) {
      push_number_digit(mid_digit, spi_transmit_data);
      spi_transmit_data.push(SEVEN_SEGMENTS_TURN_OFF_VAL);
    } else {
      spi_transmit_data.push(SEVEN_SEGMENTS_TURN_OFF_VAL);
      spi_transmit_data.push(SEVEN_SEGMENTS_TURN_OFF_VAL);
    }
    gpioHardwareOperation(hardware_opers, home_srclr_pin, "output", 0);
    gpioHardwareOperation(hardware_opers, home_srclr_pin, "output", 1);
    spiHardwareOperation(
      hardware_opers,
      0,
      home_ser_pin,
      undefined,
      home_srclk_pin,
      undefined,
      500,
      0,
      0,
      0,
      ...spi_transmit_data
    );
    gpioHardwareOperation(hardware_opers, home_rclk_pin, "output", 1);
    gpioHardwareOperation(hardware_opers, home_rclk_pin, "output", 0);

    spi_transmit_data = [];
    high_digit = parseInt(away_score / 100);
    mid_digit = parseInt((away_score / 10) % 10);
    low_digit = parseInt(away_score % 10);
    push_number_digit(low_digit, spi_transmit_data);
    if (high_digit != 0) {
      push_number_digit(mid_digit, spi_transmit_data);
      push_number_digit(high_digit, spi_transmit_data);
    } else if (mid_digit != 0) {
      push_number_digit(mid_digit, spi_transmit_data);
      spi_transmit_data.push(SEVEN_SEGMENTS_TURN_OFF_VAL);
    } else {
      spi_transmit_data.push(SEVEN_SEGMENTS_TURN_OFF_VAL);
      spi_transmit_data.push(SEVEN_SEGMENTS_TURN_OFF_VAL);
    }
    gpioHardwareOperation(hardware_opers, away_srclr_pin, "output", 0);
    gpioHardwareOperation(hardware_opers, away_srclr_pin, "output", 1);
    spiHardwareOperation(
      hardware_opers,
      0,
      away_ser_pin,
      undefined,
      away_srclk_pin,
      undefined,
      500,
      0,
      0,
      0,
      ...spi_transmit_data
    );
    gpioHardwareOperation(hardware_opers, away_rclk_pin, "output", 1);
    gpioHardwareOperation(hardware_opers, away_rclk_pin, "output", 0);

    const event = constructNowEvent(hardware_opers);
    await postHardwareOperation(event);
  }
}

async function changeScore(side, value) {
  let new_scores = app_scores.map((score) => score);
  if (start_display == 0) {
    addErrorMsg("请选择主队和客队的数码管连接引脚，并点击开始按钮。");
  } else {
    if (side === "home") {
      new_scores[1] += value;
    } else {
      new_scores[0] += value;
    }
    await seven_segment_display(new_scores);
    app_scores = new_scores;
    home_score_ele.innerHTML = app_scores[1];
    away_score_ele.innerHTML = app_scores[0];
  }
}

async function resetScores() {
  if (start_display == 0) {
    addErrorMsg("请选择主队和客队的数码管连接引脚，并点击开始按钮。");
  } else {
    await seven_segment_display([0, 0]);
    app_scores = [0, 0];
    home_score_ele.innerHTML = app_scores[1];
    away_score_ele.innerHTML = app_scores[0];
  }
}

document
  .getElementById("startScore")
  .addEventListener("click", async function (event) {
    if (home_ser_pin == undefined) {
      addErrorMsg("请选择主队数码管连接引脚。");
    } else if (away_ser_pin == undefined) {
      addErrorMsg("请选择客队数码管连接引脚。");
    } else {
      start_display = 1;
      removeErrorMsg();
      await seven_segment_display(app_scores);
      home_score_ele.innerHTML = app_scores[1];
      away_score_ele.innerHTML = app_scores[0];
    }
  });

document
  .getElementById("homeSegmentPinSelect")
  .addEventListener("change", function (event) {
    home_ser_pin = parseInt(event.target.value);
    home_srclk_pin = home_ser_pin + 1;
    home_rclk_pin = home_ser_pin + 2;
    home_srclr_pin = home_ser_pin + 3;
    localStorage.setItem("homeserpin", home_ser_pin);
  });

document
  .getElementById("awaySegmentPinSelect")
  .addEventListener("change", function (event) {
    away_ser_pin = parseInt(event.target.value);
    away_srclk_pin = away_ser_pin + 1;
    away_rclk_pin = away_ser_pin + 2;
    away_srclr_pin = away_ser_pin + 3;
    localStorage.setItem("awayserpin", away_ser_pin);
  });

document
  .getElementById("resetScore")
  .addEventListener("click", async function () {
    await resetScores();
  });
document
  .getElementById("addOneHome")
  .addEventListener("click", async function () {
    await changeScore("home", 1);
  });
document
  .getElementById("addTwoHome")
  .addEventListener("click", async function () {
    await changeScore("home", 2);
  });
document
  .getElementById("addThreeHome")
  .addEventListener("click", async function () {
    await changeScore("home", 3);
  });
document
  .getElementById("minusOneHome")
  .addEventListener("click", async function () {
    await changeScore("home", -1);
  });
document
  .getElementById("addOneAway")
  .addEventListener("click", async function () {
    await changeScore("away", 1);
  });
document
  .getElementById("addTwoAway")
  .addEventListener("click", async function () {
    await changeScore("away", 2);
  });
document
  .getElementById("addThreeAway")
  .addEventListener("click", async function () {
    await changeScore("away", 3);
  });
document
  .getElementById("minusOneAway")
  .addEventListener("click", async function () {
    await changeScore("away", -1);
  });

import {
  delayHardwareOperation,
  captureRegularHardwareOperation,
  gpioHardwareOperation,
  constructNowEvent,
  postHardwareOperation,
} from "./api";

const State = {
  START: "start",
  TEST_RIGHT: "test_right",
  TEST_LEFT: "test_left",
  SHOW_RESULT: "show_result",
};

const LedState = {
  ON: 0,
  OFF: 1,
};

const INITIAL_DELAY_RANGE_MILLIS = [2000, 6000];
const TEST_COUNTER_MAX = 10;
const COMPLETE_INDICATE_DURATION_SEC = 2;

var game_state = State.START;
const response_result = { left: [], right: [] };
var counter = 0;

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

function getInitialDelay() {
  const val = Math.floor(
    Math.random() *
      (INITIAL_DELAY_RANGE_MILLIS[1] - INITIAL_DELAY_RANGE_MILLIS[0])
  );
  return INITIAL_DELAY_RANGE_MILLIS[0] + val;
}

function clearResponseResult() {
  response_result.left = [];
  response_result.right = [];
}

function pushResponseResult(state, counter, response_ms) {
  if (state === State.TEST_RIGHT) {
    const right_result = document.getElementById("rightResult").innerHTML;
    response_result.right.push(response_ms);
    const data = `<tr><th scope="row">${
      counter + 1
    }</th><td>${response_ms}</td></tr>`;
    document.getElementById("rightResult").innerHTML = right_result + data;
  } else if (state === State.TEST_LEFT) {
    response_result.left.push(response_ms);
    const left_result = document.getElementById("leftResult").innerHTML;
    const data = `<tr><th scope="row">${
      counter + 1
    }</th><td>${response_ms}</td></tr>`;
    document.getElementById("leftResult").innerHTML = left_result + data;
  } else {
  }
}

function calculateStatistics() {
  let right_valid_count = 0;
  let right_sum = 0;
  let right_max = response_result.right[0];
  let right_min = response_result.right[0];
  let left_valid_count = 0;
  let left_sum = 0;
  let left_max = response_result.left[0];
  let left_min = response_result.left[0];
  for (let i = 0; i < response_result.right.length; i++) {
    if (response_result.right[i] != -1) {
      right_sum += response_result.right[i];
      if (response_result.right[i] > right_max) {
        right_max = response_result.right[i];
      }
      if (response_result.right[i] < right_min) {
        right_min = response_result.right[i];
      }
      right_valid_count++;
    }
  }
  for (let i = 0; i < response_result.left.length; i++) {
    if (response_result.left[i] != -1) {
      left_sum += response_result.left[i];
      if (response_result.left[i] > left_max) {
        left_max = response_result.left[i];
      }
      if (response_result.left[i] < left_min) {
        left_min = response_result.left[i];
      }
      left_valid_count++;
    }
  }
  document.getElementById("testResultData").innerHTML = `右手反应平均速度为${
    right_sum / right_valid_count
  }毫秒,最快反应速度为${right_min}毫秒,最慢反应速度为${right_max}毫秒.左手反应平均速度为${
    left_sum / left_valid_count
  }毫秒,最快反应速度为${left_min}毫秒,最慢反应速度为${left_max}毫秒.`;
}

async function captureResponseTime(state) {
  var response_time_ms = -1;
  if (state === State.TEST_RIGHT) {
    const opers = [];
    const initial_delay = getInitialDelay();
    delayHardwareOperation(opers, "ms", initial_delay);
    gpioHardwareOperation(opers, "led", "output", LedState.ON);
    captureRegularHardwareOperation(opers, "right", 1, "ms", "negative", 5);
    gpioHardwareOperation(opers, "led", "output", LedState.OFF);
    const event = constructNowEvent(opers);
    const ret = await postHardwareOperation(event);
    if (ret["result"][2].length == 2) {
      response_time_ms = ret["result"][2][1];
    } else {
      response_time_ms = -1;
    }
  } else if (state === State.TEST_LEFT) {
    const opers = [];
    const initial_delay = getInitialDelay();
    delayHardwareOperation(opers, "ms", initial_delay);
    gpioHardwareOperation(opers, "led", "output", LedState.ON);
    captureRegularHardwareOperation(opers, "left", 1, "ms", "negative", 5);
    gpioHardwareOperation(opers, "led", "output", LedState.OFF);
    const event = constructNowEvent(opers);
    const ret = await postHardwareOperation(event);
    if (ret["result"][2].length == 2) {
      response_time_ms = ret["result"][2][1];
    } else {
      response_time_ms = -1;
    }
  } else {
    // wrong state, do nothing
  }
  return response_time_ms;
}

async function runStateMachine() {
  const opers = [];
  var response_time_ms = -1;
  switch (game_state) {
    case State.START:
      // clear state and variables
      clearResponseResult();
      counter = 0;
      gpioHardwareOperation(opers, "led", "output", LedState.OFF);
      const event = constructNowEvent(opers);
      await postHardwareOperation(event);
      game_state = State.TEST_RIGHT;
      addStatusMsg("右手测试开始！");
      break;
    case State.TEST_RIGHT:
      response_time_ms = await captureResponseTime(game_state);
      pushResponseResult(game_state, counter, response_time_ms);
      counter++;
      if (counter === TEST_COUNTER_MAX) {
        counter = 0;
        game_state = State.TEST_LEFT;
        addStatusMsg("右手测试完成！");
        document.getElementById("testResult").classList.add("d-none");
        document.getElementById("rightSpeedTest").classList.remove("d-none");
        document.getElementById("leftSpeedTest").classList.remove("d-none");
      }
      break;
    case State.TEST_LEFT:
      addStatusMsg("左手测试开始！");
      response_time_ms = await captureResponseTime(game_state);
      pushResponseResult(game_state, counter, response_time_ms);
      counter++;
      if (counter === TEST_COUNTER_MAX) {
        counter = 0;
        game_state = State.SHOW_RESULT;
        addStatusMsg("左手测试完成,显示统计！");
        calculateStatistics();
        document.getElementById("testResult").classList.remove("d-none");
        document.getElementById("rightSpeedTest").classList.remove("d-none");
        document.getElementById("leftSpeedTest").classList.remove("d-none");
      }
      break;
    case State.SHOW_RESULT:
      document.getElementById("rightResult").innerHTML = "";
      document.getElementById("leftResult").innerHTML = "";
      clearResponseResult();
      game_state = State.START;
      document.getElementById("rightSpeedTest").classList.remove("d-none");
      document.getElementById("testResult").classList.add("d-none");
      document.getElementById("leftSpeedTest").classList.add("d-none");
      break;
    default:
      break;
  }
  return game_state;
}

async function indicateTestComplete() {
  const opers = [];
  for (let i = 0; i < COMPLETE_INDICATE_DURATION_SEC; i++) {
    gpioHardwareOperation(opers, "led", "output", LedState.ON);
    delayHardwareOperation(opers, "ms", 250);
    gpioHardwareOperation(opers, "led", "output", LedState.OFF);
    delayHardwareOperation(opers, "ms", 250);
    gpioHardwareOperation(opers, "led", "output", LedState.ON);
    delayHardwareOperation(opers, "ms", 250);
    gpioHardwareOperation(opers, "led", "output", LedState.OFF);
    delayHardwareOperation(opers, "ms", 250);
  }

  const event = constructNowEvent(opers);
  await postHardwareOperation(event);
}

document
  .getElementById("startRightTest")
  .addEventListener("click", async () => {
    if (game_state !== State.START) {
      addErrorMsg("状态错误，请刷新页面并重新开始测试！");
    } else {
      while (State.TEST_LEFT != (await runStateMachine())) {}
      await indicateTestComplete();
    }
  });

document.getElementById("startLeftTest").addEventListener("click", async () => {
  if (game_state !== State.TEST_LEFT) {
    addErrorMsg("状态错误，请刷新页面并重新开始测试！");
  } else {
    while (State.SHOW_RESULT != (await runStateMachine())) {}
    await indicateTestComplete();
  }
});

document.getElementById("retestBtn").addEventListener("click", async () => {
  if (game_state !== State.SHOW_RESULT) {
    addErrorMsg("状态错误，请刷新页面并重新开始测试！");
  } else {
    while (State.START != (await runStateMachine())) {}
  }
});

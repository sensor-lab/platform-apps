import {
  captureTriggerHardwareOperation,
  constructNowEvent,
  postHardwareOperation,
} from "sensorsparks.api";

var trigger_pin = -1;
var echo_pin = -1;
var period_timer = null;

const REFRESH_PERIOD = 300;   // 300 millisecond

document.getElementById("startButton").addEventListener("click", async function(event) {
  if (trigger_pin == -1 || echo_pin == -1) {
    document.getElementById("errorMsg").classList.remove("d-none");
  } else {
    document.getElementById("errorMsg").classList.add("d-none");
    document.getElementById("stopButton").classList.remove("d-none");
    document.getElementById("startButton").classList.add("d-none");
    period_timer = setInterval(async function() {
      const opers = [];
      captureTriggerHardwareOperation(opers, echo_pin, 5, "us", "change", 0.1, trigger_pin, "high", "us", 10);
      const now_event = constructNowEvent(opers);
      const response = await postHardwareOperation(now_event);
      if (response["errorcode"] === 0) {
        if (response["result"][0].length >= 3) {
          document.getElementById("connectionError").classList.add("d-none");
          const durationUs = response["result"][0][2];
          const distanceInCm = durationUs / 2 / 29.1;
          document.getElementById("distanceValue").innerHTML = distanceInCm.toFixed(3);
        } else {
          document.getElementById("connectionError").classList.remove("d-none");
        }
      }
    }, REFRESH_PERIOD);
  }
});

document.getElementById("stopButton").addEventListener("click", function(event) {
  document.getElementById("stopButton").classList.add("d-none");
  document.getElementById("startButton").classList.remove("d-none");
  if (period_timer != null) {
    clearInterval(period_timer);
    period_timer = null;
  }
});

document.getElementById("connectedEchoPin").addEventListener("change", function(event) {
  trigger_pin = parseInt(document.getElementById("connectedTriggerPin").options[document.getElementById("connectedTriggerPin").selectedIndex].value);
  echo_pin = parseInt(document.getElementById("connectedEchoPin").options[document.getElementById("connectedEchoPin").selectedIndex].value);
  if (trigger_pin !== -1 && echo_pin !== -1) {
    document.getElementById("displayPins").classList.remove("d-none");
    document.getElementById(
        "displayPins"
      ).children[0].children[0].children[1].innerHTML = "平台引脚" + trigger_pin;
    document.getElementById(
        "displayPins"
      ).children[1].children[0].children[1].innerHTML = "平台引脚" + echo_pin;
  } else {
    document.getElementById("displayPins").classList.add("d-none");
  }
});

document.getElementById("connectedTriggerPin").addEventListener("change", function(event) {
  trigger_pin = parseInt(document.getElementById("connectedTriggerPin").options[document.getElementById("connectedTriggerPin").selectedIndex].value);
  echo_pin = parseInt(document.getElementById("connectedEchoPin").options[document.getElementById("connectedEchoPin").selectedIndex].value);
  if (trigger_pin !== -1 && echo_pin !== -1) {
    document.getElementById("displayPins").classList.remove("d-none");
    document.getElementById(
        "displayPins"
      ).children[0].children[0].children[1].innerHTML = "平台引脚" + trigger_pin;
    document.getElementById(
        "displayPins"
      ).children[1]
  } else {
    document.getElementById("displayPins").classList.add("d-none");
  }
});

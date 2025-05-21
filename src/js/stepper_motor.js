import {
  gpioHardwareOperation,
  delayHardwareOperation,
  constructNowEvent,
  postHardwareOperation,
} from 'sensorsparks.api';

var phase1_pin = -1;
var phase2_pin = -1;
var phase3_pin = -1;
var phase4_pin = -1;
var direction = -1;
var driveMode = -1;
var speedRpm = -1;
var selectAngle = -1;
var angleValue = -1;
var circleValue = -1;
var hasReseted = 0;

const NUM_FULL_STEP_REVOLUTION = 2048;
const NUM_HALF_STEP_REVOLUTION = NUM_FULL_STEP_REVOLUTION * 2;

function addErrorMsg(message) {
  document.getElementById("errorMsg").innerHTML = message;
  document.getElementById("errorMsg").classList.remove("d-none");
}

function addDriveMsg() {
  if (
    phase1_pin != -1 &&
    phase2_pin != -1 &&
    phase3_pin != -1 &&
    phase4_pin != -1 &&
    direction != -1 &&
    driveMode != -1 &&
    speedRpm != -1 &&
    selectAngle != -1
  ) {
    if (angleValue != -1) {
      let modeStr;
      let directionStr;
      if (driveMode == 0) {
        modeStr = "全步进";
      } else {
        modeStr = "半步进";
      }
      if (directionStr == 0) {
        directionStr = "正向";
      } else {
        directionStr = "逆向";
      }
      let msg =
        "步进电机将以" +
        speedRpm +
        "RPM的速度，" +
        modeStr +
        "的方式，" +
        directionStr +
        "转动" +
        angleValue +
        "度。";
      document.getElementById(
        "driveMessage"
      ).children[0].children[0].children[0].innerHTML = msg;
      document.getElementById("driveMessage").classList.remove("d-none");
    } else if (circleValue != -1) {
      let modeStr;
      let directionStr;
      if (driveMode == 0) {
        modeStr = "全步进";
      } else {
        modeStr = "半步进";
      }
      if (directionStr == 0) {
        directionStr = "正向";
      } else {
        directionStr = "逆向";
      }
      let msg =
        "步进电机将以" +
        speedRpm +
        "RPM的速度，" +
        modeStr +
        "的方式，" +
        directionStr +
        "转动" +
        circleValue +
        "圈。";
      document.getElementById(
        "driveMessage"
      ).children[0].children[0].children[0].innerHTML = msg;
      document.getElementById("driveMessage").classList.remove("d-none");
    } else {
      document.getElementById("driveMessage").classList.add("d-none");
    }
  } else {
    document.getElementById("driveMessage").classList.add("d-none");
  }
}

async function resetMotorDriver(
  phase1_pin_id,
  phase2_pin_id,
  phase3_pin_id,
  phase4_pin_id
) {
  const opers = [];
  gpioHardwareOperation(opers, phase1_pin_id, "output", 0);
  gpioHardwareOperation(opers, phase2_pin_id, "output", 0);
  gpioHardwareOperation(opers, phase3_pin_id, "output", 0);
  gpioHardwareOperation(opers, phase4_pin_id, "output", 0);

  const event = constructNowEvent(opers);
  await postHardwareOperation(event);
}

async function driveMotor(
  phase1_pin_id,
  phase2_pin_id,
  phase3_pin_id,
  phase4_pin_id,
  direction,
  mode,
  delay,
  cycle
) {
  let request = "/hardware/operation";
  let body = {
    event: "now",
    cycle: cycle,
    actions: [],
  };
  var cycle;

  const opers = [];
  let phase1, phase2, phase3, phase4;

  if (direction == 0) {
    phase1 = phase1_pin_id;
    phase2 = phase2_pin_id;
    phase3 = phase3_pin_id;
    phase4 = phase4_pin_id;
  } else {
    phase1 = phase4_pin_id;
    phase2 = phase3_pin_id;
    phase3 = phase2_pin_id;
    phase4 = phase1_pin_id;
  }

  if (mode == 0) {
    // full stepping: 32 steps for 5.625 degree (stride)
    gpioHardwareOperation(opers, phase1, "output", 1);
    gpioHardwareOperation(opers, phase4, "output", 0);
    delayHardwareOperation(opers, "us", delay);
    gpioHardwareOperation(opers, phase2, "output", 1);
    gpioHardwareOperation(opers, phase1, "output", 0);
    delayHardwareOperation(opers, "us", delay);
    gpioHardwareOperation(opers, phase3, "output", 1);
    gpioHardwareOperation(opers, phase2, "output", 0);
    delayHardwareOperation(opers, "us", delay);
    gpioHardwareOperation(opers, phase4, "output", 1);
    gpioHardwareOperation(opers, phase3, "output", 0);
    delayHardwareOperation(opers, "us", delay);
  } else {
    // full stepping: 64 steps for 5.625 degree (stride)
    // full stepping: 32 steps for 5.625 degree (stride)
    gpioHardwareOperation(opers, phase1, "output", 1);
    gpioHardwareOperation(opers, phase4, "output", 0);
    delayHardwareOperation(opers, "us", delay);
    gpioHardwareOperation(opers, phase1, "output", 1);
    gpioHardwareOperation(opers, phase2, "output", 1);
    delayHardwareOperation(opers, "us", delay);
    gpioHardwareOperation(opers, phase2, "output", 1);
    gpioHardwareOperation(opers, phase1, "output", 0);
    delayHardwareOperation(opers, "us", delay);
    gpioHardwareOperation(opers, phase2, "output", 1);
    gpioHardwareOperation(opers, phase3, "output", 1);
    delayHardwareOperation(opers, "us", delay);
    gpioHardwareOperation(opers, phase3, "output", 1);
    gpioHardwareOperation(opers, phase2, "output", 0);
    delayHardwareOperation(opers, "us", delay);
    gpioHardwareOperation(opers, phase3, "output", 1);
    gpioHardwareOperation(opers, phase4, "output", 1);
    delayHardwareOperation(opers, "us", delay);
    gpioHardwareOperation(opers, phase4, "output", 1);
    gpioHardwareOperation(opers, phase3, "output", 0);
    delayHardwareOperation(opers, "us", delay);
    gpioHardwareOperation(opers, phase4, "output", 1);
    gpioHardwareOperation(opers, phase1, "output", 1);
    delayHardwareOperation(opers, "us", delay);
  }
  const event = constructNowEvent(opers, (cycle = cycle));
  await postHardwareOperation(event);
}

document
  .getElementById("pinSelect")
  .addEventListener("change", function (event) {
    var ele = document.getElementById("pinSelect");
    if (ele.options[ele.selectedIndex].value == -1) {
      addErrorMsg("请在列表中选择正确的连接引脚。");
      document.getElementById("displayPins").classList.add("d-none");
    } else {
      let pin_id = parseInt(ele.options[ele.selectedIndex].value);
      phase1_pin = pin_id;
      phase2_pin = pin_id + 1;
      phase3_pin = pin_id + 2;
      phase4_pin = pin_id + 3;
      document.getElementById(
        "displayPins"
      ).children[0].children[0].children[1].innerHTML = "平台引脚" + phase1_pin;
      document.getElementById(
        "displayPins"
      ).children[1].children[0].children[1].innerHTML = "平台引脚" + phase2_pin;
      document.getElementById(
        "displayPins"
      ).children[2].children[0].children[1].innerHTML = "平台引脚" + phase3_pin;
      document.getElementById(
        "displayPins"
      ).children[3].children[0].children[1].innerHTML = "平台引脚" + phase4_pin;
      document.getElementById("displayPins").classList.remove("d-none");
      document.getElementById("errorMsg").classList.add("d-none");
      addDriveMsg();
    }
  });

document
  .getElementById("direction")
  .addEventListener("change", function (event) {
    var ele = document.getElementById("direction");
    if (ele.options[ele.selectedIndex].value == -1) {
      addErrorMsg("请在列表中选择电机转动方向。");
    } else {
      direction = parseInt(ele.options[ele.selectedIndex].value);
      document.getElementById("errorMsg").classList.add("d-none");
      addDriveMsg();
    }
  });

document
  .getElementById("driveMode")
  .addEventListener("change", function (event) {
    var ele = document.getElementById("driveMode");
    if (ele.options[ele.selectedIndex].value == -1) {
      addErrorMsg("请在列表中选择电机的驱动方式。");
    } else {
      driveMode = parseInt(ele.options[ele.selectedIndex].value);
      document.getElementById("errorMsg").classList.add("d-none");
      addDriveMsg();
    }
  });

document.getElementById("speed").addEventListener("change", function (event) {
  var ele = document.getElementById("speed");
  if (ele.options[ele.selectedIndex].value == -1) {
    addErrorMsg("请在列表中选择电机速度。");
  } else {
    speedRpm = parseInt(ele.options[ele.selectedIndex].value);
    document.getElementById("errorMsg").classList.add("d-none");
    addDriveMsg();
  }
});

document
  .getElementById("selectAngle")
  .addEventListener("change", function (event) {
    var ele = document.getElementById("selectAngle");
    if (ele.options[ele.selectedIndex].value == -1) {
      addErrorMsg("请在列表中选择按角度或圈数计算。");
    } else {
      selectAngle = parseInt(ele.options[ele.selectedIndex].value);
      document.getElementById("errorMsg").classList.add("d-none");
      if (selectAngle == 0) {
        document.getElementById("inputAngle").classList.remove("d-none");
        document.getElementById("inputCircle").classList.add("d-none");
      } else {
        document.getElementById("inputAngle").classList.add("d-none");
        document.getElementById("inputCircle").classList.remove("d-none");
      }
      addDriveMsg();
    }
  });

document
  .getElementById("inputAngle")
  .addEventListener("input", function (event) {
    circleValue = -1;
    angleValue = parseFloat(
      document.getElementById("inputAngle").children[0].value
    );
    addDriveMsg();
  });

document
  .getElementById("inputCircle")
  .addEventListener("input", function (event) {
    angleValue = -1;
    circleValue = parseFloat(
      document.getElementById("inputCircle").children[0].value
    );
    addDriveMsg();
  });

document
  .getElementById("startButton")
  .addEventListener("click", async function (event) {
    let err = 0;
    if (
      phase1_pin == -1 ||
      phase2_pin == -1 ||
      phase3_pin == -1 ||
      phase4_pin == -1
    ) {
      addErrorMsg("请在列表中选择正确的连接引脚。");
      document.getElementById("displayPins").classList.add("d-none");
      err = 1;
    }
    if (direction == -1) {
      addErrorMsg("请在列表中选择电机转动方向。");
      err = 1;
    }
    if (driveMode == -1) {
      addErrorMsg("请在列表中选择电机的驱动方式。");
      err = 1;
    }
    if (speedRpm == -1) {
      addErrorMsg("请在列表中选择电机速度。");
      err = 1;
    }
    if (selectAngle == -1) {
      addErrorMsg("请在列表中选择按角度或圈数计算。");
      err = 1;
    }
    if (selectAngle == 0 && angleValue <= 0) {
      addErrorMsg("请填写转动角度，需要大于0。");
      err = 1;
    }
    if (selectAngle == 1 && circleValue <= 0) {
      addErrorMsg("请填写圈数，需要大于0。");
      err = 1;
    }
    if (err == 0) {
      if (0 == hasReseted) {
        hasReseted = 1;
        await resetMotorDriver(phase1_pin, phase2_pin, phase3_pin, phase4_pin);
      }
      let delay = 0;
      if (driveMode == 0) {
        // full stepping
        delay = parseInt(
          (60 * 1000 * 1000) / speedRpm / NUM_FULL_STEP_REVOLUTION
        );
      } else {
        // half stepping
        delay = parseInt(
          (60 * 1000 * 1000) / speedRpm / NUM_HALF_STEP_REVOLUTION
        );
      }
      let cycle = 0;
      if (selectAngle == 0) {
        // input angle information, driveMotor calls 4 full steps each time
        // the value would be same as half stepping (driveMotor calls 8 half steps each time)
        cycle = parseInt(angleValue / ((360 / NUM_FULL_STEP_REVOLUTION) * 4));
      } else {
        // input circle information
        cycle = parseInt(
          (circleValue * 360) / ((360 / NUM_FULL_STEP_REVOLUTION) * 4)
        );
      }
      let total_time_ms = 0;
      if (driveMode == 0) {
        // the meaning of *4: please refer to driveMotor function
        total_time_ms = delay * 4 * cycle;
      } else {
        // half stepping
        // the meaning of *8: please refer to driveMotor function
        total_time_ms = delay * 8 * cycle;
      }
      if (total_time_ms > 10000) {
        await driveMotor(
          phase1_pin,
          phase2_pin,
          phase3_pin,
          phase4_pin,
          direction,
          driveMode,
          delay,
          cycle
        );
        // rotation time longer than 10 seconds
        let i = 0;
        var time_id = setInterval(() => {
          i++;
          if (i == 11) {
            document.getElementById("motorProgressBar").style.width = "0%";
            clearInterval(time_id);
          } else {
            document.getElementById("motorProgressBar").style.width =
              i * 10 + "%";
          }
        }, total_time_ms / 10);
      } else if (total_time_ms > 1000) {
        await driveMotor(
          phase1_pin,
          phase2_pin,
          phase3_pin,
          phase4_pin,
          direction,
          driveMode,
          delay,
          cycle
        );
        // rotation time longer than 1 second
        let i = 0;
        var timer_id = setInterval(() => {
          i++;
          if (i == 5) {
            document.getElementById("motorProgressBar").style.width = "0%";
            clearInterval(timer_id);
          } else {
            document.getElementById("motorProgressBar").style.width =
              i * 25 + "%";
          }
        }, total_time_ms / 4);
      } else {
        await driveMotor(
          phase1_pin,
          phase2_pin,
          phase3_pin,
          phase4_pin,
          direction,
          driveMode,
          delay,
          cycle
        );
        document.getElementById("motorProgressBar").style.width = "100%";
        setTimeout(() => {
          document.getElementById("motorProgressBar").style.width = "0%";
        }, 3000);
      }
    }
  });

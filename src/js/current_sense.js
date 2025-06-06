import {
  i2cReadHardwareOperation,
  i2cWriteHardwareOperation,
  adcHardwareOperation,
  constructNowEvent,
  postHardwareOperation,
} from "sensorsparks.api";
import Chart from "chart.js/auto";
import zoomPlugin from "chartjs-plugin-zoom";

Chart.register(zoomPlugin);

// general variables
var start_time = null;
var refresh_timer = null;
var calibrated = false;

const I2C_SPEED_KHZ = 100;
const INA219_I2C_ADDR = 0x40;
const REFRESHING_INTERVAL_MS = 500;

// ASC712 related:
var adc_pin = -1;
var measure_range = -1;
var calibrate_adc_val = -1;

// INA219 related
var sda_pin = -1;
var scl_pin = -1;
var shunt_resistor = -1;

const CONFIG_REGISTER = 0
const SHUNT_VOLT_REGISTER = 1
const BUS_VOLT_REGISTER = 2
const POWER_REGISTER = 3
const CURRENT_REGISTER = 4
const CALIBRATION_REGISTER = 5

const currentChart = new Chart(
  document.getElementById("currentChart"),
  {
    type: "line",
    title: "电流强度曲线",
    data: {
      labels: [],
      datasets: [
        {
          label: "电流(A)",
          data: [],
          borderColor: "#4285F4",
          backgroundColor: "rgba(66, 133, 244, 0.1)",
          borderWidth: 2,
          tension: 0.1,
          fill: true,
        }
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "电流强度图表",
        },
        zoom: {
          zoom: {
            wheel: {
              enabled: true, // Enable zoom via mouse wheel
            },
            pinch: {
              enabled: true, // Enable zoom via pinch gesture
            },
            mode: "xy", // Allow zooming on both axes
          },
          pan: {
            enabled: true, // Enable panning
            mode: "xy", // Allow panning on both axes
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          ticks: {
            callback: (value) => `${value}秒`,
          },
          title: {
            display: true,
            text: "时间(s)",
          },
        },
        y: {
          beginAtZero: false,
        },
      },
    },
  }
);

async function ina219Capture() {
  // INA219
  const opers = [];
  i2cWriteHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    I2C_SPEED_KHZ,
    INA219_I2C_ADDR,
    CURRENT_REGISTER,
    -1,
    0
  );
  i2cReadHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    I2C_SPEED_KHZ,
    INA219_I2C_ADDR,
    -1,
    -1,
    2
  );
  const now_event = constructNowEvent(opers);
  const response = await postHardwareOperation(now_event, "http://192.168.1.197");
  if (response["errorcode"] === 0) {
    const current_val = ((response["result"][1][0] << 8) + response["result"][1][1]) * (measure_range / Math.pow(2,15));
    currentChart.data.labels.push((Date.now() - start_time) / 1000);
    currentChart.data.datasets[0].data.push(current_val);
    currentChart.update();

    const register_val = (response["result"][1][0] << 8) + response["result"][1][1];
  }
}

async function ina219Calibrate() {
  const calibration_register = Math.floor(0.04096 / ((measure_range / Math.pow(2,15)) * shunt_resistor))
  const opers = [];
  i2cWriteHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    I2C_SPEED_KHZ,
    INA219_I2C_ADDR,
    CALIBRATION_REGISTER,
    -1,
    (calibration_register >> 8) & 0Xff,
    calibration_register & 0xff
  );
  const now_event = constructNowEvent(opers);
  const response = await postHardwareOperation(now_event, "http://192.168.1.197");
  if (response["errorcode"] === 0) {
    calibrated = true;
  }
}

async function asc712Capture() {
  // ASC712
  const opers = [];
  adcHardwareOperation(opers, adc_pin, "3.1v");
  const now_event = constructNowEvent(opers);
  const response = await postHardwareOperation(now_event, "http://192.168.1.197");
  if (response["errorcode"] === 0) {
    const adc_val = response["result"][0][0];
    const sensitivity = measure_range === 5 ? 0.185 : measure_range === 20 ? 0.1 : 0.066
    /* the circuitary uses the following 10K / 20K divider
    5V Signal ---+
                |
                [R1] (480Ω)
                |
                +--- To adc measure pin (0-2.5v)
                |
                [R2] (480Ω)
                |
    GND ---------+
    */
    const current_val = (((adc_val - calibrate_adc_val) / 4096) * 3.1) / sensitivity;
    currentChart.data.labels.push((Date.now() - start_time) / 1000);
    currentChart.data.datasets[0].data.push(current_val);
    currentChart.update();
  }
}

async function asc712Calibrate() {
  const CALIBRATE_NUM_LOOP = 10
  const opers = [];
  let i = 0;
  for (i = 0; i < CALIBRATE_NUM_LOOP; i++) {
    adcHardwareOperation(opers, adc_pin, "3.1v");
  }
  const now_event = constructNowEvent(opers);
  const response = await postHardwareOperation(now_event, "http://192.168.1.197");
  let total_adc_count = 0;
  for (i = 0; i < CALIBRATE_NUM_LOOP; i++) {
    if (response["result"][i][0] == 0) {
      break;
    }
    total_adc_count += response["result"][i][0];
  }
  if (i === CALIBRATE_NUM_LOOP) {
    calibrate_adc_val = Math.floor(total_adc_count / CALIBRATE_NUM_LOOP);
    calibrated = true;
  }
}

document
  .getElementById("pinSelect")
  .addEventListener("change", function (event) {
    if (event.target.value === 0) {
      document.getElementById("asc712ErrorMessage").classList.remove("d-none");
      document.getElementById("ina219ErrorMessage").classList.remove("d-none");
      document.getElementById("asc712DisplayPins").classList.add("d-none");
      document.getElementById("ina219DisplayPins").classList.add("d-none");
    } else if (document.getElementById("moduleSelect").selectedIndex === 1) {
      // ASC712
      adc_pin = parseInt(event.target.value);
      document.getElementById("asc712DisplayPins").classList.remove("d-none");
      document.getElementById(
        "asc712DisplayPins"
      ).children[0].children[0].children[1].innerHTML = "平台引脚" + adc_pin;
      document.getElementById("asc712ErrorMessage").classList.add("d-none");
      document.getElementById("ina219ErrorMessage").classList.add("d-none");
      document.getElementById("asc712DisplayPins").classList.remove("d-none");
      document.getElementById("ina219DisplayPins").classList.remove("d-none");
    } else if (document.getElementById("moduleSelect").selectedIndex === 2) {
      // INA219
      sda_pin = parseInt(event.target.value);
      scl_pin = sda_pin + 1;
      document.getElementById("ina219DisplayPins").classList.remove("d-none");
      document.getElementById(
        "ina219DisplayPins"
      ).children[0].children[0].children[1].innerHTML = "平台引脚" + sda_pin;
      document.getElementById(
        "ina219DisplayPins"
      ).children[1].children[0].children[1].innerHTML = "平台引脚" + scl_pin;
      document.getElementById("asc712ErrorMessage").classList.add("d-none");
      document.getElementById("ina219ErrorMessage").classList.add("d-none");
      document.getElementById("asc712DisplayPins").classList.remove("d-none");
      document.getElementById("ina219DisplayPins").classList.remove("d-none");
    } else {
      document.getElementById("asc712ErrorMessage").classList.remove("d-none");
      document.getElementById("ina219ErrorMessage").classList.remove("d-none");
      document.getElementById("asc712DisplayPins").classList.add("d-none");
      document.getElementById("ina219DisplayPins").classList.add("d-none");
    }
  });

document
  .getElementById("startButton")
  .addEventListener("click", async function (event) {
    const module_selected = document.getElementById("moduleSelect").selectedIndex;
    if (module_selected === 0) {
      console.log("wrong module selected");
    } else if (module_selected === 1) {
      // ASC712
      measure_range = parseInt(
        document.getElementById("asc712RangeSelect").options[
          document.getElementById("asc712RangeSelect").selectedIndex
        ].value
      );
      if (measure_range === -1 || adc_pin === -1) {
        document.getElementById("asc712ErrorMessage").classList.remove("d-none");
        document.getElementById("ina219ErrorMessage").classList.add("d-none");
      } else {
        document.getElementById("asc712ErrorMessage").classList.add("d-none");
        document.getElementById("ina219ErrorMessage").classList.add("d-none");
        start_time = Date.now();
        currentChart.data.labels = [];
        currentChart.data.datasets[0].data = [];
        currentChart.update();

        if (calibrated === false) {
          await asc712Calibrate();
        }

        if (calibrated === true) {
          refresh_timer = setInterval(async function () {
            await asc712Capture();
          }, REFRESHING_INTERVAL_MS);

          document.getElementById("startButton").classList.add("d-none");
          document.getElementById("stopButton").classList.remove("d-none");
        } else {
          document.getElementById("failCalibrate").classList.remove("d-none");
        }
      }
    } else {
      // INA219
      measure_range = parseInt(
        document.getElementById("ina219RangeSelect").options[
          document.getElementById("ina219RangeSelect").selectedIndex
        ].value
      );
      shunt_resistor = parseFloat(
        document.getElementById("ina219ShuntResistorSelect").options[
          document.getElementById("ina219ShuntResistorSelect").selectedIndex
        ].value
      );
      if (measure_range === -1 || shunt_resistor === -1 || sda_pin === -1 || scl_pin === -1) {
        document.getElementById("asc712ErrorMessage").classList.add("d-none");
        document.getElementById("ina219ErrorMessage").classList.remove("d-none");
      } else {
        document.getElementById("asc712ErrorMessage").classList.add("d-none");
        document.getElementById("ina219ErrorMessage").classList.add("d-none");
        start_time = Date.now();
        currentChart.data.labels = [];
        currentChart.data.datasets[0].data = [];
        currentChart.update();
        if (calibrated === false) {
          await ina219Calibrate();
        }

        if (calibrated === true) {
          refresh_timer = setInterval(async function () {
            await ina219Capture();
          }, REFRESHING_INTERVAL_MS);
          document.getElementById("startButton").classList.add("d-none");
          document.getElementById("stopButton").classList.remove("d-none");
        } else {
          document.getElementById("failCalibrate").classList.remove("d-none");
        }
      }
    }
  
  });

document
  .getElementById("stopButton")
  .addEventListener("click", async function (event) {
    clearInterval(refresh_timer);
    document.getElementById("startButton").classList.remove("d-none");
    document.getElementById("stopButton").classList.add("d-none");
  });

document
  .getElementById("moduleSelect")
  .addEventListener("change", function (event) {
    adc_pin = -1;
    sda_pin = -1;
    scl_pin = -1;
    document.getElementById("pinSelect").value = -1;
    if (event.target.value == 0) {
      document.getElementById("asc712Setting").classList.remove("d-none");
      document.getElementById("ina219Setting").classList.add("d-none");
    } else if (event.target.value == 1) {
      document.getElementById("asc712Setting").classList.add("d-none");
      document.getElementById("ina219Setting").classList.remove("d-none");
    }
    document.getElementById("ina219DisplayPins").classList.add("d-none");
    document.getElementById("asc712DisplayPins").classList.add("d-none");
  });

document
  .getElementById("asc712RangeSelect")
  .addEventListener("change", function (event) {
    // if (event.target.value == 5) {
    //   currentChart.options.scales.y.max = 5;
    //   currentChart.options.scales.y.min = -5;
    // } else if (event.target.value == 20) {
    //   currentChart.options.scales.y.max = 20;
    //   currentChart.options.scales.y.min = -20;
    // } else if (event.target.value == 30) {
    //   currentChart.options.scales.y.max = 30;
    //   currentChart.options.scales.y.min = -30;
    // }
  });

document
  .getElementById("ina219RangeSelect")
  .addEventListener("change", function (event) {
    // if (event.target.value == 5) {
    //   currentChart.options.scales.y.max = 5;
    //   currentChart.options.scales.y.min = -5;
    // } else if (event.target.value == 10) {
    //   currentChart.options.scales.y.max = 10;
    //   currentChart.options.scales.y.min = -10;
    // } else if (event.target.value == 20) {
    //   currentChart.options.scales.y.max = 20;
    //   currentChart.options.scales.y.min = -20;
    // } else if (event.target.value == 30) {
    //   currentChart.options.scales.y.max = 30;
    //   currentChart.options.scales.y.min = -30;
    // }
  });
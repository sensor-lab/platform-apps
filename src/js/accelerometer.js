import {
  i2cReadHardwareOperation,
  i2cWriteHardwareOperation,
  constructNowEvent,
  postHardwareOperation,
} from "sensorsparks.api";
import Chart from "chart.js/auto";
import zoomPlugin from "chartjs-plugin-zoom";

Chart.register(zoomPlugin);

var sda_pin = -1;
var scl_pin = -1;
var start_time = null;
var refresh_timer = null;

const I2C_SPEED_KHZ = 100;
const MPU6050_I2C_ADDR = 104;
const REFRESHING_INTERVAL_MS = 100;

const accelerometerChart = new Chart(
  document.getElementById("acceleromterChart"),
  {
    type: "line",
    title: "加速度",
    data: {
      labels: [],
      datasets: [
        {
          label: "X轴加速度",
          data: [],
          borderColor: "#4285F4",
          backgroundColor: "rgba(66, 133, 244, 0.1)",
          borderWidth: 2,
          tension: 0.1,
          fill: true,
        },
        {
          label: "Y轴加速度",
          data: [],
          borderColor: "rgb(52, 168, 83)",
          backgroundColor: "rgba(0, 200, 83, 0.05)",
          borderWidth: 2,
          tension: 0.1,
          fill: true,
        },
        {
          label: "Z轴加速度",
          data: [],
          borderColor: "rgb(234, 67, 53)",
          backgroundColor: "rgba(255, 64, 129, 0.05)",
          borderWidth: 2,
          tension: 0.1,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "加速度图表",
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
            callback: (value) => `${value}毫秒`,
          },
          title: {
            display: true,
            text: "时间(ms)",
          },
        },
        y: {
          beginAtZero: false,
          max: 32767,
          min: -32768,
        },
      },
    },
  }
);

const gyroChart = new Chart(document.getElementById("gyroChart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "X轴角速度",
        data: [],
        borderColor: "#2962FF",
        backgroundColor: "rgba(41, 98, 255, 0.05)",
        borderWidth: 2,
        tension: 0.1,
        fill: true,
      },
      {
        label: "Y轴角速度",
        data: [],
        borderColor: "#00C853",
        backgroundColor: "rgba(0, 200, 83, 0.05)",
        borderWidth: 2,
        tension: 0.1,
        fill: true,
      },
      {
        label: "Z轴角速度",
        data: [],
        borderColor: "#FF4081",
        backgroundColor: "rgba(255, 64, 129, 0.05)",
        borderWidth: 2,
        tension: 0.1,
        fill: true,
      },
    ],
  },
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "角速度图表",
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
          callback: (value) => `${value}毫秒`,
        },
        title: {
          display: true,
          text: "时间(ms)",
        },
      },
      y: {
        beginAtZero: false,
        max: 32767,
        min: -32768,
      },
    },
  },
});

async function initMpu6050(range) {
  let init = false;
  const opers = [];
  i2cWriteHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    I2C_SPEED_KHZ,
    MPU6050_I2C_ADDR,
    107,
    -1,
    0
  );
  i2cWriteHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    I2C_SPEED_KHZ,
    MPU6050_I2C_ADDR,
    27,
    -1,
    range << 3
  );
  i2cWriteHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    I2C_SPEED_KHZ,
    MPU6050_I2C_ADDR,
    28,
    -1,
    range << 3
  );
  i2cWriteHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    I2C_SPEED_KHZ,
    MPU6050_I2C_ADDR,
    -1,
    -1,
    117
  );
  i2cReadHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    I2C_SPEED_KHZ,
    MPU6050_I2C_ADDR,
    -1,
    -1,
    1
  );
  const now_event = constructNowEvent(opers);
  const response = await postHardwareOperation(now_event, "http://192.168.4.1");
  if (response["errorcode"] === 0) {
    if (response["result"][4][0] === 104) {
      init = true;
    }
  }

  return init;
}

async function startSensorCapture() {
  const opers = [];
  i2cWriteHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    I2C_SPEED_KHZ,
    MPU6050_I2C_ADDR,
    -1,
    -1,
    59
  );
  i2cReadHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    I2C_SPEED_KHZ,
    MPU6050_I2C_ADDR,
    -1,
    -1,
    14
  );
  const now_event = constructNowEvent(opers);
  const response = await postHardwareOperation(now_event, "http://192.168.4.1");
  if (response["errorcode"] === 0) {
    let acce_x = (response["result"][1][0] << 8) + response["result"][1][1];
    let acce_y = (response["result"][1][2] << 8) + response["result"][1][3];
    let acce_z = (response["result"][1][4] << 8) + response["result"][1][5];

    let gyro_x = (response["result"][1][8] << 8) + response["result"][1][9];
    let gyro_y = (response["result"][1][10] << 8) + response["result"][1][11];
    let gyro_z = (response["result"][1][12] << 8) + response["result"][1][13];

    if ((acce_x & (1 << 15)) > 0) {
      // acce_x -= 65546
      acce_x = -((~acce_x & 0xffff) + 1);
    }
    if ((acce_y & (1 << 15)) > 0) {
      // acce_y -= 65546
      acce_y = -((~acce_y & 0xffff) + 1);
    }
    if ((acce_z & (1 << 15)) > 0) {
      // acce_z -= 65546
      acce_z = -((~acce_z & 0xffff) + 1);
    }
    if ((gyro_x & (1 << 15)) > 0) {
      // gyro_x -= 65536
      gyro_x = -((~gyro_x & 0xffff) + 1);
    }
    if ((gyro_y & (1 << 15)) > 0) {
      // gyro_y -= 65536
      gyro_y = -((~gyro_y & 0xffff) + 1);
    }
    if ((gyro_z & (1 << 15)) > 0) {
      // gyro_z -= 65536
      gyro_z = -((~gyro_z & 0xffff) + 1);
    }

    accelerometerChart.data.labels.push(Date.now() - start_time);
    accelerometerChart.data.datasets[0].data.push(acce_x);
    accelerometerChart.data.datasets[1].data.push(acce_y);
    accelerometerChart.data.datasets[2].data.push(acce_z);
    accelerometerChart.update();

    gyroChart.data.labels.push(Date.now() - start_time);
    gyroChart.data.datasets[0].data.push(gyro_x);
    gyroChart.data.datasets[1].data.push(gyro_y);
    gyroChart.data.datasets[2].data.push(gyro_z);
    gyroChart.update();

    console.log(`acc x: ${acce_x}, y: ${acce_y}, z: ${acce_z}`);
    console.log(`gyro x: ${gyro_x}, y: ${gyro_y}, z: ${gyro_z}`);
  }
}

document
  .getElementById("pinSelect")
  .addEventListener("change", function (event) {
    if (event.target.value == -1) {
      document.getElementById("wrongselection").classList.remove("d-none");
      document.getElementById("displayPins").classList.add("d-none");
    } else {
      sda_pin = parseInt(event.target.value);
      scl_pin = sda_pin + 1;
      document.getElementById("displayPins").classList.remove("d-none");
      document.getElementById(
        "displayPins"
      ).children[0].children[0].children[1].innerHTML = "平台引脚" + sda_pin;
      document.getElementById(
        "displayPins"
      ).children[1].children[0].children[1].innerHTML = "平台引脚" + scl_pin;
    }
  });

document
  .getElementById("startButton")
  .addEventListener("click", async function (event) {
    if (
      sda_pin == -1 ||
      document.getElementById("rangeSelect").selectedIndex === 0
    ) {
      document.getElementById("wrongselection").classList.remove("d-none");
    } else {
      const range = parseInt(
        document.getElementById("rangeSelect").options[
          document.getElementById("rangeSelect").selectedIndex
        ].value
      );
      document.getElementById("wrongselection").classList.add("d-none");

      if (await initMpu6050(range)) {
        document.getElementById("failInit").classList.add("d-none");
        start_time = Date.now();
        accelerometerChart.data.labels = [];
        accelerometerChart.data.datasets[0].data = [];
        accelerometerChart.data.datasets[1].data = [];
        accelerometerChart.data.datasets[2].data = [];
        accelerometerChart.update();
        gyroChart.data.labels = [];
        gyroChart.data.datasets[0].data = [];
        gyroChart.data.datasets[1].data = [];
        gyroChart.data.datasets[2].data = [];
        gyroChart.update();
        refresh_timer = setInterval(async function () {
          await startSensorCapture();
        }, REFRESHING_INTERVAL_MS);

        document.getElementById("startButton").classList.add("d-none");
        document.getElementById("stopButton").classList.remove("d-none");
      } else {
        document.getElementById("failInit").classList.remove("d-none");
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

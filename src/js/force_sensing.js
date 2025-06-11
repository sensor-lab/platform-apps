import {
  adcHardwareOperation,
  constructNowEvent,
  postHardwareOperation,
} from "sensorsparks.api";
import Chart from "chart.js/auto";

var state = "config";      //"config", "capture", "display"
var timeLineLabels = [];
var forceKgVals = [];
var initialTimeoutSecond = 10;
var pin_id = -1;
var range = -1;

const forceChart = new Chart(
  document.getElementById("forceChart"),
  {
    type: "line",
    title: "压力曲线",
    data: {
      labels: [],
      datasets: [
        {
          label: '按压力量(kg)',
          backgroundColor: 'rgba(161, 198, 247, 1)',
          borderColor: 'rgb(47, 128, 237)',
          data: [],
        }
      ],
    },
    options: {
      responsive: true,
      animation: false,
      plugins: {
        title: {
          display: true,
          text: "压力曲线",
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

setComponentState("config");

function setComponentState(current_state) {
    state = current_state;
    if (current_state == "capture") {
      // reset chart
      forceChart.data.labels = [];
      forceChart.data.datasets[0].data = [];
      forceChart.update();
      timeLineLabels = [];
      forceKgVals = [];

      // not showing start button
      document.getElementById("startButton").classList.add("d-none");
      // showing alert
      document.getElementById("instruction").classList.remove("d-none");
      // not showing statistics
      document.getElementById("statistics").classList.add("d-none");
      // not showing config
      document.getElementById("configform").classList.add("d-none");
    } else if (current_state == "display") {
      document.getElementById("forceChart").classList.remove("d-none");
      // showing start button
      document.getElementById("startButton").classList.remove("d-none");
      // not showing alert
      document.getElementById("instruction").classList.add("d-none");
      // show statistics
      document.getElementById("statistics").classList.remove("d-none");
      // not showing config
      document.getElementById("configform").classList.add("d-none");
    } else if (current_state == "config") {
      document.getElementById("instruction").classList.add("d-none");
      document.getElementById("statistics").classList.add("d-none");
      document.getElementById("configform").classList.remove("d-none");
      document.getElementById("startButton").classList.remove("d-none");
    }
}

function startSensorCapture() {
    setComponentState("capture");
    var progressbar_id = setInterval(moveBar, 1000);
    var capture_id = setInterval(getAdcCapture, 10);
    var width = 100;
    const windowSize = 10
    var window = [];
    const startTime = Date.now();

    function moveBar() {
        var elem = document.getElementById("timeoutCounter");
        if (width == 0) {
            calStatistics();
            setComponentState("display");
            clearInterval(progressbar_id);
        } else {
            width-=(100 / initialTimeoutSecond);
            elem.style.width = width + "%";
            elem.innerHTML = (width / (100 / initialTimeoutSecond)) + "秒";
        }
    }
    
    function calStatistics() {
        // find average
        const average = calAverage(forceKgVals);
        // find maximum
        let maximumVal = 0;
        let maximumIndex = 0;
        if (forceKgVals.length > 0) {
            maximumVal = forceKgVals[0];
            maximumIndex = 0;
            for (let i = 1; i < forceKgVals.length; i++) {
                if (forceKgVals[i] > maximumVal) {
                    maximumIndex = i;
                    maximumVal = forceKgVals[i];
                }
            }
        }
        const tableAverage = document.getElementById("statAverage");
        const tableMax = document.getElementById("statMax");

        tableAverage.getElementsByTagName("td")[2].innerHTML = average;
        tableMax.getElementsByTagName("td")[1].innerHTML = timeLineLabels[maximumIndex];
        tableMax.getElementsByTagName("td")[2].innerHTML = forceKgVals[maximumIndex];
    }

    function calAverage(windowParam) {
        var total = 0;
        for (let i = 0; i < windowParam.length; i++) {
            total += windowParam[i];
        }
        return total/windowParam.length;
    }

    function calForce(adcVal) {
        // ADC is 12-bit, MD30-60 datasheet https://xonstorage.blob.core.windows.net/pdf/leanstar_md306010kg_xonjuly20_12_link.pdf
        const fixedDividerResistor = 10; // 10K resistor
        const voltageSupply = 3.3;              // 3.3v
        const voltage = adcVal / (4096) * 3.1;
        var resistorInKohm = (voltageSupply - voltage ) / (voltage / (fixedDividerResistor * 1000)) / 1000
        var forceInKg;
        if (resistorInKohm >= 30) {
            // Range 1: [0kg, 3.5kg] <=> [120kOhm, 30kOhm], slope = -25.71
            if (resistorInKohm >= 120) {
                resistorInKohm = 120;
            }
            forceInKg = (resistorInKohm - 120) / (-25.71);
        } else if (resistorInKohm >= 18) {
            // Range 2： [3.5kg, 5kg] <=> [30kOhm, 18kOhm], slope = -8
            forceInKg = (resistorInKohm - 58) / (-8);
        } else if (resistorInKohm >= 10) {
            // Range 3: [5kg, 10kg] <=> [18kOhm, 10kOhm], slope = -1.6
            forceInKg = (resistorInKohm - 26) / (-1.6);
        } else {
            // Range 4: [10kg, 20kg] <=> [10kOhm, 5kOhm], slope = -0.5
            forceInKg = (resistorInKohm - 15) / (-0.5);
            if (range == 20) {
              if (forceInKg > 20) {
                forceInKg = 20;
              }
            } else if (range == 30) {
              if (forceInKg > 30) {
                forceInKg = 30;
              }
            }
            
        }
        return forceInKg;
    }

    async function getAdcCapture() {
        if (state != "capture") {
            clearInterval(capture_id);
        } else {
            const opers = [];
            adcHardwareOperation(opers, pin_id, "3.1v");
            const now_event = constructNowEvent(opers);
            const response = await postHardwareOperation(now_event);
            if (response["errorcode"] === 0) {
                const singleAdcVal = response["result"][0][0];
                if (window.length < windowSize) {
                    window.push(singleAdcVal);
                } else {
                    window.shift();
                    window.push(singleAdcVal);
                }
                // update chart
                forceChart.data.labels.push((Date.now() - startTime) / 1000);
                timeLineLabels.push((Date.now() - startTime) / 1000);
                forceChart.data.datasets[0].data.push(calForce(calAverage(window)));
                forceKgVals.push(calForce(calAverage(window)));
                forceChart.update();
            }
        }
    }
}

document.getElementById("pinSelect").addEventListener("change", function(event) {
    var ele = document.getElementById("pinSelect");
    if (ele.options[ele.selectedIndex].value == -1) {
        document.getElementById("wrongselection").classList.remove("d-none");
    } else {
        pin_id = parseInt(ele.options[ele.selectedIndex].value);
        document.getElementById("wrongselection").classList.add("d-none");
    }
});

document.getElementById("startButton").addEventListener("click", function (event) {
  range = document.getElementById("rangeSelect").options[
    document.getElementById("rangeSelect").selectedIndex].value;
  if (pin_id == -1 || range == -1) {
      document.getElementById("wrongselection").classList.remove("d-none");
      setComponentState("config");
  } else if (state != "capture") {
      startSensorCapture();
  }
});


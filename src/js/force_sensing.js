import {readAdc} from 'sensorsparks.api'

var state = "config";      //"config", "capture", "display"
var labels = [];
var forceKgVals = [];
var initialTimeoutSecond = 10;
var pin_id = -1;
var forceSenseLineChart = undefined;

setComponentState("config");

function setComponentState(current_state) {
    state = current_state;
    if (current_state == "capture") {
        // not showing line chart
        document.getElementById("lineChart").classList.add("d-none");
        // not showing start button
        document.getElementById("startButton").classList.add("d-none");
        // showing alert
        document.getElementById("instruction").classList.remove("d-none");
        // not showing statistics
        document.getElementById("statistics").classList.add("d-none");
        // not showing config
        document.getElementById("configform").classList.add("d-none");
    } else if (current_state == "display") {
        // showing line chart
        displayChart()
        document.getElementById("lineChart").classList.remove("d-none");
        // showing start button
        document.getElementById("startButton").classList.remove("d-none");
        // not showing alert
        document.getElementById("instruction").classList.add("d-none");
        // show statistics
        document.getElementById("statistics").classList.remove("d-none");
        // not showing config
        document.getElementById("configform").classList.add("d-none");
    } else if (current_state == "config") {
        document.getElementById("lineChart").classList.add("d-none");
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
            if (forceSenseLineChart != undefined) {
                forceSenseLineChart.destroy();
            }
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
        tableAverage = document.getElementById("statAverage");
        tableMax = document.getElementById("statMax");

        tableAverage.getElementsByTagName("td")[2].innerHTML = average;
        tableMax.getElementsByTagName("td")[1].innerHTML = labels[maximumIndex];
        tableMax.getElementsByTagName("td")[2].innerHTML = forceKgVals[maximumIndex];
    }

    function calAverage(windowParam) {
        var total = 0;
        for (i = 0; i < windowParam.length; i++) {
            total += windowParam[i];
        }
        return total/windowParam.length;
    }
    function calForce(adcVal) {
        // ADC is 12-bit, MD30-60 datasheet https://xonstorage.blob.core.windows.net/pdf/leanstar_md306010kg_xonjuly20_12_link.pdf
        const fixedDividerResistor = 10; // 10K resistor
        const voltageSupply = 3.3;              // 3.3v
        const voltage = adcVal / (4096) * 3.1;
        var resistorInKg = (voltageSupply - voltage ) / (voltage / (fixedDividerResistor * 1000)) / 1000
        var forceInKg;
        if (resistorInKg >= 30) {
            // Range 1: [0kg, 3.5kg] <=> [120kOhm, 30kOhm], slope = -25.71
            if (resistorInKg >= 120) {
                resistorInKg = 120;
            }
            forceInKg = (resistorInKg - 120) / (-25.71);
        } else if (resistorInKg >= 18) {
            // Range 2： [3.5kg, 5kg] <=> [30kOhm, 18kOhm], slope = -8
            forceInKg = (resistorInKg - 58) / (-8);
        } else if (resistorInKg >= 10) {
            // Range 3: [5kg, 10kg] <=> [18kOhm, 10kOhm], slope = -1.6
            forceInKg = (resistorInKg - 26) / (-1.6);
        } else {
            // Range 4: [10kg, 20kg] <=> [10kOhm, 5kOhm], slope = -0.5
            forceInKg = (resistorInKg - 15) / (-0.5);
            if (forceInKg > 30) {
                forceInKg = 30;
            }
        }
        return forceInKg;
    }
    async function getAdcCapture() {
        if (state != "capture") {
            clearInterval(capture_id);
        } else {
            singleAdcVal = await readAdc(pin_id);

            if (singleAdcVal != undefined) {
                labels.push((Date.now() - startTime) / 1000);
                if (window.length < windowSize) {
                    window.push(singleAdcVal);
                } else {
                    window.shift();
                    window.push(singleAdcVal);
                }
                // calculate average
                forceKgVals.push(calForce(calAverage(window)));
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
    if (pin_id == -1) {
        document.getElementById("wrongselection").classList.remove("d-none");
        setComponentState("config");
    } else if (state != "capture") {
        startSensorCapture();
    }
})

function displayChart() {
    const ctx = document.getElementById("lineChart").getContext('2d');
    forceSenseLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '按压力量(kg)',
                backgroundColor: 'rgba(161, 198, 247, 1)',
                borderColor: 'rgb(47, 128, 237)',
                data: forceKgVals,
            }]
        },
        options: {
            scales: {
              y: {
                title: {
                  display: true,
                  text: '按压力量(kg)'
                }
              },
              x: {
                title: {
                    display: true,
                    text: '时间(s)'
                }
              }
            }     
          }
    });
}

import { i2cReadHardwareOperation, i2cWriteHardwareOperation, constructNowEvent, postHardwareOperation } from "./api";

// TODO1: add logic to detect i2c failure, platform should return that information
// TODO2: add logic to save ambient data capture and able to download

const I2C_HIGH_SPEED_KHZ = 100
const I2C_MID_SPEED_KHZ = 50
const I2C_LOW_SPEED_KHZ = 10
const SHT30_I2C_ADDR = 68
const MTS01_I2C_ADDR = 69
const AGS02MA_I2C_ADDR = 26

var sda_pin = undefined;
var scl_pin = undefined;
var timer_id = undefined;
var captured_data = [];

refreshTime();
setInterval(refreshTime, 1000);

if (localStorage.getItem("ambient_module_pin")) {
    sda_pin = parseInt(localStorage.getItem("ambient_module_pin"));
    document.getElementById("connectedPin").value = sda_pin;
    if (sda_pin !== -1) {
        scl_pin = sda_pin + 1;
        startCapture();
    }
}

function addErrorMsg (message) {
    document.getElementById('errorMsg').innerHTML = message;
    document.getElementById('errorMsg').classList.remove('d-none');
    setTimeout(removeErrorMsg, 5000);
}

function removeErrorMsg () {
    document.getElementById('errorMsg').classList.add('d-none');
}

function addStatusMsg (message) {
    document.getElementById('statusMsg').innerHTML = message;
    document.getElementById('statusMsg').classList.remove('d-none');
    setTimeout(removeStatusMsg, 5000);
}

function removeStatusMsg () {
    document.getElementById('statusMsg').classList.add('d-none')
}

document.getElementById("connectedPin").addEventListener("change", async function(event) {
    await stopCapture();
    if (event.target.value != -1) {
        if (sda_pin !== parseInt(event.target.value)) {
            sda_pin = parseInt(event.target.value);
            scl_pin = sda_pin + 1;
            await startCapture();
            localStorage.setItem("ambient_module_pin", sda_pin);
        }
    } else {
        localStorage.setItem("ambient_module_pin", event.target.value);
    }
});

function refreshTime() {
    var date = new Date();
    var time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate()
        + ' ' + date.getHours() + ':' + date.getMinutes() + ":" + date.getSeconds();
    document.getElementById("currentDate").innerHTML = `环境监测 ${time}`;
}

async function startSht30SingleShot() {
    let status = 0
    const opers = [];
    i2cWriteHardwareOperation(opers, sda_pin, scl_pin, I2C_HIGH_SPEED_KHZ, 68, 36, 11);
    const now_event = constructNowEvent(opers);
    const response = await postHardwareOperation(now_event);
    // TODO detect i2c error
    if (response === undefined) {
        addErrorMsg("和平台通信失败，请重启平台");
        status = 1;
    }
    return status;
}

async function readSht30SingleShot() {
    let status = 0;
    let humidity = 0;
    const opers = [];
    i2cReadHardwareOperation(opers, sda_pin, scl_pin, I2C_HIGH_SPEED_KHZ, SHT30_I2C_ADDR, -1, -1, 6);
    const now_event = constructNowEvent(opers);
    const response = await postHardwareOperation(now_event);
    if (response !== undefined) {
        // if (response.errorcode !== 0) {
        //     // TODO
        // } else 
        {
            const temperature = -45.0 + 175.0 * (((response["result"][0][0] << 8) + response["result"][0][1]) / 65535);
            humidity = 100.0 * (((response["result"][0][3] << 8) + response["result"][0][4]) / 65535);
            document.getElementById('humidity_value').innerHTML = humidity.toFixed(2);
        }
    } else {
        addErrorMsg("和平台通信失败，请重启平台");
    }
    return [status, humidity];
}

async function readMts01Temperature() {
    let status = 0;
    let temperature = 0;
    const opers = [];
    i2cWriteHardwareOperation(opers, sda_pin, scl_pin, I2C_MID_SPEED_KHZ, MTS01_I2C_ADDR, 204, 68);
    i2cReadHardwareOperation(opers, sda_pin, scl_pin, I2C_MID_SPEED_KHZ, MTS01_I2C_ADDR, -1, -1, 3);
    const now_event = constructNowEvent(opers);
    const response = await postHardwareOperation(now_event);
    if (response === undefined) {
        addErrorMsg("和平台通信失败，请重启平台");
        status = 1;
    } else {
        temp_val = (response["result"][1][0] << 8) + response["result"][1][1]
        if ((temp_val & (1 << 15)) != 0) {
            temp_val = temp_val - (1 << 16)
        }
        temperature = 40 + (temp_val / 256)
        console.log(temperature)
        document.getElementById('temp_value').innerHTML = temperature.toFixed(2);
    }
    return [status, temperature];
}

async function readAgs02ma() {
    let status = 0;
    let air_pollute_val = 0;
    const opers = [];
    i2cWriteHardwareOperation(opers, sda_pin, scl_pin, I2C_LOW_SPEED_KHZ, AGS02MA_I2C_ADDR, 0);
    i2cReadHardwareOperation(opers, sda_pin, scl_pin, I2C_LOW_SPEED_KHZ, AGS02MA_I2C_ADDR, -1, -1, 5);
    const now_event = constructNowEvent(opers);
    const response = await postHardwareOperation(now_event);
    if (response === undefined) {
        status = 1;
        addErrorMsg("和平台通信失败，请重启平台");
    } else {
        air_pollute_val = (response["result"][1][0] << 24) + (response["result"][1][1] << 16) + (response["result"][1][2] << 8) + (response["result"][1][3])
        document.getElementById('air_condition_val').innerHTML = air_pollute_val.toFixed(2);
        if (air_pollute_val <= 300) {
            document.getElementById('air_condition_status').innerHTML = "优良";
        } else if (air_pollute_val <= 1500) {
            document.getElementById('air_condition_status').innerHTML = "微量污染";
        } else if (air_pollute_val <= 3000) {
            document.getElementById('air_condition_status').innerHTML = "轻度污染";
        } else if (air_pollute_val <= 5000) {
            document.getElementById('air_condition_status').innerHTML = "中度污染";
        } else {
            document.getElementById('air_condition_status').innerHTML = "重度污染";
        }
    }
    return [status, air_pollute_val];
}

function convertArrayToCSV(array) {
    const headers = Object.keys(array[0]);
    const csvRows = array.map(obj => headers.map(header => obj[header]).join(','));
    return [headers.join(','), ...csvRows].join('\n');
}

function downloadBlob(content, filename, contentType) {
    // Create a blob
    var blob = new Blob([content], { type: contentType });
    var url = URL.createObjectURL(blob);
  
    // Create a link to download it
    var pom = document.createElement('a');
    pom.href = url;
    pom.setAttribute('download', filename);
    pom.click();
}

document.getElementById("downloadData").addEventListener("click", function() {
    if (captured_data.length == 0) {
        addErrorMsg("尚未捕捉到有效的数据");
    } else {
        const data_str = convertArrayToCSV(captured_data);
        downloadBlob(data_str, "环境数据.csv", "text/csv;charset=utf-8;");
    }
})

async function getAllSensors() {
    const sht30_write_status = await startSht30SingleShot();
    const [sht30_read_status, humidity] = await readSht30SingleShot();
    const [mts01_status, temperature] = await readMts01Temperature();
    const [ags02ma_status, air_condition] = await readAgs02ma();
    if (sht30_read_status | sht30_write_status | mts01_status | ags02ma_status) {
        window.scrollTo(0, 0);
        stopCapture();
    } else {
        let date = new Date();
        let time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate()
            + 'T' + date.getHours() + ':' + date.getMinutes() + ":" + date.getSeconds();
        captured_data.push({
            "time": time,
            "temperature": temperature,
            "humidity": humidity,
            "air_condition": air_condition
        })
    }
}

async function startCapture() {
    await getAllSensors();
    timer_id = setInterval(getAllSensors, 2000);
}

async function stopCapture() {
    if (timer_id !== undefined) {
        clearInterval(timer_id);
        timer_id = undefined;
    }
}

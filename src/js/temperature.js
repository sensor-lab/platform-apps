var sda_pin = parseInt(prompt("输入SDA引脚号：", "0"));
    var scl_pin = 0
    var adc_pin = 0
    if (sda_pin == 0 || sda_pin == 4) {
        scl_pin = sda_pin + 1
        adc_pin = sda_pin + 2
    } else {
        scl_pin = sda_pin - 1
        adc_pin = sda_pin - 2
    }

function refreshTime() {
    var date = new Date();
    var time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate()
        + ' ' + date.getHours() + ':' + date.getMinutes() + ":" + date.getSeconds();
    document.getElementById("currentDate").innerHTML = `环境监测 ${time}`;
}

refreshTime()
setInterval(refreshTime, 1000);

async function startSingleShot() {
    let request = '/hardware/operation'
    let body = {
        'event': 'now',
        'actions': [["i2c", 0, "write", sda_pin, scl_pin, 100, 68, 36, 11, 0]]
    }
    try {
        const response = await fetch(request, {
            method: 'post',
            body: JSON.stringify(body)
        })
    } catch (err) {
        console.error(`Error: ${err}`);
    }
}

async function readSingleShot() {
    let request = '/hardware/operation'
    let body = {
        'event': 'now',
        'actions': [["i2c", 0, "read", sda_pin, scl_pin, 100, 68, -1, -1, 6]]
    }
    try {
        const response = await fetch(request, {
            method: 'post',
            body: JSON.stringify(body)
        })
            .then(response => response.json())
            .then(response => {
                temperature = -45.0 + 175.0 * (((response["result"][0][0] << 8) + response["result"][0][1]) / 65535)
                humidity = 100.0 * (((response["result"][0][3] << 8) + response["result"][0][4]) / 65535)
                console.log(humidity)
                
                document.getElementById('humidity_value').innerHTML = humidity.toFixed(3);
            })
    } catch (err) {
        console.error(`Error: ${err}`);
        // Dev purpose
        document.getElementById('humidity_value').innerHTML = "12.34";

    }
}

async function readMts01Temperature() {
    let request = '/hardware/operation'
    let body = {
        'event': 'now',
        'actions': [["i2c", 0, "write", sda_pin, scl_pin, 50, 69, 204, 68, 0], ["i2c", 0, "read", sda_pin, scl_pin, 50, 69, -1, -1, 3]]
    }
    try {
        const response = await fetch(request, {
            method: 'post',
            body: JSON.stringify(body)
        })
            .then(response => response.json())
            .then(response => {
                temp_val = (response["result"][1][0] << 8) + response["result"][1][1]
                if ((temp_val & (1 << 15)) != 0) {
                    temp_val = temp_val - (1 << 16)
                }
                temperature = 40 + (temp_val / 256)
                console.log(temperature)
                document.getElementById('temp_value').innerHTML = temperature.toFixed(3);
            })
    } catch (err) {
        console.error(`Error: ${err}`);
        // Dev purpose
        document.getElementById('temp_value').innerHTML = "32.18";

    }
}

async function readAgs02ma() {
    let request = '/hardware/operation'
    let body = {
        'event': 'now',
        'actions': [["i2c", 0, "write", sda_pin, scl_pin, 10, 26, 0, -1, 0], ["i2c", 0, "read", sda_pin, scl_pin, 10, 26, -1, -1, 5]]
    }
    try {
        const response = await fetch(request, {
            method: 'post',
            body: JSON.stringify(body)
        })
            .then(response => response.json())
            .then(response => {
                air_pollute_val = (response["result"][1][0] << 24) + (response["result"][1][1] << 16) + (response["result"][1][2] << 8) + (response["result"][1][3])
                document.getElementById('air_condition_val').innerHTML = air_pollute_val.toFixed(3);
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
            })
    } catch (err) {
        console.error(`Error: ${err}`);

        // Dev purpose
        document.getElementById('air_condition_val').innerHTML = "150.00";
        document.getElementById('air_condition_status').innerHTML = "优良";

    }
    return
}

async function readGasSensor() {
    let request = '/hardware/operation'
    let body = {
        'event': 'now',
        'actions': [["adc", adc_pin, "3.1v"]]
    }
    try {
        const response = await fetch(request, {
            method: 'post',
            body: JSON.stringify(body)
        })
            .then(response => response.json())
            .then(response => {
                gas_level = response["result"][0][0] / 4096 * 3.1
                document.getElementById('flammable_gas_val').innerHTML = gas_level.toFixed(3);
                if (gas_level <= 2.5) {
                    document.getElementById('flammable_gas_status').innerHTML = "未监测到可燃气体";
                } else {
                    document.getElementById('flammable_gas_status').innerHTML = "存在可燃气体";
                }
            })
    } catch (err) {
        console.error(`Error: ${err}`);

        // Dev purpose
        document.getElementById('flammable_gas_val').innerHTML = "1.008";
        document.getElementById('flammable_gas_status').innerHTML = "未监测到可燃气体";
    }
}

async function getAllSensors() {
    await startSingleShot()
    await readSingleShot()
    await readMts01Temperature()
    await readAgs02ma()
    await readGasSensor()
}

getAllSensors()
setInterval(getAllSensors, 1000);
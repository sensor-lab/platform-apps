const bootstrap = require('bootstrap')
import {
  delayHardwareOperation,
  i2cReadHardwareOperation,
  i2cWriteHardwareOperation,
  addReturnInformation,
  constructNowEvent,
  constructScheduleEvent,
  postHardwareOperation
} from './api'
import Chart from 'chart.js/auto'

const I2C_HIGH_SPEED_KHZ = 100
const I2C_MID_SPEED_KHZ = 50
const I2C_LOW_SPEED_KHZ = 10
const SHT30_I2C_ADDR = 68
const MTS01_I2C_ADDR = 69
const AGS02MA_I2C_ADDR = 26
// update environment data every 15 seconds
const ENVIRONMENT_UPDATE_SEC = 15

var loaded_env_data = []
var sda_pin = undefined
var scl_pin = undefined
var timer_id = undefined

if (localStorage.getItem('ambient_module_pin')) {
  sda_pin = parseInt(localStorage.getItem('ambient_module_pin'))
  document.getElementById('connectedPin').value = sda_pin
  if (sda_pin !== -1) {
    scl_pin = sda_pin + 1
    startCapture()
  }
}

function addErrorMsg (message) {
  document.getElementById('errorMsg').innerHTML = message
  document.getElementById('errorMsg').classList.remove('d-none')
  setTimeout(removeErrorMsg, 5000)
}

function removeErrorMsg () {
  document.getElementById('errorMsg').classList.add('d-none')
}

function addStatusMsg (message) {
  document.getElementById('statusMsg').innerHTML = message
  document.getElementById('statusMsg').classList.remove('d-none')
  setTimeout(removeStatusMsg, 5000)
}

function removeStatusMsg () {
  document.getElementById('statusMsg').classList.add('d-none')
}

async function startSht30SingleShot () {
  let status = 0
  const opers = []
  i2cWriteHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    I2C_HIGH_SPEED_KHZ,
    SHT30_I2C_ADDR,
    36,
    11
  )
  const now_event = constructNowEvent(opers)
  const response = await postHardwareOperation(now_event)
  // TODO detect i2c error
  if (response === undefined) {
    addErrorMsg('和平台通信失败，请重启平台')
    status = 1
  } else if (response.errorcode !== 0) {
    addErrorMsg('和环境模块通信失败，请检查连接和引脚号')
    status = 1
  }
  return status
}

async function readSht30SingleShot () {
  let status = 0
  let humidity = 0
  const opers = []
  i2cReadHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    I2C_HIGH_SPEED_KHZ,
    SHT30_I2C_ADDR,
    -1,
    -1,
    6
  )
  const now_event = constructNowEvent(opers)
  const response = await postHardwareOperation(now_event)
  if (response !== undefined) {
    if (response.errorcode !== 0) {
      addErrorMsg('和环境模块通信失败，请检查连接和引脚号')
      status = 1
    } else {
      const temperature =
        -45.0 +
        175.0 *
          (((response['result'][0][0] << 8) + response['result'][0][1]) / 65535)
      humidity =
        100.0 *
        (((response['result'][0][3] << 8) + response['result'][0][4]) / 65535)
      document.getElementById('humidity_value').innerHTML = humidity.toFixed(2)
    }
  } else {
    addErrorMsg('和平台通信失败，请重启平台')
  }
  return [status, humidity]
}

async function readMts01Temperature () {
  let status = 0
  let temperature = 0
  const opers = []
  i2cWriteHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    I2C_MID_SPEED_KHZ,
    MTS01_I2C_ADDR,
    204,
    68
  )
  i2cReadHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    I2C_MID_SPEED_KHZ,
    MTS01_I2C_ADDR,
    -1,
    -1,
    3
  )
  const now_event = constructNowEvent(opers)
  const response = await postHardwareOperation(now_event)
  if (response === undefined) {
    addErrorMsg('和平台通信失败，请重启平台')
    status = 1
  } else if (response.errorcode !== 0) {
    addErrorMsg('和环境模块通信失败，请检查连接和引脚号')
    status = 1
  } else {
    let temp_val = (response['result'][1][0] << 8) + response['result'][1][1]
    if ((temp_val & (1 << 15)) != 0) {
      temp_val = temp_val - (1 << 16)
    }
    temperature = 40 + temp_val / 256
    document.getElementById('temp_value').innerHTML = temperature.toFixed(2)
  }
  return [status, temperature]
}

async function readAgs02ma () {
  let status = 0
  let air_pollute_val = 0
  const opers = []
  i2cWriteHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    I2C_LOW_SPEED_KHZ,
    AGS02MA_I2C_ADDR,
    0
  )
  i2cReadHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    I2C_LOW_SPEED_KHZ,
    AGS02MA_I2C_ADDR,
    -1,
    -1,
    5
  )
  const now_event = constructNowEvent(opers)
  const response = await postHardwareOperation(now_event)
  if (response === undefined) {
    status = 1
    addErrorMsg('和平台通信失败，请重启平台')
  } else if (response.errorcode !== 0) {
    addErrorMsg('和环境模块通信失败，请检查连接和引脚号')
    status = 1
  } else {
    air_pollute_val =
      (response['result'][1][0] << 24) +
      (response['result'][1][1] << 16) +
      (response['result'][1][2] << 8) +
      response['result'][1][3]
    document.getElementById('air_condition_val').innerHTML =
      air_pollute_val.toFixed(2)
    if (air_pollute_val <= 300) {
      document.getElementById('air_condition_status').innerHTML = '优良'
    } else if (air_pollute_val <= 1500) {
      document.getElementById('air_condition_status').innerHTML = '微量污染'
    } else if (air_pollute_val <= 3000) {
      document.getElementById('air_condition_status').innerHTML = '轻度污染'
    } else if (air_pollute_val <= 5000) {
      document.getElementById('air_condition_status').innerHTML = '中度污染'
    } else {
      document.getElementById('air_condition_status').innerHTML = '重度污染'
    }
  }
  return [status, air_pollute_val]
}

function convertArrayToCSV (array) {
  const headers = Object.keys(array[0])
  const csvRows = array.map(obj => headers.map(header => obj[header]).join(','))
  const headers_translated = ['时间', '温度', '湿度', '空气质量']
  return [headers_translated.join(','), ...csvRows].join('\n')
}

function downloadBlob (content, filename, contentType) {
  // Create a blob
  var blob = new Blob([content], { type: contentType })
  var url = URL.createObjectURL(blob)

  // Create a link to download it
  var pom = document.createElement('a')
  pom.href = url
  pom.setAttribute('download', filename)
  pom.click()
}

async function getAllSensors () {
  const sht30_write_status = await startSht30SingleShot()
  const [sht30_read_status, humidity] = await readSht30SingleShot()
  const [mts01_status, temperature] = await readMts01Temperature()
  const [ags02ma_status, air_condition] = await readAgs02ma()
  if (sht30_read_status | sht30_write_status | mts01_status | ags02ma_status) {
    window.scrollTo(0, 0)
    stopCapture()
  }
}

async function startCapture () {
  await getAllSensors()
  timer_id = setInterval(getAllSensors, ENVIRONMENT_UPDATE_SEC * 1000)
}

async function stopCapture () {
  if (timer_id !== undefined) {
    clearInterval(timer_id)
    timer_id = undefined
  }
}

async function plotEnvironmentData (env_data) {
  new Chart(document.getElementById('environmentPlot'), {
    type: 'line',
    data: {
      labels: env_data.map(row => row.time),
      datasets: [
        {
          label: '温度',
          borderColor: 'rgb(192, 0, 0)',
          data: env_data.map(row => row.temperature)
        },
        {
          label: '湿度',
          borderColor: 'rgb(75, 192, 192)',
          data: env_data.map(row => row.humidity)
        },
        {
          label: '空气质量',
          borderColor: 'rgb(0, 0, 192)',
          data: env_data.map(row => row.aircondition)
        }
      ]
    }
  })
}

document
  .getElementById('connectedPin')
  .addEventListener('change', async function (event) {
    await stopCapture()
    if (event.target.value != -1) {
      if (sda_pin !== parseInt(event.target.value)) {
        sda_pin = parseInt(event.target.value)
        scl_pin = sda_pin + 1
        await startCapture()
        localStorage.setItem('ambient_module_pin', sda_pin)
      }
    } else {
      localStorage.setItem('ambient_module_pin', event.target.value)
    }
  })

document
  .getElementById('startTimerBtn')
  .addEventListener('click', async function (event) {
    if (sda_pin === undefined) {
      addErrorMsg('请选择环境模块和平台连接引脚')
    } else {
      const opers = []
      removeErrorMsg()
      // temperature: mts01 sensor
      i2cWriteHardwareOperation(
        opers,
        sda_pin,
        scl_pin,
        I2C_MID_SPEED_KHZ,
        MTS01_I2C_ADDR,
        204,
        68
      )
      i2cReadHardwareOperation(
        opers,
        sda_pin,
        scl_pin,
        I2C_MID_SPEED_KHZ,
        MTS01_I2C_ADDR,
        -1,
        -1,
        3
      )
      // humidity: sht30
      i2cWriteHardwareOperation(
        opers,
        sda_pin,
        scl_pin,
        I2C_HIGH_SPEED_KHZ,
        SHT30_I2C_ADDR,
        36,
        11
      )
      delayHardwareOperation(opers, 'ms', 50) // give 50ms for data ready
      i2cReadHardwareOperation(
        opers,
        sda_pin,
        scl_pin,
        I2C_HIGH_SPEED_KHZ,
        SHT30_I2C_ADDR,
        -1,
        -1,
        6
      )
      delayHardwareOperation(opers, 'ms', 50)

      // air condition: ags02
      i2cWriteHardwareOperation(
        opers,
        sda_pin,
        scl_pin,
        I2C_LOW_SPEED_KHZ,
        AGS02MA_I2C_ADDR,
        0
      )
      i2cReadHardwareOperation(
        opers,
        sda_pin,
        scl_pin,
        I2C_LOW_SPEED_KHZ,
        AGS02MA_I2C_ADDR,
        -1,
        -1,
        5
      )
      delayHardwareOperation(opers, 'ms', 50)

      const interval = document.getElementById('timerIntervalSelect').value
      const sch_event = constructScheduleEvent(opers, interval)
      const sch_ret_event = addReturnInformation(sch_event, [
        'file',
        'data.bin'
      ])

      console.log(`sch event: ${JSON.stringify(sch_ret_event)}`)

      const ret = await postHardwareOperation(sch_event)
      if (ret === undefined) {
        addErrorMsg('定时功能开启失败，请重启平台并重新打开该应用')
      } else {
        addStatusMsg('定时功能开启成功，请关闭该窗口')
      }
    }
  })

document
  .getElementById('fileSelect')
  .addEventListener('change', async function (event) {
    var input = event.target
    var reader = new FileReader()
    removeErrorMsg()
    reader.onload = async function () {
      const lines = reader.result.split(/[\r\n]+/g)
      loaded_env_data = []
      lines.forEach(line => {
        let line_json
        try {
          line_json = JSON.parse(line)
          if (line_json.data.errorcode === 0) {
            // calculate temperature value
            let temperature
            let humidity
            let aircondition
            let temp_val =
              (line_json['data']['result'][1][0] << 8) +
              line_json['data']['result'][1][1]
            if ((temp_val & (1 << 15)) != 0) {
              temp_val = temp_val - (1 << 16)
            }
            temperature = 40 + temp_val / 256
            temperature = temperature.toFixed(2)

            // calculate humidity value
            humidity =
              100.0 *
              (
                ((line_json['data']['result'][4][3] << 8) +
                  line_json['data']['result'][4][4]) /
                65535
              ).toFixed(2)

            // calculate aircondition value
            aircondition =
              (line_json['data']['result'][7][0] << 24) +
              (line_json['data']['result'][7][1] << 16) +
              (line_json['data']['result'][7][2] << 8) +
              line_json['data']['result'][7][3]

            loaded_env_data.push({
              time: line_json['time'],
              temperature: temperature,
              humidity: humidity,
              aircondition: aircondition
            })
          }
        } catch (error) {
          console.log(`Failed to parse line to JSON: ${line}`)
        }
      })
      if (loaded_env_data.length > 0) {
        await plotEnvironmentData(loaded_env_data)
      }
    }
    reader.readAsText(input.files[0])
  })

document
  .getElementById('downloadEnvData')
  .addEventListener('click', function () {
    if (loaded_env_data.length == 0) {
      addErrorMsg('请先加载环境数据')
    } else {
      const data_str = convertArrayToCSV(loaded_env_data)
      downloadBlob(data_str, '环境数据.csv', 'text/csv;charset=utf-8;')
    }
  })

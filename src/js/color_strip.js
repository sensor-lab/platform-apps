import { setupAdvanceOutput, startAdvanceOutput } from './api'

const LEDS_PER_METER = 60

var data_pin = -1
var color_strip_type = -1
var color_strip_length = -1
var color_scheme = -1

// Color theme selector
const colorMap = new Map()
colorMap.set('bluesky', ['#00a6fb', '#0582ca', '#006494', '#003554', '#051923'])
colorMap.set('greenmountain', [
  '#5bba6f',
  '#3fa34d',
  '#2a9134',
  '#137547',
  '#054a29'
])
colorMap.set('redish', ['#ea8c55', '#c75146', '#ad2e24', '#81171b', '#540804'])
colorMap.set('rainbow', [
  '#ff0000',
  '#ffa500',
  '#ffff00',
  '#008000',
  '#0000ff',
  '#4b0082',
  '#ee82ee'
])

// Strip setting
const ledStripMap = new Map()
ledStripMap.set('ws2811', [2.5, 0.4, 2.5, 1.25])
ledStripMap.set('ws2812', [1.15, 0.35, 1.3, 0.7])

const makeRepeated = (arr, repeats) =>
  [].concat(...Array.from({ length: repeats }, () => arr))

function checkAllRequiredFields (setup) {
  var error = 0
  if (data_pin == -1) {
    addErrorMsg('请在列表中选择正确的连接引脚。')
    error = 1
  }

  if (color_strip_type == -1) {
    addErrorMsg('请在列表中选择正确的灯带IC。')
    error = 1
  }

  if (color_strip_length == -1) {
    addErrorMsg('请在列表中选择正确的灯带长度。')
    error = 1
  }

  if (color_scheme == -1 && setup == true) {
    addErrorMsg('请在列表中选择正确的灯带主题。')
    error = 1
  }
  return error
}

document
  .getElementById('submitBut')
  .addEventListener('click', async function (event) {
    if (checkAllRequiredFields(true) == 0) {
      var timing = ledStripMap.get(color_strip_type)
      await setupAdvanceOutput(
        data_pin,
        timing[0],
        timing[1],
        timing[2],
        timing[3]
      )
      var colorCodes = colorMap.get(color_scheme)
      var colorData = []
      var cycle = parseInt(
        (LEDS_PER_METER * color_strip_length) / colorCodes.length
      )
      if (color_strip_type == 0) {
        // WS2811
        colorCodes.map(code => {
          let codeInt = parseInt(code.substr(1), 16)
          let color_red = (codeInt >> 16) & 0xff
          let color_green = (codeInt >> 8) & 0xff
          let color_blue = codeInt & 0xff
          colorData.push(color_red, color_green, color_blue)
        })
        await startAdvanceOutput(data_pin, cycle, colorData)
      } else {
        // WS2812
        colorCodes.map(code => {
          let codeInt = parseInt(code.substr(1), 16)
          let color_red = (codeInt >> 16) & 0xff
          let color_green = (codeInt >> 8) & 0xff
          let color_blue = codeInt & 0xff
          colorData.push(color_green, color_red, color_blue)
        })
        colorData = makeRepeated(colorData, cycle)
        await startAdvanceOutput(data_pin, 0, colorData)
      }
    }
  })

document
  .getElementById('shutdownBut')
  .addEventListener('click', async function (event) {
    if (checkAllRequiredFields(false) == 0) {
      timing = ledStripMap.get(color_strip_type)
      await setupAdvanceOutput(
        data_pin,
        timing[0],
        timing[1],
        timing[2],
        timing[3]
      )
      if (color_strip_type == 0) {
        // WS2811
        var colorData = [0, 0, 0]
        var cycle = LEDS_PER_METER * color_strip_length
        await startAdvanceOutput(data_pin, cycle, colorData)
      } else {
        // WS2812
        var colorData = [0, 0, 0]
        var cycle = LEDS_PER_METER * color_strip_length
        colorData = makeRepeated(colorData, cycle)
        await startAdvanceOutput(data_pin, 0, colorData)
      }
    }
  })

function addStripMsg () {
  if (color_strip_type != -1 && color_strip_length != -1) {
    let msg = `选择的灯带为${color_strip_length}米 ${color_strip_type} 灯带`
    document.getElementById(
      'setupMessage'
    ).children[0].children[0].children[0].innerHTML = msg
    document.getElementById('setupMessage').classList.remove('d-none')
  }
}

function addErrorMsg (message) {
  document.getElementById('errorMsg').innerHTML = message
  document.getElementById('errorMsg').classList.remove('d-none')
  document.getElementById('setupMessage').classList.add('d-none')
}

document
  .getElementById('pinSelect')
  .addEventListener('change', function (event) {
    var ele = document.getElementById('pinSelect')
    if (ele.options[ele.selectedIndex].value == -1) {
      addErrorMsg('请在列表中选择正确的连接引脚。')
      document.getElementById('displayPins').classList.add('d-none')
    } else {
      data_pin = parseInt(ele.options[ele.selectedIndex].value)
      document.getElementById(
        'displayPins'
      ).children[0].children[0].children[1].innerHTML = '平台引脚' + data_pin
      document.getElementById('displayPins').classList.remove('d-none')
      document.getElementById('errorMsg').classList.add('d-none')
      addStripMsg()
    }
  })

document
  .getElementById('colorStripType')
  .addEventListener('change', function (event) {
    var ele = document.getElementById('colorStripType')
    if (ele.options[ele.selectedIndex].value == -1) {
      addErrorMsg('请在列表中选择正确的灯带IC。')
    } else {
      color_strip_type = ele.options[ele.selectedIndex].value
      document.getElementById('errorMsg').classList.add('d-none')
      addStripMsg()
    }
  })

document
  .getElementById('colorStripLength')
  .addEventListener('change', function (event) {
    var ele = document.getElementById('colorStripLength')
    if (ele.options[ele.selectedIndex].value == -1) {
      addErrorMsg('请在列表中选择正确的灯带长度。')
    } else {
      color_strip_length = parseInt(ele.options[ele.selectedIndex].value)
      document.getElementById('errorMsg').classList.add('d-none')
      addStripMsg()
    }
  })

document
  .getElementById('colorThemeSelector')
  .addEventListener('change', function (event) {
    var ele = document.getElementById('colorThemeSelector')
    if (ele.options[ele.selectedIndex].value == -1) {
      addErrorMsg('请在列表中选择正确的灯带主题。')
      colorMap.forEach((val, key, map) => {
        document.getElementById(key).classList.add('d-none')
      })
    } else {
      color_scheme = ele.options[ele.selectedIndex].value
      document.getElementById('errorMsg').classList.add('d-none')
      addStripMsg()

      colorMap.forEach((val, key, map) => {
        if (key === color_scheme) {
          document.getElementById(key).classList.remove('d-none')
        } else {
          document.getElementById(key).classList.add('d-none')
        }
      })
    }
  })

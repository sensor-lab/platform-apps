import {
  dvpSetHardwareOperation,
  dvpCaptureHardwareOperation,
  dvpReadHardwareOperation,
  dvpResetHardwareOperation,
  constructNowEvent,
  postHardwareOperation
} from 'sensorsparks.api'

var sda_pin = 0
var scl_pin = 1
var xclk_pin = 5
var pclk_pin = 4
var vsync_pin = 2
var href_pin = 3
var reset_pin = -1
var data_0_pin = 12
var format = 'jpeg'
var pic_size = '640x480'
var rotate_degree = 0

const pic_size_ele = document.getElementById('pictureSize')
const shot_time_ele = document.getElementById('shotTime')
const pic_rotate_ele = document.getElementById('imageRotate')

document.getElementById(
  'displayPins'
).children[0].children[0].children[1].innerHTML = '平台引脚' + sda_pin
document.getElementById(
  'displayPins'
).children[1].children[0].children[1].innerHTML = '平台引脚' + scl_pin
document.getElementById(
  'displayPins'
).children[2].children[0].children[1].innerHTML = '平台引脚' + xclk_pin
document.getElementById(
  'displayPins'
).children[3].children[0].children[1].innerHTML = '平台引脚' + pclk_pin
document.getElementById(
  'displayPins'
).children[4].children[0].children[1].innerHTML = '平台引脚' + vsync_pin
document.getElementById(
  'displayPins'
).children[5].children[0].children[1].innerHTML = '平台引脚' + href_pin
if (reset_pin == -1) {
  document.getElementById(
    'displayPins'
  ).children[6].children[0].children[1].innerHTML = '未连接'
} else {
  document.getElementById(
    'displayPins'
  ).children[6].children[0].children[1].innerHTML = '平台引脚' + reset_pin
}

document.getElementById(
  'displayPins'
).children[7].children[0].children[1].innerHTML =
  '平台引脚' + data_0_pin + '至' + (data_0_pin + 7)

function addErrorMsg (message) {
  document.getElementById('errorMsg').innerHTML = message
  document.getElementById('errorMsg').classList.remove('d-none')
}

function removeErrorMsg () {
  document.getElementById('errorMsg').classList.add('d-none')
}

function addStatusMsg (message) {
  document.getElementById('statusMsg').innerHTML = message
  document.getElementById('statusMsg').classList.remove('d-none')
}

function removeStatusMsg () {
  document.getElementById('statusMsg').classList.add('d-none')
}

function combineAndDisplayJPEG (base64Chunks) {
  // convert to an array of binary to handle trailing = in base64
  const byte_arrays = base64Chunks.map((chunk) => {
    const binary = atob(chunk)
    const len = binary.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  })
  // merge to one single array
  const totalLength = byte_arrays.reduce((sum, a) => sum + a.length, 0)
  const image_bytes = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of byte_arrays) {
    image_bytes.set(arr, offset)
    offset += arr.length
  }

  // convert back to base64 to display
  let binary = ''
  const chunkSize = 0x8000 // Avoid call stack overflow
  for (let i = 0; i < image_bytes.length; i += chunkSize) {
    const chunk = image_bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, chunk)
  }
  const combined_base64 = btoa(binary)

  var img = document.querySelector('#photo')
  img.src = `data:image/jpeg;base64,${combined_base64}`
  img.alt = 'Combined JPEG'
  img.style.maxWidth = '100%'
  img.style.height = 'auto'
  img.style.transform = `rotate(${rotate_degree}deg)`
}

async function CaptureFrame () {
  var opers = []
  // set dvp and then capture
  dvpSetHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    xclk_pin,
    pclk_pin,
    vsync_pin,
    href_pin,
    reset_pin,
    data_0_pin,
    format,
    pic_size
  )
  dvpCaptureHardwareOperation(opers)
  let now_event = constructNowEvent(opers)
  let response = await postHardwareOperation(now_event)

  if (response['errorcode'] !== 0) {
    addErrorMsg('无法监测到照相机，请确保照相机模块连接正常')
    removeStatusMsg()
    return []
  } else {
    let image_data = []
    let more_data = true
    while (more_data) {
      opers = []
      dvpReadHardwareOperation(opers)
      now_event = constructNowEvent(opers)
      response = await postHardwareOperation(now_event)
      if (response['errorcode'] !== 0) {
        more_data = false
      } else {
        image_data.push(response['result'][0][0])
      }
    }
    console.log('read image complete')
    return image_data
  }
}

pic_size_ele.addEventListener('change', function (event) {
  pic_size = event.target.value
})

pic_rotate_ele.addEventListener('click', function (event) {
  rotate_degree = (rotate_degree + 180) % 360
  var img = document.querySelector('#photo')
  img.style.transform = `rotate(${rotate_degree}deg)`
})

document
  .getElementById('cameraOneshot')
  .addEventListener('click', async function () {
    shot_time_ele.style.display = 'none'
    const image_data = await CaptureFrame()
    if (image_data.length > 0) {
      combineAndDisplayJPEG(image_data)
      removeErrorMsg()
      removeStatusMsg()
      shot_time_ele.innerHTML = new Date().toLocaleString('zh-CN', {
        hour12: false
      })
      shot_time_ele.style.display = 'block'
    }
  })

document
  .getElementById('cameraReset')
  .addEventListener('click', async function () {
    const opers = []
    dvpResetHardwareOperation(opers)
    const now_event = constructNowEvent(opers)
    const response = await postHardwareOperation(now_event)
    if (response['errorcode'] !== 0) {
      addErrorMsg('照相机重置失败，请重试')
      removeStatusMsg()
    } else {
      removeErrorMsg()
      addStatusMsg('照相机重置成功')
    }
  })

import {
  i2sSetupHardwareOperation,
  i2sStartHardwareOperation,
  i2sStopHardwareOperation,
  constructNowEvent,
  postHardwareOperation,
} from "sensorsparks.api";

const start_button_ele = document.getElementById("startButton");
const stop_button_ele = document.getElementById("stopButton");
const display_pins_ele = document.getElementById("displayPins");
const connected_pin_ele = document.getElementById("connectedPin");
const sample_rate_ele = document.getElementById("sampleRateSelection");
const error_msg_ele = document.getElementById("errorMsg");
const NUM_OF_CHANNELS = 2;  // inmp output stereo format

var data_in_pin = undefined
var sclk_pin = undefined
var lrsclk_pin = undefined
var capturing_in_process = 0;
var sample_rate = 0;

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function encodeWAV(response_data) {
  // convert response_data to 24-bit wav samples
  const byteArray = new Uint8Array(response_data);
  const samples = new Uint32Array(byteArray.buffer, byteArray.byteOffset, byteArray.length / 4).map(num => num / 2); // /2 as inmap441 - 1 bit offset

  // write into wav file
  const buffer = new ArrayBuffer(44 + samples.length * 3);    // *3 as inmp441 is 24-bit sample length
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + samples.length * 3, true);   // *3 as inmp441 is 24-bit sample length
  // RIFF type
  writeString(view, 8, 'WAVE');
  // Format chunk identifier
  writeString(view, 12, 'fmt ');
  // Format chunk length
  view.setUint32(16, 16, true);
  // Sample format (raw)
  view.setUint16(20, 1, true);
  // Channel count
  view.setUint16(22, NUM_OF_CHANNELS, true);
  // Sample rate
  view.setUint32(24, sample_rate, true);
  // Byte rate (sample rate * block align)
  view.setUint32(28, sample_rate * NUM_OF_CHANNELS * 3, true);
  // Block align (channel count * bytes per sample)
  view.setUint16(32, NUM_OF_CHANNELS * 3, true);
  // Bits per sample
  view.setUint16(34, NUM_OF_CHANNELS * 3 * 8, true);
  // Data chunk identifier
  writeString(view, 36, 'data');
  // Data chunk length
  view.setUint32(40, samples.length * 3, true);

  // Write the PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 3) {
    view.setUint8(offset, samples[i] & 0xff);
    view.setUint8(offset + 1, (samples[i] >> 8) & 0xff);
    view.setUint8(offset + 2, (samples[i] >> 16) & 0xff);
  }

  return new Blob([view], { type: 'audio/wav' });
}

async function playAudio(wav_data) {
  // Create an object URL for the Blob
  const url = URL.createObjectURL(wav_data);

  // Create an anchor element
  const a = document.createElement('a');
  a.href = url;
  a.download = 'download.wav';
  
  // Trigger the download
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);

  // Create an audio element and play it
  const audio = new Audio(url);
  audio.onerror = (e) => {
    console.error('Audio playback error:', e);
    URL.revokeObjectURL(url); // Clean up
  };
  audio.onended = () => {
    URL.revokeObjectURL(url); // Clean up after playback
  };
  audio.play().catch(e => console.error('Playback failed:', e));
}

connected_pin_ele.addEventListener("change", function (event) {
    if (event.target.value !== -1) {
      data_in_pin = parseInt(connected_pin_ele.options[connected_pin_ele.selectedIndex].value);
      sclk_pin = data_in_pin + 1
      lrsclk_pin = sclk_pin + 1
      display_pins_ele.children[0].children[0].children[1].innerHTML = "平台引脚" + data_in_pin;
      display_pins_ele.children[1].children[0].children[1].innerHTML = "平台引脚" + sclk_pin;
      display_pins_ele.children[2].children[0].children[1].innerHTML = "平台引脚" + lrsclk_pin;
      display_pins_ele.classList.remove("d-none");
    }
  });

start_button_ele.addEventListener("click", async function(event) {
  if (data_in_pin == undefined || sample_rate_ele.selectedIndex == 0) {
    error_msg_ele.classList.remove("d-none");
  } else {
    error_msg_ele.classList.add("d-none");
    // setup
    const response_data = [];
    sample_rate = parseInt(sample_rate_ele.options[sample_rate_ele.selectedIndex].value);
    let opers = []
    i2sSetupHardwareOperation(opers, 0, data_in_pin, undefined, sclk_pin, lrsclk_pin, undefined, 32, "stereo", sample_rate);
    let now_event = constructNowEvent(opers);
    let response = await postHardwareOperation(now_event);

    if (response["errorcode"] === 0) {
      capturing_in_process = true;
      start_button_ele.classList.add("d-none");
      stop_button_ele.classList.remove("d-none");

      while (capturing_in_process) {
        opers = [];
        i2sStartHardwareOperation(opers, 0, "read", 4000, undefined);
        now_event = constructNowEvent(opers);
        response = await postHardwareOperation(now_event);
        if (response["errorcode"] === 0) {
          response_data.push(...Uint8Array.from(Buffer.from(response["result"][0][0], 'base64')))
          } else {
          console.log("capture error")
          break;
        }
      }

      opers = [];
      i2sStopHardwareOperation(opers, 0);
      now_event = constructNowEvent(opers);
      response = await postHardwareOperation(now_event);

      const wav = encodeWAV(response_data);
      await playAudio(wav);

    } else {
      error_msg_ele.classList.remove("d-none");
    }
  }
});

stop_button_ele.addEventListener("click", function(event) {
  capturing_in_process = false;
  start_button_ele.classList.remove("d-none");
  stop_button_ele.classList.add("d-none");
});
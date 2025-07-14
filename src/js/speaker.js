import {
  i2sSetupHardwareOperation,
  i2sStartHardwareOperation,
  i2sStopHardwareOperation,
  constructNowEvent,
  postHardwareOperation,
} from "sensorsparks.api";

const wave_file_selector_ele = document.getElementById("wavFileSelector");
const wave_info_table_parent = document.getElementById("fileInfo");
const wave_info_table = document.getElementById("infoTable");
const start_button_ele = document.getElementById("startButton");
const stop_button_ele = document.getElementById("stopButton");
const connected_pin_ele = document.getElementById("connectedPin");
const display_pins_ele = document.getElementById("displayPins");
const error_msg_ele  =  document.getElementById("errorMsg");
const status_msg_ele  =  document.getElementById("statusMsg");

const REQUEST_DATA_LEN = 6000;

var data_out_pin = undefined;
var sclk_pin = undefined;
var lrsclk_pin = undefined;
var filesize = undefined;
var num_channels = undefined;
var sample_rate = undefined;
var shrink_ratio = undefined;
var bits_per_sample = undefined;
var pcm_data = [];
var playing_in_progress = false;

function processWavFile(filename, uint8data) {
  const wav_header = Array.from(uint8data.slice(0, 44))
  const view = new DataView(new Uint8Array(wav_header).buffer);
  filesize = view.getUint32(4, true);
  num_channels = view.getUint16(22, true);
  sample_rate = view.getUint32(24, true);
  bits_per_sample = view.getUint16(34, true);

  wave_info_table.children[0].children[0].children[1].innerHTML = filename
  wave_info_table.children[0].children[1].children[1].innerHTML = `${filesize + 8} Bytes`;   // +8 per standard
  wave_info_table.children[0].children[2].children[1].innerHTML = `${sample_rate} Hz`;
  if (sample_rate > 16000) {
    status_msg_ele.classList.remove("d-none");
    shrink_ratio = 16000 / sample_rate;
  } else {
    shrink_ratio = undefined;
  }
  if (num_channels == 1) {
    wave_info_table.children[0].children[3].children[1].innerHTML = "单声道"
  } else if (num_channels == 2) {
    wave_info_table.children[0].children[3].children[1].innerHTML = "双声道"
  } else {
    wave_info_table.children[0].children[3].children[1].innerHTML = "未知"
  }
  wave_info_table.children[0].children[4].children[1].innerHTML = `${bits_per_sample / num_channels} bits`
  wave_info_table_parent.classList.remove("d-none");
  if (shrink_ratio) {
    pcm_data = uint8data.slice(44);
  } else {
    pcm_data = uint8data.slice(44);
  }
}

wave_file_selector_ele.addEventListener("change", async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    // Read file as ArrayBuffer
    const reader = new FileReader();
    reader.onload = function(e) {
      const arrayBuffer = e.target.result;
      const uint8Array = new Uint8Array(arrayBuffer);
      processWavFile(file.name, uint8Array);
    };

    reader.onerror = function() {
      alert('Error reading file');
    };
    
    reader.readAsArrayBuffer(file);
});

start_button_ele.addEventListener("click", async function(event) {
  if (data_out_pin === undefined || pcm_data.length === 0) {
    error_msg_ele.classList.remove("d-none");
  } else {
    error_msg_ele.classList.add("d-none");

    // setup
    let opers = []
    if (shrink_ratio === undefined) {
      i2sSetupHardwareOperation(opers, 0, undefined, data_out_pin, sclk_pin, lrsclk_pin, 
        undefined, bits_per_sample, num_channels == 1 ? "mono":"stereo", sample_rate);
    } else {
      i2sSetupHardwareOperation(opers, 0, undefined, data_out_pin, sclk_pin, lrsclk_pin, 
        undefined, bits_per_sample, num_channels == 1 ? "mono":"stereo", 16000);
    }
    
    let now_event = constructNowEvent(opers);
    let response = await postHardwareOperation(now_event);

    // playing
    if (response["errorcode"] === 0) {
      start_button_ele.classList.add("d-none");
      stop_button_ele.classList.remove("d-none");
      playing_in_progress = true;
      let offset = 0;
      while (offset < pcm_data.length && playing_in_progress === true) {
        opers = [];
        if (offset + REQUEST_DATA_LEN <= pcm_data.length) {
          i2sStartHardwareOperation(opers, 0, "write", REQUEST_DATA_LEN, pcm_data.slice(offset, offset + REQUEST_DATA_LEN));
          offset += REQUEST_DATA_LEN;
        } else {
          i2sStartHardwareOperation(opers, 0, "write", pcm_data.length - offset, pcm_data.slice(offset));
          offset  = pcm_data.length;
        }
        let now_event = constructNowEvent(opers);
        let response = await postHardwareOperation(now_event);
      }

      opers = [];
      i2sStopHardwareOperation(opers, 0);
      now_event = constructNowEvent(opers);
      response = await postHardwareOperation(now_event);

    } else {
      error_msg_ele.classList.remove("d-none");
    } 
  }
});

connected_pin_ele.addEventListener("change", async function (event) {
    if (event.target.value !== -1) {
      data_out_pin = parseInt(connected_pin_ele.options[connected_pin_ele.selectedIndex].value);
      sclk_pin = data_out_pin + 1
      lrsclk_pin = sclk_pin + 1
      display_pins_ele.children[0].children[0].children[1].innerHTML = "平台引脚" + data_out_pin;
      display_pins_ele.children[1].children[0].children[1].innerHTML = "平台引脚" + sclk_pin;
      display_pins_ele.children[2].children[0].children[1].innerHTML = "平台引脚" + lrsclk_pin;
      display_pins_ele.classList.remove("d-none");
    }
  });

stop_button_ele.addEventListener("click", function(event) {
  start_button_ele.classList.remove("d-none");
  stop_button_ele.classList.add("d-none");
  playing_in_progress = false;
});
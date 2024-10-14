const bootstrap = require("bootstrap");
import {
  getConfig,
  setConfig,
  getStatus,
  restartPlatform,
  setState,
  getCrc32,
} from "./api.js";
import version from "../app_version.json";

var mode, ssid, password, mdnsname, voltage, fwver;
var app_update_filepaths,
  fw_update_filepath,
  app_update_files,
  fw_update_file,
  app_version_file,
  fw_version_file,
  app_skip_files,
  app_skip_filepaths,
  fw_version;

function addErrorMsg(message) {
  removeStatusMsg();
  document.getElementById("errorMsg").innerHTML = message;
  document.getElementById("errorMsg").classList.remove("d-none");
}

function removeErrorMsg() {
  document.getElementById("errorMsg").classList.add("d-none");
}

function addStatusMsg(message) {
  removeErrorMsg();
  document.getElementById("statusMsg").innerHTML = message;
  document.getElementById("statusMsg").classList.remove("d-none");
}

function removeStatusMsg() {
  document.getElementById("statusMsg").classList.add("d-none");
}

function extractFwVersion(fw_file_name) {
  const version = fw_file_name.substring(
    fw_file_name.indexOf("v"),
    fw_file_name.lastIndexOf(".")
  );
  return version;
}

function extractMajorMinorBuildVer(fw_version) {
  if (fw_version != undefined) {
    if (fw_version.startsWith("fw")) {
      const fw_version_no_ext = fw_version.substring(
        0,
        fw_version.lastIndexOf(".")
      );
      const splitted = fw_version_no_ext.split("_");
      const major_ver = parseInt(splitted[1].substring(1));
      const minor_ver = parseInt(splitted[2]);
      const build_ver = parseInt(splitted[3]);
      return [major_ver, minor_ver, build_ver];
    } else {
      const splitted = fw_version.split("-");
      const major_ver = parseInt(splitted[0].substring(1));
      const minor_ver = parseInt(splitted[1]);
      const build_ver = parseInt(splitted[2]);
      return [major_ver, minor_ver, build_ver];
    }
  } else {
    return [0, 0, 0];
  }
}

function addAppUpdateList(file, app_list) {
  const li = document.createElement("li");
  li.textContent = file.webkitRelativePath;
  app_update_filepaths.push(file.webkitRelativePath);
  app_update_files.push(file);
  li.classList.add("list-group-item");
  app_list.appendChild(li);
}

function addAppSkipUpdateList(file, app_skip_list) {
  const li = document.createElement("li");
  li.textContent = file.webkitRelativePath;
  app_skip_filepaths.push(file.webkitRelativePath);
  app_skip_files.push(file);
  li.classList.add("list-group-item");
  app_skip_list.appendChild(li);
}

async function getPlatformStatus() {
  const ret = await getStatus();
  if (ret == -1) {
    addErrorMsg("无法得到平台状态信息，请重启平台。");
  } else {
    // add error message and get config failed
    if (ret["status"].length == 0) {
      document.getElementById("statusDisplay").innerHTML += "状态正常\r\n";
    } else {
      for (let i = 0; i < ret["status"].length; i++) {
        if (ret["status"][i] == 0) {
          document.getElementById("statusDisplay").innerHTML = "状态正常\r\n";
          break;
        } else if (ret["status"][i] == 1) {
          document.getElementById("statusDisplay").innerHTML +=
            "未设置平台时间\r\n";
        } else if (ret["status"][i] == 2) {
          document.getElementById("statusDisplay").innerHTML +=
            "电源不支持TypeC PD协议\r\n";
        } else if (ret["status"][i] == 3) {
          document.getElementById("statusDisplay").innerHTML +=
            "电源不支持设定的电压\r\n";
        } else if (ret["status"][i] == 4) {
          document.getElementById("statusDisplay").innerHTML +=
            "尝试连接的路由器未找到\r\n";
        } else if (ret["status"][i] == 5) {
          document.getElementById("statusDisplay").innerHTML +=
            "路由器连接密码错误\r\n";
        } else if (ret["status"][i] == 6) {
          document.getElementById("statusDisplay").innerHTML +=
            "SD卡加载错误\r\n";
        } else if (ret["status"][i] == 7) {
          document.getElementById("statusDisplay").innerHTML +=
            "未找到配置文件\r\n";
        } else if (ret["status"][i] == 8) {
          document.getElementById("statusDisplay").innerHTML +=
            "未找到应用\r\n";
        } else if (ret["status"][i] == 9) {
          document.getElementById("statusDisplay").innerHTML +=
            "版本匹配错误\r\n";
        }
      }
    }
  }
}

async function getPlatformConfig() {
  const ret = await getConfig();
  if (ret != -1) {
    let platformtime;
    let hwver;
    mode = ret["mode"];
    ssid = ret["ssid"];
    password = ret["password"];
    mdnsname = ret["mdns"];
    voltage = ret["voltage"];
    platformtime = ret["timedate"];
    fwver = ret["fwver"];
    hwver = ret["hwver"];

    if (hwver === "V-1--1") {
      hwver = "未设置";
    }
    if (platformtime == "notset") {
      platformtime = "未设置";
    }

    document.getElementById("modeSelect").value = mode;
    document.getElementById("ssid").setAttribute("value", ssid);
    document.getElementById("password").setAttribute("value", password);
    document.getElementById("mdnsname").setAttribute("value", mdnsname);
    document.getElementById("platformtime").setAttribute("value", platformtime);
    document
      .getElementById("version")
      .setAttribute(
        "value",
        `应用版本：${version["app_ver"]}。固件版本：${fwver}。硬件版本：${hwver}。`
      );
    let options = document.getElementById("voltage");
    for (let i = 0; i < options.length; i++) {
      if (options[i].getAttribute("value") == voltage) {
        options[i].setAttribute("selected", "");
      }
    }
  } else {
    addErrorMsg("无法得到平台配置信息，请重启平台。");
  }
}

function calculateCrc32Le(buffer) {
  const crc32_le_table = new Uint32Array([
    0x00000000, 0x77073096, 0xee0e612c, 0x990951ba, 0x076dc419, 0x706af48f,
    0xe963a535, 0x9e6495a3, 0x0edb8832, 0x79dcb8a4, 0xe0d5e91e, 0x97d2d988,
    0x09b64c2b, 0x7eb17cbd, 0xe7b82d07, 0x90bf1d91, 0x1db71064, 0x6ab020f2,
    0xf3b97148, 0x84be41de, 0x1adad47d, 0x6ddde4eb, 0xf4d4b551, 0x83d385c7,
    0x136c9856, 0x646ba8c0, 0xfd62f97a, 0x8a65c9ec, 0x14015c4f, 0x63066cd9,
    0xfa0f3d63, 0x8d080df5, 0x3b6e20c8, 0x4c69105e, 0xd56041e4, 0xa2677172,
    0x3c03e4d1, 0x4b04d447, 0xd20d85fd, 0xa50ab56b, 0x35b5a8fa, 0x42b2986c,
    0xdbbbc9d6, 0xacbcf940, 0x32d86ce3, 0x45df5c75, 0xdcd60dcf, 0xabd13d59,
    0x26d930ac, 0x51de003a, 0xc8d75180, 0xbfd06116, 0x21b4f4b5, 0x56b3c423,
    0xcfba9599, 0xb8bda50f, 0x2802b89e, 0x5f058808, 0xc60cd9b2, 0xb10be924,
    0x2f6f7c87, 0x58684c11, 0xc1611dab, 0xb6662d3d, 0x76dc4190, 0x01db7106,
    0x98d220bc, 0xefd5102a, 0x71b18589, 0x06b6b51f, 0x9fbfe4a5, 0xe8b8d433,
    0x7807c9a2, 0x0f00f934, 0x9609a88e, 0xe10e9818, 0x7f6a0dbb, 0x086d3d2d,
    0x91646c97, 0xe6635c01, 0x6b6b51f4, 0x1c6c6162, 0x856530d8, 0xf262004e,
    0x6c0695ed, 0x1b01a57b, 0x8208f4c1, 0xf50fc457, 0x65b0d9c6, 0x12b7e950,
    0x8bbeb8ea, 0xfcb9887c, 0x62dd1ddf, 0x15da2d49, 0x8cd37cf3, 0xfbd44c65,
    0x4db26158, 0x3ab551ce, 0xa3bc0074, 0xd4bb30e2, 0x4adfa541, 0x3dd895d7,
    0xa4d1c46d, 0xd3d6f4fb, 0x4369e96a, 0x346ed9fc, 0xad678846, 0xda60b8d0,
    0x44042d73, 0x33031de5, 0xaa0a4c5f, 0xdd0d7cc9, 0x5005713c, 0x270241aa,
    0xbe0b1010, 0xc90c2086, 0x5768b525, 0x206f85b3, 0xb966d409, 0xce61e49f,
    0x5edef90e, 0x29d9c998, 0xb0d09822, 0xc7d7a8b4, 0x59b33d17, 0x2eb40d81,
    0xb7bd5c3b, 0xc0ba6cad, 0xedb88320, 0x9abfb3b6, 0x03b6e20c, 0x74b1d29a,
    0xead54739, 0x9dd277af, 0x04db2615, 0x73dc1683, 0xe3630b12, 0x94643b84,
    0x0d6d6a3e, 0x7a6a5aa8, 0xe40ecf0b, 0x9309ff9d, 0x0a00ae27, 0x7d079eb1,
    0xf00f9344, 0x8708a3d2, 0x1e01f268, 0x6906c2fe, 0xf762575d, 0x806567cb,
    0x196c3671, 0x6e6b06e7, 0xfed41b76, 0x89d32be0, 0x10da7a5a, 0x67dd4acc,
    0xf9b9df6f, 0x8ebeeff9, 0x17b7be43, 0x60b08ed5, 0xd6d6a3e8, 0xa1d1937e,
    0x38d8c2c4, 0x4fdff252, 0xd1bb67f1, 0xa6bc5767, 0x3fb506dd, 0x48b2364b,
    0xd80d2bda, 0xaf0a1b4c, 0x36034af6, 0x41047a60, 0xdf60efc3, 0xa867df55,
    0x316e8eef, 0x4669be79, 0xcb61b38c, 0xbc66831a, 0x256fd2a0, 0x5268e236,
    0xcc0c7795, 0xbb0b4703, 0x220216b9, 0x5505262f, 0xc5ba3bbe, 0xb2bd0b28,
    0x2bb45a92, 0x5cb36a04, 0xc2d7ffa7, 0xb5d0cf31, 0x2cd99e8b, 0x5bdeae1d,
    0x9b64c2b0, 0xec63f226, 0x756aa39c, 0x026d930a, 0x9c0906a9, 0xeb0e363f,
    0x72076785, 0x05005713, 0x95bf4a82, 0xe2b87a14, 0x7bb12bae, 0x0cb61b38,
    0x92d28e9b, 0xe5d5be0d, 0x7cdcefb7, 0x0bdbdf21, 0x86d3d2d4, 0xf1d4e242,
    0x68ddb3f8, 0x1fda836e, 0x81be16cd, 0xf6b9265b, 0x6fb077e1, 0x18b74777,
    0x88085ae6, 0xff0f6a70, 0x66063bca, 0x11010b5c, 0x8f659eff, 0xf862ae69,
    0x616bffd3, 0x166ccf45, 0xa00ae278, 0xd70dd2ee, 0x4e048354, 0x3903b3c2,
    0xa7672661, 0xd06016f7, 0x4969474d, 0x3e6e77db, 0xaed16a4a, 0xd9d65adc,
    0x40df0b66, 0x37d83bf0, 0xa9bcae53, 0xdebb9ec5, 0x47b2cf7f, 0x30b5ffe9,
    0xbdbdf21c, 0xcabac28a, 0x53b39330, 0x24b4a3a6, 0xbad03605, 0xcdd70693,
    0x54de5729, 0x23d967bf, 0xb3667a2e, 0xc4614ab8, 0x5d681b02, 0x2a6f2b94,
    0xb40bbe37, 0xc30c8ea1, 0x5a05df1b, 0x2d02ef8d,
  ]);

  var crc = 0xffffffffn;
  for (var i = 0; i < buffer.length; i++) {
    crc =
      BigInt(crc32_le_table[(crc ^ BigInt(buffer[i])) & 0xffn]) ^ (crc >> 8n);
  }
  crc = BigInt.asUintN(32, ~crc);
  return [
    crc & 0xffn,
    (crc >> 8n) & 0xffn,
    (crc >> 16n) & 0xffn,
    (crc >> 24n) & 0xffn,
  ];
}

document
  .getElementById("enableConfig")
  .addEventListener("change", function (event) {
    if (this.checked) {
      document.getElementById("modeSelect").removeAttribute("disabled");
      document.getElementById("ssid").removeAttribute("disabled");
      document.getElementById("password").removeAttribute("disabled");
      document.getElementById("mdnsname").removeAttribute("disabled");
      document.getElementById("voltage").removeAttribute("disabled");
      document.getElementById("submitButton").removeAttribute("disabled");
    } else {
      document.getElementById("modeSelect").setAttribute("disabled", "");
      document.getElementById("ssid").setAttribute("disabled", "");
      document.getElementById("password").setAttribute("disabled", "");
      document.getElementById("mdnsname").setAttribute("disabled", "");
      document.getElementById("voltage").setAttribute("disabled", "");
      document.getElementById("submitButton").setAttribute("disabled", "");
    }
  });

document
  .getElementById("setTimeButton")
  .addEventListener("click", async function (event) {
    const cur_time = new Date();
    const timezone_offset = cur_time.getTimezoneOffset() / 60;    // integer as hour
    const config = {
      tmzoneoffset: timezone_offset,
      timedate:
        cur_time.getFullYear() +
        "-" +
        (cur_time.getMonth() + 1) +
        "-" +
        cur_time.getDate() +
        "T" +
        cur_time.getHours() +
        ":" +
        cur_time.getMinutes() +
        ":" +
        cur_time.getSeconds(),
    };

    const ret = await setConfig(config);
    if (ret == -1) {
      addErrorMsg("时间设置失败，请重试。");
    } else {
      addStatusMsg("时间设置成功，请刷新页面。");
    }
  });

document
  .getElementById("submitButton")
  .addEventListener("click", async function (event) {
    mode = document.getElementById("modeSelect").value;
    ssid = document.getElementById("ssid").value;
    password = document.getElementById("password").value;
    mdnsname = document.getElementById("mdnsname").value;
    voltage = document.getElementById("voltage").value;
    const config = {
      mode: mode,
      ssid: ssid,
      password: password,
      mdns: mdnsname,
      voltage: parseInt(voltage),
    };
    const ret = await setConfig(config);
    if (ret == -1) {
      addErrorMsg("平台配置失败，请重试。");
    } else {
      addStatusMsg("平台配置成功，请重启平台使配置生效。");
    }
  });

document
  .getElementById("resetButton")
  .addEventListener("click", async function (event) {
    await restartPlatform();
  });

document
  .getElementById("sysupdateFileInput")
  .addEventListener("change", async function (event) {
    app_update_filepaths = [];
    app_skip_filepaths = [];
    fw_update_filepath = "";
    fw_update_file = "";
    app_update_files = [];
    app_skip_files = [];
    fw_version = "";
    app_version_file = "";
    const fw_list = document.getElementById("fwList");
    const app_list = document.getElementById("appList");
    const app_skip_list = document.getElementById("appSkipUpdateList");
    app_list.innerHTML = "";
    fw_list.innerHTML = "";

    document.getElementById("updateProgress").style.width = "0%";
    document.getElementById("updateProgress").innerHTML = "0%";
    document.getElementById("sysupdateModalLabel").innerHTML = "系统更新";
    document.getElementById("confirmSysupdate").disabled = true;

    for (let i = 0; i < event.target.files.length; i++) {
      const filename = event.target.files[i]["name"].split("/").pop();
      if (filename.split(".").pop() == "bin") {
        const li = document.createElement("li");
        li.textContent = event.target.files[i].webkitRelativePath;
        fw_update_filepath = event.target.files[i].webkitRelativePath;
        fw_update_file = event.target.files[i];
        fw_version_file = extractFwVersion(fw_update_filepath);
        li.classList.add("list-group-item");
        fw_list.appendChild(li);
        const [running_fw_major, running_fw_minor, running_fw_build] =
          extractMajorMinorBuildVer(fwver);
        const [update_fw_major, update_fw_minor, update_fw_build] =
          extractMajorMinorBuildVer(filename);
        if (running_fw_major > update_fw_major) {
          addErrorMsg(
            `运行固件的版本${fwver}高于更新固件的版本${fw_version_file}，无法进行更新。请参考文档网站降低固件的版本。`
          );
          document
            .getElementById("confirmSysupdate")
            .setAttribute("disabled", true);
        } else if (running_fw_minor > update_fw_minor) {
          addErrorMsg(
            `运行固件的版本${fwver}高于更新固件的版本${fw_version_file}，无法进行更新。请参考文档网站降低固件的版本。`
          );
          document
            .getElementById("confirmSysupdate")
            .setAttribute("disabled", true);
        } else if (running_fw_build > update_fw_build) {
          addErrorMsg(
            `运行固件的版本${fwver}高于更新固件的版本${fw_version_file}，无法进行更新。请参考文档网站降低固件的版本。`
          );
          document
            .getElementById("confirmSysupdate")
            .setAttribute("disabled", true);
        } else if (
          running_fw_major == update_fw_major &&
          running_fw_build == update_fw_build &&
          running_fw_build == update_fw_build
        ) {
          addStatusMsg(`运行固件的版本已经为${fwver}。无需进行固件更新。`);
          document
            .getElementById("confirmSysupdate")
            .removeAttribute("disabled");
        } else {
          document
            .getElementById("confirmSysupdate")
            .removeAttribute("disabled");
        }
        break;
      }
    }
    if (fw_version_file) {
      document.getElementById(
        "fwversionText"
      ).innerHTML = `固件版本：${fw_version_file}`;
    } else {
      document.getElementById("fwversionText").innerHTML = `未发现固件更新文件`;
    }

    for (let i = 0; i < event.target.files.length; i++) {
      if (fw_update_filepath != event.target.files[i].webkitRelativePath) {
        if (event.target.files[i].name.split("/").pop() == "app_version.json") {
          const reader = new FileReader();
          app_version_file = "exist";
          reader.addEventListener(
            "load",
            () => {
              app_version_file = JSON.parse(reader.result)["app_ver"];
              document.getElementById(
                "appversionText"
              ).innerHTML = `应用版本：${app_version_file}`;
            },
            false
          );
          reader.readAsText(event.target.files[i]);
        }
        const server_crc = await getCrc32(event.target.files[i].name);
        if (server_crc === -1) {
          addAppUpdateList(event.target.files[i], app_list);
        } else if (server_crc === -2 || server_crc === -3) {
          console.log(`getCrc32 Request is invalid`);
        } else {
          const reader = new FileReader();
          reader.addEventListener("load", async () => {
            const cal_crc = calculateCrc32Le(new Uint8Array(reader.result));
            if (
              cal_crc[0] == server_crc[0] &&
              cal_crc[1] == server_crc[1] &&
              cal_crc[2] == server_crc[2] &&
              cal_crc[3] == server_crc[3]
            ) {
              addAppSkipUpdateList(event.target.files[i], app_skip_list);
            } else {
              addAppUpdateList(event.target.files[i], app_list);
            }
          });
          reader.readAsArrayBuffer(event.target.files[i]);
        }
      }
    }

    if (app_version_file == "") {
      document.getElementById("appversionText").innerHTML = `应用版本：未知`;
    }
    document.getElementById("confirmSysupdate").disabled = false;
  });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

document
  .getElementById("confirmSysupdate")
  .addEventListener("click", async function (event) {
    let update_files_index = 0;
    let total_num_update_files = app_update_filepaths.length;
    let current_progress_percent = 0.0;
    let i;
    let fw_update_success = true;
    let app_update_success = true;

    document.getElementById("sysupdateModalLabel").innerHTML =
      "系统更新中，请勿断电";

    if (fw_version_file) {
      total_num_update_files++;
      const ret = await setState("fwupdate");
      if (ret == -1) {
        fw_update_success = false;
      } else {
        let filename = fw_update_filepath.split("/").pop();
        let request = new XMLHttpRequest();
        let form_data = new FormData();
        form_data.append(filename, fw_update_file, fw_update_filepath);
        request.open("POST", "/upload", false); // set false to use synchronize mode
        request.send(form_data);
        if (request.status === 200 || request.status === 201) {
          update_files_index++;
          current_progress_percent =
            update_files_index / total_num_update_files;
          document.getElementById("updateProgress").style.width =
            Math.ceil(current_progress_percent.toFixed(2)) + "%";
          document.getElementById("updateProgress").innerHTML =
            Math.ceil(current_progress_percent.toFixed(2)) + "%";
        } else if (request.status == 0) {
          fw_update_success = false;
          alert("Server closed the connection abruptly!");
        } else {
          fw_update_success = false;
          alert(request.status + " Error!\n" + request.responseText);
        }
      }
    }

    if (app_update_filepaths.length > 0) {
      const ret = await setState("appupdate");
      if (ret == -1) {
        app_update_success = false;
      } else {
        for (i = 0; i < app_update_filepaths.length; i++) {
          let upload_file = app_update_filepaths[i];
          let app_filename = upload_file.split("/").pop();
          let request = new XMLHttpRequest();
          let form_data = new FormData();
          form_data.append(app_filename, app_update_files[i], upload_file);
          request.open("POST", "/upload", false); // set false to use synchronize mode
          request.send(form_data);
          if (request.status === 200 || request.status === 201) {
            update_files_index++;
            current_progress_percent =
              update_files_index / total_num_update_files;
            document.getElementById("updateProgress").style.width =
              Math.ceil(current_progress_percent * 100) + "%";
            document.getElementById("updateProgress").innerHTML =
              Math.ceil(current_progress_percent * 100) + "%";
            await sleep(300);
          } else if (request.status == 0) {
            alert("Server closed the connection abruptly!");
            app_update_success = false;
            break;
          } else {
            app_update_success = false;
            alert(request.status + " Error!\n" + request.responseText);
            break;
          }
        }
      }
    }

    document.getElementById("sysupdateModalLabel").innerHTML =
      "更新完成，请关闭该窗口。";
    if (fw_update_success == false) {
      addErrorMsg("固件更新失败，请重试。");
    } else if (app_update_success == false) {
      addErrorMsg("应用更新失败，请重试。");
    } else {
      addStatusMsg("更新成功，请重启平台。");
    }
  });

// initial logic
getPlatformStatus();
getPlatformConfig();

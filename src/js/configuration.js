const bootstrap =  require("bootstrap");
import {getConfig, setConfig, getStatus, restartPlatform, setState} from './api.js'
import version from '../app_version.json'

var mode, ssid, password, mdnsname, voltage;
var app_update_files, fw_update_file, app_version_file, fw_version

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

document.getElementById("enableConfig").addEventListener("change", function(event) {
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
                    document.getElementById("statusDisplay").innerHTML += "未设置平台时间\r\n";
                } else if (ret["status"][i] == 2) {
                    document.getElementById("statusDisplay").innerHTML += "电源不支持TypeC PD协议\r\n";
                } else if (ret["status"][i] == 3) {
                    document.getElementById("statusDisplay").innerHTML += "电源不支持设定的电压\r\n";
                } else if (ret["status"][i] == 4) {
                    document.getElementById("statusDisplay").innerHTML += "尝试连接的路由器未找到\r\n";
                } else if (ret["status"][i] == 5) {
                    document.getElementById("statusDisplay").innerHTML += "路由器连接密码错误\r\n";
                } else if (ret["status"][i] == 6) {
                    document.getElementById("statusDisplay").innerHTML += "SD卡加载错误\r\n";
                } else if (ret["status"][i] == 7) {
                    document.getElementById("statusDisplay").innerHTML += "未找到配置文件\r\n";
                } else if (ret["status"][i] == 8) {
                    document.getElementById("statusDisplay").innerHTML += "未找到应用\r\n";
                } else if (ret["status"][i] == 9) {
                    document.getElementById("statusDisplay").innerHTML += "版本匹配错误\r\n";
                }
            }
        }
    }
}

async function getPlatformConfig() {
    const ret = await getConfig();
    if (ret != -1) {
        let platformtime;
        let fwver;
        let hwver;
        mode = ret["mode"];
        ssid = ret["ssid"];
        password = ret["password"];
        mdnsname = ret["mdns"];
        voltage = ret["voltage"];
        platformtime = ret["timedate"];
        fwver = ret["fwver"];
        hwver = ret["hwver"];

        document.getElementById("modeSelect").value = mode;
        document.getElementById("ssid").setAttribute("value", ssid);
        document.getElementById("password").setAttribute("value", password);
        document.getElementById("mdnsname").setAttribute("value", mdnsname);
        document.getElementById("voltage").setAttribute("value", voltage);
        document.getElementById("platformtime").setAttribute("value", platformtime);
        document.getElementById("version").setAttribute("value", `应用版本：${version["app_ver"]}。固件版本：${fwver}。硬件版本：${hwver}。`);
    } else {
        addErrorMsg("无法得到平台配置信息，请重启平台。");
    }
}

document.getElementById("setTimeButton").addEventListener("click", async function(event) {
    const cur_time = new Date();
    const config = {
        "timedate": cur_time.getFullYear() + "-" + (cur_time.getMonth() + 1) + "-" + cur_time.getDate() + 
        "T" + cur_time.getHours() + ":" + cur_time.getMinutes() + ":" + cur_time.getSeconds()
    }
    const ret = await setConfig(config);
    if (ret == -1) {
        addErrorMsg("时间设置失败，请重试。");
    } else {
        addStatusMsg("时间设置成功，请刷新页面。");
    }
});

document.getElementById("submitButton").addEventListener("click", async function(event) {
    mode = document.getElementById("modeSelect").value;
    ssid = document.getElementById("ssid").value;
    password = document.getElementById("password").value;
    mdnsname = document.getElementById("mdnsname").value;
    voltage = document.getElementById("voltage").value;
    const config = {
        "mode": mode,
        "ssid": ssid,
        "password": password,
        "mdns": mdnsname,
        "voltage": voltage
    }
    const ret = await setConfig(config);
    if (ret == -1) {
        addErrorMsg("平台配置失败，请重试。");
    } else {
        addStatusMsg("平台配置成功，请重启平台使配置生效。");
    }
});

document.getElementById("resetButton").addEventListener("click", async function(event) {
    await restartPlatform();
});

function extractFwVersion(fw_file_name) {
    const version = fw_file_name.substring(fw_file_name.indexOf("v"), fw_file_name.lastIndexOf("."));
    return version;
}

document.getElementById('sysupdateFileInput').addEventListener('change', function(event) {
    app_update_files = [];
    fw_update_file = "";
    fw_version = "";
    app_version_file = ""
    const fw_list = document.getElementById('fwList');
    const app_list = document.getElementById('appList');
    app_list.innerHTML = '';
    fw_list.innerHTML = '';

    document.getElementById("updateProgress").style.width = "0%";
    document.getElementById("updateProgress").innerHTML = "0%";

    for (let i = 0; i < event.target.files.length; i++) {
        const filename =  event.target.files[i]["name"].split('/').pop();
        if (filename.split('.').pop() == "bin") {
            const li = document.createElement('li');
            li.textContent = event.target.files[i].webkitRelativePath;
            fw_update_file = event.target.files[i].webkitRelativePath;
            fw_version = extractFwVersion(fw_update_file);
            li.classList.add("list-group-item");
            fw_list.appendChild(li);
            break;
        }
    }
    if (fw_version != "") {
        document.getElementById("fwversionText").innerHTML = `固件版本：${fw_version}`;
    } else {
        document.getElementById("fwversionText").innerHTML = `未发现固件更新文件`;
    }

    for (let i = 0; i < event.target.files.length; i++) {
        if (fw_update_file != event.target.files[i].webkitRelativePath) {
            const li = document.createElement('li');
            li.textContent = event.target.files[i].webkitRelativePath;
            app_update_files.push(event.target.files[i].webkitRelativePath);
            li.classList.add("list-group-item");
            app_list.appendChild(li);
            if (event.target.files[i]["name"].split('/').pop() == "app_version.json") {
                const reader = new FileReader();   
                app_version_file = "exist";   
                reader.addEventListener("load", () => {
                    app_version_file = JSON.parse(reader.result)["app_ver"];
                    document.getElementById("appversionText").innerHTML = `应用版本：${app_version_file}`;
                }, false);
                reader.readAsText(event.target.files[i]);
            }
        }
    }

    if (app_version_file == "") {
        document.getElementById("appversionText").innerHTML = `应用版本：未知`;
    }
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

document.getElementById('confirmSysupdate').addEventListener('click', async function(event) {

    let update_files_index = 0;
    let total_num_update_files = app_update_files.length;
    let current_progress_percent = 0.0;
    let i;
    let fw_update_success = true;
    let app_update_success = true;

    if (fw_version != "") {
        total_num_update_files ++;
        const ret = await setState("fwupdate");
        if (ret == -1) {
            fw_update_success = false;
        } else {
            let upload_path = fw_update_file.split('/').pop();
            let request = new XMLHttpRequest();
            request.open("POST", upload_path, false);   // set false to use synchronize mode
            request.send(fw_update_file);
            if (request.status === 200 || request.status === 201) {
                update_files_index ++;
                current_progress_percent = update_files_index / total_num_update_files;
                document.getElementById("updateProgress").style.width = current_progress_percent.toFixed(2) + "%";
                document.getElementById("updateProgress").innerHTML = current_progress_percent.toFixed(2) + "%";
            } else if (request.status == 0) {
                fw_update_success = false;
                alert("Server closed the connection abruptly!");
            } else {
                fw_update_success = false;
                alert(request.status + " Error!\n" + request.responseText);
            }
        }
    }

    if (app_update_files.length > 0) {
        const ret = await setState("appupdate");
        if (ret == -1) {
            app_update_success = false;
        } else {
            for (i = 0; i < app_update_files.length; i++) {
                let upload_file = app_update_files[i];
                let upload_path = upload_file.split('/').pop();
                let request = new XMLHttpRequest();
                request.open("POST", upload_path, false);   // set false to use synchronize mode
                request.send(upload_file);
                if (request.status === 200 || request.status === 201) {
                    update_files_index ++;
                    current_progress_percent = update_files_index / total_num_update_files;
                    document.getElementById("updateProgress").style.width = Math.ceil(current_progress_percent * 100) + "%";
                    document.getElementById("updateProgress").innerHTML = Math.ceil(current_progress_percent * 100) + "%";
                    await sleep(100);
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

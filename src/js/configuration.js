const bootstrap =  require("bootstrap");
import {getConfig, setConfig, getStatus, restartPlatform} from './api.js'

const app_ver = "秦-前221"

var mode, ssid, password, mdnsname, voltage;

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
        document.getElementById("version").setAttribute("value", `应用版本：${app_ver}。固件版本：${fwver}。硬件版本：${hwver}。`);
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

// initial logic
getPlatformStatus();
getPlatformConfig();

import {gpio, gpioOutputSchedule, setTime, getTime} from 'sensorsparks.api'

var pin = localStorage.getItem("pin");
var mode = document.getElementById("mode")
            .options[document.getElementById("mode").selectedIndex]
                .value;
var start_date = null;
var start_time = null;
var duration = null;
var schedule_now = false;
var sync_status = 0;
changeMode(mode);

if (pin != null) {
    document.getElementById("pinSelect").value = pin;
    (async() => {
        try{
            await getPinStatus(pin);
        } catch (error) {
            console.log("error:", error);
        }
    })();
}

async function getPinStatus(pin_id) {
    let pin_status = await gpio(parseInt(pin_id), "input", 0);
    if (pin_id == null) {
        addErrorMsg("引脚状态读取错误");
    } else {
        updatePinStatus(pin_id, pin_status);
    }
    return pin_status;
}

function updatePinStatus(pin_id, status) {
    document.getElementById("displayPins").classList.remove("d-none");
    document.getElementById("displayPins").children[0].children[0].children[0].innerHTML="引脚"+pin_id+"状态";
    if (status == 0) {
        document.getElementById("displayPins").children[0].children[0].children[1].innerHTML="关闭";
    } else {
        document.getElementById("displayPins").children[0].children[0].children[1].innerHTML="打开";
    }
}

document.getElementById("mode").addEventListener("change", async function(event) {
    var mode = document.getElementById("mode").value;
    changeMode(mode);
    if (mode == 1) {
        // sync time with the device
        let dev_timedate_ret = await getTime();
        let update_dev_timedate = 0;
        if (dev_timedate_ret == -1) {
            update_dev_timedate = 1;
        } else {
            let dev_timedate = new Date(dev_timedate_ret);
            let client_timedate = new Date();
            if (Math.abs(client_timedate.getSeconds() - dev_timedate.getSeconds()) > 15) {
                update_dev_timedate = 1;
            }
        }

        if (update_dev_timedate == 1) {
            if (0 == setTime(new Date())) {
                sync_status = 0;
                addStatusMsg("同步设备时间成功");
                setTimeout(function() {
                    removeStatusMsg();
                }, 10000);
            } else {
                sync_status = -1;
                addErrorMsg("同步设备时间失败");
                setTimeout(function() {
                    removeErrorMsg();
                }, 10000);
            }
        } else {
            sync_status = 0;
        }
    }
})

function changeMode(mode) {
    if (mode == 0) {
        // set the pin right away
        document.getElementById("instantSetButton").classList.remove("d-none");
        document.getElementById("scheduleSetButton").classList.add("d-none");
        document.getElementById("scheduleTime").classList.add("d-none");
    } else {
        // set the pin in the future
        document.getElementById("scheduleSetButton").classList.remove("d-none");
        document.getElementById("instantSetButton").classList.add("d-none");
        document.getElementById("scheduleTime").classList.remove("d-none");
    }
}

function addErrorMsg(message) {
    document.getElementById("errorMsg").innerHTML = message;
    document.getElementById("errorMsg").classList.remove("d-none");
}

function removeErrorMsg() {
    document.getElementById("errorMsg").classList.add("d-none");
}

function addStatusMsg(message) {
    document.getElementById("statusMsg").innerHTML = message;
    document.getElementById("statusMsg").classList.remove("d-none");
}

function removeStatusMsg() {
    document.getElementById("statusMsg").classList.add("d-none");
}

document.getElementById("pinSelect").addEventListener("change", async function(event) {
    var ele = document.getElementById("pinSelect");
    if (ele.options[ele.selectedIndex].value == -1) {
        addErrorMsg("请在列表中选择正确的连接引脚。");
        document.getElementById("displayPins").classList.add("d-none")
    } else {
        pin = parseInt(ele.options[ele.selectedIndex].value);
        localStorage.setItem("pin", pin);
        removeErrorMsg();
        let pin_status = await getPinStatus(pin);
        if (pin == null) {
            addErrorMsg("引脚状态读取错误");
        } else {
            updatePinStatus(pin, pin_status);
        }
    }
});

document.getElementById("scheduleNow").addEventListener("change", function(event) {
    if (document.getElementById("scheduleNow").checked) {
        schedule_now = true;
        document.getElementById("startDate").setAttribute("disabled", true);
        document.getElementById("startTime").setAttribute("disabled", true);
    } else {
        schedule_now = false;
        document.getElementById("startDate").removeAttribute("disabled");
        document.getElementById("startTime").removeAttribute("disabled");
    }
});

document.getElementById("startDate").addEventListener("change", function(event) {
    start_date = document.getElementById("startDate").value;
    removeErrorMsg();
});

document.getElementById("startTime").addEventListener("change", function(event) {
    start_time = document.getElementById("startTime").value;
    removeErrorMsg();
});

document.getElementById("duration").addEventListener("change", function(event) {
    duration = document.getElementById("duration").value;
    removeErrorMsg();
});

document.getElementById("startButton").addEventListener("click", function(event) {
    updatePinStatus(pin, 1);
    gpio(parseInt(pin), "output", 1);
});

document.getElementById("stopButton").addEventListener("click", function(event) {
    updatePinStatus(pin, 0);
    gpio(parseInt(pin), "output", 0);
});

document.getElementById("scheduleSetButton").addEventListener("click", function(event) {
    if (sync_status == -1) {
        addErrorMsg("时间同步失败，无法进行定时设置。");
    }else {
        if (schedule_now == true) {
            if (duration == -1 || pin == -1) {
                addErrorMsg("请选择正确的引脚号和开启时长。");
            } else {
                var on_time = new Date();
                var off_time = new Date(on_time.getTime() + duration * 1000 * 60);
                gpio(parseInt(parseInt(pin)), "output", 1);
                gpioOutputSchedule(parseInt(pin), 0, off_time, null, 0);
                addStatusMsg("定时设置成功");
                updatePinStatus(pin, 1);
                setTimeout(function() {
                    removeStatusMsg();
                }, 10000);
            }
            
        }  else {
            if (start_date == null || start_time == null || duration == -1 || pin == -1) {
                addErrorMsg("请选择正确的引脚号，开始时间和开启时长。");
            } else {
                var on_time = new Date(start_date + "T" + start_time);
                var off_time = new Date(on_time.getTime() + duration * 1000 * 60);
                gpioOutputSchedule(parseInt(pin), 1, on_time, null, 0);
                gpioOutputSchedule(parseInt(pin), 0, off_time, null, 0);
                addStatusMsg("定时设置成功");
                setTimeout(function() {
                    removeStatusMsg();
                }, 10000);
            }
        }
    }
});



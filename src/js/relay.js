import {gpio} from './api'

var pin = localStorage.getItem("pin");
var mode = document.getElementById("mode")
            .options[document.getElementById("mode").selectedIndex]
                .value;
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
    return pin_status
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

document.getElementById("mode").addEventListener("change", function(event) {
    var mode = document.getElementById("mode").value;
    changeMode(mode);
})

function changeMode(mode) {
    if (mode == 0) {
        // set the pin right away
        document.getElementById("instantSetButton").classList.remove("d-none");
        document.getElementById("scheduleSetButton").classList.add("d-none");
        document.getElementById("startTime").classList.add("d-none");
        document.getElementById("duration").classList.add("d-none");
    } else {
        // set the pin in the future
        document.getElementById("scheduleSetButton").classList.remove("d-none");
        document.getElementById("instantSetButton").classList.add("d-none");
        document.getElementById("startTime").classList.remove("d-none");
        document.getElementById("duration").classList.remove("d-none");
    }
}

function addErrorMsg(message) {
    document.getElementById("errorMsg").innerHTML = message;
    document.getElementById("errorMsg").classList.remove("d-none");
}

document.getElementById("pinSelect").addEventListener("change", async function(event) {
    var ele = document.getElementById("pinSelect");
    if (ele.options[ele.selectedIndex].value == -1) {
        addErrorMsg("请在列表中选择正确的连接引脚。");
        document.getElementById("displayPins").classList.add("d-none")
    } else {
        pin = parseInt(ele.options[ele.selectedIndex].value);
        localStorage.setItem("pin", pin);
        document.getElementById("errorMsg").classList.add("d-none");
        let pin_status = await getPinStatus(pin);
        if (pin == null) {
            addErrorMsg("引脚状态读取错误");
        } else {
            updatePinStatus(pin, pin_status);
        }
    }
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

});



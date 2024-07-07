// Import all plugins
import * as bootstrap from 'bootstrap';
import {captureRegularHardwareOperation, constructNowEvent, postHardwareOperation,
    pwmAsyncHardwareOperation, gpioHardwareOperation,delayHardwareOperation, 
    advanceOutputSetupHardwareOperation, advanceOutputStartHardwareOperation
} from "./api.js"

var ir_transistor_0_pin = undefined;
var ir_transistor_1_pin = undefined;
var infrared_receiver_pin = undefined;
var control_buttons_list = [];
var current_control_value = undefined;

if (localStorage.getItem("infraredlist")) {
    control_buttons_list = JSON.parse(localStorage.getItem("infraredlist"));
    updateControlButtons(control_buttons_list);
}

if (localStorage.getItem("pin")) {
    ir_transistor_0_pin = parseInt(localStorage.getItem("pin"));
    ir_transistor_1_pin = ir_transistor_0_pin + 1;
    infrared_receiver_pin = ir_transistor_0_pin + 2;
    document.getElementById("infraredtPinSelect").value = ir_transistor_0_pin;
}

function addErrorMsg(message) {
    document.getElementById("errorMsg").innerHTML = message;
    document.getElementById("errorMsg").classList.remove("d-none");
}

function removeErrorMsg() {
    document.getElementById("errorMsg").classList.add("d-none");
}

function updateControlButtons(lst) {
    const infrared_buttons_area = document.getElementById("infraredButtons");
    infrared_buttons_area.innerHTML = "";
    for (let i = 0; i < lst.length; i++) {
        const card_div = document.createElement("div");
        card_div.classList.add("card", "my-2", "mx-2");
        const card_header_ele = document.createElement("div");
        const card_body_ele = document.createElement("div");
        card_header_ele.classList.add("card-header");
        card_body_ele.classList.add("card-body");
        card_header_ele.innerHTML = lst[i]["name"];
        card_body_ele.innerHTML = lst[i]["value"];
        card_div.append(card_header_ele, card_body_ele);
        infrared_buttons_area.appendChild(card_div);
        card_div.addEventListener("click", async function(event) {
            if (ir_transistor_0_pin == undefined) {
                addErrorMsg("请选择正确的红外线模块连接引脚。");
            } else {
                let opers = [];
                const ctr_str_array = lst[i]["value"].split(",");
                const signals = ctr_str_array.map((ctr_str) => {
                    return parseInt(ctr_str);
                });
                pwmAsyncHardwareOperation(opers, 0, 38000, 1.0, "async", ir_transistor_0_pin, 512, undefined, undefined, undefined, undefined);
                gpioHardwareOperation(opers, ir_transistor_1_pin, "output", 1);
                delayHardwareOperation(opers, "ms", 10);
                gpioHardwareOperation(opers, ir_transistor_1_pin, "output", 0);
                delayHardwareOperation(opers, "ms", 3);
                advanceOutputSetupHardwareOperation(opers, ir_transistor_1_pin, "us", 1125, 570, 2250, 570);
                advanceOutputStartHardwareOperation(opers, ir_transistor_1_pin, signals);
                gpioHardwareOperation(opers, ir_transistor_1_pin, "output", 0);
                const oper_event = constructNowEvent(opers);
                const ret = await postHardwareOperation(oper_event);
            }
        });
    }
    localStorage.setItem("infraredlist", JSON.stringify(lst));
};

function decodeNecSignal(signal_array) {
    const codes = [];
    // IR NEC protocol: https://techdocs.altium.com/display/FPGA/NEC%2bInfrared%2bTransmission%2bProtocol
    if (signal_array[0] == 1 && 
        signal_array[2] >= 7500 && signal_array[2] <= 9500 &&
        signal_array[3] >= 4000 && signal_array[3] <= 5000 &&
        signal_array.length % 2 == 0) {
        let code = 0;
        let bitindex = 0;
        for (let i = 4; i < signal_array.length; i += 2) {
            if (signal_array[i + 1] > 1100) {
                // code 1
                // advance output sends data from most significant bit.
                code |= (1 << (7 - bitindex));
            } else {
                // code 0
                code &= ~(1 << (7 - bitindex));
            }
            bitindex ++;
            if (bitindex == 8) {
                bitindex = 0;
                codes.push(code);
                code = 0;
            }
        }
    } else {
        addErrorMsg("解码错误。");
    }
    return codes;
}

document.getElementById("infraredtPinSelect").addEventListener("change", function(event) {
    var ele = event.target;
    if (ele.options[ele.selectedIndex].value == -1) {
        addErrorMsg("请在列表中选择正确的连接引脚。");
    } else {
        ir_transistor_0_pin = parseInt(ele.options[ele.selectedIndex].value);
        ir_transistor_1_pin = ir_transistor_0_pin + 1;
        infrared_receiver_pin = ir_transistor_0_pin + 2;
        localStorage.setItem("pin", ir_transistor_0_pin);
        removeErrorMsg();
    }
});

document.getElementById("startDecoding").addEventListener("click", async function(event) {

    if (infrared_receiver_pin == undefined) {
        addErrorMsg("请选择正确的红外线模块连接引脚。");
    } else {
        var progressbar_id = setInterval(moveBar, 1000);
        var width = 100;
        const timeout_second = 10;
        
        document.getElementById("receiveProgressbar").style.removeProperty("display");

        let opers = [];
        // 67: based on NEC protocol, 4 bytes = 4 * 8 * 2 = 64. 
        // Plus +1 for idle duration at the beginning, +2 for leading signals.
        captureRegularHardwareOperation(opers, infrared_receiver_pin, 67, "us", 
            "change", timeout_second);
        const oper_event = constructNowEvent(opers);
        const ret = await postHardwareOperation(oper_event);
        const signals = decodeNecSignal(ret["result"][0]);
        
        function moveBar() {
            var elem = document.getElementById("timeoutCounter");
            if (width == 0) {
                document.getElementById("receiveProgressbar").style.display = "none";
                clearInterval(progressbar_id);
                if (signals.length > 0) {
                    current_control_value = signals;
                    document.getElementById("rcvInfraredValue").innerHTML = current_control_value;
                } else {
                    current_control_value = undefined;
                    document.getElementById("rcvInfraredValue").innerHTML = "未收到";
                }
            } else {
                width-=(100 / timeout_second);
                elem.style.width = width + "%";
                elem.innerHTML = (width / (100 / timeout_second)) + "秒";
            }
        }
    }
});

document.getElementById("confirmAdd").addEventListener("click", function(event) {
    const ctr_but_name = document.getElementById("controlButtonName").value;
    const ctr_but_value = document.getElementById("controlButtonValue").value;
    if (ctr_but_name == "" || !ctr_but_name) {
        addErrorMsg("请输入有效的控制按钮名称");
    } else if (ctr_but_value == "" || !ctr_but_value) {
        addErrorMsg("无效的控制按钮值");
    } else {
        control_buttons_list.push({
            "name": ctr_but_name,
            "value": ctr_but_value
        });
        updateControlButtons(control_buttons_list);
    }
});

document.getElementById("confirmDelete").addEventListener("click", function(event) {
    const del_but_name = document.getElementById("deleteControlName").value;
    if (del_but_name == "" || !del_but_name) {
        addErrorMsg("请输入有效的控制按钮名称");
    } else {
        let i;
        let find_item = false;
        for (i = 0; i < control_buttons_list.length; i++) {
            if (control_buttons_list[i]["name"] == del_but_name) {
                control_buttons_list.splice(i, 1);
                find_item = true;
                break;
            }
        }
        if (find_item) {
            updateControlButtons(control_buttons_list);
        } else {
            addErrorMsg("未找到该控制按钮");
        }
    }
});

document.getElementById("customizedCtrVal").addEventListener("change", function(event) {
    if (event.target.checked) {
        document.getElementById("controlButtonValue").removeAttribute("disabled");
    } else {
        document.getElementById("controlButtonValue").setAttribute("disabled", true);
    }
});

document.getElementById("addButton").addEventListener("click", function(event) {
    if (current_control_value != undefined) {
        document.getElementById("controlButtonValue").value = current_control_value;
    }
});


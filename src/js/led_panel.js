import {advanceOutputSetupHardwareOperation, advanceOutputStartHardwareOperation,
    constructNowEvent, postHardwareOperation
} from 'sensorsparks.api'

var board_width = undefined;
var board_height = undefined;
const PAINT = '画图';
const ERASE = '清除';
const selected_color = document.getElementById('colorPicker');
const grid = document.getElementById('pixelCanvas');
var mode = PAINT;
var led_panel = [];
var pin = undefined;

if (localStorage.getItem("pin")) {
    pin = parseInt(localStorage.getItem("pin"));
    document.getElementById("pinSelect").value = pin;
}

if (localStorage.getItem("boardsize")) {
    let board_size = localStorage.getItem("boardsize");
    board_width = board_size.split("x")[0];
    board_height = board_size.split("x")[1];
    document.getElementById("paintBoardSize").value = board_size;
}

if (localStorage.getItem("ledpanel")) {
    led_panel = JSON.parse(localStorage.getItem("ledpanel"));
    createPaintBoard(led_panel);
    setupHardware();
}

async function setupHardware() {
    const opers = [];
    advanceOutputSetupHardwareOperation(opers, pin, "us", 1.15, 0.35, 1.3, 0.7);
    const now_event = constructNowEvent(opers);
    await postHardwareOperation(now_event);
}

async function startLeds() {
    const opers = [];
    const led_panel_convert_blank_color = [];
    for (let i = 0; i < led_panel.length / 3; i++) {
        if (led_panel[i * 3] === 255 && led_panel[i * 3 + 1] === 255 && led_panel[i * 3 + 2] === 255) {
            led_panel_convert_blank_color.push(0);
            led_panel_convert_blank_color.push(0);
            led_panel_convert_blank_color.push(0);
        } else {
            led_panel_convert_blank_color.push(led_panel[i * 3]);
            led_panel_convert_blank_color.push(led_panel[i * 3 + 1]);
            led_panel_convert_blank_color.push(led_panel[i * 3 + 2]);
        }
    }
    advanceOutputStartHardwareOperation(opers, pin, led_panel_convert_blank_color);
    const now_event = constructNowEvent(opers);
    await postHardwareOperation(now_event);
}

async function stopLeds() {
    const stop_led_panel = [];
    const opers = [];
    for (let i = 0;  i < led_panel.length; i++) {
        stop_led_panel.push(0);
    }
    advanceOutputStartHardwareOperation(opers, pin, stop_led_panel);
    const now_event = constructNowEvent(opers);
    await postHardwareOperation(now_event);
}

function addErrorMsg(message) {
    document.getElementById("errorMsg").innerHTML = message;
    document.getElementById("errorMsg").classList.remove("d-none");
}

function removeErrorMsg() {
    document.getElementById("errorMsg").classList.add("d-none");
}

function paintEraseTiles(targetCell) {
    if (targetCell.nodeName === 'TD') {
        let led_index = 0;
        let td_index = targetCell.cellIndex;
        let tr_index = targetCell.parentNode.rowIndex;
        if (td_index % 2 == 0) {
            led_index = td_index * board_height + tr_index;
        } else {
            led_index = td_index * board_height + (board_height - 1 - tr_index);
        }
        if (mode === PAINT) {
            targetCell.style.backgroundColor = selected_color.value;
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(selected_color.value);
            led_panel[led_index * 3] = parseInt(parseInt(result[2], 16));
            led_panel[led_index * 3 + 1] = parseInt(parseInt(result[1], 16));
            led_panel[led_index * 3 + 2] = parseInt(parseInt(result[3], 16));
        } else {
            targetCell.style.backgroundColor = 'transparent'
            led_panel[led_index * 3] = 255;
            led_panel[led_index * 3 + 1] = 255;
            led_panel[led_index * 3 + 2] = 255;
        }
        localStorage.setItem("ledpanel", JSON.stringify(led_panel));
    }
}

function createPaintBoard(existed_panel) {
    let mouseIsDown = false;
    const rows = board_height;
    const columns = board_width;

    if (existed_panel != undefined) {
        led_panel = existed_panel;
    } else {
        led_panel = [];    
        for (var i = 0; i < rows * columns; i++) {
            led_panel.push(255,255,255);
        }
    }

    while (grid.hasChildNodes()) {
      grid.removeChild(grid.lastChild);
    }

    let tableRows = '';
    let r = 0;
    while (r < rows) {
        tableRows += '<tr>';
        for (let c=0; c < columns; c++) {
            if (existed_panel != undefined) {
                let led_panel_index;
                if (c % 2 == 0) {
                    led_panel_index = (c * board_height + r) * 3;
                } else {
                    led_panel_index = (c * board_height + (board_height - 1 - r)) * 3;
                }
                const color_code = `#${led_panel[led_panel_index+1].toString(16).padStart(2, '0')}` +
                                `${led_panel[led_panel_index].toString(16).padStart(2, '0')}`   +
                                `${led_panel[led_panel_index+2].toString(16).padStart(2, '0')}`;
                tableRows += `<td style="background-color: ${color_code}"></td>`;
            } else {
                tableRows += `<td></td>`;
            }
        }
        tableRows += '</tr>';
        r += 1;
    }
    grid.insertAdjacentHTML('afterbegin', tableRows);
    grid.classList.toggle('flyItIn');
    grid.classList.toggle('flyItIn2');

    grid.addEventListener("click", function(event) {
        event.preventDefault();
        if (selected_color.value === "#ffffff") {
            addErrorMsg("请选择正确的颜色。");
        } else {
            paintEraseTiles(event.target);
            removeErrorMsg();
        }
    });

    grid.addEventListener('mousedown', function(event) {
        event.preventDefault();
        mouseIsDown = true;
    });

    document.addEventListener('mouseup', function(event) {
        event.preventDefault();
        mouseIsDown = false;
    });

    grid.addEventListener('mouseover', function(event) {
        event.preventDefault();
        if (mouseIsDown) {
            if (selected_color.value === "#ffffff") {
                addErrorMsg("请选择正确的颜色。");
            } else {
                paintEraseTiles(event.target);
                removeErrorMsg();
            }
        }
    });

    grid.addEventListener('contextmenu', function(event) {
        event.preventDefault();
        mode = ERASE;
        paintEraseTiles(event.target);
        mode = PAINT;
    });

    document.getElementById("paintBoard").style.removeProperty("display");
    localStorage.setItem("ledpanel", JSON.stringify(led_panel));
}

document.getElementById("paintBoardSize").addEventListener("change", function(event) {
    if (event.target.value == -1) {
        addErrorMsg("请选择灯板的尺寸。");
    } else {
        const board_size = event.target.value.split("x");
        board_width = board_size[0];
        board_height = board_size[1];
        localStorage.setItem("boardsize", event.target.value);
        removeErrorMsg();
    }
});

document.getElementById("pinSelect").addEventListener("change", function(event) {
    var ele = event.target;
    if (ele.options[ele.selectedIndex].value == -1) {
        addErrorMsg("请在列表中选择正确的连接引脚。");
    } else {
        pin = parseInt(ele.options[ele.selectedIndex].value);
        localStorage.setItem("pin", pin);
        removeErrorMsg();
    }
});

document.getElementById("createPaintBoard").addEventListener("click", async function(event) {
    event.preventDefault();
    createPaintBoard(undefined);
    // send advanced operation to clear the led panel now.
    await setupHardware();
});

document.getElementById("setLedButton").addEventListener("click", async function(event) {
    await startLeds();
});

document.getElementById("closeLedButton").addEventListener("click", async function(event) {
    await stopLeds();
});

import { 
    advanceOutputSetupHardwareOperation,
    advanceOutputStartHardwareOperation,
    constructNowEvent,
    postHardwareOperation 
} from '@sensorsparks/platform-api'

const INIT_LEVEL = 3
var level = INIT_LEVEL

const INIT_STATE_ST = 0
const INIT_STATE_ST_MSG = "开始:"
const SHOW_LED_PATTERN_ST = 1
const SHOW_LED_PATTERN_ST_MSG = "正在灯带上显示，请观察并记住颜色顺序"
const WAIT_USER_INPUT_ST = 2
const WAIT_USER_INPUT_ST_MSG = "请输入刚才的颜色顺序"
const DISPLAY_RESULT_ST = 3
const DISPLAY_RESULT_ST_MSG = `等级${level}的结果：`
const EXIT_ST = 4
const EXIT_ST_MSG = "游戏结束，点击开始重新开始"
const MSG_REFRESH_INTERVAL_MSEC = 1000
const NUM_OF_COLORS = 3
const COLORS_ARRAY = [[0, 255, 0],[255, 255, 0],[0, 0, 255]]

var state = INIT_STATE_ST
var cur_pattern = []
var user_pattern = []
var pin_id = -1

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getRandom(prev) {
    while(true) {
        let tentative = Math.floor(Math.random() * NUM_OF_COLORS);
        if (prev != tentative) {
            return tentative
        }
    } 
}

function arrayComp(arr1, arr2) {
    return arr1.length === arr2.length && 
                arr1.every((value, index) => value === arr2[index]);
}

document.getElementById('redTile').addEventListener('click', async function(event) {
    const element = event.target;
    element.classList.add('animate-red');
    user_pattern.push(0)
    setTimeout(() => {
        element.classList.remove('animate-red');
    }, 1000)
});

document.getElementById('yellowTile').addEventListener('click', async function(event) {
    const element = event.target;
    element.classList.add('animate-yellow');
    user_pattern.push(1)
    setTimeout(() => {
        element.classList.remove('animate-yellow');
    }, 1000)
});

document.getElementById('blueTile').addEventListener('click', async function(event) {
    const element = event.target;
    element.classList.add('animate-blue');
    user_pattern.push(2)
    setTimeout(() => {
        element.classList.remove('animate-blue');
    }, 1000)
});

document.getElementById('startBut').addEventListener("click", async function(event) {
    if (pin_id < 0) {
        document.getElementById("errorMsg").innerHTML = "请选择正确的连接引脚";
        document.getElementById("errorMsg").classList.remove("d-none");
    } else {
        document.getElementById("errorMsg").classList.add("d-none");
    }

    let opers = [];
    advanceOutputSetupHardwareOperation(opers, pin_id, "us", 2.5, 0.4, 2.5, 1.25)
    const now_event = constructNowEvent(opers)
    await postHardwareOperation(now_event)
    document.getElementById("startBut").classList.add("d-none")
    const paragraph = document.getElementById("infoMessage").querySelector("p");
    state = INIT_STATE_ST
    while (state != EXIT_ST) {
        switch(state) {
            case INIT_STATE_ST: {
                paragraph.textContent = INIT_STATE_ST_MSG + `灯将亮${level}次`;
                state = SHOW_LED_PATTERN_ST;
                await sleep(1500);
                break;
            }
            case SHOW_LED_PATTERN_ST: {
                paragraph.textContent = SHOW_LED_PATTERN_ST_MSG;
                await sleep(3000);
                let random = null
                cur_pattern = []
                for (let i = 0; i < level; i ++) {
                    random = getRandom(random)
                    cur_pattern.push(random)
                    opers = []
                    advanceOutputStartHardwareOperation(opers, pin_id, COLORS_ARRAY[random])
                    let now_event = constructNowEvent(opers)
                    let response = await postHardwareOperation(now_event)
                    await sleep(1000)
                }
                advanceOutputStartHardwareOperation(opers, pin_id, [0,0,0])
                let now_event = constructNowEvent(opers)
                await postHardwareOperation(now_event)
                state = WAIT_USER_INPUT_ST;
                break;
            }
            case WAIT_USER_INPUT_ST: {
                paragraph.textContent = WAIT_USER_INPUT_ST_MSG;
                user_pattern = []
                while (user_pattern.length < level) {
                    await sleep(300)
                }
                state = DISPLAY_RESULT_ST;
                break;
            }
            case DISPLAY_RESULT_ST: {
                paragraph.textContent = `等级${level}的结果：`
                if (arrayComp(user_pattern, cur_pattern)) {
                    paragraph.textContent += "晋级下一级"
                    level ++
                    state = SHOW_LED_PATTERN_ST
                } else {
                    paragraph.textContent += "输入错误"
                    state = EXIT_ST;
                }
                await sleep(1500)
                break;
            }
            default: {
                break;
            }
        }
    }
    document.getElementById("startBut").classList.remove("d-none")
});

document.getElementById("pinSelect").addEventListener("change", function(event) {
    var ele = document.getElementById("pinSelect");
    pin_id = parseInt(ele.options[ele.selectedIndex].value);
});

document.getElementById("infoMessage").querySelector("p").textContent = "点击开始按钮开始游戏";

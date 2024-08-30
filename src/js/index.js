// Import all plugins
import * as bootstrap from 'bootstrap';

// Or import only needed plugins
import { Tooltip as Tooltip, Toast as Toast, Popover as Popover } from 'bootstrap';

const main_apps_categories = [
    {
        name: "发光类",
        apps: ["relay", "color_led", "score_board", "led_panel"]
    }, {
        name: "传感器",
        apps: ["force_sensing", "temperature", "infrared_transceiver","camera"]
    }, {
        name: "声音类", 
        apps: ["buzzer_note_player"]
    }, {
        name: "电机",
        apps: ["stepper_motor"]
     }, {
        name: "电力传输",
        apps: ["relay"]
     }, {
        name: "通信", 
        apps: ["nfc"]
     }, {
        name: "自定义",
        apps: []
     }, {
        name: "测试应用",
        apps: ["boardtest"]
    }
];

const main_apps_info = [
    {
        id: "force_sensing",
        name: "力感插板",
        description: "将压力传感器连接到力感插板的螺丝端子，并将螺丝端子连接到平台上。您会看到根据手指触摸的力度不同，页面绘制出不同的折线。点击按钮进行使用。",
        document: "https://www.sensor-lab.io",
    },
    {
        id: "color_led",
        name: "LED灯带",
        description: "将LED灯带通过电源信号插板和平台连接，并通过插板上的跳线接头选择合适的逻辑电压。通过杜邦线连接合适的灯带供电电压。您可以选择任意的灯带颜色。点击下面的按钮开始使用。",
        document: "https://www.sensor-lab.io",
    },
    {
        id: "temperature",
        name: "环境监测插板",
        description: "将环境检测插板和平台连接，页面每秒进行更新并显示当前的温度，湿度和控制质量信息。点击下面的按钮开始使用。",
        document: "https://www.sensor-lab.io",
    },
    {
        id: "stepper_motor",
        name: "步进电机控制",
        description: "将步进电机和步进电机驱动连接，通过杜邦线将步进电机驱动板的引脚和平台连接。通过页面可以控制驱动步进电机的方式，速度和转动角度。点击按钮进行使用。",
        document: "https://www.sensor-lab.io",
    },
    {
        id: "relay",
        name: "电源控制器",
        description: "将电源信号模块插到平台的排针上，移动电源信号模块上的两针跳线，使其输出5V电压。然后通过杜邦线连接电源信号模块的电压输出端和继电器模块的接线端子。点击按钮进行使用。",
        document: "https://www.sensor-lab.io",
    },
    {
        id: "buzzer_note_player",
        name: "音符播放器",
        description: "将蜂鸣器模块插到平台的排针上，在网页上选择和组合自己喜欢的音符，即可进行播放。点击按钮进行使用。",
        document: "https://www.sensor-lab.io",
    },
    {
        id: "boardtest",
        name: "用户测试",
        description: "简单的网页窗口来熟悉平台的功能。",
        document: "https://www.sensor-lab.io",
    },
    {
        id: "score_board",
        name: "计分板",
        description: "将两个七段数码管插板插到平台的排针上，裁判通过网页选择主队和客队的得分，分数会通过七段数码管展示给选手。",
        document: "https://www.sensor-lab.io",
    },
    {
        id: "infrared_transceiver",
        name: "红外线遥控器",
        description: "将红外线插板插到平台的排针上，通过网页即可解码电视遥控器，空调遥控器等。并通过手机控制家里的电视或空调等设备。",
        document: "https://www.sensor-lab.io",
    },
    {
        id: "led_panel",
        name: "LED灯板",
        description: "将WS2812发光灯板与平台通过电源信号插板连接，WS2812为5V电源，3.3V信号。",
        document: "https://www.sensor-lab.io",
    },
    {
        id: "nfc",
        name: "nfc读写卡器",
        description: "将RC522 NFC模块和平台连接，通过SPI总线读写NFC卡。",
        document: "https://www.sensor-lab.io",
    },
    {
        id: "camera",
        name: "远程照相机",
        description: "使用Arducam Mini照相机，进行远程拍照。",
        document: "https://www.sensor-lab.io",
    }
];

var selected_apps = [];

if (localStorage.getItem("main_selected_apps") != undefined) {
    selected_apps = JSON.parse(localStorage.getItem("main_selected_apps"));
}

function deleteSelectedApp(app_id) {
    const index = selected_apps.indexOf(app_id);
    if (index > -1) {
        selected_apps.splice(index, 1);
        localStorage.setItem("main_selected_apps", JSON.stringify(selected_apps));
        addApps();
    }
}

function addCategory() {
    for (let i = 0; i < main_apps_categories.length; i++) {
        const node = document.createElement("option");
        node.innerHTML = main_apps_categories[i].name;
        node.setAttribute("value", main_apps_categories[i].name);
        document.getElementById("categorySelect").appendChild(node);
    }
}

function addApps() {
    document.getElementById("selectedAppsShow").innerHTML = "";
    document.getElementById("appsArea").innerHTML = "";
    for (let i = 0; i < selected_apps.length; i++) {
        for (let j = 0; j < main_apps_info.length; j++) {
            if (selected_apps[i] == main_apps_info[j].id) {
                var background_style = "text-black bg-light";
                if (i % 2 == 1) {
                    background_style = "text-white bg-dark";
                }
                const html_element = `
                <div class="col-md-6">
                    <div class="p-5 mb-4 ${background_style} rounded-4">
                        <div class="container-fluid py-5">
                            <h2 class="display-6 fw-bold">${main_apps_info[j].name}</h2>
                            <p class="col-md-8 fs-5">${main_apps_info[j].description}</p>
                            <a href="${main_apps_info[j].id}.html" class="btn btn-primary btn-lg">开始使用</a>
                            <button href="${main_apps_info[j].document}" class="btn btn-secondary btn-lg" type="button">文档</button>
                        </div>
                    </div>
                </div>
                `
                document.getElementById("appsArea").insertAdjacentHTML("beforeend", html_element);

                const table_node = document.getElementById("selectedAppsShow");
                const table_row = document.createElement("tr");
                const table_ele1 = document.createElement("td");
                table_ele1.innerHTML = main_apps_info[j].name;
                const table_ele2 = document.createElement("td");
                const button_ele = document.createElement("button");
                button_ele.innerHTML = "删除应用";
                button_ele.setAttribute("type", "button");
                button_ele.classList.add("btn");
                button_ele.classList.add("btn-danger");
                button_ele.addEventListener("click", function() {
                    deleteSelectedApp(main_apps_info[j].id);
                })
                table_ele2.appendChild(button_ele);
                table_row.appendChild(table_ele1);
                table_row.appendChild(table_ele2);
                table_node.appendChild(table_row);
            }
        }
    }
}

// event listener logic
var app_to_add = undefined;

document.getElementById("categorySelect").addEventListener("change", function(event) {
    if (document.getElementById("categorySelect").value != -1) {
        for (let i = 0; i < main_apps_categories.length; i++) {
            if (document.getElementById("categorySelect").value == main_apps_categories[i].name) {
                document.getElementById("appSelect").innerHTML = ""
                for (let j = 0; j < main_apps_categories[i].apps.length; j++) {
                    const node = document.createElement("option");
                    for (let k = 0; k < main_apps_info.length; k++) {
                        if (main_apps_categories[i].apps[j] == main_apps_info[k].id) {
                            node.innerHTML = main_apps_info[k].name;
                            node.value = main_apps_info[k].id;
                        }
                    }
                    document.getElementById("appSelect").appendChild(node);
                }
            }
        }

        document.getElementById("appSelect").classList.remove("d-none");
        document.getElementById("appAddition").classList.remove("d-none");
    } else {
        document.getElementById("appSelect").classList.add("d-none");
        document.getElementById("appAddition").classList.add("d-none");
    }
});

document.getElementById("appAddition").addEventListener("click", function(event) {
    app_to_add =  document.getElementById("appSelect").value;
    if (app_to_add != undefined && selected_apps.indexOf(app_to_add) == -1) {
        selected_apps.push(app_to_add);
        localStorage.setItem("main_selected_apps", JSON.stringify(selected_apps));
        addApps();
    }
});

// execution logic
addApps();
addCategory();
import * as bootstrap from 'bootstrap';

import {sendRequest} from './api.js'

const predefinedLogo = new URL('../images/upload-solid.svg', import.meta.url);
const deleteLogo = new URL('../images/trash-solid.svg', import.meta.url);

const predefinedScripts = [
    {
        "name": "闪烁平台的LED灯",
        "content": "{\r\n\"event\":\"now\",\r\n\"actions\": [[\"gpio\", \"led\", \"output\", 2]]\r\n}",
    },
    {
        "name": "按下左按钮打开平台的LED灯",
        "content": "{\r\n" +
                    "\"event\":\"pinstate\",\r\n" +
                    "\"pin\": \"left\",\r\n" + 
                    "\"trigger\": \"falling\",\r\n" + 
                    "\"debounce\": 50,\r\n" +
                    "\"actions\": [[\"gpio\", \"led\", \"output\", 0]]\r\n" +
                    "}"
    },
    {
        "name": "按下有按钮关闭平台的LED灯",
        "content": "{\r\n" +
        "\"event\":\"pinstate\",\r\n" +
        "\"pin\": \"right\",\r\n" + 
        "\"trigger\": \"falling\",\r\n" + 
        "\"debounce\": 50,\r\n" +
        "\"actions\": [[\"gpio\", \"led\", \"output\", 1]]\r\n" +
        "}"
    },
];
var savedFiles = [];

document.getElementById("userinput").innerHTML = localStorage.getItem("userinputstore");
if (localStorage.getItem("savedfiles")) {
    savedFiles = JSON.parse(localStorage.getItem("savedfiles"));
}

document.getElementById("submitButton").addEventListener("click", async function() {
    const payload = document.getElementById("userinput").value;
    try {
        removeErrorMsg();
        JSON.parse(payload);
        const response = await sendRequest(payload);
        document.getElementById("platform-response").innerHTML = JSON.stringify(response);
    } catch (err) {
        addErrorMsg("请检查输入，输入不符合JSON格式。")
    }
});

document.getElementById("saveButton").addEventListener("click", function() {
    const filename = document.getElementById("filename").value;
    if (filename === "") {
        addErrorMsg("请在窗口中输入正确的保存文件名称。")
    } else {
        savedFiles.push({
            "name": filename,
            "content": document.getElementById("userinput").value
        });
        localStorage.setItem("savedfiles", JSON.stringify(savedFiles));
        updateSaveFilesTable();
    }
});

document.getElementById("userinput").addEventListener("input", function() {
    localStorage.setItem("userinputstore", document.getElementById("userinput").value);
});

function addErrorMsg(message) {
    document.getElementById("errorMsg").innerHTML = message;
    document.getElementById("errorMsg").classList.remove("d-none");
}

function removeErrorMsg() {
    document.getElementById("errorMsg").classList.add("d-none");
}

function updateSaveFilesTable() {
    for (let i = 0; i < savedFiles.length; i++) {
        const eleTr = document.createElement("tr");
        const eleTh = document.createElement("th");
        const eleTd1 = document.createElement("td");
        const eleTd2 = document.createElement("td");
        const eleImage1 = document.createElement("img");
        const eleImage2 = document.createElement("img");
        eleTh.setAttribute("scope", "row");
        eleTh.innerHTML = savedFiles[i]["name"];
        eleImage1.setAttribute("src", predefinedLogo);
        eleImage1.setAttribute("style", "width:25px;");
        eleImage2.setAttribute("src", deleteLogo);
        eleImage2.setAttribute("style", "width:25px;");
        eleTd1.append(eleImage1);
        eleTd2.append(eleImage2);
        eleTr.append(eleTh, eleTd1, eleTd2);
        document.getElementById("savedfiles").append(eleTr);

        eleTd1.addEventListener("click", function() {
            updateInputContent(savedFiles[i]["content"]);
        });

        eleTd2.addEventListener("click", function() {
            document.getElementById("savedfiles").innerHTML = "";
            savedFiles.splice(i, 1);
            updateSaveFilesTable();
        });
    }
}

function updateInputContent(input) {
    document.getElementById("userinput").innerHTML = input;
    localStorage.setItem("userinputstore", input);
    window.scrollTo(0,0);
}

function setupPredefinedScripts() {
    const predefinedEle = document.getElementById("predefinedBody");
    for (let i = 0; i < predefinedScripts.length; i++) {
        const eleTr = document.createElement("tr");
        const eleTh = document.createElement("th");
        const eleTd = document.createElement("td");
        const eleImage = document.createElement("img");
        eleTh.setAttribute("scope", "row");
        eleImage.setAttribute("src", predefinedLogo);
        eleImage.setAttribute("style", "width:25px;");
        eleTh.innerHTML = predefinedScripts[i]["name"];
        eleTd.appendChild(eleImage);
        eleTd.addEventListener("click", function() {
            updateInputContent(predefinedScripts[i]["content"]);
        });
        eleTr.append(eleTh, eleTd);
        predefinedEle.append(eleTr);
    }
}

setupPredefinedScripts();
updateSaveFilesTable();


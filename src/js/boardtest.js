import {sendRequest} from 'sensorsparks.api'

const predefinedLogo = new URL('../images/upload-solid.svg', import.meta.url);
const deleteLogo = new URL('../images/trash-solid.svg', import.meta.url);

const predefinedScripts = [
    {
        "name": "闪烁平台的LED灯",
        "api": 0,
        "content": "{\r\n\"event\":\"now\",\r\n\"actions\": [[\"gpio\", \"led\", \"output\", 2]]\r\n}",
    },
    {
        "name": "按下左按钮打开平台的LED灯",
        "api": 0,
        "content": "{\r\n" +
                    "\"event\":\"pinstate\",\r\n" +
                    "\"pin\": \"left\",\r\n" + 
                    "\"trigger\": \"falling\",\r\n" + 
                    "\"debounce\": 50,\r\n" +
                    "\"actions\": [[\"gpio\", \"led\", \"output\", 0]]\r\n" +
                    "}"
    },
    {
        "name": "按下右按钮关闭平台的LED灯",
        "api": 0,
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
var gApiIndex = 0;

class ApiInfo {
    constructor(uri, method, body, param) {
        this.uri = uri;
        this.method = method;
        this.body = body;
        this.param = param;
    }
}

const apiTable = [
    new ApiInfo("/hardware/operation","POST",true, false),
    new ApiInfo("/hardware/operation","GET",false, false),
    new ApiInfo("/hardware/operation","DELETE",false, true),
    new ApiInfo("/hardware/status","GET",false, false),
    new ApiInfo("/hardware/config","GET",false, false),
    new ApiInfo("/hardware/config","POST",true, false),
    new ApiInfo("/hardware/restart","POST",false, false),
]

document.getElementById("userinput").innerHTML = localStorage.getItem("userinputstore");
if (localStorage.getItem("savedfiles")) {
    savedFiles = JSON.parse(localStorage.getItem("savedfiles"));
}

document.getElementById("submitButton").addEventListener("click", async function() {
    let payload;
    if (document.getElementById("userinput").hasAttribute("disabled")) {
        payload = null;
    } else {
        payload = document.getElementById("userinput").value;
    }
    let api = apiTable[gApiIndex];
    let uri = api.uri;
    if (document.getElementById("paraminput").hasAttribute("hidden") == false) {
        uri += "?" + document.getElementById("paraminputText").value;
    }

    try {
        removeErrorMsg();
        if (payload != null) {
            JSON.parse(payload);
        }
        const response = await sendRequest(uri, api.method, payload);
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
            "api": gApiIndex,
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

function updateInputContent(apiIndex, input) {
    document.getElementById("userinput").value = input;
    
    document.getElementById("apiSelect").value = apiIndex;
    gApiIndex = apiIndex;
    if ((apiTable[apiIndex].uri == "/hardware/operation" && apiTable[apiIndex].method == "POST") || 
        (apiTable[apiIndex].uri == "/hardware/config" && apiTable[apiIndex].method == "POST")){
        document.getElementById("userinput").removeAttribute("disabled");
    } else {
        document.getElementById("userinput").setAttribute("disabled", true);
    }
    document.getElementById("apiInfo").innerHTML = `URL: ${apiTable[gApiIndex].method} ${apiTable[gApiIndex].uri}`
    localStorage.setItem("userinputstore", input);
    window.scrollTo(0,0);
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
            updateInputContent(savedFiles[i]["api"], savedFiles[i]["content"]);
        });

        eleTd2.addEventListener("click", function() {
            document.getElementById("savedfiles").innerHTML = "";
            savedFiles.splice(i, 1);
            updateSaveFilesTable();
        });
    }
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
            updateInputContent(predefinedScripts[i]["api"], predefinedScripts[i]["content"]);
        });
        eleTr.append(eleTh, eleTd);
        predefinedEle.append(eleTr);
    }
}

document.getElementById("apiSelect").addEventListener("change", function(event) {
    gApiIndex = event.target.value;
    if (apiTable[gApiIndex].body == false) {
        document.getElementById("userinput").value = "";
        document.getElementById("userinput").setAttribute("disabled", true);
    } else {
        document.getElementById("userinput").removeAttribute("disabled");
    }

    if (apiTable[gApiIndex].param == false) {
        document.getElementById("paraminput").setAttribute("hidden", true);
    } else {
        document.getElementById("paraminput").removeAttribute("hidden");
    }

    document.getElementById("apiInfo").innerHTML = `URL: ${apiTable[gApiIndex].method} ${apiTable[gApiIndex].uri}`
});
document.getElementById("apiInfo").innerHTML = `URL: ${apiTable[gApiIndex].method} ${apiTable[gApiIndex].uri}`

document.getElementById("paraminputText").addEventListener("input", function(event) {
    document.getElementById("apiInfo").innerHTML = `URL: ${apiTable[gApiIndex].method} ${apiTable[gApiIndex].uri}?${event.target.value}`
});

setupPredefinedScripts();
updateSaveFilesTable();


const bootstrap =  require("bootstrap");
import {syncPwmReq} from './api'

var pin = localStorage.getItem("pin");
var buzzer_notes;

if (pin != null) {
    document.getElementById("pinSelect").value = pin;
}

if (localStorage.getItem("buzzer_notes") == null) {
    buzzer_notes = [{
        name:"do",
        level:4,
        duration:0.5
    }];
} else {
    buzzer_notes = JSON.parse(localStorage.getItem("buzzer_notes"));
}

const color_info = {
    "do": "#ffadad",
    "do#": "#FF8F8F",
    "re": "#ffd6a5",
    "re#": "#FFAE69",
    "mi": "#fdffb6",
    "fa": "#caffbf",
    "fa#": "#CAD7AB",
    "sol": "#9bf6ff",
    "sol#": "#9BE2CD",
    "la": "#a0c4ff",
    "la#": "#A088CD",
    "si": "#ffc6ff",
    "pause": "#bfc1c2",
};

const notes_info = [
    {
        name:"pause",
        level:0,
        freq:0 
    },
    {
        name:"do",
        level:3,
        freq:130.81
    },
    {
        name:"do#",
        level:3,
        freq:138.59
    },
    {
        name:"re",
        level:3,
        freq:146.83
    },
    {
        name:"re#",
        level:3,
        freq:155.56
    },
    {
        name:"mi",
        level:3,
        freq:164.81
    },
    {
        name:"fa",
        level:3,
        freq:174.61
    },
    {
        name:"fa#",
        level:3,
        freq:185
    },
    {
        name:"sol",
        level:3,
        freq:196,
    },
    {
        name:"sol#",
        level:3,
        freq:207.65,
    },
    {
        name:"la",
        level:3,
        freq: 220
    },
    {
        name:"la#",
        level:3,
        freq: 233.08
    },
    {
        name:"si",
        level:3,
        freq:246.94
    },
    {
        name:"do",
        level:4,
        freq:261.63
    },
    {
        name:"do#",
        level:4,
        freq:277.18
    },
    {
        name:"re",
        level:4,
        freq:293.66
    },
    {
        name:"re#",
        level:4,
        freq:311.13
    },
    {
        name:"mi",
        level:4,
        freq:329.63
    },
    {
        name:"fa",
        level:4,
        freq:349.23
    },
    {
        name:"fa#",
        level:4,
        freq:369.99
    },
    {
        name:"sol",
        level:4,
        freq:392,
    },
    {
        name:"sol#",
        level:4,
        freq:415.3,
    },
    {
        name:"la",
        level:4,
        freq: 440
    },
    {
        name:"la#",
        level:4,
        freq: 466.16
    },
    {
        name:"si",
        level:4,
        freq:493.88
    },
    {
        name:"do",
        level:5,
        freq:523.25
    },
    {
        name:"do#",
        level:5,
        freq:554.37
    },
    {
        name:"re",
        level:5,
        freq:587.33
    },
    {
        name:"re#",
        level:5,
        freq:622.25
    },
    {
        name:"mi",
        level:5,
        freq:659.25
    },
    {
        name:"fa",
        level:5,
        freq:698.46
    },
    {
        name:"fa#",
        level:5,
        freq:739.99
    },
    {
        name:"sol",
        level:5,
        freq:783.99,
    },
    {
        name:"sol#",
        level:5,
        freq:830.61,
    },
    {
        name:"la",
        level:5,
        freq: 880
    },
    {
        name:"la#",
        level:5,
        freq: 932.33
    },
    {
        name:"si",
        level:5,
        freq:987.77
    }
];

notes_info.map(function(note) {
    for (let key in color_info) {
        if (key == note.name) {
            note["color"] = color_info[key];
        }
    }
});

var addNoteModal = new bootstrap.Modal(document.getElementById('addNoteModal'), {
    keyboard: true
  });

function getNoteInfo(note) {
    var freq, color;
    for (let key in color_info) {
        if (key == note.name) {
            color = color_info[key];
        }
    }
    for (let i = 0; i < notes_info.length; i++) {
        if (notes_info[i].name == note.name && notes_info[i].level == note.level) {
            freq = notes_info[i].freq;
        } else if (note.name == "pause") {
            freq = 0;
        }
    }
    return [freq, color];
}

function clearSelected(id) {
    let options = document.getElementById(id);
    for (let i = 0; i < options.length; i++) {
        options[i].removeAttribute("selected");
    }
}

function updateModal(metaData) {
    clearSelected("noteSelect");
    let options = document.getElementById("noteSelect");
    for (let i = 0; i < options.length; i++) {
        if (options[i].getAttribute("value") == metaData["name"]) {
            options[i].setAttribute("selected","");
            noteSelected = metaData["name"];
        }
    }

    clearSelected("levelSelect");
    options = document.getElementById("levelSelect");
    for (let i = 0; i < options.length; i++) {
        if (options[i].getAttribute("value") == metaData["level"]) {
            options[i].setAttribute("selected","");
            levelSelected = metaData["level"];
        }
    }

    durationSelectIndex = metaData["durSelectIndex"];
    if (metaData["durSelectIndex"] != -1) {
        clearSelected("durationSelect");
        options = document.getElementById("durationSelect");
        for (let i = 0; i < options.length; i++) {
            if (options[i].getAttribute("value") == metaData["duration"]) {
                options[i].setAttribute("selected","");
                durationSelected = metaData["duration"];
            }
        }
        document.getElementById("otherDuration").checked = false;
        document.getElementById("durationInput").setAttribute("disabled", true);
        document.getElementById("durationSelect").removeAttribute("disabled");
    } else {
        let durationInput = document.getElementById("durationInput");
        durationInput.setAttribute("placeholder", metaData["duration"]);
        durationVal = metaData["duration"];
        document.getElementById("otherDuration").checked = true;
        document.getElementById("durationSelect").setAttribute("disabled", true);
        document.getElementById("durationInput").removeAttribute("disabled");
        document.getElementById("durationInput").value = durationVal;
    }
}

// Need move this part to the top later
addNotes();
var noteSelected = -1;
var levelSelected = -1;
var durationSelectIndex = -1;
var durationSelected = -1;
var durationVal = -1;
var noteClickedId = -1;

function noteClicked(id) {
    let card = document.getElementsByClassName("card")[id];
    updateModal(JSON.parse(card.getAttribute("data-meta")));
    addNoteModal.show();
    noteClickedId = id;
}

function getdurSelectIndex(duration) {
    let durationOptions = document.getElementById("durationSelect");
    let durSelectIndex = -1;
    for (let i = 0; i < durationOptions.length; i++) {
        if (durationOptions[i].value == duration) {
            durSelectIndex = i;
        }
    }
    return durSelectIndex;
}

function generateNote(note, id) {
    var noteElement = document.createElement("div");
    var childElement = document.createElement("div");
    var [freq, color] = getNoteInfo(note)

    noteElement.classList.add("card");
    noteElement.style["background-color"] = color;
    childElement.classList.add("card-body");
    childElement.appendChild(document.createElement("h5"));
    childElement.appendChild(document.createElement("p"));
    childElement.children[0].classList.add("card-title");
    if (note.name == "pause") {
        childElement.children[0].textContent = note.name;
    } else {
        childElement.children[0].textContent = note.name + note.level + "("+ freq +"Hz)";
    }
    childElement.children[1].classList.add("card-text");
    childElement.children[1].classList.add("text-center");
    childElement.children[1].textContent = note.duration+"秒";
    noteElement.appendChild(childElement);
    noteElement.setAttribute("data-meta", JSON.stringify({
        "name":note.name,
        "level":note.level,
        "durSelectIndex":getdurSelectIndex(note.duration),
        "duration":note.duration
    }))
    noteElement.addEventListener('click', function() {
        noteClicked(id);
    });

    return noteElement;
}

function addNotes() {
    document.getElementById("notes_area").innerHTML = "";
    for (let i = 0 ; i < buzzer_notes.length; i++) {
        document.getElementById("notes_area").appendChild(generateNote(buzzer_notes[i], i));
    }
    localStorage.setItem("buzzer_notes", JSON.stringify(buzzer_notes));
}

function addErrorMsg(message) {
    document.getElementById("errorMsg").innerHTML = message;
    document.getElementById("errorMsg").classList.remove("d-none");
}

function removeErrorMsg() {
    document.getElementById("errorMsg").classList.add("d-none");
}

document.getElementById("otherDuration").addEventListener("change", function(event) {
    if (document.getElementById("otherDuration").checked) {
        document.getElementById("durationSelect").setAttribute("disabled", true);
        document.getElementById("durationInput").removeAttribute("disabled");
    } else {
        document.getElementById("durationInput").setAttribute("disabled", true);
        document.getElementById("durationSelect").removeAttribute("disabled");
    }
});

document.getElementById("noteSelect").addEventListener("change", async function(event) {
    noteSelected = document.getElementById("noteSelect").value;
    if (noteSelected == "pause") {
        document.getElementById("levelSelect").classList.add("d-none");
    } else {
        document.getElementById("levelSelect").classList.remove("d-none");
    }
});

document.getElementById("levelSelect").addEventListener("change", async function(event) {
    levelSelected = document.getElementById("levelSelect").value;
});

document.getElementById("durationSelect").addEventListener("change", async function(event) {
    durationSelected = document.getElementById("durationSelect").value;
});

document.getElementById("otherDuration").addEventListener("change", async function(event) {
    if (document.getElementById("otherDuration").checked) {
        durationSelectIndex = -1;
    } else {
        durationSelectIndex = document.getElementById("durationSelect").value;
    }
});

document.getElementById("durationInput").addEventListener("change", async function(event) {
    durationVal = document.getElementById("durationInput").value;
});

document.getElementById("addNoteActButton").addEventListener("click", async function(event) {
    if (durationSelectIndex == -1) {
        buzzer_notes = buzzer_notes.toSpliced(noteClickedId + 1, 0, {
            name:noteSelected,
            level: levelSelected,
            duration: parseFloat(durationVal),
        });
    } else {
        buzzer_notes = buzzer_notes.toSpliced(noteClickedId + 1, 0, {
            name:noteSelected,
            level: levelSelected,
            duration: parseFloat(durationSelected),
        });
    }
    addNotes();
    removeErrorMsg();
});

document.getElementById("removeNoteActButton").addEventListener("click", async function(event) {
    if (buzzer_notes.length > 1) {
        buzzer_notes.splice(noteClickedId, 1);
        addNotes();
    } else {
        addErrorMsg("无法删除，音符区域至少需要一个音符。");
    }
});

document.getElementById("modifyNoteActButton").addEventListener("click", async function(event) {
    buzzer_notes[noteClickedId].name = noteSelected;
    buzzer_notes[noteClickedId].level = levelSelected;
    if (durationSelectIndex == -1) {
        buzzer_notes[noteClickedId].duration = parseFloat(durationVal);
    } else {
        buzzer_notes[noteClickedId].duration = parseFloat(durationSelected);
    }
    addNotes();
});

document.getElementById("areaDeletion").addEventListener("click", async function(event) {
    first_note = buzzer_notes[0];
    document.getElementById("notes_area").innerHTML = "";
    buzzer_notes = [];
    buzzer_notes.push(first_note);
    addNotes();
});

document.getElementById("pinSelect").addEventListener("change", async function(event) {
    var ele = document.getElementById("pinSelect");
    if (ele.options[ele.selectedIndex].value == -1) {
        addErrorMsg("请在列表中选择正确的连接引脚。");
        document.getElementById("displayPins").classList.add("d-none")
    } else {
        pin = parseInt(ele.options[ele.selectedIndex].value);
        localStorage.setItem("pin", pin);
        removeErrorMsg();
    }
});

document.getElementById("scheduleSetButton").addEventListener("click", async function(event) {
    if (pin == undefined) {
        addErrorMsg("无法开始播放，请在列表中选择蜂鸣器和平台连接的引脚。");
    } else {
        let operations = []
        for (let i = 0; i < buzzer_notes.length; i++) {
            let [freq, color] = getNoteInfo(buzzer_notes[i]);
            operations.push({
                frequency: freq,
                duration: buzzer_notes[i].duration,
            });
        }
        await syncPwmReq(pin, operations);
    }
});




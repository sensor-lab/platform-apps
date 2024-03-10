function refreshTime() {
    var date = new Date();
    var time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate()
        + ' ' + date.getHours() + ':' + date.getMinutes() + ":" + date.getSeconds();
    document.getElementById("currentDate").innerHTML = `环境监测 ${time}`;
}

refreshTime()
setInterval(refreshTime, 1000);

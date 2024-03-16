// GPIO config
var num_of_leds_global = 0
var base_color_global = 0
var blink_color_global = 0
var blink_index_global = 0
var interval_global = null
var gpio_index = parseInt(prompt("请将LED灯带和电平转换插板连接，并将电平转换插板插入平台。输入引脚号：", "0"));

if (gpio_index < 0 || gpio_index > 23) {
    alert("请输入正确的引脚号，需要在0-23之间。")
}

// Color theme map
const colorMap = new Map();
colorMap.set('blue', ['#00a6fb', '#0582ca', '#006494', '#003554', '#051923']);
colorMap.set('green', ['#5bba6f', '#3fa34d', '#2a9134', '#137547', '#054a29']);
colorMap.set('red', ['#ea8c55', '#c75146', '#ad2e24', '#81171b', '#540804']);

function displaySelectedTheme(selected) {
    colorMap.forEach((val, key, map) => {
        if (key === selected) {
            document.getElementById(key).classList.remove("d-none");
        } else {
            document.getElementById(key).classList.add("d-none");
        }
    })
}

// Color them selector
var colorThemeSelector = document.getElementById("colorThemeSelector")
var selectedColor = colorThemeSelector.options[colorThemeSelector.selectedIndex].value
console.log(selectedColor)
displaySelectedTheme(selectedColor)

colorThemeSelector.addEventListener("change", function (event) {
    selectedColor = colorThemeSelector.options[colorThemeSelector.selectedIndex].value
    console.log(selectedColor)
    displaySelectedTheme(selectedColor)
});

// Color length selector
var colorLengthSelector = document.getElementById("colorLengthSelector")

document.getElementById("submitButton").addEventListener("click", function (event) {
    console.log("Light LED");
    console.log(`Color Theme: ${selectedColor}`)
    console.log(`Color Theme color items: ${colorMap.get(selectedColor)}`)
    console.log(`Color Length: ${colorLengthSelector.options[colorLengthSelector.selectedIndex].value}`)
    // Todo: send API request to board
})
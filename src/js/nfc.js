document.getElementById("testBtn").addEventListener("click", async function () {
    let request = 'http://192.168.1.108/hardware/operation';
    let event = {
        "event": "now",
        "actions": [ 
            ["gpio", "led", "output", 2],
        ]
    };
    try {
        const response = await fetch(request, {
            method: 'post',
            body: JSON.stringify(event),
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            mode: 'no-cors'
        });
        return  await response.json();
    } catch (error) {
        console.log('Error call API:', error);
    }
})
export async function readAdc(pin_id) {
    let request = '/hardware/operation';
    let body = {
      'event': 'now',
      'actions': [["adc", pin_id, "3.1v"]]
    };

    try {
        const response = await fetch(request, {
            method: 'post',
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (data.errorcode == 0) {
            adc_val = data.result[0][0];
            return adc_val;
        } else {
            console.log('API returns error code:', data.errorcode);
        }
    } catch (error) {
        console.log('Error call API:', error);
    }
}

export async function resetMotorDriver(phase1_pin_id, phase2_pin_id, 
                                    phase3_pin_id, phase4_pin_id) {
    let request = '/hardware/operation';
    let body = {
        'event': 'now',
        'actions': [["gpio", phase1_pin_id, "output", 0],
                    ["gpio", phase2_pin_id, "output", 0],
                    ["gpio", phase3_pin_id, "output", 0],
                    ["gpio", phase4_pin_id, "output", 0]]
    };
    try {
        const response = await fetch(request, {
            method: 'post',
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (data.errorcode != 0) {
            console.log('API returns error code:', data.errorcode);
        }
    } catch (error) {
        console.log('Error call API:', error);
    }
}

export async function driveMotor(phase1_pin_id, phase2_pin_id, 
                                phase3_pin_id, phase4_pin_id, 
                                direction, mode, delay, repeat) {
    let request = '/hardware/operation';
    let body = {
        'event': 'now',
        "repeat": repeat,
        "actions": []
    };
    var cycle;

    if (direction == 0) {
        phase1_pin = phase1_pin_id;
        phase2_pin = phase2_pin_id;
        phase3_pin = phase3_pin_id;
        phase4_pin = phase4_pin_id;
    } else {
        phase1_pin = phase4_pin_id;
        phase2_pin = phase3_pin_id;
        phase3_pin = phase2_pin_id;
        phase4_pin = phase1_pin_id;
    }

    if (mode == 0) {
        // full stepping: 32 steps for 5.625 degree (stride)
        cycle = [
            ["gpio", phase1_pin_id, "output", 1],
            ["gpio", phase4_pin_id, "output", 0],
            ["delay", 0, "ms", delay],
            ["gpio", phase2_pin_id, "output", 1],
            ["gpio", phase1_pin_id, "output", 0],
            ["delay", 0, "ms", delay],
            ["gpio", phase3_pin_id, "output", 1],
            ["gpio", phase2_pin_id, "output", 0],
            ["delay", 0, "ms", delay],
            ["gpio", phase4_pin_id, "output", 1],
            ["gpio", phase3_pin_id, "output", 0],
            ["delay", 0, "ms", delay],
        ]
    } else {
        // full stepping: 64 steps for 5.625 degree (stride)
        cycle = [
            ["gpio", phase1_pin, "output", 1],
            ["gpio", phase4_pin, "output", 0],
            ["delay", 0, "ms", delay],
            ["gpio", phase1_pin, "output", 1],
            ["gpio", phase2_pin, "output", 1],
            ["delay", 0, "ms", delay],
            ["gpio", phase2_pin, "output", 1],
            ["gpio", phase1_pin, "output", 0],
            ["delay", 0, "ms", delay],
            ["gpio", phase2_pin, "output", 1],
            ["gpio", phase3_pin, "output", 1],
            ["delay", 0, "ms", delay],
            ["gpio", phase3_pin, "output", 1],
            ["gpio", phase2_pin, "output", 0],
            ["delay", 0, "ms", delay],
            ["gpio", phase3_pin, "output", 1],
            ["gpio", phase4_pin, "output", 1],
            ["delay", 0, "ms", delay],
            ["gpio", phase4_pin, "output", 1],
            ["gpio", phase3_pin, "output", 0],
            ["delay", 0, "ms", delay],
            ["gpio", phase4_pin, "output", 1],
            ["gpio", phase1_pin, "output", 1],
            ["delay", 0, "ms", delay],
        ]
    }
    body.actions.push(...cycle);

    try {
        const response = await fetch(request, {
            method: 'post',
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (data.errorcode == 0) {
            adc_val = data.result[0][0];
            return adc_val;
        } else {
            console.log('API returns error code:', data.errorcode);
        }
    } catch (error) {
        console.log('Error call API:', error);
    }                       
}
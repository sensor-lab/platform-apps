export async function setState(state) {
    let request = '/hardware/config';
    if (state != "normal" && state != "fwupdate" && state != "appupdate") {
        return -1;
    } else {
        try {
            const response = await fetch(request, {
                method: 'post',
                body: JSON.stringify({
                    "state": state
                })
            });
            const ret = await response.json();
            return ret;
        } catch (error) {
            console.log('Error call API:', error);
        }
    }
    return -1;
}

export async function restartPlatform() {
    let request = '/hardware/restart';
    try {
        const response = await fetch(request, {
            method: 'post'
        });
        const ret = await response.json();
        if (ret.hasOwnProperty("errorcode") == false) {
            return 0;
        } else {
            return -1;
        }
    } catch (error) {
        console.log('Error call API:', error);
    }
    return -1;
}

export async function getConfig() {
    let request = '/hardware/config';
    try {
        const response = await fetch(request, {
            method: 'get'
        });
        const ret = await response.json();
        if (ret.hasOwnProperty("errorcode") == false) {
            return ret;
        } else {
            return -1;
        }
    } catch (error) {
        console.log('Error call API:', error);
    }
    return -1;
}

export async function setConfig(config) {
    let request = '/hardware/config';
    try {
        const response = await fetch(request, {
            method: 'post',
            body: JSON.stringify(config)
        });
        const ret = await response.json();
        return ret;
    } catch (error) {
        console.log('Error call API:', error);
    }
    return -1;
}

export async function getStatus() {
    let request = '/hardware/status';
    try {
        const response = await fetch(request, {
            method: 'get'
        });
        const ret = await response.json();
        if (ret.hasOwnProperty("errorcode") == false) {
            return ret;
        } else {
            return -1;
        }
    } catch (error) {
        console.log('Error call API:', error);
    }
    return -1;
}

export async function setTime(timedate) {
    let request = '/hardware/timedate';
    var timedate_str =  timedate.getFullYear() + "-" + (timedate.getMonth() + 1) + "-" + timedate.getDate() + 
                        "T" + timedate.getHours() + ":" + timedate.getMinutes() + ":" + timedate.getSeconds();

    var body = {
        value: timedate_str
    };
    try {
        const response = await fetch(request, {
            method: 'post',
            body: body 
        });
        const ret = await response.json();
        if (ret.hasOwnProperty("errorcode") == false) {
            return 0;
        } else {
            return -1;
        }
    } catch (error) {
        console.log('Error call API:', error);
    }
    return 0;
}

export async function getTime() {
    let request = '/hardware/timedate';
    try {
        const response = await fetch(request, {
            method: 'get'
        });
        const ret = await response.json();
        if (ret.hasOwnProperty("errorcode") == false) {
            return ret.value;
        } else {
            return -1;
        }
    } catch (error) {
        console.log('Error call API:', error);
    }
}

export async function gpio(pin_id, mode, level) {
    let request = '/hardware/operation';
    var body;
    if (mode == "input") {
        body = {
            'event': 'now',
            'actions': [["gpio", pin_id, "input", 0]]
          };
    } else {
        body = {
            'event': 'now',
            'actions': [["gpio", pin_id, "output", level]]
          };
    }

    try {
        const response = await fetch(request, {
            method: 'post',
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (data.errorcode == 0) {
            ret_val = data.result[0][0];
            return ret_val;
        } else {
            console.log('API returns error code:', data.errorcode);
        }
    } catch (error) {
        console.log('Error call API:', error);
    }
}

export async function gpio_output_schedule(pin_id, level, start_time, interval, repeat) {
    let request = '/hardware/operation';
    var start_time_str =  start_time.getFullYear() + "-" + (start_time.getMonth() + 1) + "-" + start_time.getDate() + 
                        "T" + start_time.getHours() + ":" + start_time.getMinutes() + ":" + start_time.getSeconds();
    var body = {
        'event': 'schedule',
        'start': start_time_str,
        'repeat': repeat,
        'actions': [["gpio", pin_id, "output", level]]
    };

    if (interval != null) {
        // if no interval, give it default 10d
        // not setting interval could result in the task get removed unexpectedly.
        body["interval"] = interval;
    }

    try {
        const response = await fetch(request, {
            method: 'post',
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (data.errorcode == 0) {
            ret_val = data.result[0][0];
            return ret_val;
        } else {
            console.log('API returns error code:', data.errorcode);
        }
    } catch (error) {
        console.log('Error call API:', error);
    }
}

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
                                direction, mode, delay, cycle) {
    let request = '/hardware/operation';
    let body = {
        'event': 'now',
        "cycle": cycle,
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

export async function setupAdvanceOutput(pin_id, 
    zero_total_duration_us, zero_high_duration_us,
    one_total_duration_us, one_high_duration_us) {
    let request = '/hardware/operation';
    let body = {
      'event': 'now',
      'actions': [["advance_output", pin_id, "setup","us",
            "zero", zero_total_duration_us, zero_high_duration_us, 
            "one", one_total_duration_us, one_high_duration_us]]
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

export async function startAdvanceOutput(pin_id, cycle, data) {
    let request = '/hardware/operation';
    let body = {
        'event': 'now',
        'cycle': cycle,
        'actions': [["advance_output", pin_id, "start", data.length, ...data]]
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

export async function syncPwmReq(pin_id, operations) {
    let request = '/hardware/operation';
    let body = {
        'event': 'now',
        'actions': []
    };
    for (let i = 0; i < operations.length; i++) {
        if (operations[i].frequency != 0) {
            body['actions'].push(["pwm", 0, operations[i].frequency, operations[i].duration, "sync", parseInt(pin_id), 512]);
        } else {
            body['actions'].push(["delay", 0, "ms", Math.floor(operations[i].duration * 1000)]);
        }
    }
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

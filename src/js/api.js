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
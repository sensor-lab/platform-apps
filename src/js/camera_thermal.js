import {
  i2cReadHardwareOperation,
  i2cWriteHardwareOperation,
  constructNowEvent,
  postHardwareOperation
} from '@sensorsparks/platform-api'

async function mlx90641GetRegister(regAddr) {
    const opers = [];
    i2cWriteHardwareOperation(
    opers,
    16,
    17,
    100,
    51,
    36,
    7
    );
    i2cReadHardwareOperation(
    opers,
    16,
    17,
    100,
    51,
    -1,
    -1,
    6
    );
    const now_event = constructNowEvent(opers);
    const response = await postHardwareOperation(now_event, "http://192.168.1.123");
    if (response["errorcode"] === 0) {
    console.log("success")
    }
}

async function mlx90641GetDeviceID() {

}

async function mlx90641Init() {

}

document
  .getElementById('cameraOneshot')
  .addEventListener('click', async function () {
      
  })
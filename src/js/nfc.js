import {spiHardwareOperation, delayHardwareOperation, constructNowEvent, postHardwareOperation} from './api'

function addErrorMsg(message) {
    document.getElementById("errorMsg").innerHTML = message;
    document.getElementById("errorMsg").classList.remove("d-none");
}

function removeErrorMsg() {
    document.getElementById("errorMsg").classList.add("d-none");
}

function addStatusMsg(message) {
    document.getElementById("statusMsg").innerHTML = message;
    document.getElementById("statusMsg").classList.remove("d-none");
}

function removeStatusMsg() {
    document.getElementById("statusMsg").classList.add("d-none");
}

// define value for the command register
const IDLE = 0;
const MEM = 1;
const GENERATE_RANDOM_ID = 2;
const CALCULATE_CRC = 3;
const TRANSMIT = 4;
const NO_CMD_CHANGE = 7;
const RECEIVE = 8;
const TRANSCEIVE = 12;
const MF_AUTHENT = 14;
const SOFT_RESET = 15;

const CommandReg = 0x01 << 1;// starts and stops command execution
const ComIEnReg= 0x02 << 1;// enable and disable interrupt request control bits
const DivIEnReg = 0x03 << 1;// enable and disable interrupt request control bits
const ComIrqReg= 0x04 << 1;// interrupt request bits
const DivIrqReg= 0x05 << 1;// interrupt request bits
const ErrorReg= 0x06 << 1;// error bits showing the error status of the last command executed 
const Status1Reg= 0x07 << 1;// communication status bits
const Status2Reg= 0x08 << 1;// receiver and transmitter status bits
const FIFODataReg= 0x09 << 1;// input and output of 64 byte FIFO buffer
const FIFOLevelReg= 0x0A << 1;// number of bytes stored in the FIFO buffer
const WaterLevelReg= 0x0B << 1;// level for FIFO underflow and overflow warning
const ControlReg= 0x0C << 1;// miscellaneous control registers
const BitFramingReg= 0x0D << 1;// adjustments for bit-oriented frames
const CollReg= 0x0E << 1;// bit position of the first bit-collision detected on the RF interface
// Page 1: Command
const ModeReg= 0x11 << 1;// defines general modes for transmitting and receiving 
const TxModeReg= 0x12 << 1;// defines transmission data rate and framing
const RxModeReg= 0x13 << 1;// defines reception data rate and framing
const TxControlReg= 0x14 << 1;// controls the logical behavior of the antenna driver pins TX1 and TX2
const TxASKReg= 0x15 << 1;// controls the setting of the transmission modulation
const TxSelReg= 0x16 << 1;// selects the internal sources for the antenna driver
const RxSelReg= 0x17 << 1;// selects internal receiver settings
const RxThresholdReg= 0x18 << 1;// selects thresholds for the bit decoder
const DemodReg= 0x19 << 1;// defines demodulator settings
const MfTxReg= 0x1C << 1;// controls some MIFARE communication transmit parameters
const MfRxReg= 0x1D << 1;// controls some MIFARE communication receive parameters
const SerialSpeedReg= 0x1F << 1;// selects the speed of the serial UART interface
// Page 2: Configuration
const CRCResultRegH= 0x21 << 1;// shows the MSB and LSB values of the CRC calculation
const CRCResultRegL= 0x22 << 1;
const ModWidthReg= 0x24 << 1;// controls the ModWidth setting?
const RFCfgReg= 0x26 << 1;// configures the receiver gain
const GsNReg= 0x27 << 1;// selects the conductance of the antenna driver pins TX1 and TX2 for modulation 
const CWGsPReg= 0x28 << 1;// defines the conductance of the p-driver output during periods of no modulation
const ModGsPReg= 0x29 << 1;// defines the conductance of the p-driver output during periods of modulation
const TModeReg= 0x2A << 1;// defines settings for the internal timer
const TPrescalerReg= 0x2B << 1;// the lower 8 bits of the TPrescaler value. The 4 high bits are in TModeReg.
const TReloadRegH= 0x2C << 1;// defines the 16-bit timer reload value
const TReloadRegL= 0x2D << 1;
const TCounterValueRegH= 0x2E << 1;// shows the 16-bit timer value
const TCounterValueRegL= 0x2F << 1;
// Page 3: Test Registers
const TestSel1Reg= 0x31 << 1;// general test signal configuration
const TestSel2Reg= 0x32 << 1;// general test signal configuration
const TestPinEnReg= 0x33 << 1;// enables pin output driver on pins D1 to D7
const TestPinValueReg= 0x34 << 1;// defines the values for D1 to D7 when it is used as an I/O bus
const TestBusReg= 0x35 << 1;// shows the status of the internal test bus
const AutoTestReg= 0x36 << 1;// controls the digital self-test
const VersionReg= 0x37 << 1;// shows the software version
const AnalogTestReg= 0x38 << 1;// controls the pins AUX1 and AUX2
const TestDAC1Reg= 0x39 << 1;// defines the test value for TestDAC1
const TestDAC2Reg= 0x3A << 1;// defines the test value for TestDAC2
const TestADCReg= 0x3B << 1;// shows the value of ADC I and Q channels


// PICC commands by sending over to FIFO data register
const PICC_CMD_REQA = 0x26;// REQuest command, Type A. Invites PICCs in state IDLE to go to READY and prepare for anticollision or selection. 7 bit frame.
const PICC_CMD_WUPA = 0x52;// Wake-UP command, Type A. Invites PICCs in state IDLE and HALT to go to READY(*) and prepare for anticollision or selection. 7 bit frame.
const PICC_CMD_CT = 0x88;// Cascade Tag. Not really a command, but used during anti collision.
const PICC_CMD_SEL_CL1 = 0x93;// Anti collision/Select, Cascade Level 1
const PICC_CMD_SEL_CL2 = 0x95;// Anti collision/Select, Cascade Level 2
const PICC_CMD_SEL_CL3 = 0x97;// Anti collision/Select, Cascade Level 3
const PICC_CMD_HLTA = 0x50;// HaLT command, Type A. Instructs an ACTIVE PICC to go to state HALT.
const PICC_CMD_RATS = 0xE0;     // Request command for Answer To Reset.
// The commands used for MIFARE Classic (from http://www.mouser.com/ds/2/302/MF1S503x-89574.pdf, Section 9)
// Use PCD_MFAuthent to authenticate access to a sector, then use these commands to read/write/modify the blocks on the sector.
// The read/write commands can also be used for MIFARE Ultralight.
const PICC_CMD_MF_AUTH_KEY_A= 0x60;// Perform authentication with Key A
const PICC_CMD_MF_AUTH_KEY_B= 0x61;// Perform authentication with Key B
const PICC_CMD_MF_READ= 0x30;// Reads one 16 byte block from the authenticated sector of the PICC. Also used for MIFARE Ultralight.
const PICC_CMD_MF_WRITE= 0xA0;// Writes one 16 byte block to the authenticated sector of the PICC. Called "COMPATIBILITY WRITE" for MIFARE Ultralight.
const PICC_CMD_MF_DECREMENT= 0xC0;// Decrements the contents of a block and stores the result in the internal data register.
const PICC_CMD_MF_INCREMENT= 0xC1;// Increments the contents of a block and stores the result in the internal data register.
const PICC_CMD_MF_RESTORE= 0xC2;// Reads the contents of a block into the internal data register.
const PICC_CMD_MF_TRANSFER= 0xB0;// Writes the contents of the internal data register to a block.
// The commands used for MIFARE Ultralight (from http://www.nxp.com/documents/data_sheet/MF0ICU1.pdf, Section 8.6)
// The PICC_CMD_MF_READ and PICC_CMD_MF_WRITE can also be used for MIFARE Ultralight.
const PICC_CMD_UL_WRITE= 0xA2;// Writes one 4 byte page to the PICC.

function readRegister(opers, reg, len=1) {
    spiHardwareOperation(opers, 0, 16, 17, 18, 19, 400, 0, 1, len, reg | 0x80);
}

function writeRegister(opers, reg, ...data) {
    const write_data = [reg, ...data];
    spiHardwareOperation(opers, 0, 16, 17, 18, 19, 400, 0, 0, 0, ...write_data);
}

async function setBit(reg, val) {
    opers = [];
    readRegister(opers, reg);
    let now_event = constructNowEvent(opers);
    let ret = await postHardwareOperation(now_event, "http://192.168.1.108");
    const write_val = ret["result"][0][0] | val;
    opers = [];
    writeRegister(opers, reg, write_val);
    now_event = constructNowEvent(opers);
    ret = await postHardwareOperation(now_event, "http://192.168.1.108");
} 

async function resetBit(reg, val) {
    opers = [];
    readRegister(opers, reg);
    let now_event = constructNowEvent(opers);
    let ret = await postHardwareOperation(now_event, "http://192.168.1.108");
    const write_val = ret["result"][0][0] & (~val);
    opers = [];
    writeRegister(opers, reg, write_val);
    now_event = constructNowEvent(opers);
    ret = await postHardwareOperation(now_event, "http://192.168.1.108");
}

async function transceiveData(transmit_data, receive_data) {
    let opers = [];
}

async function cardPresent() {
    let card_present = false;
    await resetBit(CollReg, 0x80);
    let opers = [];
    writeRegister(opers, TxModeReg, 0);
    writeRegister(opers, RxModeReg, 0);
    writeRegister(opers, ModWidthReg, 38);
    writeRegister(opers, CommandReg, IDLE);
    writeRegister(opers, ComIrqReg, 127);
    writeRegister(opers, FIFOLevelReg, 128);
    writeRegister(opers, FIFODataReg, PICC_CMD_REQA);
    writeRegister(opers, BitFramingReg, 7);
    writeRegister(opers, CommandReg, TRANSCEIVE);
    let now_event = constructNowEvent(opers);
    await postHardwareOperation(now_event, "http://192.168.1.108");
    opers = [];
    await setBit(BitFramingReg, 0x80);      // start sending

    let i = 0;
    while (i < 5)
    {
        opers = [];
        readRegister(opers, ComIrqReg);
        now_event = constructNowEvent(opers);
        let ret = await postHardwareOperation(now_event, "http://192.168.1.108");
        if (ret["result"][0][0] & 0x30) {
            card_present = true;
            break;
        }
        i++;
    }
    if (card_present) {
        opers = [];
        readRegister(opers, FIFOLevelReg);
        now_event = constructNowEvent(opers);
        let ret = await postHardwareOperation(now_event, "http://192.168.1.108");
        const fifo_level = ret["result"][0][0];
        opers = [];
        readRegister(opers, FIFODataReg, fifo_level);
        now_event = constructNowEvent(opers);
        ret = await postHardwareOperation(now_event, "http://192.168.1.108");
        console.log(`FIFO data: ${ret["result"]}`);
    }
    return card_present;
}

document.getElementById("getUidBtn").addEventListener("click", async function () {
    let opers = []
    // reset the NFC module
    writeRegister(opers, CommandReg, SOFT_RESET);
    delayHardwareOperation(opers, "ms", 50);
    writeRegister(opers, TxModeReg, 0);
    writeRegister(opers, RxModeReg, 0);
    writeRegister(opers, ModWidthReg, 38);
    // configure TModeReg, TPrescalerReg, TReloadRegH, TReloadRegL
    writeRegister(opers, TModeReg, 128);
    writeRegister(opers, TPrescalerReg, 169);
    writeRegister(opers, TReloadRegH, 3);
    writeRegister(opers, TReloadRegL, 232);
    writeRegister(opers, ModGsPReg, 64)
    writeRegister(opers, ModeReg, 61);
    let now_event = constructNowEvent(opers);
    let ret = await postHardwareOperation(now_event, "http://192.168.1.108");
    opers = [];
    console.log(`intialize NFC module: ${ret}`)
    // turn on antenna
    await setBit(TxControlReg, 0x3);

    let i = 0;
    let card_present = false;
    while(i < 10) 
    {
        await new Promise(r => setTimeout(r, 1000));
        card_present = await cardPresent();
        if (card_present == true) {
            addStatusMsg("监测到NFC卡！");
            break;
        }
    }

    if (card_present) {
        // start reading UID
        await resetBit(CollReg, 0x80);
        opers = [];
        writeRegister(opers, BitFramingReg, 7);
    }

})
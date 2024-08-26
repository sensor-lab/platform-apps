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

// PICC commands by sending over to FIFO data register, refer: ISO 14443-3
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

var g_uid = [];
var mosi_pin = undefined;
var miso_pin = undefined;
var sck_pin = undefined;
var cs_pin = undefined;

if (localStorage.getItem("mfrc522_pin")) {
    mosi_pin = parseInt(localStorage.getItem("mfrc522_pin"));
    miso_pin = mosi_pin + 1;
    sck_pin = mosi_pin + 2;
    cs_pin = mosi_pin + 3;
    document.getElementById("mfrc522PinSelect").value = mosi_pin;
    showPin();
}

function showPin() {
    if (mosi_pin !== undefined) {
        document.getElementById("moduleConnectionInfo").innerHTML = 
        `MOSI: ${mosi_pin},MISO: ${miso_pin},SCK: ${sck_pin},CS: ${cs_pin}`
    }
    document.getElementById("pinCard").classList.remove("d-none");
}

function readRegister(opers, reg, len=1) {
    transmit_data = [reg | 0x80];
    for (i = 0; i < len - 1; i++) {
        transmit_data.push(reg | 0x80);
    }
    
    spiHardwareOperation(opers, 0, mosi_pin, miso_pin, sck_pin, cs_pin, 400, 0, 1, len, ...transmit_data);
}

function writeRegister(opers, reg, ...data) {
    const write_data = [reg, ...data];
    spiHardwareOperation(opers, 0, mosi_pin, miso_pin, sck_pin, cs_pin, 400, 0, 0, 0, ...write_data);
}

async function setBit(reg, val) {
    opers = [];
    readRegister(opers, reg);
    let now_event = constructNowEvent(opers);
    let ret = await postHardwareOperation(now_event);
    const write_val = ret["result"][0][0] | val;
    opers = [];
    writeRegister(opers, reg, write_val);
    now_event = constructNowEvent(opers);
    ret = await postHardwareOperation(now_event);
} 

async function resetBit(reg, val) {
    opers = [];
    readRegister(opers, reg);
    let now_event = constructNowEvent(opers);
    let ret = await postHardwareOperation(now_event);
    const write_val = ret["result"][0][0] & (~val);
    opers = [];
    writeRegister(opers, reg, write_val);
    now_event = constructNowEvent(opers);
    ret = await postHardwareOperation(now_event);
}

async function transceiveData(cmd, transmit_data, receive_data, tx_last_bits=0) {
    let opers = [];
    let data_received = false;
    await resetBit(CollReg, 0x80);
    writeRegister(opers, TxModeReg, 0);
    writeRegister(opers, RxModeReg, 0);
    writeRegister(opers, ModWidthReg, 38);
    writeRegister(opers, CommandReg, IDLE);
    writeRegister(opers, ComIrqReg, 127);
    writeRegister(opers, FIFOLevelReg, 128);
    writeRegister(opers, FIFODataReg, ...transmit_data);
    writeRegister(opers, BitFramingReg, tx_last_bits);
    writeRegister(opers, CommandReg, cmd);
    let now_event = constructNowEvent(opers);
    await postHardwareOperation(now_event);
    opers = [];
    await setBit(BitFramingReg, 0x80);      // start sending

    let i = 0;
    while (i < 5)
    {
        opers = [];
        readRegister(opers, ComIrqReg);
        now_event = constructNowEvent(opers);
        let ret = await postHardwareOperation(now_event);
        if (ret["result"][0][0] & 0x30) {
            data_received = true;
            break;
        }
        i++;
    }

    if (data_received) {
        opers = [];
        readRegister(opers, FIFOLevelReg);
        now_event = constructNowEvent(opers);
        let ret = await postHardwareOperation(now_event);
        const fifo_level = ret["result"][0][0];
        opers = [];
        readRegister(opers, FIFODataReg, fifo_level);
        now_event = constructNowEvent(opers);
        ret = await postHardwareOperation(now_event);
        receive_data.push(...ret["result"][0]);
    }
    return data_received
}

async function cardPresent() {
    let card_present = false;
    const transmit_data = [PICC_CMD_REQA];
    let receive_data = [];
    card_present = await transceiveData(TRANSCEIVE, transmit_data, receive_data, 7);
    if (card_present) {
        addStatusMsg("检测到NFC卡");
    }
    return card_present;
}

async function selectCard() {
    let get_uid = false;
    let ret_uid = [];
    // start reading UID
    await resetBit(CollReg, 0x80);
    opers = [];
    writeRegister(opers, BitFramingReg, 0);
    let now_event = constructNowEvent(opers);
    await postHardwareOperation(now_event);
    let transmit_data = [PICC_CMD_SEL_CL1, 0x20];
    let receive_data = [];
    if (await transceiveData(TRANSCEIVE, transmit_data, receive_data)) {
        if (receive_data.length == 5) {
            get_uid = true;
            ret_uid = [PICC_CMD_SEL_CL1, 0x70, ...receive_data];
        }
    }

    let is_cascade = false;
    let get_type = false;
    let type = 0;
    if (get_uid) {
        const crc = await calculateCrc(ret_uid);
        if (crc.length == 2) {
            let receive_data = [];
            transmit_data = [...ret_uid, crc[0], crc[1]];
            if (await transceiveData(TRANSCEIVE, transmit_data, receive_data)) {
                g_uid = [];
                if (ret_uid[2] == PICC_CMD_CT) {
                    g_uid.push(ret_uid[3]);
                    g_uid.push(ret_uid[4]);
                    g_uid.push(ret_uid[5]);
                    is_cascade = true;
                } else {
                    g_uid.push(ret_uid[2]);
                    g_uid.push(ret_uid[3]);
                    g_uid.push(ret_uid[4]);
                    g_uid.push(ret_uid[5]);
                    get_type = true;
                    type = receive_data[0] & 0x7F;
                }
            }
        }
    }

    if (is_cascade) {
        transmit_data = [PICC_CMD_SEL_CL2, 0x20];
        receive_data = [];
        if (await transceiveData(TRANSCEIVE, transmit_data, receive_data)) {
            ret_uid = [PICC_CMD_SEL_CL2, 0x70, ...receive_data];
            const crc = await calculateCrc(ret_uid);
            if (crc.length == 2) {
                let receive_data = [];
                transmit_data = [...ret_uid, crc[0], crc[1]];
                if (await transceiveData(TRANSCEIVE, transmit_data, receive_data)) {
                    g_uid.push(ret_uid[2]);
                    g_uid.push(ret_uid[3]);
                    g_uid.push(ret_uid[4]);
                    g_uid.push(ret_uid[5]);
                    get_type = true;
                    type = receive_data[0] & 0x7F;
                }
            }
        }
    }

    if (get_type) {
        printCardType(type);
    }
}

async function writeData(block_id, ...data) {
    // need select then authenticate first
    let buffer = [];
	// Build command buffer
	buffer[0] = PICC_CMD_MF_WRITE;
	buffer[1] = block_id;
    let crc = await calculateCrc(buffer);
    if (crc.length == 2) {
        let rcv_data = [];
		buffer.push(crc[0]);
        buffer.push(crc[1]);
        await transceiveData(TRANSCEIVE, buffer, rcv_data);
    }
    for (let i = data.length; i < 16; i++) {
        data.push(0x20);
    }
    crc = await calculateCrc(data);
    if (crc.length == 2) {
        let rcv_data = [];
        data.push(crc[0]);
        data.push(crc[1]);
        await transceiveData(TRANSCEIVE, data, rcv_data);
    }
}

async function readData(block_id) {
    // need select then authenticate first
    let buffer = [];
	// Build command buffer
	buffer[0] = PICC_CMD_MF_READ;
	buffer[1] = block_id;
	// Calculate CRC_A
	crc = await calculateCrc(buffer);
    let rcv_data = [];
	if (crc.length == 2) {
		buffer[2] = crc[0];
        buffer[3] = crc[1];
        await transceiveData(TRANSCEIVE, buffer, rcv_data);
        console.log(`read data: ${rcv_data}`);
    }
    return rcv_data
}

async function authentication(block_id) {
	// Build command buffer
    const MF_KEY_SIZE = 6
	let send_data = [];
    let receive_data = [];
	send_data[0] = PICC_CMD_MF_AUTH_KEY_A;
	send_data[1] = block_id;
	for (let i = 0; i < MF_KEY_SIZE; i++) {	// 6 key bytes: the factory default key of 0xFFFFFFFFFFFF
		send_data[2+i] = 0xff;
	}
	// Use the last uid bytes as specified in http://cache.nxp.com/documents/application_note/AN10927.pdf
	// section 3.2.5 "MIFARE Classic Authentication".
	// The only missed case is the MF1Sxxxx shortcut activation,
	// but it requires cascade tag (CT) byte, that is not part of uid.
	for (let i = 0; i < 4; i++) {				// The last 4 bytes of the UID
		send_data[8+i] = g_uid[i + g_uid.length - 4];
	}

    await transceiveData(MF_AUTHENT, send_data, receive_data);

    console.log(`authen rcv: ${receive_data}`);
}

async function calculateCrc(data) {
    let opers = [];
    let result = [];
    writeRegister(opers, CommandReg, IDLE);
    writeRegister(opers, DivIrqReg, 0x04);  // clear CRC Irq
    writeRegister(opers, FIFOLevelReg, 128);
    writeRegister(opers, FIFODataReg, ...data);
    writeRegister(opers, CommandReg, CALCULATE_CRC);
    let now_event = constructNowEvent(opers);
    await postHardwareOperation(now_event);
    let i = 0;
    while (i < 5)
    {
        opers = [];
        readRegister(opers, DivIrqReg);
        now_event = constructNowEvent(opers);
        let ret = await postHardwareOperation(now_event);
        if (ret["result"][0][0] & 0x04) {
            opers = [];
            readRegister(opers, CRCResultRegL);
            readRegister(opers, CRCResultRegH);
            now_event = constructNowEvent(opers);
            ret = await postHardwareOperation(now_event);
            result.push(ret["result"][0][0], ret["result"][1][0]);
            break;
        }
        i++;
    }
    return result;
}

async function haltA() {
	let buffer = [];
	
	// Build command buffer
	buffer[0] = PICC_CMD_HLTA;
	buffer[1] = 0;
	// Calculate CRC_A
	const ret = await calculateCrc(buffer);
	if (ret.length == 2) {
        buffer.push(ret[0]);
        buffer.push(ret[1]);
        let recv_data = [];
        await transceiveData(TRANSCEIVE, buffer, recv_data);
    }

    // exit authentication state in the end
    await resetBit(Status2Reg, 0x08);
}

function printCardType(type) {
    document.getElementById("nfcCardUid").innerHTML = `NFC卡ID: ${g_uid}`;
    switch(type) {
        case 0x04: {
            document.getElementById("nfcCardType").innerHTML = `NFC卡类型：未得到`;
            break;	
        }
        case 0x09: {
            document.getElementById("nfcCardType").innerHTML = `NFC卡类型：PICC_TYPE_MIFARE_MINI`;
            break;
        }
        case 0x08: {
            document.getElementById("nfcCardType").innerHTML = `NFC卡类型：PICC_TYPE_MIFARE_1K`;
            break;
        }
        case 0x18: {
            document.getElementById("nfcCardType").innerHTML = `NFC卡类型：PICC_TYPE_MIFARE_4K`;
            break;
        }
        case 0x00: {
            document.getElementById("nfcCardType").innerHTML = `NFC卡类型：PICC_TYPE_MIFARE_UL`;
            break;
        }
        case 0x10:
        case 0x11: {
            document.getElementById("nfcCardType").innerHTML = `NFC卡类型：PICC_TYPE_MIFARE_PLUS`;
            break;
        }
        case 0x01: {
            document.getElementById("nfcCardType").innerHTML = `NFC卡类型：PICC_TYPE_TNP3XXX`;
            break;
        }
        case 0x20: {
            document.getElementById("nfcCardType").innerHTML = `NFC卡类型：PICC_TYPE_ISO_14443_4`;
            break;
        }
        case 0x40: {
            document.getElementById("nfcCardType").innerHTML = `NFC卡类型：PICC_TYPE_ISO_18092`;
            break;
        }
        default: {
            document.getElementById("nfcCardType").innerHTML = `NFC卡类型：未知`;
            break;
        }
    }
    document.getElementById("getUIDCard").classList.remove("d-none");
}

function decodeData(type, data) {
    if (type == 0) {
        return ""
    } else if (type == 1) {
        // ASCII
        let ascii_data = "";
        let valid_data = data.slice(0, 16);
        valid_data.map((data, index, array) => {
            ascii_data += String.fromCharCode(data);
        });
        return ascii_data;
    } else if (type == 2) {
        // UTF16
        let utf16_data = "";
        let valid_data = [];
        for (let i = 0; i < 16; i += 2) {
            valid_data.push(data[i] + (data[i + 1] << 8));
        }
        valid_data.map((data, index, array) => {
            utf16_data += String.fromCharCode(data);
        });
        return utf16_data;
    } else {
        // unknown type
        return ""
    }
}

async function mfrc522Initialization() {
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
    let ret = await postHardwareOperation(now_event);
    opers = [];
    // turn on antenna
    await setBit(TxControlReg, 0x3);
}


document.getElementById("getUidBtn").addEventListener("click", async function () {
    let i = 0;
    let card_present = false;
    if (mosi_pin === undefined) {
        addErrorMsg("请选择MFRC522模块正确的连接引脚");
    } else {
        await mfrc522Initialization();
        while(i < 10) 
        {
            await new Promise(r => setTimeout(r, 1000));
            card_present = await cardPresent();
            if (card_present == true) {
                break;
            } else {
                i ++;
            }
        }
    
        if (card_present) {
           await selectCard();
        }
        removeStatusMsg();
    }
});

document.getElementById("readCardBtn").addEventListener("click", async function() {
    let card_present = false;
    if (mosi_pin === undefined) {
        addErrorMsg("请选择MFRC522模块正确的连接引脚");
    } else {
        await mfrc522Initialization();
        for (let i = 0; i < 10; i++)
        {
            await new Promise(r => setTimeout(r, 1000));
            card_present = await cardPresent();
            if (card_present == true) {
                break;
            } else {
                i ++;
            }
        }

        if (card_present) {
            await selectCard();
            document.getElementById("cardReadData").innerHTML = ""
            let start_block_id = parseInt(document.getElementById("readStartBlock").value);
            let number_of_blocks = parseInt(document.getElementById("blockNumbers").value);
            let decode_type = parseInt(document.getElementById("readDataDecodeType").value);
            addStatusMsg("正在读取中，请稍后。");
            for (let i = 0; i < number_of_blocks; i++) {
                await authentication(start_block_id + i);
                const read_data = await readData(start_block_id + i);
                // reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template
                let temp_node = document.querySelector("#readNfcDataTemplate").content.cloneNode(true)
                let td = temp_node.querySelectorAll("td");
                let th = temp_node.querySelectorAll("th");
                th[0].textContent = (start_block_id + i).toString();
                td[0].textContent = "";
                for (let j = 0; j < 15; j ++) {
                    td[0].textContent += `${read_data[j]}, `;
                }
                td[0].textContent += `${read_data[15]}`;
                td[1].textContent = decodeData(decode_type, read_data);
                document.getElementById("cardReadData").appendChild(temp_node)        
            }
            await haltA();
        }
        removeStatusMsg();
        addStatusMsg("读数据完成");
        window.scrollTo(0,0);
    }
});

document.getElementById("writeCardBtn").addEventListener("click", async function() {
    let card_present = false;
    let ascii_input = true;
    let error = false;
    let binary_data;
    const format = parseInt(document.getElementById("writeDataFormat").value);
    const write_data = (document.getElementById("writeDataArea").value).split("");
    if (write_data[0].charCodeAt(0) > 256) {
        ascii_input = false;
    } else {
        ascii_input = true;
    }
    if (format == 0) {
        binary_data = write_data.flatMap(char => {
            let code = char.charCodeAt(0);
            if (ascii_input && code < 256) {
                return code
            } else if (ascii_input == false && code >= 256) {
                return [code & 0xFF, (code >> 8) & 0xff]
            } else {
                error = true;
                addErrorMsg("请勿将中文字符和英文字母混用，请分开进行写入。");
            }
        });
    } else {
        binary_data = write_data.reduce((acc, item, index, arr) => {
            if (index % 2 === 1) {
                const number_str = arr[index - 1] + item;
                const number_binary = parseInt(number_str, 16);
                if (NaN == number_binary) {
                    addErrorMsg("二进制数据错误，请检查输入。")
                }
                acc.push(number_binary);
            }
            return acc;
          }, []);
    }

    if (mosi_pin === undefined) {
        addErrorMsg("请选择MFRC522模块正确的连接引脚");
    } else if (error == true) {
        window.scrollTo(0,0);
    } else {
        await mfrc522Initialization();
        for (let i = 0; i < 10; i++) 
        {
            await new Promise(r => setTimeout(r, 1000));
            card_present = await cardPresent();
            if (card_present == true) {
                break;
            } else {
                i ++;
            }
        }
        let start_block_id = parseInt(document.getElementById("writeStartBlock").value);

        if (card_present) {
            await selectCard();
            const number_blocks_to_write = Math.ceil(binary_data.length / 16);
            addStatusMsg("正在写入中，请稍后。");
            for (let i = 0; i < number_blocks_to_write; i++) {
                await authentication(start_block_id + i);
                if (i == (number_blocks_to_write - 1)) {
                    // last block
                    const block_data = binary_data.slice(i * 16)
                    for (let j = 0; j < (number_blocks_to_write * 16 - binary_data.length); j++) {
                        block_data.push(0x20);
                    }
                    await writeData(start_block_id + i, ...block_data);
                } else {
                    const block_data = binary_data.slice(i * 16, (i + 1) * 16);
                    await writeData(start_block_id + i, ...block_data);
                }
            }
            await haltA();
        }
        removeStatusMsg();
        addStatusMsg("写数据完成");
        window.scrollTo(0,0);
    }    
});

document.getElementById("mfrc522PinSelect").addEventListener("change", function(event) {
    mosi_pin = parseInt(event.target.value);
    miso_pin = mosi_pin + 1;
    sck_pin = mosi_pin + 2;
    cs_pin = mosi_pin + 3;
    localStorage.setItem("mfrc522_pin", mosi_pin);
    showPin();
});

import {
  spiHardwareOperation,
  i2cReadHardwareOperation,
  i2cWriteHardwareOperation,
  delayHardwareOperation,
  constructNowEvent,
  postHardwareOperation,
} from "./api";

// many hidden registers though....
// Register table - OV2640 DSP address
const R_BPASS_REG = 0x05;
const QS_REG = 0x44;
const CTRLI_REG = 0x50;
const HSIZE_REG = 0x51;
const VSIZE_REG = 0x52;
const XOFFL_REG = 0x53;
const YOFFL_REG = 0x54;
const VHYX_REG = 0x55;
const TEST_REG = 0x57;
const ZMOW_REG = 0x5a;
const ZMOH_REG = 0x5b;
const ZMHH_REG = 0x5c;
const CTRL2_REG = 0x86;
const CTRL3_REG = 0x87;
const SIZEL_REG = 0x8c;
const HSIZE8_REG = 0xc0;
const VSIZE8_REG = 0xc1;
const CTRL0_REG = 0xc2;
const CTRL1_REG = 0xc3;
const R_DVP_SP_REG = 0xd3;
const IMAGE_MODE_REG = 0xda;
const RESET_REG = 0xe0;
const MC_BIST_REG = 0xf9;
const RA_DLMT_REG = 0xff;

// Register table - OV2640 Sensor address
const COM1_REG = 0x03;
const REG04_REG = 0x04;
const COM2_REG = 0x09;
const COM3_REG = 0x0c;
const COM4_REG = 0x0d;
const AEC_REG = 0x10;
const CLKRC_REG = 0x11;
const COM7_REG = 0x12;
const COM7_COLOR_BAR = 0x02;
const COM8_REG = 0x13;
const COM8_DEFAULT_VAL = 0xc0;
const COM8_BNDF_EN = 0x20;
const COM8_AGC_EN = 0x04;
const COM8_AEC_EN = 0x01;
const COM9_REG = 0x14;
const COM10_REG = 0x15;
const HREFST_REG = 0x17;
const HREFEND_REG = 0x18;
const VSTRT_REG = 0x19;
const VEND_REG = 0x1a;
const AEW_REG = 0x24;
const AEB_REG = 0x25;
const VV_REG = 0x26;
const REG32_REG = 0x32;
const ARCOM2_REG = 0x34;
const REG45_REG = 0x45;
const FLL_REG = 0x46;
const BD50_REG = 0x4f;
const BD60_REG = 0x50;
const HISTO_LOW_REG = 0x61;
const HISTO_HIGH_REG = 0x62;
const BPADDR_REG = 0x7c;
const BPDATA_REG = 0x7d;

// Register table - Arducam SPI registers
const ARDUCAM_TEST_REG = 0x00;
const ARDUCAM_CAPTURE_CTR_REG = 0x01;
const ARDUCAM_SENSOR_INTERFACE_TIMING_REG = 0x03;
const ARDUCAM_FIFO_CTR_REG = 0x04;
const ARDUCAM_GPIO_DIR_REG = 0x05;
const ARDUCAM_GPIO_WR_REG = 0x06;
const ARDUCAM_BURST_FIFO_READ_REG = 0x3c;
const ARDUCAM_SINGLE_FIFO_READ_REG = 0x3d;
const ARDUCAM_CHIP_VER_REG = 0x40;
const ARDUCAM_FIFO_DONE_REG = 0x41;
const ARDUCAM_WRITE_FIFO_SIZE1_REG = 0x42;
const ARDUCAM_WRITE_FIFO_SIZE2_REG = 0x43;
const ARDUCAM_WRITE_FIFO_SIZE3_REG = 0x44;
const ARDUCAM_GPIO_RD_REG = 0x45;

class CameraConfigReg {
  constructor(reg, value) {
    this.reg = reg;
    this.value = value;
  }
}

const ov2640_init_regs = [
  new CameraConfigReg(RA_DLMT_REG, 0x01),
  new CameraConfigReg(COM7_REG, 0x80),
  new CameraConfigReg(RA_DLMT_REG, 0x00),
  new CameraConfigReg(0x2c, 0xff), // 手册没有说明该寄存器的作用，参考手册进行配置
  new CameraConfigReg(0x2e, 0xdf),
  new CameraConfigReg(RA_DLMT_REG, 0x01),
  new CameraConfigReg(0x3c, 0x32), // 手册没有说明该寄存器的作用，参考手册进行配置
  new CameraConfigReg(0x2c, 0x0c),
  new CameraConfigReg(0x33, 0x78),
  new CameraConfigReg(0x3a, 0x33),
  new CameraConfigReg(0x3b, 0xfb),
  new CameraConfigReg(0x3e, 0x00),
  new CameraConfigReg(0x43, 0x11),
  new CameraConfigReg(0x16, 0x10),
  new CameraConfigReg(0x39, 0x92),
  new CameraConfigReg(0x35, 0xda),
  new CameraConfigReg(0x22, 0x1a),
  new CameraConfigReg(0x37, 0xc3),
  new CameraConfigReg(0x36, 0x1a),
  new CameraConfigReg(0x4c, 0x00),
  new CameraConfigReg(0x5b, 0x00),
  new CameraConfigReg(0x5b, 0x00),
  new CameraConfigReg(0x42, 0x03),
  new CameraConfigReg(0x4a, 0x81),
  new CameraConfigReg(0x21, 0x99),
  new CameraConfigReg(0x5c, 0x00),
  new CameraConfigReg(0x63, 0x00),
  new CameraConfigReg(0x7c, 0x05),
  new CameraConfigReg(0x6c, 0x00),
  new CameraConfigReg(0x6d, 0x80),
  new CameraConfigReg(0x6e, 0x00),
  new CameraConfigReg(0x70, 0x02),
  new CameraConfigReg(0x71, 0x94),
  new CameraConfigReg(0x73, 0xc1),
  new CameraConfigReg(0x20, 0x80),
  new CameraConfigReg(0x28, 0x30),
  new CameraConfigReg(0x37, 0xc0),
  new CameraConfigReg(0x3d, 0x38),
  new CameraConfigReg(0x6d, 0x00),
  new CameraConfigReg(0x23, 0x00),
  new CameraConfigReg(0x06, 0x88),
  new CameraConfigReg(0x07, 0xc0),
  new CameraConfigReg(0x0d, 0x87),
  new CameraConfigReg(0x0e, 0x41),
  new CameraConfigReg(CLKRC_REG, 0x00), // CLKRC,时钟分频控制
  new CameraConfigReg(COM2_REG, 0x02), // COM2,公共控制,输出驱动能力选择
  new CameraConfigReg(REG04_REG, 0x28), // REG04,寄存器组4,可设置摄像头扫描方向等
  new CameraConfigReg(COM7_REG, 0x40), // COM7,公共控制,系统复位、摄像头分辨率选择、缩放模式、颜色彩条设置
  new CameraConfigReg(COM9_REG, 0x48), // COM9,公共控制,增益设置
  new CameraConfigReg(COM10_REG, 0x00), // COM10,公共控制,PCLK、HS、VS输出极性控制
  new CameraConfigReg(REG32_REG, 0x09), // REG32,寄存器组32,像素时钟分频以及水平起始、终止像素的（低3位）
  new CameraConfigReg(COM1_REG, 0x8a), // COM1,公共控制,无效帧设置、垂直窗口起始、结束行（低2位）
  new CameraConfigReg(FLL_REG, 0x00), // FLL,帧率长度调整,通过插入空行来降低帧率,也可以通过 0x2a/0x2b/0x47等寄存器去调整
  new CameraConfigReg(AEW_REG, 0x40), // AEW,环境平均亮度大于AEW(7:0)时,AEC/AGC值将降低
  new CameraConfigReg(AEB_REG, 0x38), // AEB,环境平均亮度小于AEB(7:0)时,AEC/AGC值将增加
  new CameraConfigReg(VV_REG, 0x82), // VV,快速模式步进阈值
  new CameraConfigReg(ARCOM2_REG, 0xc0), // ARCOM2,缩放窗口水平起始像素
  new CameraConfigReg(HISTO_LOW_REG, 0x70), // HISTO_LOW ,低等级直方图算法
  new CameraConfigReg(HISTO_HIGH_REG, 0x80), // HISTO_HIGH,高等级直方图算法

  new CameraConfigReg(HREFST_REG, 0x11), // HREFST,水平窗口起始像素（高8位）,默认值0x11
  new CameraConfigReg(HREFEND_REG, 0x43), // HREFEND,水平窗口终止像素（高8位）,UXGA默认值 0x75, SVGA和CIF默认值0x43
  // VSTRT,垂直窗口起始行（高8位）,数据手册建议的配置是：UXGA为 0x01, SVGA和CIF模式为 0x00
  // 在OpenMV的配置中,不管什么模式都建议配置成 0x01,代码的解释是解决垃圾像素的问题。
  // 在笔者实际的测试中,如果配置成0x00,发现在图像垂直翻转的时候会有一行显示不对,应该就是openMV所说的垃圾像素
  // 因此这里也直接配置成 0x01,问题解决
  new CameraConfigReg(VSTRT_REG, 0x01), // VSTRT,垂直窗口起始行（高8位）
  new CameraConfigReg(VEND_REG, 0x97), // VEND, 垂直窗口结束行（高8位）,默认值 0x97
  // 以下5个寄存器，共同决定了光带滤除的效果（室内照明灯具开关频率是50HZ，对于传感器而言，会捕捉到明暗交错的光带）
  // 用户可以结合手册，根据实际场景去配置，以达到最佳的光带滤除效果
  new CameraConfigReg(COM8_REG, 0xe5), // COM8,公共控制,曝光、自动增益、滤波设置
  new CameraConfigReg(COM3_REG, 0x3a), // COM3,公共控制,自动或手动设置带宽、快照和视频输出配置
  new CameraConfigReg(BD50_REG, 0xbb), // BD50,50Hz带宽 AEC低8位
  new CameraConfigReg(BD60_REG, 0x9c), // BD60,60HZ带宽 AEC低8位
  new CameraConfigReg(0x5a, 0x23), // 手册没有说明该寄存器的作用，参考手册进行配置
  new CameraConfigReg(RA_DLMT_REG, 0x00), // 设置DSP寄存器租
  new CameraConfigReg(0xe5, 0x7f), // 手册没有说明该寄存器的作用，参考手册进行配置
  new CameraConfigReg(0x41, 0x24),
  new CameraConfigReg(0x76, 0xff),
  new CameraConfigReg(0x33, 0xa0),
  new CameraConfigReg(0x42, 0x20),
  new CameraConfigReg(0x43, 0x18),
  new CameraConfigReg(0x4c, 0x00),
  new CameraConfigReg(0xd7, 0x03),
  new CameraConfigReg(0xd9, 0x10),
  new CameraConfigReg(0x88, 0x3f),
  new CameraConfigReg(0xc8, 0x08),
  new CameraConfigReg(0xc9, 0x80),
  new CameraConfigReg(0x7c, 0x00),
  new CameraConfigReg(0x7d, 0x00),
  new CameraConfigReg(0x7c, 0x03),
  new CameraConfigReg(0x7d, 0x48),
  new CameraConfigReg(0x7d, 0x48),
  new CameraConfigReg(0x7c, 0x08),
  new CameraConfigReg(0x7d, 0x20),
  new CameraConfigReg(0x7d, 0x10),
  new CameraConfigReg(0x7d, 0x0e),
  new CameraConfigReg(0x90, 0x00),
  new CameraConfigReg(0x91, 0x0e),
  new CameraConfigReg(0x91, 0x1a),
  new CameraConfigReg(0x91, 0x31),
  new CameraConfigReg(0x91, 0x5a),
  new CameraConfigReg(0x91, 0x69),
  new CameraConfigReg(0x91, 0x75),
  new CameraConfigReg(0x91, 0x7e),
  new CameraConfigReg(0x91, 0x88),
  new CameraConfigReg(0x91, 0x8f),
  new CameraConfigReg(0x91, 0x96),
  new CameraConfigReg(0x91, 0xa3),
  new CameraConfigReg(0x91, 0xaf),
  new CameraConfigReg(0x91, 0xc4),
  new CameraConfigReg(0x91, 0xd7),
  new CameraConfigReg(0x91, 0xe8),
  new CameraConfigReg(0x91, 0x20),
  new CameraConfigReg(0x92, 0x00),
  new CameraConfigReg(0x93, 0x06),
  new CameraConfigReg(0x93, 0xe3),
  new CameraConfigReg(0x93, 0x05),
  new CameraConfigReg(0x93, 0x05),
  new CameraConfigReg(0x93, 0x00),
  new CameraConfigReg(0x93, 0x04),
  new CameraConfigReg(0x93, 0x00),
  new CameraConfigReg(0x93, 0x00),
  new CameraConfigReg(0x93, 0x00),
  new CameraConfigReg(0x93, 0x00),
  new CameraConfigReg(0x93, 0x00),
  new CameraConfigReg(0x93, 0x00),
  new CameraConfigReg(0x93, 0x00),
  new CameraConfigReg(0x96, 0x00),
  new CameraConfigReg(0x97, 0x08),
  new CameraConfigReg(0x97, 0x19),
  new CameraConfigReg(0x97, 0x02),
  new CameraConfigReg(0x97, 0x0c),
  new CameraConfigReg(0x97, 0x24),
  new CameraConfigReg(0x97, 0x30),
  new CameraConfigReg(0x97, 0x28),
  new CameraConfigReg(0x97, 0x26),
  new CameraConfigReg(0x97, 0x02),
  new CameraConfigReg(0x97, 0x98),
  new CameraConfigReg(0x97, 0x80),
  new CameraConfigReg(0x97, 0x00),
  new CameraConfigReg(0x97, 0x00),
  new CameraConfigReg(0xa4, 0x00),
  new CameraConfigReg(0xa8, 0x00),
  new CameraConfigReg(0xc5, 0x11),
  new CameraConfigReg(0xc6, 0x51),
  new CameraConfigReg(0xbf, 0x80),
  new CameraConfigReg(0xc7, 0x10),
  new CameraConfigReg(0xb6, 0x66),
  new CameraConfigReg(0xb8, 0xa5),
  new CameraConfigReg(0xb7, 0x64),
  new CameraConfigReg(0xb9, 0x7c),
  new CameraConfigReg(0xb3, 0xaf),
  new CameraConfigReg(0xb4, 0x97),
  new CameraConfigReg(0xb5, 0xff),
  new CameraConfigReg(0xb0, 0xc5),
  new CameraConfigReg(0xb1, 0x94),
  new CameraConfigReg(0xb2, 0x0f),
  new CameraConfigReg(0xc4, 0x5c),
  new CameraConfigReg(0x7f, 0x00),

  new CameraConfigReg(MC_BIST_REG, 0xc0), // MC_BIST,控制器复位、ROM选择
  new CameraConfigReg(RESET_REG, 0x14), // RESET,可选择复位 控制器、SCCB单元、JPEG单元、DVP接口单元等
  new CameraConfigReg(CTRL3_REG, 0xd0), // CTRL3,使能芯片内部的指定的模块
  new CameraConfigReg(CTRL1_REG, 0xed), // CTRL1,使能芯片内部的指定的模块
  new CameraConfigReg(CTRL0_REG, 0x0e), // CTRL0,使能YUV422、YUV_EN、RGB_EN
  new CameraConfigReg(CTRL2_REG, 0x3d), // CTRL2,使能芯片内部的指定的模块
  new CameraConfigReg(IMAGE_MODE_REG, 0x09), // 图像输出模式,可设置JPEG输出、RGB565等,可设置是否翻转DVP接口的输出
  // 此处设置的是传感器的图像尺寸,与配置的模式有关,例如SVGA需要设置成800*480,XVGA要设置成1600*1200
  new CameraConfigReg(HSIZE8_REG, 0x64), // 图像的水平尺寸,10~3 bit
  new CameraConfigReg(VSIZE8_REG, 0x4b), // 图像的垂直尺寸,10~3 bit
  new CameraConfigReg(SIZEL_REG, 0x00), // 图像水平尺寸的第 11 bit以及2~0bit,图像垂直尺寸的 2~0bit
  new CameraConfigReg(CTRLI_REG, 0x00), // CTRLI,设置 水平和垂直分频器
  new CameraConfigReg(HSIZE_REG, 0xc8), // 水平尺寸,7~0 bit,必须要能被4整除
  new CameraConfigReg(VSIZE_REG, 0x96), // 垂直尺寸,7~0 bit,必须要能被4整除
  new CameraConfigReg(XOFFL_REG, 0x00), // 水平偏移,7~0 bit,
  new CameraConfigReg(YOFFL_REG, 0x00), // 垂直偏移,7~0 bit,
  new CameraConfigReg(VHYX_REG, 0x00), // 水平、垂直尺寸的第 8 bit, 水平、垂直偏移的 第 10~8 bit
  new CameraConfigReg(TEST_REG, 0x00), // 水平尺寸的第 9 bit
  // 0xd3 寄存器用于设置像素驱动时钟,即 PCLK 的输出频率，有自动模式和手动模式
  //	在自动模式下，PCLK的频率会非常高，适用于高分辨率或者有高速缓存的场合，用户可根据实际工况选择最合适的模式
  //
  // Bit[7]：  设置为1时,开启自动模式,此时 PCLK 由OV2640自动控制,该模式下的PCLK频率非常高，
  //           适用于高分辨率或者有高速缓存的场合
  //
  // Bit[6:0]：手动设置分频系数,当设置成YUV模式或RGB565模式时, PCLK = sysclk / Bit[6:0] ,
  //           当 时钟控制寄存器 0x11（CLKRC）设置为 不分频 且外部输入时钟为24M时，
  //           在SVGA模式下， PCLK = 2*24M / Bit[6:0]
  //	fanke
  // 如果要手动配置,用户需要根据实际输出的图像尺寸去计算具体的 PCLK ,这里以 480*360 分辨率为例：
  // 一帧 RGB565（16位色） 图像的数据量为：480*360*2 = 345.6 KB ,
  // OV2640在 SVGA模式下,帧率为30左右,则每秒的数据量在 345.6 * 30 = 10.4 MB 左右,
  // 因为模块是8位的接口,则PCLK最少要设置为 10.4 MHz,才能满足图像传输的需求,不然会导致花屏  ,
  // 加上OV2640的帧率是可以微调的,因此实际的 PCLK 要稍微大些,此处设置为 12M，
  // 即  PCLK = 48M / Bit[6:0] = 48 / 0x04 = 12M
  new CameraConfigReg(R_DVP_SP_REG, 0x04), // R_DVP_SP, 设置 PCLK 引脚的时钟

  new CameraConfigReg(0xe5, 0x1f), // 手册里没有说明这些寄存器的作用,这里直接保留官方给的设置参数
  new CameraConfigReg(0xe1, 0x67),
  new CameraConfigReg(0xdd, 0x7f),

  new CameraConfigReg(RESET_REG, 0x00), // RESET,可选择复位 控制器、SCCB单元、JPEG单元、DVP接口单元等
  new CameraConfigReg(R_BPASS_REG, 0x00), // 使能DSP
];

const SPECIAL_EFFECT_NORMAL_ID = 0;
const SPECIAL_EFFECT_BLUEISH_ID = 1;
const SPECIAL_EFFECT_REDISH_ID = 2;
const SPECIAL_EFFECT_BLACK_WHITE_ID = 3;
const SPECIAL_EFFECT_SEPIA_ID = 4;
const SPECIAL_EFFECT_NEGATIVE_ID = 5;
const SPECIAL_EFFECT_GREENISH_ID = 6;
const SPECIAL_EFFECT_BLACK_WHITE_NEGATIVE_ID = 7;

const ov2640_special_regs = [
  [
    // normal
    new CameraConfigReg(RA_DLMT_REG, 0x00),
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x00),
    new CameraConfigReg(BPADDR_REG, 0x05),
    new CameraConfigReg(BPDATA_REG, 0x80),
    new CameraConfigReg(BPDATA_REG, 0x80),
  ],
  [
    // Blueish (cool light)
    new CameraConfigReg(RA_DLMT_REG, 0x00),
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x18),
    new CameraConfigReg(BPADDR_REG, 0x05),
    new CameraConfigReg(BPDATA_REG, 0xa0),
    new CameraConfigReg(BPDATA_REG, 0x40),
  ],
  [
    // Redish (warm light)
    new CameraConfigReg(RA_DLMT_REG, 0x00),
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x18),
    new CameraConfigReg(BPADDR_REG, 0x05),
    new CameraConfigReg(BPDATA_REG, 0x40),
    new CameraConfigReg(BPDATA_REG, 0xc0),
  ],
  [
    // black and white
    new CameraConfigReg(RA_DLMT_REG, 0x00),
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x18),
    new CameraConfigReg(BPADDR_REG, 0x05),
    new CameraConfigReg(BPDATA_REG, 0x80),
    new CameraConfigReg(BPDATA_REG, 0x80),
  ],
  [
    // Sepia
    new CameraConfigReg(RA_DLMT_REG, 0x00),
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x18),
    new CameraConfigReg(BPADDR_REG, 0x05),
    new CameraConfigReg(BPDATA_REG, 0x40),
    new CameraConfigReg(BPDATA_REG, 0xa6),
  ],
  [
    // Negative
    new CameraConfigReg(RA_DLMT_REG, 0x00),
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x40),
    new CameraConfigReg(BPADDR_REG, 0x05),
    new CameraConfigReg(BPDATA_REG, 0x80),
    new CameraConfigReg(BPDATA_REG, 0x80),
  ],
  [
    // Greenish
    new CameraConfigReg(RA_DLMT_REG, 0x00),
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x18),
    new CameraConfigReg(BPADDR_REG, 0x05),
    new CameraConfigReg(BPDATA_REG, 0x50),
    new CameraConfigReg(BPDATA_REG, 0x50),
  ],
  [
    // Black and white negative
    new CameraConfigReg(RA_DLMT_REG, 0x00),
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x58),
    new CameraConfigReg(BPADDR_REG, 0x05),
    new CameraConfigReg(BPDATA_REG, 0x80),
    new CameraConfigReg(BPDATA_REG, 0x80),
  ],
];

const ov2640_contract_regs = [
  [
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x04),
    new CameraConfigReg(BPADDR_REG, 0x07),
    new CameraConfigReg(BPDATA_REG, 0x20),
    new CameraConfigReg(BPDATA_REG, 0x18),
    new CameraConfigReg(BPDATA_REG, 0x34),
    new CameraConfigReg(BPDATA_REG, 0x06),
  ],
  [
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x04),
    new CameraConfigReg(BPADDR_REG, 0x07),
    new CameraConfigReg(BPDATA_REG, 0x20),
    new CameraConfigReg(BPDATA_REG, 0x1c),
    new CameraConfigReg(BPDATA_REG, 0x2a),
    new CameraConfigReg(BPDATA_REG, 0x06),
  ],
  [
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x04),
    new CameraConfigReg(BPADDR_REG, 0x07),
    new CameraConfigReg(BPDATA_REG, 0x20),
    new CameraConfigReg(BPDATA_REG, 0x20),
    new CameraConfigReg(BPDATA_REG, 0x20),
    new CameraConfigReg(BPDATA_REG, 0x06),
  ],
  [
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x04),
    new CameraConfigReg(BPADDR_REG, 0x07),
    new CameraConfigReg(BPDATA_REG, 0x20),
    new CameraConfigReg(BPDATA_REG, 0x24),
    new CameraConfigReg(BPDATA_REG, 0x16),
    new CameraConfigReg(BPDATA_REG, 0x06),
  ],
  [
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x04),
    new CameraConfigReg(BPADDR_REG, 0x07),
    new CameraConfigReg(BPDATA_REG, 0x20),
    new CameraConfigReg(BPDATA_REG, 0x28),
    new CameraConfigReg(BPDATA_REG, 0x0c),
    new CameraConfigReg(BPDATA_REG, 0x06),
  ],
];

const ov2640_brightness_regs = [
  [
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x04),
    new CameraConfigReg(BPADDR_REG, 0x09),
    new CameraConfigReg(BPDATA_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x00),
  ],
  [
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x04),
    new CameraConfigReg(BPADDR_REG, 0x09),
    new CameraConfigReg(BPDATA_REG, 0x10),
    new CameraConfigReg(BPDATA_REG, 0x00),
  ],
  [
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x04),
    new CameraConfigReg(BPADDR_REG, 0x09),
    new CameraConfigReg(BPDATA_REG, 0x20),
    new CameraConfigReg(BPDATA_REG, 0x00),
  ],
  [
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x04),
    new CameraConfigReg(BPADDR_REG, 0x09),
    new CameraConfigReg(BPDATA_REG, 0x30),
    new CameraConfigReg(BPDATA_REG, 0x00),
  ],
  [
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x04),
    new CameraConfigReg(BPADDR_REG, 0x09),
    new CameraConfigReg(BPDATA_REG, 0x40),
    new CameraConfigReg(BPDATA_REG, 0x00),
  ],
];

const ov2640_saturation_regs = [
  [
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x02),
    new CameraConfigReg(BPADDR_REG, 0x03),
    new CameraConfigReg(BPDATA_REG, 0x28),
    new CameraConfigReg(BPDATA_REG, 0x28),
  ],
  [
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x02),
    new CameraConfigReg(BPADDR_REG, 0x03),
    new CameraConfigReg(BPDATA_REG, 0x38),
    new CameraConfigReg(BPDATA_REG, 0x38),
  ],
  [
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x02),
    new CameraConfigReg(BPADDR_REG, 0x03),
    new CameraConfigReg(BPDATA_REG, 0x48),
    new CameraConfigReg(BPDATA_REG, 0x48),
  ],
  [
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x02),
    new CameraConfigReg(BPADDR_REG, 0x03),
    new CameraConfigReg(BPDATA_REG, 0x58),
    new CameraConfigReg(BPDATA_REG, 0x58),
  ],
  [
    new CameraConfigReg(BPADDR_REG, 0x00),
    new CameraConfigReg(BPDATA_REG, 0x02),
    new CameraConfigReg(BPADDR_REG, 0x03),
    new CameraConfigReg(BPDATA_REG, 0x68),
    new CameraConfigReg(BPDATA_REG, 0x68),
  ],
];

const ov2640_light_mode_regs = [
  [
    new CameraConfigReg(0xcc, 0x5e),
    new CameraConfigReg(0xcd, 0x41),
    new CameraConfigReg(0xce, 0x54),
  ],
  [
    new CameraConfigReg(0xcc, 0x52),
    new CameraConfigReg(0xcd, 0x41),
    new CameraConfigReg(0xce, 0x66),
  ],
  [
    new CameraConfigReg(0xcc, 0x65),
    new CameraConfigReg(0xcd, 0x41),
    new CameraConfigReg(0xce, 0x4f),
  ],
  [
    new CameraConfigReg(0xcc, 0x42),
    new CameraConfigReg(0xcd, 0x3f),
    new CameraConfigReg(0xce, 0x71),
  ],
];

var mosi_pin = 2;
var miso_pin = 1;
var sck_pin = 0;
var cs_pin = 3;
var sda_pin = 16;
var scl_pin = 17;

const DEVICE_I2C_ADDR = 0x60 >> 1;

function writeArducamReg(opers, reg_addr, ...data) {
  const transmit_data = [reg_addr | 0x80, ...data];
  spiHardwareOperation(
    opers,
    0,
    mosi_pin,
    miso_pin,
    sck_pin,
    cs_pin,
    1000,
    0,
    0,
    0,
    ...transmit_data
  );
}

function readArducamReg(opers, reg_addr, len = 1) {
  spiHardwareOperation(
    opers,
    0,
    mosi_pin,
    miso_pin,
    sck_pin,
    cs_pin,
    1000,
    0,
    1,
    len,
    reg_addr
  );
}

function burstReadArducam(opers, len = 1) {
  spiHardwareOperation(
    opers,
    0,
    mosi_pin,
    miso_pin,
    sck_pin,
    cs_pin,
    1000,
    0,
    1,
    len,
    ARDUCAM_BURST_FIFO_READ_REG
  );
}

function writeOvReg(opers, reg_addr, ...data) {
  i2cWriteHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    400,
    DEVICE_I2C_ADDR,
    reg_addr,
    -1,
    ...data
  );
}

function readOvReg(opers, reg_addr, read_len = 1) {
  i2cWriteHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    400,
    DEVICE_I2C_ADDR,
    reg_addr,
    -1
  );
  i2cReadHardwareOperation(
    opers,
    sda_pin,
    scl_pin,
    400,
    DEVICE_I2C_ADDR,
    -1,
    -1,
    read_len
  );
}

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

async function CameraInit() {
  const batch_num = 50;
  for (let i = 0; i < ov2640_init_regs.length; i += batch_num) {
    let num_regs_write = 0;
    const opers = [];
    if (ov2640_init_regs.length - i > batch_num) {
      num_regs_write = batch_num;
    } else {
      num_regs_write = ov2640_init_regs.length - i;
    }
    for (let j = 0; j < num_regs_write; j++) {
      writeOvReg(
        opers,
        ov2640_init_regs[i + j].reg,
        ov2640_init_regs[i + j].value
      );
    }
    const now_event = constructNowEvent(opers);
    const ret = await postHardwareOperation(now_event, "http://192.168.1.108");
  }
}

async function SetFrameSize() {
  const frame_width = 800; // 图像长度, has to module of 4
  const frame_height = 600; // 图像宽度, has to module of 4
  const opers = [];

  writeOvReg(opers, RA_DLMT_REG, 0x00); // 选择 DSP寄存器组

  writeOvReg(opers, ZMOW_REG, (frame_width / 4) & 0xff); // 实际图像输出的宽度（OUTW），7~0 bit，寄存器的值等于实际值/4
  writeOvReg(opers, ZMOH_REG, (frame_height / 4) & 0xff); // 实际图像输出的高度（OUTH），7~0 bit，寄存器的值等于实际值/4
  writeOvReg(
    opers,
    ZMHH_REG,
    (((frame_width / 4) >> 8) & 0x03) | (((frame_height / 4) >> 6) & 0x04)
  ); // 设置ZMHH的Bit[2:0]，也就是OUTH 的第 8 bit，OUTW 的第 9~8 bit，
  const now_event = constructNowEvent(opers);
  const ret = await postHardwareOperation(now_event, "http://192.168.1.108");
}

async function CaptureFrame() {
  const opers = [];

  // flash and clear fifo flag
  writeArducamReg(opers, ARDUCAM_FIFO_CTR_REG, 0x01);

  // start capture
  writeArducamReg(opers, ARDUCAM_FIFO_CTR_REG, 0x02);

  // delay
  delayHardwareOperation(opers, "ms", 100);

  // wait capture complete
  readArducamReg(opers, ARDUCAM_FIFO_DONE_REG, 1);

  // get fifo len
  readArducamReg(opers, ARDUCAM_WRITE_FIFO_SIZE1_REG, 1);
  readArducamReg(opers, ARDUCAM_WRITE_FIFO_SIZE2_REG, 1);
  readArducamReg(opers, ARDUCAM_WRITE_FIFO_SIZE3_REG, 1);

  const now_event = constructNowEvent(opers);
  const ret = await postHardwareOperation(now_event, "http://192.168.1.108");
  console.log(`ret2: ${JSON.stringify(ret)}`);
  const frame_size =
    ret["result"][4] |
    (ret["result"][5] << 8) |
    ((ret["result"][6] & 0x7f) << 16);
  console.log(`frame size1: ${frame_size}`);
}

async function ReadFiFO() {
  // reading FIFO
  const burst_read_num = 500;
  const fifo_size = await GetFiFoSize();
  const image_data = [];
  for (let i = 0; i < fifo_size; i += burst_read_num) {
    let read_len = 0;
    const opers = [];
    if (fifo_size - i > burst_read_num) {
      read_len = burst_read_num;
    } else {
      read_len = fifo_size - i;
    }

    burstReadArducam(opers, read_len);
    const now_event = constructNowEvent(opers);
    const ret = await postHardwareOperation(now_event, "http://192.168.1.108");
    image_data.push(...ret["result"][0]);
  }
  return image_data;
}

async function GetFiFoSize() {
  const opers = [];

  // get fifo len
  readArducamReg(opers, ARDUCAM_WRITE_FIFO_SIZE1_REG, 1);
  readArducamReg(opers, ARDUCAM_WRITE_FIFO_SIZE2_REG, 1);
  readArducamReg(opers, ARDUCAM_WRITE_FIFO_SIZE3_REG, 1);

  const now_event = constructNowEvent(opers);
  const ret = await postHardwareOperation(now_event, "http://192.168.1.108");

  const frame_size =
    ret["result"][0] |
    (ret["result"][1] << 8) |
    ((ret["result"][2] & 0x7f) << 16);
  return frame_size;
}

async function SetJpegFormat() {
  const opers = [];
  writeOvReg(opers, RA_DLMT_REG, 0x00); // 选择 DSP寄存器组
  writeOvReg(opers, RESET_REG, 0x04); // reset DVP
  writeOvReg(opers, IMAGE_MODE_REG, 0x10 | 0x08); //  IMAGE_MODE_JPEG_EN + IMAGE_MODE_RGB565
  writeOvReg(opers, 0xd7, 0x03);
  writeOvReg(opers, 0xe1, 0x77);
  writeOvReg(opers, RESET_REG, 0x00);

  const now_event = constructNowEvent(opers);
  const ret = await postHardwareOperation(now_event, "http://192.168.1.108");
}

async function SetSpecialEffect(effect_id) {
  if (sde >= ov2640_special_regs.length) {
    return -1;
  } else {
    const opers = [];
    for (let i = 0; i < ov2640_special_regs[effect_id].length; i++) {
      writeOvReg(
        opers,
        ov2640_special_regs[effect_id][i].reg,
        ov2640_special_regs[effect_id][i].value
      );
    }
    const now_event = constructNowEvent(opers);
    const ret = await postHardwareOperation(now_event, "http://192.168.1.108");
    return 0;
  }
}

async function SetExposure(exposure) {
  writeOvReg(opers, RA_DLMT_REG, 0x00);
  writeOvReg(opers, R_BPASS_REG, 0x01);
  writeOvReg(opers, RA_DLMT_REG, 0x01);
  if (exposure == 0) {
    // auto exposure
    writeOvReg(COM8_REG);
    OV2640_WR_Reg(
      COM8,
      COM8_DEFAULT_VAL | COM8_BNDF_EN | COM8_AGC_EN | COM8_AEC_EN
    );
  } else if (exposure == -1) {
    // disable auto exposure
    writeOvReg(COM8, COM8_DEFAULT_VAL);
  } else {
    // set exposure related registers
    writeOvReg(opers, COM8_REG, COM8_DEFAULT_VAL | 0x0);
    writeOvReg(opers, REG45_REG, (exposure >> 10) & 0x3f);
    writeOvReg(opers, AEC_REG, (exposure >> 2) & 0xff);
    writeOvReg(opers, REG04_REG, exposure & 0x3);
  }
  writeOvReg(opers, RA_DLMT_REG, 0x00);
  writeOvReg(opers, R_BPASS_REG, 0x00);
  return;
}

async function GetExposure() {
  let exp = 0;
  const opers = [];
  writeOvReg(opers, RA_DLMT_REG, 0x00);
  writeOvReg(opers, R_BPASS_REG, 0x01);
  writeOvReg(opers, RA_DLMT_REG, 0x01);
  // read exposure related registers
  readOvReg(opers, REG45_REG);
  readOvReg(opers, AEC_REG);
  readOvReg(opers, REG04_REG);
  writeOvReg(opers, RA_DLMT_REG, 0x00);
  writeOvReg(opers, R_BPASS_REG, 0x00);
  const now_event = constructNowEvent(opers);
  const ret = await postHardwareOperation(now_event, "http://192.168.1.108");
  console.log(`GetExposure: ${JSON.stringify(ret)}`);
  return;
}

async function SetContrast(contrast_level) {
  if (contrast_level >= ov2640_contract_regs.length) {
    addErrorMsg("");
  } else {
    const opers = [];
    for (let i = 0; i < ov2640_contract_regs[contrast_level].length; i++) {
      writeOvReg(
        opers,
        ov2640_contract_regs[contrast_level][i].reg,
        ov2640_contract_regs[contrast_level][i].value
      );
    }
  }
  return;
}

async function SetBrightness(brightness_level) {
  if (brightness_level >= ov2640_brightness_regs.length) {
    addErrorMsg("");
  } else {
    const opers = [];
    for (let i = 0; i < ov2640_brightness_regs[brightness_level].length; i++) {
      writeOvReg(
        opers,
        ov2640_contract_regs[brightness_level][i].reg,
        ov2640_contract_regs[brightness_level][i].value
      );
    }
  }
  return;
}

async function SetSaturation(saturation_level) {
  if (saturation_level > ov2640_saturation_regs.length) {
    addErrorMsg("");
  } else {
    const opers = [];
    for (let i = 0; i < ov2640_saturation_regs[saturation_level].length; i++) {
      writeOvReg(
        opers,
        ov2640_contract_regs[saturation_level][i].reg,
        ov2640_contract_regs[saturation_level][i].value
      );
    }
  }
  return;
}

async function SetQuality(quality) {
  if (quality > 60 || quality < 2) {
    return -1;
  } else {
    const opers = [];
    writeOvReg(opers, RA_DLMT_REG, 0x0);
    writeOvReg(opers, QS_REG, quality);
  }
  return;
}

async function SetColorbar(enable) {
  const opers = [];

  writeOvReg(opers, RA_DLMT_REG, 0x0);
  readOvReg(opers, COM7_REG);

  if (enable) {
    // TODO, add COM7_REG read value
    writeOvReg(oeprs, COM7_REG, COM7_COLOR_BAR);
  } else {
    writeOvReg(oeprs, COM7_REG, ~COM7_COLOR_BAR);
  }
  return;
}

async function SetLightmode(mode) {
  const opers = [];
  writeOvReg(opers, RA_DLMT_REG, 0x00);
  if (mode == 0) {
    writeOvReg(opers, 0xc7, 0x00);
  } else {
    writeOvReg(opers, 0xc7, 0x40);
  }
  return;
}

async function SetNightMode(enable) {
  const opers = [];
  writeOvReg(opers, RA_DLMT_REG, 0x0);
  writeOvReg(opers, R_BPASS_REG, 0x01);
  writeOvReg(opers, RA_DLMT_REG, 0x1);
  if (enable) {
    writeOvReg(opers, CLKRC_REG, 0);
  } else {
    writeOvReg(opers, CLKRC_REG, 0x80);
  }
  writeOvReg(opers, RA_DLMT_REG, 0x0);
  writeOvReg(opers, R_BPASS_REG, 0x0);
  delayHardwareOperation(opers, "ms", 30);

  return;
}

document
  .getElementById("cameraOneshot")
  .addEventListener("click", async function () {
    const opers = [];
    writeArducamReg(opers, 0, 55);
    readArducamReg(opers, 0);
    writeOvReg(opers, 255, 1);
    readOvReg(opers, 10);
    const now_event = constructNowEvent(opers);
    const ret = await postHardwareOperation(now_event, "http://192.168.1.108");
    console.log(`ret1: ${JSON.stringify(ret)}`);

    await CameraInit();
    await SetFrameSize();
    await SetJpegFormat();
    await CaptureFrame();
    const image_data = await ReadFiFO();

    var y = new Uint8Array(image_data);
    console.log(`uint8array: ${y}`);
    var x = String.fromCharCode(...y);
    var imgsrc = "data:image/jpeg;base64," + btoa(x);
    var image = document.querySelector("#photo");
    image.src = imgsrc;
  });

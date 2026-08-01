---
title: 嵌入式设计模式实战:在 C 语言里做架构
date: 2026-08-03
tags: [设计模式, 架构, C语言]
summary: 单例、模板方法、生产者-消费者、策略、外观——五个在嵌入式 C 项目里真正高频使用的模式,配场景和代码,不搞过度设计。
---

提到设计模式,很多嵌入式工程师第一反应是"那是 Java 的东西,单片机用不上"。但设计模式的本质是**在特定场景下被反复验证过的代码组织方式**——它和语言无关,和问题有关。这篇文章挑五个在嵌入式 C 项目里真正高频使用的模式,每个都配场景和代码,看看它们解决的是什么问题。

先说结论:**嵌入式用设计模式,不是为了"设计感",而是为了三件事——解耦、复用、可测试。**

## 单例模式:共享资源的标准答案

### 场景

日志系统、驱动管理器、全局参数表——这些对象全系统只有一份,而且要被多个模块访问。裸机时代的标准做法是全局变量,但全局变量有两个问题:初始化顺序不可控、任何人都能乱改。单例模式给"一份实例"加了一扇门。

### 实现

```c
typedef struct {
    uint32_t error_count;
    char     buffer[LOG_BUF_SIZE];
} logger_t;

logger_t *logger_instance(void) {
    static logger_t instance;      /* 静态实例:整个生命周期只有一份 */
    static bool initialized = false;
    if (!initialized) {
        instance.error_count = 0;
        initialized = true;        /* 把"构造"收进门内,初始化可控 */
    }
    return &instance;
}

/* 使用:所有模块都通过同一扇门拿同一份实例 */
logger_instance()->error_count++;
```

### 什么时候值得用

- 资源有**唯一性**要求:多个实例会互相踩踏(同时写一个文件、操作同一片寄存器);
- 对象创建/销毁**开销大**,需要复用(串口驱动的初始化很贵);
- 作为**共享数据**的载体(系统运行状态、全局配置)。

### 注意

- 多线程环境要加锁,否则并发调用可能拿到不一致状态;
- 别把单例当全局变量的"换皮"——它的价值在"初始化可控 + 访问有门",不是"我懒得传参"。

## 模板方法模式:驱动框架的骨架

### 场景

同一类设备的驱动,流程 90% 相同,只有个别步骤不同。比如传感器驱动:上电 → 复位 → 配置寄存器 → 校准 → 就绪。不同传感器只有"配置寄存器"和"校准"不一样。

**把不变的流程写在框架里,把变化的步骤留给子类实现**——这就是模板方法。C 里用函数指针实现"子类":

```c
/* 框架:定义流程,步骤由 ops 提供 */
typedef struct {
    void (*hw_init)(void);      /* 基本方法:硬件初始化 */
    void (*config)(void);       /* 基本方法:配置 */
    void (*calibrate)(void);    /* 基本方法:校准 */
} sensor_ops_t;

void sensor_start(sensor_ops_t *ops) {      /* 模板方法:固定流程 */
    ops->hw_init();
    ops->config();
    ops->calibrate();
    LOG("sensor ready");
}

/* 具体传感器 A:只实现自己的差异部分 */
static void imu_config(void) { write_reg(0x10, 0x01); }
static void imu_calibrate(void) { /* 六面校准 */ }

sensor_ops_t imu_ops = { imu_hw_init, imu_config, imu_calibrate };

/* 使用:流程一样,动作不同 */
sensor_start(&imu_ops);
sensor_start(&barometer_ops);
```

### 价值

- **封装不变,扩展可变**:加一个新传感器 = 写 3 个函数 + 填一张表,不改框架;
- 流程改动只动一处(框架),不会在 N 个驱动里改 N 遍;
- 这就是简历里"分层架构、模板方法处理数据流水线"的具体形态。

## 生产者-消费者模式:解耦采集与处理

### 场景

**数据生成速度和处理速度不匹配**——这是嵌入式里最常见的矛盾:ADC/DMA/串口在疯狂产生数据,算法模块处理不过来,或者反过来处理模块经常空等。生产者-消费者模式在中间加一个缓冲区,两边各干各的:

```
生产者(采集) --写--> [环形缓冲区] <--读-- 消费者(处理)
```

```c
/* 环形缓冲区(单生产者单消费者,无锁可用) */
typedef struct {
    uint8_t buf[RING_SIZE];
    uint16_t head, tail;
} ring_t;

void ring_push(ring_t *r, uint8_t byte) {
    r->buf[r->head] = byte;
    r->head = (r->head + 1) % RING_SIZE;   /* 满则覆盖最旧(按策略) */
}

uint8_t ring_pop(ring_t *r) {
    uint8_t b = r->buf[r->tail];
    r->tail = (r->tail + 1) % RING_SIZE;
    return b;
}
```

### 典型应用

- 串口/DMA 数据流处理(中断里入队,主循环出队);
- 日志异步写入(业务线程只入队,写 Flash 的脏活交给低优先级任务);
- 数据采集与算法处理分离(采样率高,处理耗时长的场景)。

### 升级方向

生产者和消费者可以各自升级为独立任务(RTOS),配合信号量做阻塞唤醒——**结构不变,只是把"软件缓冲"换成"任务+队列"**。这就是四层架构文章里消息总线的底层实现。

## 策略模式:算法的运行时切换

### 场景

同一个动作,有多个算法实现,而且**运行时要切换**。嵌入式里很常见:

- 数据校验:CRC32 还是 Checksum?
- 图像滤波:高斯还是中值?
- 通信方式:PCIE、DMA 还是 SPI?

```c
typedef struct {
    uint32_t (*checksum)(const uint8_t *data, uint32_t len);
} checksum_ops_t;

static uint32_t crc32_impl(const uint8_t *d, uint32_t l) { /* ... */ }
static uint32_t sum_impl(const uint8_t *d, uint32_t l) { /* ... */ }

/* 运行时决定用哪个策略 */
static checksum_ops_t crc_strategy = { crc32_impl };
static checksum_ops_t sum_strategy = { sum_impl };

void frame_send(frame_t *f, checksum_ops_t *strategy) {
    f->checksum = strategy->checksum(f->payload, f->len);
}
```

### 价值

- 调用方只依赖"接口"(函数指针表),不依赖具体算法;
- 新算法 = 新实现 + 新表,老代码零改动——**开闭原则**的实践;
- 策略可以做成编译期选择,也可以做成运行期配置(配置项决定用哪个)。

## 外观模式:给复杂子系统一扇小门

### 场景

你封装了一个协议栈、一个驱动包,内部有 20 个函数、5 个模块互相配合。调用方(业务代码)不想知道这些,它只想说"帮我发一帧数据"。

外观模式提供一个**简化入口**:

```c
/* 内部:三个模块互相协作 */
static void link_establish(void) { /* 建链:握手、协商 */ }
static void encrypt(uint8_t *buf, uint16_t len) { /* 加解密 */ }
static void crc_append(uint8_t *buf, uint16_t len) { /* 校验 */ }

/* 外观:一个函数封装整个流程 */
err_t comm_send(uint8_t *buf, uint16_t len) {
    if (!link_is_ready()) {
        link_establish();
    }
    encrypt(buf, len);
    crc_append(buf, len);
    return uart_dma_send(buf, len);
}
```

### 什么时候值得用

- 子系统内部经常变化,但对外接口要稳定(硬件迭代、协议升级都不影响业务层);
- 调用流程繁琐且固定(每次都要"先建链再加密再校验"),收成一个函数;
- 想给遗留系统套一层现代化接口。

## 选型心法:不过度设计

嵌入式资源有限、工期有限,不是模式越多越好。三个判断标准:

1. **有没有第二个使用方?** 只有一个模块用的"抽象",是负债不是资产;
2. **未来一年会变吗?** 不会变的接口,不值得为它建抽象层;
3. **代码量换可读性划算吗?** 一个模式带来 3 个文件 5 个结构体,只为包装一个 if,不值。

> 设计模式的正确用法:先写直白的代码,当重复、耦合、难测的信号出现时,再引入模式去解决它——而不是一开始就把架构画得繁花似锦。

## 小结

| 模式 | 解决的核心问题 | 嵌入式典型场景 |
| --- | --- | --- |
| 单例 | 共享资源的唯一性与可控初始化 | 日志、全局配置、驱动管理 |
| 模板方法 | 固定流程 + 可变步骤 | 传感器/外设驱动框架 |
| 生产者-消费者 | 生产与处理速度不匹配 | 数据流、异步日志、消息总线 |
| 策略 | 算法的运行时切换 | 校验算法、滤波策略、通信方式 |
| 外观 | 复杂子系统的简化入口 | 协议栈封装、硬件抽象 |

这五个模式加起来,基本就能覆盖嵌入式 C 项目 80% 的架构需求。下一篇文章聊它们背后的原则——SOLID 怎么在 C 语言里落地。

---
title: SOLID 原则:从桌面开发到单片机
date: 2026-08-06
tags: [设计原则, 架构, C语言]
summary: 单一职责、开闭、里氏替换、接口隔离、依赖倒置——五个原则在 C 语言里怎么表达?函数指针表、接口结构体,以及 OSAL 这个经典案例。
---

SOLID 是面向对象设计的五个原则,但它的适用性远不止 OO 语言。上一篇文章讲了嵌入式设计模式,这篇聊背后的原则——**SOLID 在 C 语言里怎么落地**。C 没有 class,没有接口关键字,但它的结构体 + 函数指针完全可以表达同样的思想,而且表达得更"朴素"。

## S - 单一职责原则

> There should never be more than one reason for a class to change.

**一个模块只该有一个"改变的理由"。** 翻译成嵌入式的话:**一个文件只干一件事。**

反例:一个 `uart.c` 既管寄存器配置、又管 DMA 搬运、还管协议解析、还往日志里写调试信息。结果:换一块芯片改寄存器时,协议解析代码跟着遭殃;排查 DMA 问题时,日志代码干扰视线。

正例:拆成 `uart_hw.c`(寄存器操作)、`uart_dma.c`(数据搬运)、`frame_parser.c`(协议解析)、`log.c`(日志)。每个文件的"改变理由"只有一个:

- 芯片变了 → 只改 `uart_hw.c`;
- 搬运策略变了 → 只改 `uart_dma.c`;
- 协议变了 → 只改 `frame_parser.c`。

**判断标准**:问自己"什么情况下我会改这个文件?"如果答案超过一个,它就在承担多个职责。实际项目不必强求每个文件都单一——但"两三个理由"和"五六个理由"的区别,维护时体会很深。

## O - 开闭原则

> 对扩展开放,对修改关闭。

**加新功能时,尽量写新代码,而不是改旧代码。** 因为旧代码是被测试验证过的,改它就有回归风险。

反例:

```c
void draw_shape(shape_t *s) {
    if (s->type == SHAPE_CIRCLE) { draw_circle(s); }
    else if (s->type == SHAPE_RECT) { draw_rect(s); }
    /* 新增三角形:改这个函数,加一个 else if */
}
```

每次加一种形状,都要动这个函数——它违反了开闭原则。正例(C 语言的经典表达:函数指针表):

```c
typedef struct {
    void (*draw)(void *self);
} shape_ops_t;

void draw_shape(shape_ops_t *ops, void *self) {
    ops->draw(self);       /* 不认识具体类型,只认接口 */
}

/* 新增三角形:新建 triangle.c,实现 triangle_draw */
/* draw_shape 一行不用改 */
```

**嵌入式对应物**:设备驱动框架。加一个新传感器 = 新增一个驱动文件 + 注册一张函数指针表,框架代码零改动。这就是为什么"填表"式驱动架构在嵌入式里如此普遍——它是开闭原则最朴素、最落地的形态。

## L - 里氏替换原则

> 子类必须能够替换掉父类,而不破坏程序。

**任何用父类的地方,换成子类都必须正常工作。** C 里没有继承,但这个原则照样适用——它约束的是**接口实现的一致性**。

经典反例:正方形继承矩形。矩形有 `set_width(10)` 和 `set_height(20)` 两个操作,正方形实现时会让两者互相影响——`set_width` 把高也改了。于是"用矩形的地方换成正方形"就出错了:宽和高对不上。

C 语言里的对应场景:两个驱动实现同一个接口表,但语义不一致。比如:

```c
typedef struct {
    err_t (*read)(void *self, uint8_t *buf, uint16_t len);
} flash_ops_t;
```

`spi_flash_read` 实现为"返回读取的字节数",`qspi_flash_read` 却实现为"返回错误码 0 表示成功"——两个实现语义不同,上层代码假设"返回值 >0 表示字节数",换成 QSPI 驱动就全错。**这就是 C 世界的里氏替换违反**:接口长得一样,行为契约不一样。

> 教训:接口表不只是函数签名,还隐含行为契约(返回值含义、阻塞语义、超时行为)。实现时必须严格一致。

## I - 接口隔离原则

> 不应该强迫客户端依赖它不用的方法。

**接口要小而专,不要大而全。** 反例:一个大而全的 `sensor_ops_t`,包含 `read_temperature`、`read_humidity`、`read_air_quality`、`calibrate`、`power_down`……一个只测温度的传感器被迫实现一堆空函数。

```c
/* 坏味道:一个接口塞五个职责 */
typedef struct {
    int (*read_temp)(void);
    int (*read_humidity)(void);
    int (*read_aqi)(void);
    void (*calibrate)(void);
    void (*power_down)(void);
} monster_ops_t;

/* 温度传感器:三个函数是空的 */
static int no_humidity(void) { return -1; }
static int no_aqi(void) { return -1; }
```

正例:按"客户端需要什么"拆接口:

```c
typedef struct { int (*read_temp)(void); } temp_ops_t;
typedef struct { int (*read_humidity)(void); } humidity_ops_t;
```

**判断标准**:接口的使用方是谁?每个使用方只看到它关心的函数,接口就是隔离的。

## D - 依赖倒置原则

> 高层模块不应该依赖低层模块,二者都应该依赖抽象。

这是五个原则里对嵌入式影响最深的一个。它的意思是:**业务逻辑不要直接调驱动,要调"抽象"**。

反例:业务代码直接调 `stm32_flash_write(...)`、`freertos_delay_ms(...)`。后果:换芯片、换 RTOS、换裸机,业务代码全线重写。

正例:依赖倒置 —— 业务层只依赖接口:

```c
/* 抽象:业务层只认识它 */
typedef struct {
    err_t (*write)(uint32_t addr, const uint8_t *data, uint32_t len);
    err_t (*read)(uint32_t addr, uint8_t *data, uint32_t len);
} storage_if_t;

/* 业务层:通过接口操作存储,不关心是 SPI Flash 还是 SD 卡 */
err_t app_save_record(storage_if_t *storage, const record_t *rec) { ... }
```

**这就是上一篇文章四层架构里 OSAL 层的设计哲学**:业务代码不直接调用 FreeRTOS 的 API,而是通过 OSAL 封装。今天跑 FreeRTOS,明天换 RT-Thread,甚至退回裸机——改的只是 OSAL 的实现,业务层一行不动。依赖倒置不是 OO 的专利,它就是"面向接口编程"的别名。

## C 语言里 SOLID 的完整表达

| 原则 | C 语言的表达 | 嵌入式例子 |
| --- | --- | --- |
| S 单一职责 | 一个 .c 文件一个职责 | uart_hw / uart_dma / frame_parser 拆分 |
| O 开闭 | 函数指针表 + 注册机制 | 驱动框架填表扩展 |
| L 里氏替换 | 接口实现保持行为契约一致 | 同接口的驱动语义统一 |
| I 接口隔离 | 小而专的接口结构体 | 传感器接口按功能拆分 |
| D 依赖倒置 | 业务依赖接口,不依赖实现 | OSAL、存储抽象层 |

## 小结

- **SOLID 不是 Java 专属**:结构体 + 函数指针就是 C 的表达方式;
- **五个原则是五个检查清单**:文件职责单一吗?扩展要改旧代码吗?接口语义一致吗?接口小而专吗?业务依赖抽象吗?
- **从 D 开始收益最大**:嵌入式项目最痛的"换平台重写",靠依赖倒置解决。

原则和模式一样,是"修"出来的而不是"画"出来的——代码里闻到坏味道(重复、耦合、难测)时,对照这五条找解药,比一开始堆砌抽象更可靠。

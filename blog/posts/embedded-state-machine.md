---
title: 嵌入式状态机实战:从 if-else 深渊到事件驱动
date: 2026-08-12
tags: [状态机, 架构, 嵌入式]
summary: 状态、事件、转移——用函数指针实现一个轻量 FSM,支持进入/退出事件,从按键消抖到协议解析一网打尽,还聊聊状态机与 RTOS 的关系。
---

嵌入式程序的复杂度,一大半藏在"逻辑分支"里。业务一旦有状态(空闲、运行、故障、低功耗……),`if (state && event && flag)` 的嵌套就会迅速失控。状态机(FSM)是嵌入式领域处理这类问题最成熟、最可靠的武器——它本质上是一种**架构**,不限于任何语言。

这篇文章用一个可运行的轻量状态机实现,讲清楚状态机的三个要素、事件驱动怎么写,以及它和 RTOS 任务怎么配合。

## 为什么需要状态机

先看一个反面教材——按键长按/短按识别(经典的 if-else 深渊):

```c
void key_scan(void) {
    if (key_pressed) {
        if (hold_counter > 0) {
            if (hold_counter >= LONG_PRESS_MS) {
                if (!long_press_handled) { do_long_press(); long_press_handled = true; }
            }
        } else {
            /* 短按还没释放,先记着 */
        }
    } else {
        if (hold_counter > 0 && !long_press_handled) {
            do_short_press();
        }
        hold_counter = 0;
        long_press_handled = false;
    }
}
```

这个逻辑写出来能跑,但读的人(包括三个月后的自己)要在脑子里模拟每一层 if——加一个新状态(比如"按键抖动"、 "双击检测"),要么堆更多 if,要么重写。

状态机的思路完全不同:**把"当前处于什么状态"显式建模,把"发生了什么事件"和"这个状态下该怎么办"分开**。

## FSM 的三个要素

```
状态(State)   : 空闲 → 按下 → 长按生效 / 释放 → 空闲
事件(Event)   : 按下、释放、计时到
转移(Transition): 在状态 X 收到事件 E 时,执行动作并转移到状态 Y
```

画成图:

```
        按下                 计时到
[空闲] ──────→ [按下] ──────────→ [长按]
 ↑              │                   │
 └──── 释放 ────┘←─── 释放/处理完 ──┘
```

关键转变:**代码结构跟着状态图走,而不是跟着业务逻辑的嵌套走**。

## 函数指针实现:一个 40 行的 FSM

C 语言里最经典的实现:每个状态是一个函数,函数指针指向当前状态;状态函数接收事件,返回是否要转移。加上**进入(ENTER)/退出(EXIT)事件**,状态切换时的初始化/清理逻辑就有了归宿:

```c
typedef struct fsm fsm_t;

/* 状态函数:接收"自身 + 事件",返回转移状态 */
typedef unsigned char (*state_handler_t)(fsm_t *self, event_t event);

/* 事件:系统里所有会"发生"的事 */
typedef enum {
    EVENT_NONE = 0,
    EVENT_KEY_PRESS,      /* 按键按下 */
    EVENT_KEY_RELEASE,    /* 按键释放 */
    EVENT_HOLD_TIMEOUT,   /* 长按计时到 */
    EVENT_STATE_ENTER,    /* 进入状态(内部事件) */
    EVENT_STATE_EXIT      /* 退出状态(内部事件) */
} event_t;

/* 状态机结构体 */
struct fsm {
    state_handler_t state;   /* 当前状态函数指针 */
    void *ctx;               /* 状态机的私有数据(按键计时器等) */
};

/* 状态函数返回值:是否发生转移 */
#define STATUS_TRAN 1

/* 构造与初始化 */
void fsm_ctor(fsm_t *self, state_handler_t initial) {
    self->state = initial;
}

/* 首次进入:先跑一次初始状态,再注入 ENTER 事件 */
void fsm_init(fsm_t *self, event_t event) {
    (*self->state)(self, event);
    (*self->state)(self, EVENT_STATE_ENTER);
}

/* 事件分发:处理事件;如果状态函数请求转移,执行 EXIT→ENTER */
void fsm_dispatch(fsm_t *self, event_t event) {
    state_handler_t prev_state = self->state;
    unsigned char status = (*self->state)(self, event);

    if (status == STATUS_TRAN) {
        (*prev_state)(self, EVENT_STATE_EXIT);     /* 旧状态做清理 */
        (*self->state)(self, EVENT_STATE_ENTER);   /* 新状态做初始化 */
    }
}
```

## 状态函数怎么写

每个状态一个函数,职责是:**处理事件,决定是否转移**:

```c
/* 空闲态:按键按下 → 启动长按计时,转到"按下"态 */
static unsigned char state_idle(fsm_t *self, event_t ev) {
    key_ctx_t *ctx = (key_ctx_t *)self->ctx;

    switch (ev) {
    case EVENT_KEY_PRESS:
        ctx->hold_ms = 0;
        self->state = state_pressed;     /* 请求转移 */
        return STATUS_TRAN;
    case EVENT_STATE_ENTER:              /* 进入空闲:清状态 */
        ctx->long_press_done = false;
        break;
    default:
        break;
    }
    return 0;
}

/* 按下态:释放 → 短按;计时到 → 长按 */
static unsigned char state_pressed(fsm_t *self, event_t ev) {
    key_ctx_t *ctx = (key_ctx_t *)self->ctx;

    switch (ev) {
    case EVENT_KEY_RELEASE:
        if (!ctx->long_press_done) { do_short_press(); }
        self->state = state_idle;
        return STATUS_TRAN;
    case EVENT_HOLD_TIMEOUT:
        do_long_press();
        ctx->long_press_done = true;
        self->state = state_idle;
        return STATUS_TRAN;
    case EVENT_STATE_ENTER:
        ctx->hold_ms = 0;
        break;
    default:
        break;
    }
    return 0;
}
```

主循环的职责变得极其简单:

```c
int main(void) {
    fsm_t key_fsm;
    fsm_ctor(&key_fsm, state_idle);
    fsm_init(&key_fsm, EVENT_NONE);

    while (1) {
        if (key_is_pressed())   fsm_dispatch(&key_fsm, EVENT_KEY_PRESS);
        if (key_is_released())  fsm_dispatch(&key_fsm, EVENT_KEY_RELEASE);
        if (tick_elapsed(1))    fsm_dispatch(&key_fsm, EVENT_HOLD_TIMEOUT);
    }
}
```

新加"双击检测"状态?画图 → 写两个状态函数 → 改转移 → 完事。**不用动任何其他状态函数**——这是状态机架构最值钱的地方:状态之间天然隔离,改一处不影响别处。

## 进阶:表格驱动状态机

状态函数用 `switch (ev)` 是"函数级"状态机;再进一步,可以用**状态转移表**把"状态 × 事件 → 动作 + 新状态"声明式地列出来:

```c
typedef struct {
    state_handler_t cur_state;
    event_t         event;
    state_handler_t next_state;
    void (*action)(void);
} trans_t;

static const trans_t trans_table[] = {
    { state_idle,    EVENT_KEY_PRESS,    state_pressed, act_start_hold },
    { state_pressed, EVENT_KEY_RELEASE,  state_idle,    act_short_press },
    { state_pressed, EVENT_HOLD_TIMEOUT, state_idle,    act_long_press  },
    /* 表驱动:新增转移 = 新增一行 */
};
```

好处:

- 状态图直接对应一张表,**review 的人一眼看懂全部行为**;
- 非法转移(表里查不到)可以直接断言报错,而不是静默错下去;
- 编译期可校验(查表越界、重复项)。

代价:灵活性略低(动作需要统一签名)。项目状态复杂时,表格驱动通常是更优解。

## 状态机 vs RTOS 任务

一个常见困惑:用了状态机还要不要 RTOS?答案是**两者解决不同问题,经常组合使用**:

| | 状态机 | RTOS 任务 |
| --- | --- | --- |
| 解决什么 | 状态与转移的**逻辑复杂度** | 并发与实时性的**调度复杂度** |
| 本质 | 代码组织方式 | 资源调度方式 |
| 关系 | 任务内部的实现细节 | 任务的容器 |

常见组合方式:

- **每个任务内部是一个状态机**:任务收消息 → 把消息当作事件喂给状态机 → 状态机决定动作。协议栈、通信模块基本都是这个形态;
- **状态机跨任务**:一个全局状态机(系统级状态:启动/运行/低功耗/故障),各任务把事件发布给状态机,状态机决定系统级行为;
- **裸机 = 一个 super loop 里的状态机**:上面的按键例子就是。

## 小结

- 状态机把"状态/事件/转移"显式建模,**消灭 if-else 深渊**;
- 函数指针实现 40 行搞定,支持 ENTER/EXIT 事件后,初始化和清理逻辑各归其位;
- 表格驱动进一步把行为变成可审查的声明;
- 状态机与 RTOS 不冲突:任务容器 + 状态机内核,是嵌入式系统最常见的高级形态;
- 改状态图比改嵌套 if 安全得多——状态隔离 = 修改隔离。

> 状态机不是银弹,但它是嵌入式工程师处理"有状态逻辑"的默认答案。看到复杂分支时,先画状态图,再写代码。

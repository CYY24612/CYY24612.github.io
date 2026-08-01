---
title: GDB 调试命令速查:嵌入式必备
date: 2026-08-19
tags: [GDB, 调试, 工具]
summary: 断点、单步、打印、内存查看、调用栈、线程、远程调试——GDB 高频命令一页速查,含 gdbserver 交叉调试流程。
---

GDB 是嵌入式 Linux 开发绕不开的调试器:崩了看栈、变量对不上看内存、行为诡异看反汇编。这篇把高频命令按功能分组,做成速查——比 `help` 快,比翻手册省事。

## 启动与基本控制

```bash
gdb ./app                # 带程序启动
gdb ./app core           # 用 core dump 调试(现场还原神器)
gdb ./app -p PID         # 附加到运行中的进程

(gdb) run                # 运行(简写 r)
(gdb) continue           # 继续执行(c)
(gdb) quit               # 退出(q)
```

> 嵌入式 tip:core dump 需要 `ulimit -c unlimited`,崩溃后 `gdb ./app core` 直接看现场。

## 单步执行

| 命令 | 简写 | 作用 |
| --- | --- | --- |
| `step` | `s` | 单步进入函数 |
| `next` | `n` | 单步跳过函数 |
| `finish` | — | 运行到当前函数返回 |
| `until 行号` | `u` | 运行到指定行 |

`n` 和 `s` 的区别是最高频的困惑:**`n` 把函数调用当一步跳过,`s` 进到函数里面**。

## 断点

```bash
break 10                 # 第 10 行
break foo                # 函数 foo 入口
break file.c:25          # 指定文件行号
break foo if x > 5       # 条件断点:循环里命中第 N 次很好用
info break               # 列出所有断点
delete 1                 # 删除断点 1
disable 1 / enable 1     # 禁用 / 启用
```

条件断点是排查"第 1000 次才出错"类问题的关键:

```bash
break pcb_process if pkt->len > 4096
```

## 监视点:变量一变化就停

```bash
watch x                  # 变量 x 被写时暂停
rwatch x                 # 变量 x 被读时暂停
awatch x                 # 读写都暂停
info watchpoints
```

调试"这个值到底是谁改的"——watch 就是答案。

## 打印变量

```bash
print var_num            # 打印变量
print $eax               # 打印寄存器
print/x var              # 十六进制显示
print/d var              # 十进制
print/c var              # 字符
print *array@10          # 打印数组前 10 个元素
print/x *(uint32_t*)0x40000000   # 直接读内存地址
set var x = 100          # 修改变量值(临时验证假设)
```

## 查看内存:x 命令

格式:`x/<数量><格式><单元大小> <地址>`

```bash
x/4bx 0x7fffffffe000     # 4 个字节,十六进制
x/4dw 0x7fffffffe000     # 4 个整数,十进制
x/16wx buf               # 16 个字,十六进制(看缓冲区常用)
x/s 0x40001234           # 当字符串显示
x/10i $pc                # 反汇编 10 条指令
```

| 参数 | 含义 |
| --- | --- |
| n | 显示单元数 |
| f | 格式:x 十六进制 / d 十进制 / c 字符 / s 字符串 / i 指令 |
| u | 单元大小:b 字节 / h 半字 / w 字(4B) / g 双字(8B) |

## 调用栈

```bash
backtrace                # 完整调用栈(bt)——崩溃第一件事
frame 2                  # 切到第 2 层栈帧
info args                # 当前帧的参数
info locals              # 当前帧的局部变量
up / down                # 向调用者 / 被调用者方向移动帧
```

**崩溃排查标准流程**:`bt` 看栈 → `frame N` 切到出事函数 → `info locals` 看现场变量 → 结合日志还原调用路径。

## 线程

```bash
info threads             # 列出所有线程
thread 3                 # 切到线程 3
thread apply all bt      # 所有线程的调用栈(多线程死锁必用)
set scheduler-locking on # 单步时只动当前线程
```

`thread apply all bt` 是查死锁、卡死的首选命令:所有线程停在哪一目了然。

## 嵌入式远程调试:gdbserver

目标板上没有 GDB,用 gdbserver 把调试服务架起来,PC 上的 GDB 连过去——**断点、单步、看内存全部在目标板上实时生效**:

```bash
# 目标板(或 qemu 模拟器)
gdbserver :2345 ./app

# PC 端
gdb ./app
(gdb) target remote <板子IP>:2345
(gdb) continue
```

交叉编译时记得用带调试信息的程序:`-g` 编译选项,别加 `-O2`(优化会"优化掉"断点行为)。

## 其他高频技巧

```bash
set pagination off       # 关分页,输出一口气打完
set print pretty on      # 结构体漂亮打印
display var              # 每次停下自动打印 var
info registers           # 全部寄存器
disassemble $pc          # 反汇编当前函数
```

## 速记口诀

- **崩了先 `bt`**,看栈永远第一;
- **值不对先 `watch`**,找"谁改的";
- **缓冲区用 `x/16wx`**,内存布局一眼看清;
- **多线程卡死用 `thread apply all bt`**;
- **现场没有调试器,靠 core dump + 日志**。

---
title: Shell 常用命令速查:嵌入式开发的一天
date: 2026-08-17
tags: [Shell, Linux, 工具]
summary: 找文件、查日志、看进程、配串口、交叉编译——嵌入式开发日常要用到的 Shell 命令,按场景分组速查。
---

终端是嵌入式开发的主战场:查日志、找文件、看进程、烧录、交叉编译。这篇按**使用场景**分组,收录日常最高频的命令——比 `man` 快,比翻笔记省事。

## 文件查找:find

```bash
# 找所有名为 src 的目录
find . -name src -type d

# 找路径中含 test 文件夹的所有 .py 文件
find . -path '*/test/*.py' -type f

# 找一天内修改过的文件
find . -mtime -1

# 找 500k~10M 之间的 tar.gz
find . -size +500k -size -10M -name '*.tar.gz'

# 按名字模糊找 + 排除 build 目录
find . -name '*uart*' -not -path './build/*'
```

## 代码搜索:rg(ripgrep)

```bash
# 找所有使用 requests 库的 Python 文件
rg -t py 'import requests'

# 找所有不含 shebang 行的文件(含隐藏文件)
rg -u --files-without-match '^#!'

# 找 foo 的所有匹配,并打印后面 5 行
rg foo -A 5

# 匹配统计(行数、文件数)
rg --stats PATTERN

# 排除目录搜索
rg -t c 'struct fsm' --glob '!build/**'

# 只看文件名
rg -l 'pcb_init'
```

## 查看文件

```bash
tail -f app.log          # 实时跟踪日志(调试神器)
tail -n 100 app.log      # 最后 100 行
head -n 20 app.log       # 前 20 行
less app.log             # 分页查看,支持 / 搜索、G 到底部
cat -n main.c            # 带行号显示
wc -l main.c             # 行数统计
```

## 文本处理

```bash
grep -rn 'ERROR' .       # 递归搜索,带行号
grep -i 'timeout' log    # 忽略大小写
grep -v 'DEBUG' log      # 排除 DEBUG 行

sed -i 's/old/new/g' file.c   # 原地替换
sed -n '10,20p' file.c        # 打印 10~20 行

awk '{print $1, $3}' file     # 按列取字段
cut -d',' -f2 file.csv        # 按逗号分割取第 2 列
sort | uniq -c                # 去重并计数
```

## 权限与系统

```bash
chmod +x build.sh        # 加执行权限
chmod 644 file           # rw-r--r--
chown -R user:group dir  # 递归改属主
sudo -i                  # 切 root

ps aux | grep app        # 找进程
top -p PID               # 看单进程 CPU/内存
kill -9 PID              # 强杀
df -h                    # 磁盘空间
du -sh build/            # 目录大小
```

## 网络

```bash
ping -c 3 10.0.0.1
curl -v http://...       # -v 看完整交互;默认 GET,-d 变 POST
curl -o out.bin URL      # 下载
netstat -tlnp            # 监听端口
ss -tunap                # 更快的 netstat 替代
ip addr                 # 网卡 IP(ifconfig 的现代替代)
```

## 压缩与解压

```bash
tar -czf out.tar.gz dir/     # 压缩
tar -xzf out.tar.gz          # 解压
tar -xzf out.tar.gz -C /dst  # 解压到指定目录
zip -r out.zip dir/
unzip out.zip
```

## 串口与嵌入式调试

```bash
# 查看串口设备
ls /dev/ttyUSB* /dev/ttyACM*

# 串口监视(退出 Ctrl-A 然后 Ctrl-\)
minicom -D /dev/ttyUSB0 -b 115200
screen /dev/ttyUSB0 115200

# 交叉编译环境(临时生效,当前 shell)
export PATH=/opt/gcc-arm/bin:$PATH
export CROSS_COMPILE=arm-none-eabi-
arm-none-eabi-gcc -v    # 验证工具链
```

## 终端会话与复用

```bash
history | grep make    # 查历史命令
!!                     # 重跑上一条
!make                  # 重跑最近一条 make 开头命令
Ctrl-r                 # 反向搜索历史(按一下再输入关键字)
```

## 三条实用小技巧

1. **别名救手**:
```bash
alias ll='ls -alF'
alias g='git'
# 写入 ~/.bashrc 后 source ~/.bashrc 生效
```

2. **命令不记得参数?** `man 命令` 或 `tldr 命令`(tldr 给精简示例,比 man 快)。

3. **输错长路径?** `Ctrl-a` 跳行首、`Ctrl-e` 跳行尾、`Ctrl-w` 删一个词——终端也是 Vim 的亲戚,基本键位通用。

> 查日志场景速记:`tail -f` 跟现场、`grep -rn` 找根源、`sed -n 'x,yp'` 看上下文、`awk '{print $n}'` 取字段。

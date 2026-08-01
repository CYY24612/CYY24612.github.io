---
title: Git 常用命令速查:从日常到救场
date: 2026-08-21
tags: [Git, 工具]
summary: 日常三件套、分支与合并、撤销与救场(amend/restore/revert/stash)、远程协作——Git 高频命令一页速查。
---

Git 命令多,但日常真正高频的就这么几十条。这篇按"日常使用"和"出问题救场"两条线组织,记不清的时候打开查。

## 配置(一次设置,终身受用)

```bash
git config --global user.name "你的名字"
git config --global user.email "you@example.com"
git config --global core.editor vim
git config --global init.defaultBranch main
git config --global alias.lg "log --oneline --graph --decorate -20"  # 常用别名
```

## 日常三件套

```bash
git status              # 当前状态(改了什么、暂存了什么)
git add main.c          # 暂存指定文件
git add .               # 暂存全部改动
git commit -m "message" # 提交
git diff                # 未暂存的改动
git diff --staged       # 已暂存待提交的改动
git log --oneline       # 提交历史(一行一条)
git lg                  # 别名:图形化历史
git show <commit>       # 看某次提交的完整内容
```

## 分支:开发的主战场

```bash
git branch              # 列出分支
git switch -c feature   # 新建并切换分支(现代写法)
git switch main         # 切换分支
git merge feature       # 把 feature 合并进当前分支
git branch -d feature   # 删除已合并分支
git branch -D feature   # 强制删除(没合并也删)
```

**merge 和 rebase 怎么选**(高频困惑):

| 操作 | 效果 | 适用 |
| --- | --- | --- |
| `merge` | 保留分叉历史,生成合并提交 | 团队协作、公共分支(推荐默认) |
| `rebase` | 把提交"搬"成一条直线 | 个人分支整理历史、提交前同步上游 |

规则:**公共分支只 merge 不 rebase;自己的分支随便 rebase。**

## 撤销与救场

```bash
# 改乱了工作区,想还原
git restore main.c           # 丢弃未暂存改动(旧写法 checkout --)
git restore --staged main.c  # 撤销 git add(取消暂存,保留改动)

# 提交后悔了
git commit --amend           # 修改上一次提交信息 / 补漏文件
git reset --soft HEAD~1      # 撤销提交,保留改动(重新提交用)
git reset --hard HEAD~1      # 撤销提交并丢弃改动(慎用!)

# 已推送的提交要撤回:用 revert(会生成一条新提交,团队安全)
git revert <commit>

# 干到一半要切分支
git stash                   # 暂存当前改动,工作区变干净
git stash pop               # 恢复
git stash list              # 查看暂存列表
```

> 救场口诀:**没推送的用 reset,已推送的用 revert,不确定的先用 stash。**

## 远程协作

```bash
git remote -v              # 查看远端
git clone <url>            # 克隆
git fetch origin           # 拉取远端最新(不合并)
git pull                   # fetch + merge(日常用这个)
git push                   # 推送
git push -u origin main    # 首次推送并建立跟踪
git remote add origin <url>  # 关联远端

# 推送被拒绝(远端有新提交)时
git pull --rebase          # 先把自己的提交搬上去,再推
git push
```

## 查看历史与定位

```bash
git log --oneline -5                   # 最近 5 条
git log --oneline --graph --all        # 全部分支图形
git log -p -- main.c                   # 某个文件的历史改动
git blame main.c                       # 每行是谁改的(追责神器)
git log -S "foo" --oneline             # 找"foo 这个字符串何时被增删"
git bisect start                       # 二分定位引入 bug 的提交
git bisect bad / git bisect good <commit>
```

`git bisect` 是定位"某功能哪天坏了"的利器:告诉它一个坏的提交和一个好的提交,它自动二分,几次就能锁定肇事提交。

## 标签与发布

```bash
git tag v1.0.0             # 打标签
git tag -a v1.0.0 -m "说明" # 附注标签(推荐)
git tag                    # 列出
git push origin v1.0.0     # 推送标签
```

固件发布、版本归档用标签管理,比记 commit hash 靠谱。

## 嵌入式项目实战建议

1. **提交信息写"为什么"**:`fix: uart dma 接收偶发丢字节,增加超时重取` 比 `update` 值钱一百倍;
2. **.gitignore 必须配**:`build/`、`*.o`、`*.elf`、`*.bin` 产物不入库(代码 + 构建脚本入库存,产物 CI 生成——本博客就是这么干的);
3. **一次提交一件事**:改驱动和改文档分两个 commit,回滚时互不牵连;
4. **Release 分支 + 标签**:`main` 永远可发布,开发在 feature 分支,合入走 merge。

## 一页速记

```
日常:  status → add → commit → push
分支:  switch -c → 开发 → merge
撤销:  restore(工作区) / reset(未推送) / revert(已推送)
救场:  stash(换任务) / bisect(找凶手) / log -S(找变更)
```

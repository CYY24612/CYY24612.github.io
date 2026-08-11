---
title: Git 多人协作工作流:从个人分支到安全合入主干
date: 2026-08-11
tags: [Git, 协作, 工作流]
summary: 基于远程主干 feature 分支的多人协作流程:从远程最新 master 切分支、日常开发循环、定期吸收远端更新、干净合回主干,冲突永远在个人分支上解决。
---

多人协作时,Git 用得好不好,差距不在命令记多少,而在**流程**是否统一。这篇是我日常用的 feature 分支协作流程——基于远程主干(`master`)开发,核心原则就三条:

- 永远从**远程最新的 `master`** 切分支,而不是本地 `master`(本地可能已过时)
- 冲突**永远在个人分支上解决**,合回主干时保证干净
- 推送到远端的是主干分支,个人分支只作开发与备份

## 一、开始一个任务

```bash
git fetch origin
git checkout -b cyy origin/master   # 从远程最新 master 切出个人分支
```

> `cyy` 替换为你的个人分支名,建议遵循命名规范,如 `feature/xxx`。

## 二、日常开发(循环)

```bash
git checkout cyy                    # 切到工作分支
# ...写代码...
git add <文件>                      # 或 git add -A
git commit -m "feat: 描述这次改动"   # 提交信息格式见《Git 提交信息规范》
git push                            # 备份到远端 cyy(首次需 git push -u origin cyy)
```

## 三、把同事的新提交合进来(定期做)

在个人分支上吸收远端 `master` 的新提交,**冲突在这里解决**:

```bash
git fetch origin
git merge origin/master
# 若有冲突:手动解决 → git add <文件> → 再次 git commit
```

## 四、合回主干并推送

```bash
git checkout master
git pull origin master              # 确保本地 master 也最新
git merge cyy                       # 此时是快进或干净合并
git push origin master              # 推的是 master,不是 cyy
```

> 若 `git push` 被拒绝(提示 non-fast-forward),说明远端 `master` 又有新提交:
> 先 `git pull --rebase origin master`,再 `git push origin master`。

## 五、收尾(可选)

```bash
git branch -d cyy                   # 删本地个人分支(已合并才能删)
git push origin --delete cyy        # 删远端个人分支(仅属于你且已合并)
```

## 为什么这样绕一圈

很多新人会直接在 `master` 上开发,图省事。但一旦冲突,或者改到一半被叫走,主干就变得不可信。个人分支就像**工作台**:脏活、冲突、半成品都在上面,主干永远保持干净可用。这套流程的多余动作只有 `checkout` 和 `merge`,换来的是随时可发布的 `master`,性价比很高。

配合[Git 提交信息规范(Conventional Commits)](</blog/git-commit-conventions/>)使用,日志更清晰,CHANGELOG 也能自动生成。

# 我的个人网站

这是我的个人作品集网站，基于 [这里写你的技术栈，如 HTML/CSS/JS + 粒子背景 + Neumorphism 风格] 构建。网站展示了我的嵌入式软件工程师背景、项目经历和技术博客。

🔗 **在线访问**: [https://cyy24612.github.io](https://cyy24612.github.io)

## 🚀 功能特点

- 响应式设计，支持手机/平板/PC
- 深色主题 + 新拟态(Neumorphism)卡片风格
- 鼠标跟随粒子背景动画
- 平滑滚动导航
- 支持 GitHub Pages 自动部署

## 🛠️ 技术栈

- HTML5 / CSS3
- JavaScript (ES6)
- Particles.js (粒子背景)
- Font Awesome 6 (图标库)
- GitHub Pages (托管)

---
<br>

# 个人网站搭建流程
## 创建仓库
登录 GitHub，新建一个以 `github 用户名.github.io` 为名的公开仓库

## 编写个人网站
将仓库克隆到本地，增加 index.html 文件，这个文件内为网站的内容

## 创建 GitHub Actions WorkFlow
在项目根目录下新建一个 `.github\workflows\deploy.yml` 文件，增加以下内容
```yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]   # 如果你的默认分支是 master，请改成 master
  workflow_dispatch:     # 允许手动触发

permissions:
  contents: read
  pages: write
  id-token: write
  
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'        # 如果你的静态文件在根目录，就写 '.'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## 上传项目
通过 `git add .` 将所有新的内容，增加到 git 管理
通过 `git commit` 提交内容
通过 `git push` 将内容推送到 GitHub
***如若无法推送，需要进行以下步骤***
```cmd
// 生成密钥
ssh-keygen -t ed25519 -C "your_email@example.com"

// 查看并复制密钥里的内容
cat ~/.ssh/id_ed25519.pub
```
在 GitHub 中点击右上角的头像，进入 **Settings**
点击 **SSH and GPG keys**
填写信息：
- Title：起个名字方便识别，例如 "My MacBook Pro" 或 "Work PC"。
- Key type：保持默认的 Authentication Key。
- Key：将刚才复制的公钥内容粘贴到这里。
点击 **Add SSH key** 保存
验证连接：`ssh -T git@github.com`

## 激活网站
进入个人网站项目，点击项目上方的 Settings->Pages，将Build and deployment 中的Source 更改为 GitHub Actions
之后可以在项目上方的 Actions 中查看网站 Build 进度
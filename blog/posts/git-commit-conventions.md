---
title: Git 提交信息规范:Conventional Commits 通俗指南
date: 2026-08-11
tags: [Git, 规范, 工具]
summary: 约定式提交(Conventional Commits)核心格式 <type>(<scope>): <subject>,feat/fix/docs/style/refactor/perf/test/chore/ci/build/revert 全类型讲解,附完整示例与 BREAKING CHANGE 写法。
---

提交信息写得好不好,决定了半年后你看 `git log` 是"看说明书"还是"考古"。约定式提交(Conventional Commits)是目前最主流的提交信息规范——它并非 GitHub 强制要求,而是由 Angular 团队发起、被开源社区广泛采用的一套约定。

核心格式只有一个:

```
<type>(<scope>): <subject>
```

## 提交类型(type)

按使用频率从高到低排列。

### 1. 功能与修复(最常用)

- **`feat`**:新功能(Feature)。给用户层面增加了一个新的功能或特性。
  - 示例:`feat: 新增用户登录接口`
- **`fix`**:修复 Bug。修补了线上或测试环境中的缺陷。
  - 示例:`fix: 修复订单金额计算溢出问题`

### 2. 代码质量与维护

- **`docs`**:文档(Documentation)。只修改文档,如 `README.md`、接口注释或使用说明,不涉及代码逻辑变动。
  - 示例:`docs: 更新安装部署文档`
- **`style`**:代码格式/风格。不影响程序逻辑的改动(删除多余空格、分号、缩进、代码格式化)。注意:不是指 UI 界面样式,UI 样式属于 `feat` 或 `fix`。
  - 示例:`style: 统一缩进为 2 个空格`
- **`refactor`**:重构(Refactor)。既不是修 Bug,也不是加新功能,只是对现有代码进行结构优化(重命名变量、抽取公共方法),业务逻辑不变。
  - 示例:`refactor: 抽取用户验证逻辑为独立工具类`
- **`perf`**:性能优化(Performance)。专指提升系统性能的代码改动(优化 SQL 查询、减少内存消耗等)。
  - 示例:`perf: 优化首页大图加载速度`

### 3. 工程与工具

- **`test`**:测试。新增或修改单元测试、集成测试代码,不涉及业务逻辑。
  - 示例:`test: 增加购物车模块的边界测试用例`
- **`chore`**:杂务。不修改 `src` 或 `test` 目录的其他改动(修改构建脚本、依赖版本、CI 配置等)。
  - 示例:`chore: 升级 webpack 至 5.x 版本`
- **`ci`**:持续集成(Continuous Integration)。专指修改 CI 配置文件或脚本(GitHub Actions、Jenkinsfile)。
  - 示例:`ci: 配置自动化部署流水线`
- **`build`**:构建系统。涉及构建工具或外部依赖本身的改动(`package.json`、`pom.xml`、`Dockerfile`)。
  - 示例:`build: 添加生产环境镜像构建命令`
- **`revert`**:回退。撤销之前的某次提交。
  - 示例:`revert: 回退 feat(login) 提交`

> `chore` 与 `build` 的区别:`build` 专门针对构建系统与外部依赖本身;`chore` 是其余不涉及代码逻辑的工程杂项。两者界限并不绝对,与团队约定保持一致即可。

### 补充:两个重要附加项

- **scope(范围)**:写在 `type` 后面的括号里,指明改动模块,如 `feat(登录)`、`fix(支付)`。
- **BREAKING CHANGE(破坏性变更)**:改动导致现有 API 不兼容(升级后旧代码跑不起来)时,需要在正文或脚注中写明 `BREAKING CHANGE`,或在 `type` 后加 `!`,如 `feat(api)!: 重构用户认证接口`。

## 完整示例

```text
feat(支付): 支持支付宝扫码支付

新增支付宝 PC 端 / 手机端扫码支付入口,替换原银行转账流程。

BREAKING CHANGE: 移除银行转账接口 POST /transfer,调用方需迁移到新的支付接口
```

## 为什么值得这样写

1. **自动生成 CHANGELOG**:工具可以根据 `feat` 和 `fix` 自动筛选出用户可见的改动,生成清晰的 Release Notes。
2. **语义化版本控制**:帮助维护者判断下一个版本号该升大版本(破坏性变更)、中版本(新功能)还是小版本(修复)。

## 常用做法

- 想在 GitHub 设置提交模板:在项目根目录创建 `.gitmessage.txt`,然后执行 `git config --local commit.template .gitmessage.txt`。
- 大多数开发者更习惯直接 `git commit -m "type: 内容"`,配合 IDE 插件快速输入。
- 如需强制校验格式,可引入 commitlint + husky 在提交时检查,把规范变成硬约束。

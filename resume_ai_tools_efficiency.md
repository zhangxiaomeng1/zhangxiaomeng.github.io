# AI 工具提效实践

## 基于 Claude Code / Codex 构建 7×24 小时自动化开发流水线

### 项目背景

在 AIFriends iOS 项目开发过程中，探索并落地了一套基于 AI 编程工具的自动化开发流水线，将重复性开发任务（新增页面、接口对接、多语言补全、Bug 修复等）从人工逐条执行，转变为 AI 自主批量完成，实现 7×24 小时无人值守运行。

**项目职责**：AI 工程化方案设计、上下文工程（Context Engineering）、自动化流水线搭建与维护、AI 生成代码 Review 与质量把控。

**核心亮点**：
- 自研 Shell 驱动 Claude Code（claude-sonnet-4-6）的 7×24 小时无人值守开发流水线，任务队列化 + 三级验证（编译 + 测试 + AI Review）+ 双远端推送全自动闭环
- 双引擎并行方案：Claude Code 版（`run_ios_tasks.sh`）+ Codex 版（`run_ios_tasks_codex.sh`），Codex 版增加失败重试机制，失败任务自动进入重试队列，最终失败才通知人工介入
- 上下文工程（Context Engineering）实践：结构化 prompt 注入项目规范（路径、架构文档、编码规范、禁止幻觉规则），AI 生成代码符合率 90%+，人工修改量极低
- AI 代码 Review 自动化：`ai_code_review.sh` 调用 Claude Code 读取 git diff，按命名规范、屏幕适配、字体映射、安全问题 4 个维度自动审查，输出结构化 JSON 结果，Review 不通过自动回滚

---

### 技术实现

#### 流水线架构

```
tasks.txt（待执行任务队列）
    ↓
Shell 脚本逐行读取任务
    ↓
注入结构化上下文（项目路径 + 架构文档 + 编码规范 + 禁止幻觉规则）
    ↓
调用 Claude Code / Codex 自主执行（--dangerously-skip-permissions）
    ↓
三级验证流程：
  [1/3] xcodebuild 全量编译 + xcbeautify 格式化输出
  [2/3] AI 自动生成并运行功能测试（generate_and_run_tests.sh）
  [3/3] AI 代码 Review（ai_code_review.sh，git diff → Claude → JSON 结果）
    ↓
验证通过 → git add（精准暂存）+ commit + push（GitHub + Gitee）
验证失败 → git reset --hard 回滚 + 记录失败任务 + 邮件通知
    ↓
移入 tasks_done.txt + 邮件通知 + 继续下一个任务（无限循环）
```

#### 失败重试机制（Codex 版）

```
首次失败 → 记录到 tasks_failed.txt → 继续执行其他任务
所有任务完成后 → 检测 tasks_failed.txt → 自动进入重试阶段
重试失败 → 记录到最终失败列表 → 邮件通知人工介入
```

#### 上下文注入策略

每次调用 AI 时，自动注入 6 步结构化 prompt：

| 步骤 | 内容 |
|------|------|
| Step 1 | 强制读取 CLAUDE.md 规范 + 项目结构文档 + 目标文件 |
| Step 2 | 修改前检查：文件规模（wc -l）+ 调用方搜索（grep）+ 影响范围声明 |
| Step 3 | 禁止幻觉规则：禁止推断 API 参数、禁止猜测 UI 数值、禁止跨文件假设 |
| Step 4 | iOS 开发规范：禁止 Storyboard、尺寸用 `.w/.h`、字体映射、目录规范 |
| Step 5 | 实现 + 编译验证 + 影响范围确认 |
| Step 6 | 精准 git add（禁止 `git add .`）+ 中文 commit 格式 |

#### AI 代码 Review 自动化（ai_code_review.sh）

- 读取 `git diff HEAD -- '*.swift'` 获取变更内容
- 调用 Claude Code 按 4 个维度审查：命名规范（AIF 前缀 + PascalCase）、屏幕适配（`.w/.h` 是否硬编码）、字体映射（XYFont）、安全问题（强制解包、内存泄漏）
- 输出结构化 JSON：`{"status": "pass/warning/fail", "issues": [...], "summary": "..."}`
- `fail` 状态自动触发 `git reset --hard` 回滚，邮件通知具体问题

---

### 实际效果

- 夜间/周末无人值守执行开发任务，早上查看邮件即可了解完成情况
- 多语言补全（27 种语言 × N 条文案）等高重复性任务，从人工数小时压缩至 AI 自动完成
- 新增页面、接口对接等标准化任务，AI 按规范自主完成并通过三级验证，人工只需 Review 代码
- 编译失败自动回滚，保证 master 分支始终可编译，不引入破坏性提交
- 结合 Cursor / Trae 进行交互式开发，复杂逻辑由人工设计方案，标准化实现交给 AI 批量执行

---

### 工具组合

| 工具 | 用途 |
|------|------|
| Claude Code（claude-sonnet-4-6） | 核心执行引擎，自主完成代码编写、编译修复、git 提交 |
| OpenAI Codex（codex exec） | 备用执行引擎，与 Claude Code 双引擎并行，互为兜底 |
| Cursor | 交互式开发，复杂逻辑设计与调试 |
| Trae | 国内环境下的 AI 辅助编码 |
| Shell 脚本（5 个） | 任务调度、编译验证、测试生成、AI Review、模拟器管理 |
| xcodebuild + xcbeautify | 全量编译验证，保证每次提交可编译 |
| SwiftLint | 静态代码分析，配合编译验证形成双重质量门禁 |
| Git（GitHub + Gitee） | 双远端代码同步与备份 |

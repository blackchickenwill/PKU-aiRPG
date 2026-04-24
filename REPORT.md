# REPORT.md

# 《烛之武退秦师》MVP v0.1 重制报告

## 1. 为什么重做

上一版 v0.1 为了让工程容易落地，把系统压缩成了：

```text
parser / npcMind / narrator / worldDirector
```

这种写法虽然有状态机约束，但容易被误解成：

```text
一个全知 LLM 同时揣测所有人物、剧情和结局。
```

这不符合项目原始思想。

你真正想要的是：

```text
每个重要 NPC 都有自己的内核、记忆、主观信念和视角。
世界不是由总控替他们思考，而是由事件分发给他们，他们各自反应，再由状态机审核落盘。
```

所以本次重制把架构改为：

```text
WorldState 客观世界账本
EventLog 事件日志
ObservationFilter 事件可见性过滤
NPCMemoryStore 多 NPC 私有记忆
NPC Kernel 独立心智内核
WorldDirector 调度器
Validator / Reducer 硬约束落盘
Narrator 叙事表现器
```

## 2. 本次重制改了什么

### 2.1 新增“多 NPC 独立心智内核”原则

关键 NPC 不共享全知心智。每个 NPC 只知道自己能观察到或被告知的事件。

秦伯、晋使、郑伯、守卫、百姓代表拥有不同可见世界。

### 2.2 新增 ObservationFilter

所有事件都不能直接广播给所有 NPC。

例如：

```text
烛之武在秦伯主帐说“亡郑利晋”。

秦伯：知道完整内容。
守卫：知道谈话持续。
晋使：知道郑使久留主帐，但不知道话语内容。
郑伯：暂时不知道。
百姓：不知道。
```

### 2.3 新增 NPCMemory / NPCMemoryStore

NPC 的主观状态从 NPCState 中拆出来，形成独立记忆系统。

包括：

```text
episodicMemory
beliefs
doubts
attitudes
promises
lastPlayerInteraction
privateFlags
```

### 2.4 重写 WorldDirector 定位

WorldDirector 不再是“总控大脑”。

它是：

```text
事件调度器
NPC 唤醒器
时间推进器
冲突排序器
结局触发器
```

它不替秦伯、晋使、郑伯思考。

### 2.5 重写 Codex 任务表

TASKS.md 现在强制 Codex 先实现：

```text
observationFilter
npcMemory
mock NPC kernels
worldDirector scheduler
information isolation tests
```

防止项目滑向全知聊天机器人。

### 2.6 新增信息隔离测试

必须测试：

```text
晋使不能知道主帐内具体话语。
郑伯不能知道秦伯反应，除非有汇报事件。
秦伯可以更新自己的疑虑。
NPCMemory 不能因不可见事件更新。
```

## 3. 现在给 Codex 什么

交付 Codex 的核心文件：

```text
PROJECT_BRIEF.md
AGENTS.md
MVP_SPEC.md
NPC_KERNEL_ARCHITECTURE.md
TASKS.md
CODEX_HANDOFF.md
REPORT.md
```

其中：

```text
PROJECT_BRIEF.md：项目总纲和设计哲学
AGENTS.md：Codex 必须遵守的工程门规
MVP_SPEC.md：第一版要做什么、不做什么
NPC_KERNEL_ARCHITECTURE.md：多 NPC 内核架构说明
TASKS.md：逐步开发任务
CODEX_HANDOFF.md：怎么把任务交给 Codex
REPORT.md：本次重制说明
```

辅助交付：

```text
prompts/
drafts/src/game/
drafts/tests/
codex_prompts/
```

## 4. 如果跑通了，世界会怎么演变

一轮完整演变：

```text
玩家输入一句自然语言
→ parser 判断意图
→ safety 排除提示词攻击和越界行为
→ validator 检查位置、身份、信息、目标是否成立
→ reducer 生成并落盘客观 GameEvent
→ observationFilter 判断每个 NPC 能看到什么
→ 相关 NPC kernel 被唤醒
→ 每个 NPC 根据自己的 memory 和 ObservableEvent 生成反应提案
→ validator 检查 NPC 提案是否合法
→ reducer 更新 NPCMemory / WorldState / EventLog
→ worldDirector 判断是否推进时间或触发后续事件
→ narrator 给玩家正式模式反馈
```

举例：

```text
玩家对秦伯说“秦伯若灭郑，实利尽归于晋。”

秦伯 kernel：
听到完整内容，更新疑虑，可能追问郑国对秦有何用。

晋使 kernel：
不知道话语内容，只观察到郑使与秦伯谈话过久，警觉上升。

郑伯 kernel：
暂时没有消息，不更新秦营认知。

守卫 kernel：
记录郑使仍在帐中，保持警戒。
```

## 5. LLM 和硬约束如何分工

LLM 负责：

```text
理解玩家语言
判断话术策略
在单个 NPC 视角内推演主观反应
生成 NPC 台词
生成文学化叙事
辅助生成结局文本
```

硬约束负责：

```text
角色身份
地点位置
谁在场
谁能观察什么
信息来源和可信度
事件是否落盘
NPC 是否有权行动
是否提示词攻击
是否世界观越界
检查点回滚
结局维度组合
```

最重要的一条：

```text
LLM 可以提出“秦伯想撤军”的意图，但不能直接让秦军撤退。
只有 Validator + Reducer 通过后，客观世界才会变化。
```

## 6. 当前版本的核心判断

这版比上一版更难实现，但更符合项目思想。

上一版适合快速工程原型。

本版更接近你真正要研究的东西：

```text
人物不是剧情工具。
人物是具有私有记忆和主观判断的行动主体。
世界不是 LLM 编出来的。
世界是多主体意图在硬规则中落盘后的结果。
```

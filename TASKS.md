# TASKS.md

# 《烛之武退秦师》MVP v0.1：NPC Kernel 重制版任务清单

每个任务都应该作为一个小 PR / 小 commit 完成。不要跳过 mock 阶段直接接 LLM。

总原则：

```text
不要通过为每一种玩家输入单独硬编码剧情分支来“支持自由度”。
像“烛之武拒绝佚之狐”这样的例子，应该作为回归测试存在，
用来检验系统的通用机制是否成立，而不是要求代码里出现专门分支。
```

系统应该通过以下一般机制消化任意合理的世界内输入：

```text
semantic action classification
world validation
event logging
observation filtering
NPC memory update
NPC affordance selection
NPC intention proposal
NPC proposal validation
WorldDirector scheduling
reducer commit
```

## Task 01：初始化项目骨架 `已完成`

目标：建立 Next.js + TypeScript + Tailwind 项目。

要求：

```text
左侧：节点地图
右侧：场景 / 对话面板
底部：玩家输入框
可选：调试面板占位
```

不做：

```text
LLM 调用
复杂游戏逻辑
数据库
战斗系统
```

验收：

```text
npm run dev 可运行
UI 能展示初始占位地图与输入框
```

## Task 02：核心类型与 Zod Schema `已完成`

创建：

```text
src/game/types.ts
src/game/schemas.ts
```

必须包含：

```text
WorldState
NPCState
NPCMemory
NPCMemoryStore
KnowledgeItem
LocationState
PlayerAction
ActionProposal
SafetyClassification
GameEvent
ObservableEvent
MemoryPatchProposal
NPCIntentionProposal
NPCKernelInput
NPCKernelOutput
ValidatorResult
Checkpoint
EndingState
```

验收：

```text
TypeScript 编译通过
初始 schema 测试通过
```

## Task 03：初始世界数据 `已完成`

创建：

```text
src/game/initialWorld.ts
src/data/npcs.json
src/data/locations.json
src/data/initialKnowledge.json
src/data/npcMemories.json
```

包含 NPC：

```text
郑伯
佚之狐
秦伯
晋使
守卫 / 传令官
郑国百姓代表
```

包含地点：

```text
烛之武宅
郑伯宫室
郑国市井
城墙 / 城门
秦营外
秦伯主帐
晋军营方向
```

验收：

```text
初始世界通过 schema 校验
每个关键 NPC 有独立 memory
```

## Task 04：Mock Action Parser + Safety `已完成`

创建：

```text
src/game/parserMock.ts
src/game/safety.ts
```

识别：

```text
请求会面
利害分析说服
郑为东道主利益交换
试探
辩解
模糊发言
现代越界行为
提示词攻击
请求系统 prompt
角色身份破坏
```

验收：

```text
10+ parser 测试通过
提示词攻击不产生有效世界事件
```

## Task 05：Validator + Reducer `已完成`

创建：

```text
src/game/validator.ts
src/game/reducer.ts
```

Validator 检查：

```text
位置
目标 NPC 是否在场
角色身份
信息是否可用
安全分类
事件是否与状态冲突
```

Reducer：

```text
只接受 Validator 通过的 GameEvent
追加 eventLog
更新 WorldState
更新 flags
不直接接受 LLM 原始输出
```

验收：

```text
不能在郑伯宫室直接说服秦伯
能在秦营外请求通报
能在秦伯主帐进行利害分析
状态变化可解释
```

## Task 06：ObservationFilter `已完成`

创建：

```text
src/game/observationFilter.ts
```

功能：

```text
把 GameEvent 转成每个 NPC 可见的 ObservableEvent
不可见则返回 null
```

必须处理：

```text
主帐内谈话
守卫观察
晋使间接察觉
郑伯等待消息
百姓传闻
```

验收：

```text
Jin envoy cannot know exact Qin tent dialogue.
Zheng duke cannot know Qin duke reaction without report.
Qin duke can observe full argument directed at him.
```

## Task 07：NPCMemory Reducer `已完成`

创建：

```text
src/game/npcMemory.ts
```

功能：

```text
保存每个 NPC 的私有记忆
接受 MemoryPatchProposal
校验 patch 是否源于 ObservableEvent
落盘为结构化记忆摘要
```

验收：

```text
不可见事件不能更新 NPC memory
memory patch 可回滚
```

## Task 08：Mock NPC Kernels `已完成`

创建：

```text
src/game/npcKernel.ts
src/game/kernels/qinDukeMock.ts
src/game/kernels/jinEnvoyMock.ts
src/game/kernels/zhengDukeMock.ts
src/game/kernels/guardMock.ts
```

要求：

```text
每个 kernel 只处理自己的 ObservableEvent
输出 MemoryPatchProposal / NPCIntentionProposal
不能直接改 WorldState
```

验收：

```text
秦伯听到亡郑利晋后产生疑虑
晋使只因谈话过久而警觉
郑伯无消息时不更新秦营认知
```

## Task 08.1：Generic NPC Reaction Patterns + Yi Zhi Hu Opening Regression

目标：补齐“同类输入 -> 同类反应模式”的通用层，而不是为个别句子写分支。

要求：

```text
为 mock NPC kernels 抽取可复用的 reaction patterns：
- refusal
- grievance
- conditional_acceptance
- loyalty_conflict
- ambiguous_speech
- probing
```

说明：

```text
“佚之狐开场遭遇烛之武拒绝”只能作为 regression scenario。
实现目标不是硬编码“如果是佚之狐且在开场且玩家说拒绝就走某分支”，
而是让 NPC 基于 affordance、目标、压力和可见事件，
对“拒绝 / 抱怨 / 附条件接受 / 忠诚冲突 / 含混表态 / 试探”这些一般模式产生反应。
```

验收：

```text
Yi Zhi Hu opening refusal regression passes.
同类 grievance / conditional acceptance 输入不会要求新增专门分支。
reaction pattern 可被多个 NPC 复用。
```

## Task 08.2：NPC Affordance Model

创建：

```text
src/game/npcAffordances.ts
```

目标：让 NPC 基于身份、地点、可见事件、当前压力与 authority 决定“现在有哪些合理动作可以做”。

要求：

```text
affordance 不是剧情分支表
affordance 是一般性的行动可能性集合
例如：
- guard can report / delay / block / admit_conditionally
- qin_duke can question / defer / request further benefit / withdraw_conditionally
- yi_zhihu can urge / reassure / relay / press for commitment
```

验收：

```text
不同 NPC 在相似事件下基于 affordance 产生不同 proposal。
新输入优先复用 affordance，而不是新增 one-off branch。
```

## Task 08.3：Goal / Pressure Evaluation Helpers

创建：

```text
src/game/npcEvaluation.ts
```

目标：为 mock kernel 提供“目标、风险、时间压力、联盟压力、秩序压力”的通用评估助手。

要求：

```text
评估器应为一般机制
不要把“某句台词 -> 某个结局”写成硬连接
评估器要能支持：
- 当前目标优先级
- 风险上升
- 时间压力
- 联盟压力
- 信誉 / 秩序压力
```

验收：

```text
kernel 的反应开始由 goal / pressure 评估驱动，而不是仅靠关键词特判。
```

## Task 09：NPC Proposal Validator

创建：

```text
src/game/npcProposalValidator.ts
```

职责：

```text
校验 NPCIntentionProposal / MemoryPatchProposal 是否合法
检查：
- NPC authority
- location
- visibility source
- 与已落盘事实是否冲突
- 是否超出 affordance
```

验收：

```text
NPC proposal 不可越权
不可见事件不能转成有效 NPC proposal
guard report / qin_duke question 等 proposal 需通过 validator
```

## Task 10：WorldDirector Scheduler

创建：

```text
src/game/worldDirector.ts
```

职责：

```text
选择哪些 NPC kernel 被唤醒
排序 NPCIntentionProposal
调度延迟事件
提出时间推进
不替 NPC 思考
不直接修改状态
```

验收：

```text
WorldDirector 输出 schedule/proposals，不输出直接 state mutation
Yi Zhi Hu opening refusal 等场景通过 scheduler 串起来，而不是特殊剧情分支
```

## Task 11：Full Mock Game Loop

连接：

```text
input
→ parserMock
→ safety
→ validator
→ reducer
→ observationFilter
→ npc kernels
→ npc proposal validator
→ reducer
→ worldDirector schedule
→ narrator mock
```

验收：

```text
玩家能连续输入 6 轮
任意合理世界内输入优先由通用机制推进
回归例子不依赖专门 hardcoded branch
```

## Task 12：Debug / Director Panel

显示：

```text
ActionProposal
SafetyClassification
ValidatorResult
GameEvent
ObservableEvent per NPC
NPCMemory summary
NPC affordances
NPCIntentionProposal
WorldDirector schedule
Checkpoints
Ending dimensions
```

正式模式不显示这些。

## Task 13：Checkpoint / Rollback

创建：

```text
src/game/checkpoint.ts
```

支持：

```text
关键节点自动存档
回滚关键节点
debug 查看 checkpoint
```

验收：

```text
回滚后 WorldState 和 NPCMemoryStore 都恢复
reaction chain 可在 checkpoint 前后重跑验证
```

## Task 14：Ending Composer

创建：

```text
src/game/ending.ts
```

从状态和事件日志组合：

```text
郑国命运
秦晋关系
烛之武命运
历史评价
```

验收：

```text
至少 3 种结局
结局来自状态，不是自由编写
```

## Task 15：Prompt Files for LLM NPC Kernel

创建：

```text
src/prompts/actionParser.md
src/prompts/npcKernel.md
src/prompts/worldDirector.md
src/prompts/narrator.md
```

目标：

```text
LLM 不只是 narrator 或 style layer。
LLM 在这里首先是“单个 NPC Kernel 内部的主观推理引擎”。
它需要在该 NPC 的私有记忆、可见事件、目标、压力和 affordance 约束下思考，
并且只能输出结构化 proposals，不得直接改 state。
```

验收：

```text
prompt 明确禁止直接改 state
npcKernel prompt 明确“单次只模拟一个 NPC”
npcKernel prompt 明确输出 structured proposals only
```

## Task 16：LLM Feature Flag

在 mock 跑通后再做。

要求：

```text
LLM parser / kernel 输出必须 schema 校验
失败时 fallback 为安全拒绝
LLM kernel 只接入单 NPC 私有上下文
debug 只显示结构化摘要，不显示隐藏推理
mock 仍可用
```

验收：

```text
prompt injection 测试仍通过
信息隔离测试仍通过
回归例子继续通过，且不是靠 hardcoded branch
```

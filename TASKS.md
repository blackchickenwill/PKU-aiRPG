# TASKS.md

# 《烛之武退秦师》MVP v0.1：NPC Kernel 重制版任务清单

每个任务都应该作为一个小 PR / 小 commit 完成。不要跳过 mock 阶段直接接 LLM。

## Task 01：初始化项目骨架

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

## Task 02：核心类型与 Zod Schema

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

## Task 03：初始世界数据

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

## Task 04：Mock Action Parser + Safety

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

## Task 05：Validator + Reducer

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

## Task 06：ObservationFilter

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

## Task 07：NPCMemory Reducer

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

## Task 08：Mock NPC Kernels

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

## Task 09：WorldDirector 调度器

创建：

```text
src/game/worldDirector.ts
```

职责：

```text
选择哪些 NPC kernel 被唤醒
排序 NPCIntentionProposal
提出时间推进
调度延迟事件
不替 NPC 思考
不直接修改状态
```

验收：

```text
WorldDirector 输出 schedule/proposals，不输出直接 state mutation
```

## Task 10：游戏循环整合

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
→ narrator mock
```

验收：

```text
玩家能连续输入 6 轮
事件日志和 NPC 记忆都能在 debug panel 看到
```

## Task 11：Debug / Director Panel

显示：

```text
ActionProposal
SafetyClassification
ValidatorResult
GameEvent
ObservableEvent per NPC
NPCMemory summary
NPCIntentionProposal
WorldDirector schedule
Checkpoints
Ending dimensions
```

正式模式不显示这些。

## Task 12：Checkpoint

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
```

## Task 13：Ending Composer

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

## Task 14：Prompt 文件，不接入

创建：

```text
src/prompts/actionParser.md
src/prompts/npcKernel.md
src/prompts/worldDirector.md
src/prompts/narrator.md
```

验收：

```text
prompt 明确禁止直接改 state
npcKernel prompt 明确“单次只模拟一个 NPC”
```

## Task 15：LLM Feature Flag

在 mock 跑通后再做。

要求：

```text
LLM parser / kernel 输出必须 schema 校验
失败时 fallback 为安全拒绝
debug 只显示结构化摘要，不显示隐藏推理
mock 仍可用
```

验收：

```text
prompt injection 测试仍通过
信息隔离测试仍通过
```

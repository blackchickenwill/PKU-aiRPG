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

## 7. 落盘报告

后续每次提交前，均在此追加一条简短落盘记录，说明本次实际写入仓库主线的改动范围、验证结果与边界。

### 2026-04-24 Task 05.1 validator/reducer cleanup

本次改动：

- 调整 `validator` 对 `refuse_mission`、`delay_commitment`、`conditional_acceptance` 的处理。
- 只有“目标 NPC 在场”或“开场 `zhu_home` 且 `yi_zhihu` 在场”时，这三类表态才作为有效直接对话接受。
- 若当前没有明确听者，则转为 `converted` 的无副作用表态事件，不再凭空生成强烈拒绝事件。
- `ambiguous_in_world_action` 不再按危险输入拒绝，而是转换为 harmless dialogue/no-effect 事件，并给出正式提示语。
- 真正不安全输入仍然保持 `rejected`，`reducer` 对此仍不改动世界状态。

本次新增验证：

- “嗯……” 会被 `validator` 转为 `converted`，而非危险拒绝。
- “我老矣，无能为也已。” 在 `zhu_home` 且有 `yi_zhihu` 时，会作为开场拒绝对话被接受。
- 同一句话在 `market` 且没有目标时，不会生成对 `yi_zhihu` 的强拒绝事件。
- 原有 validator / reducer 测试继续通过。

验证结果：

- `npm run test` 通过，47 个测试全部通过。
- `npm run build` 通过。

未包含内容：

- 未实现 ObservationFilter。
- 未实现 NPC kernels。
- 未接入任何 LLM / API key / 模型提供方。
- 未改动 UI movement。

### 2026-04-24 Task 06 ObservationFilter

本次改动：

- 新增 `src/game/observationFilter.ts`。
- 实现 `filterEventForNpc(event, npcId, runtime)` 与 `filterEventForAllNpcs(event, runtime)`。
- 将已落盘 `GameEvent` 转换为按 NPC 视角隔离的 `ObservableEvent`。
- 针对以下场景加入显式可见性规则：
  - `zhu_home` 中指向 `yi_zhihu` 的开场对话
  - `zheng_palace` 中指向 `zheng_duke` 的宫室对话
  - `qin_main_tent` 中指向 `qin_duke` 的主帐外交对话
  - `qin_camp_exterior` 中通过守卫请求通报的会面请求
  - `movement` 的到达侧与离开侧部分可见观察
- 主帐内外交对话已实现“秦伯全知、守卫部分可见、晋使仅知外部迹象、郑伯/佚之狐/百姓不可见”的 MVP 过滤逻辑。

本次新增验证：

- 佚之狐可完整观察 `zhu_home` 开场拒绝表态。
- 郑伯与秦伯不能观察 `zhu_home` 的开场拒绝。
- 秦伯可完整观察 `qin_main_tent` 里的直接外交对话。
- 晋使无法获知主帐内具体措辞，只能得到间接迹象。
- 守卫对主帐对话仅有 partial visibility。
- 不相关 NPC 会得到 `null`。
- `filterEventForAllNpcs` 仅返回非空观察结果。
- 营外请求通报时，守卫 full、秦伯 partial、郑侧 NPC null。
- movement 至少能让目的地在场 NPC 观察到玩家到达。

验证结果：

- `npm run test` 通过，57 个测试全部通过。
- `npm run build` 通过。

未包含内容：

- 未实现 NPC kernels。
- 未更新 NPCMemory。
- 未实现 WorldDirector。
- 未接入任何 LLM / API key / 模型提供方。
- 未改动初始世界数据。
- 未改动 UI。

### 2026-04-24 Task 06.1 qin camp audience-request visibility tightening

本次改动：

- 收紧 `qin_camp_exterior` 中 `requestAudience` 事件的可见性。
- 玩家在营外向守卫请求通报时，只有 `guard` 能收到 full visibility。
- `qin_duke` 对这条初始请求事件改为 `null`。
- `jin_envoy` 对这条初始请求事件改为 `null`。
- 郑侧 NPC 对这条初始请求事件保持 `null`。

本次新增验证：

- 守卫能完整观察营外请求通报。
- `qin_duke` 对初始 `requestAudience` 事件为 `null`。
- `jin_envoy` 对初始 `requestAudience` 事件为 `null`。
- 原有开场与主帐可见性测试继续通过。

验证结果：

- `npm run test` 通过。
- `npm run build` 通过。

未包含内容：

- 未实现 guard report event。
- 秦伯何时得知请求，仍留待后续 NPC kernel / validator / reducer / WorldDirector 任务处理。
- 未实现 NPC kernels。
- 未更新 NPCMemory。

### 2026-04-24 Task 07 NPCMemory Reducer

本次改动：

- 新增 `src/game/npcMemory.ts`。
- 实现 `applyMemoryPatchProposal(store, patch, observableEvent)`。
- 该 reducer 会先校验：
  - `observableEvent` 不得为 `null`
  - `patch.npcId` 必须等于 `observerNpcId`
  - `patch.sourceObservableEventId` 必须等于 `observableEvent.id`
  - 不允许把不可见事件写入 NPC memory
- 通过校验后，结构化更新 `episodicMemory`、`beliefs`、`doubts`、`attitudes`、`lastPlayerInteraction`、`privateFlags`。
- 保持纯函数语义：不会原地修改输入 store。
- 新增 `restoreNpcMemoryStore(snapshot)`，用于后续 checkpoint / rollback 流程恢复记忆快照。

本次新增验证：

- 只有来自该 NPC 自己可见事件的 patch 才能写入 memory。
- 不可见事件不能更新 NPC memory。
- patch 与观察者归属不一致时会被拒绝。
- `sourceObservableEventId` 不匹配时会被拒绝。
- memory store 快照可恢复，用于回滚验证。

验证结果：

- `npm run test` 通过，62 个测试全部通过。
- `npm run build` 通过。

未包含内容：

- 未实现 NPC kernels。
- 未实现 NPC proposal validator。
- 未把 memory reducer 接进完整游戏循环。
- 未实现 WorldDirector。
- 未接入任何 LLM / API key / 模型提供方。

### 2026-04-24 Task 08 Mock NPC Kernels

本次改动：

- 新增 `src/game/npcKernel.ts` 作为 mock kernel dispatcher。
- 新增：
  - `src/game/kernels/qinDukeMock.ts`
  - `src/game/kernels/jinEnvoyMock.ts`
  - `src/game/kernels/zhengDukeMock.ts`
  - `src/game/kernels/guardMock.ts`
- 每个 kernel 只消费自己的 `ObservableEvent`，只输出 `MemoryPatchProposal` / `NPCIntentionProposal` / 文本反应，不直接修改 `WorldState`。
- dispatcher 会先校验：
  - `npcState.id` 必须等于 `observableEvent.observerNpcId`
  - `npcMemory.npcId` 必须等于 `npcState.id`
  - 若输入归属不一致，则返回 no-op output，而不生成错误归属的 proposal
- `qin_duke` mock：
  - 在主帐中完整听到“亡郑利晋 / 秦远晋近 / 东道主”类论证后，生成疑虑上升的 memory patch
  - 生成面向玩家的 `question` intention
- `jin_envoy` mock：
  - 只因“久留主帐 / 谈话持续”等外部迹象起疑
  - 不知道主帐具体话语
  - 生成面向 `qin_duke` 的 `request_meeting` intention
- `zheng_duke` mock：
  - 只有在直接听到宫室进言时才更新
  - 对未收到汇报的秦营主帐事件保持 no-op
- `guard` mock：
  - 对营外请求通报事件生成 memory patch
  - 同时生成面向 `qin_duke` 的 `report` intention
  - 这样后续 guard report event 可以由 validator / reducer / WorldDirector 再接入

本次新增验证：

- 秦伯听到完整利害论后会动摇并追问。
- 晋使只因外部可见迹象而起疑，不获取隐藏内容。
- 郑伯在未收到汇报时，不会因秦营主帐事件更新。
- 守卫会把营外请求通报转成 `report` proposal。
- dispatcher 遇到观察者归属不匹配时会返回 no-op。

验证结果：

- `npm run test` 通过，67 个测试全部通过。
- `npm run build` 通过。

未包含内容：

- 未实现 NPC kernels 的统一调度。
- 未实现 NPC proposal validator。
- 未把 kernel 输出正式接入 reducer / game loop。
- 未实现 WorldDirector。
- 未接入任何 LLM / API key / 模型提供方。

### 2026-04-24 Roadmap Correction Only

本次改动：

- 仅修正文档路线，不改代码。
- 重写 `TASKS.md` 中 Task 08 之后的路线，明确后续任务应围绕通用机制推进：
  - semantic action classification
  - world validation
  - event logging
  - observation filtering
  - NPC memory update
  - NPC affordance selection
  - NPC intention proposal
  - NPC proposal validation
  - WorldDirector scheduling
  - reducer commit
- 将 `Task 01` 到 `Task 08` 标记为已完成。
- 在 `TASKS.md` 中新增：
  - Task 08.1 Generic NPC Reaction Patterns + Yi Zhi Hu Opening Regression
  - Task 08.2 NPC Affordance Model
  - Task 08.3 Goal / Pressure Evaluation Helpers
  - Task 09 NPC Proposal Validator
  - Task 10 WorldDirector Scheduler
  - Task 11 Full Mock Game Loop
  - Task 12 Debug / Director Panel
  - Task 13 Checkpoint / Rollback
  - Task 14 Ending Composer
  - Task 15 Prompt Files for LLM NPC Kernel
  - Task 16 LLM Feature Flag
- 重写 `Task 08.1`，明确“佚之狐开场拒绝”是 regression scenario，不是 hardcoded branch。
- 重写 `Task 15`，明确 LLM 的角色是单个 NPC Kernel 内部的主观推理引擎，而不只是 narrator / style layer。
- 在 `NPC_KERNEL_ARCHITECTURE.md` 中新增“例子是回归测试，不是分支”章节，强调通过 affordance 与 goal-driven reasoning 泛化。

验证结果：

- 本次为文档修正，不运行 build。
- 本次为文档修正，不运行 tests。

未包含内容：

- 未改动任何 TypeScript / JSON / UI / runtime 代码。
- 未新增 kernel 实现。
- 未接入任何 LLM / API key / 模型提供方。

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

### 2026-04-24 Task 08.1 Generic NPC Reaction Patterns + Yi Zhi Hu Opening Regression

本次改动：

- 新增 `src/game/reactionPatterns.ts`。
- 实现两个通用 helper：
  - `detectReactionPatternFromObservation(input)`
  - `suggestNpcAffordanceFromPattern(input)`
- 当前支持的通用 reaction patterns：
  - `refusal`
  - `grievance`
  - `conditional_acceptance`
  - `loyalty_conflict`
  - `ambiguous_speech`
  - `probing`
  - `none`
- affordance suggestions 当前返回一般性建议：
  - `acknowledge_grievance`
  - `persuade_again`
  - `report`
  - `request_meeting`
  - `question`
  - `observe_silently`
  - `do_nothing`
- 新增 `src/game/kernels/yiZhihuMock.ts`。
- `yi_zhihu` kernel 现在基于通用 reaction pattern 与 affordance 建议产出 proposal，不再是 no-op。
- `src/game/npcKernel.ts` 已更新为分发 `yi_zhihu` 到 `runYiZhihuKernelMock`。

设计说明：

```text
“佚之狐开场遭遇烛之武拒绝”在这里是 regression coverage，
不是 one-off branch 逻辑。
kernel 响应依赖的是通用模式识别与 affordance 建议，
而不是针对某一句固定台词写专门分支。
```

本次新增验证：

- 通用 reaction pattern 能识别：
  - refusal
  - grievance
  - conditional_acceptance
  - loyalty_conflict
- Yi Zhi Hu kernel 会使用这些通用 pattern 生成 proposal。
- Yi Zhi Hu 输出仍通过 `npcKernelOutputSchema`。
- `memoryPatch.npcId` 与 `intention.npcId` 均保持为 `yi_zhihu`。
- Yi Zhi Hu 不会直接更新郑伯 memory。
- 既有秦伯 / 晋使 / 守卫 / 郑伯 kernel 测试继续通过。

验证结果：

- `npm run test` 通过，76 个测试全部通过。
- `npm run build` 通过。

未包含内容：

- 未接入任何 LLM / API key / 模型提供方。
- kernels 仍然只输出 proposals，不直接修改 `WorldState`。
- 未实现 WorldDirector。
- 未实现 NPC Proposal Validator。

### 2026-04-24 Task 08.2 NPC Affordance Model

本次改动：

- 新增 `src/game/npcAffordances.ts`。
- 实现：
  - `NPCAffordance`
  - `AffordanceContext`
  - `getAvailableAffordances(context)`
- affordance 模型当前综合考虑：
  - NPC identity
  - NPC role / authority
  - current location
  - observable event
  - reaction pattern
  - private memory
  - current pressure hints
- 当前支持的通用 affordance 包括：
  - `acknowledge_grievance`
  - `persuade_again`
  - `report`
  - `request_meeting`
  - `question`
  - `warn`
  - `delay`
  - `block`
  - `admit_conditionally`
  - `negotiate`
  - `defer_decision`
  - `withdraw_conditionally`
  - `detain`
  - `pressure_qin`
  - `apologize_or_acknowledge_late_use`
  - `authorize_mission`
  - `urge`
  - `wait_for_report`
  - `observe_silently`
  - `do_nothing`
- `reactionPatterns.ts` 中的 affordance 建议已改为兼容包装，统一走 `getAvailableAffordances(context)`。
- `yiZhihuMock` 已更新为使用新的 affordance helper。

设计说明：

```text
affordance 是“当前这个 NPC 合理可能提出什么动作”的一般可能性集合，
不是剧情分支表。
它不直接决定剧情结果，也不把例子写成硬编码 outcomes。
```

本次新增验证：

- Yi Zhi Hu grievance context 包含：
  - `acknowledge_grievance`
  - `report`
  - `request_meeting`
- Guard audience request context 包含：
  - `report`
  - `block`
  - `delay`
  - 不包含 `withdraw_conditionally`
- Qin Duke interest-analysis context 包含：
  - `question`
  - `negotiate`
  - `defer_decision`
  - 不包含直接提交式撤军动作
- Jin Envoy partial suspicion context 包含：
  - `warn`
  - `request_meeting`
  - `pressure_qin`
  - 不包含依赖隐藏主帐内容的行动
- Zheng Duke 在无 report 情况下不能对秦营主帐事件作出实质反应
- 既有 tests 继续通过

验证结果：

- `npm run test` 通过，81 个测试全部通过。
- `npm run build` 通过。

未包含内容：

- affordances 仍然只是 general action possibilities，不是 story branches。
- 未实现 WorldDirector。
- 未实现 NPC Proposal Validator。
- 未接入任何 LLM / API key / 模型提供方。

### 2026-04-24 Task 08.3 Goal / Pressure Evaluation Helpers

本次改动：

- 新增 `src/game/npcEvaluation.ts`。
- 实现：
  - `PressureLevel`
  - `InformationConfidence`
  - `EvaluationContext`
  - `NPCPressureEvaluation`
  - `evaluateGoalPriority(context)`
  - `evaluateTimePressure(context)`
  - `evaluateAuthorityConstraint(context)`
  - `evaluateRelationshipRisk(context)`
  - `evaluateInformationConfidence(context)`
  - `evaluateEscalationNeed(context)`
  - `rankAffordancesByEvaluation(context, affordances)`
- 该评估层用于帮助 mock NPC kernels 判断：
  - 当前目标优先级是否受时间压力推动
  - authority constraint 是否限制当下可优先动作
  - relationship risk 是否要求先安抚 / 升级处理
  - information confidence 是否足够支持直接反应
  - escalation need 是否要求更快上升到 report / request_meeting
- 对现有 kernels 做了最小接入：
  - `yiZhihuMock`
  - `guardMock`
  - `qinDukeMock`
  - `jinEnvoyMock`
  - `zhengDukeMock`
- 这些 kernels 现在会先取 available affordances，再经过 evaluation 排序，选择首选 proposal。

设计说明：

```text
这层是通用的 pressure / goal evaluator，
不是 story branch table。
它不把“某句台词 -> 某个结果”写死，
而是通过一般性的时间压力、权限、关系风险、信息置信度、升级需要，
来帮助 affordance 排序。
```

本次新增验证：

- Yi Zhi Hu grievance context 会产生 high escalation need。
- Yi Zhi Hu mild refusal 在无 grievance 时，`persuade_again` / `question` 排名高于 `report`。
- Guard audience request 会表现出 authority constraint，并优先 `report` / `delay` / `block`。
- Qin Duke interest-analysis context 中，`question` / `defer_decision` / `negotiate` 排名先于 `withdraw_conditionally`，除非已有 `qinDukeWavering` flag。
- Jin Envoy partial cue 会表现出 alliance pressure，并优先 `request_meeting` / `warn`。
- Zheng Duke 在没有 report 时，information confidence 为 low，且 `wait_for_report` 排名最高。
- 既有 tests 继续通过。

验证结果：

- `npm run test` 通过，87 个测试全部通过。
- `npm run build` 通过。

未包含内容：

- 未实现 WorldDirector。
- 未实现 NPC Proposal Validator。
- 未接入任何 LLM / API key / 模型提供方。
- 评估层仍然只服务于 proposals 选择，不直接修改 `WorldState` 或 `NPCMemory`。

### 2026-04-24 Task 08.3.1 npcEvaluation mojibake cleanup

本次改动：

- 仅清理 `src/game/npcEvaluation.ts` 中 `evaluateGoalPriority()` 的乱码中文关键词。
- 将相关关键词替换为可读中文：`国危`、`围郑`、`利晋`、`秦远晋近`、`停留时间偏长`、`请求通报`、`请为我通报`。
- 补充 `src/game/npcEvaluation.test.ts`，直接验证可读中文关键词仍能驱动目标优先级判断。

设计说明：

- 本次只是 mojibake cleanup。
- 不改变架构，不改变任务路线。
- 不扩展行为机制，只修正关键词可读性与对应回归测试。

未包含内容：

- 未接入任何 LLM / API key / 模型提供方。
- 未实现 WorldDirector。
- 未实现 NPC Proposal Validator。
- 未修改 UI。

### 2026-04-24 Task 09 NPC Proposal Validator

本次改动：

- 新增 `src/game/npcProposalValidator.ts`。
- 新增 `src/game/npcProposalValidator.test.ts`。
- 实现 `validateNpcIntentionProposal(context, proposal)`，用于校验 NPC intention proposal 的来源、归属、authority、target、affordance 与信息可见性。
- 实现 `validateNpcMemoryPatchProposal(context, patch)`，复用 `applyMemoryPatchProposal` 的来源与归属校验规则，只做验证，不在该层提交 memory 更新。
- 合法 NPC intention 会被转换为 `GameEvent` proposal，并带有 `proposedOnly` 标记。

设计说明：

- 该模块只验证 NPC proposals 是否可进入后续落盘流程。
- 它不替 NPC 思考，不决定剧情结果，不做 WorldDirector 调度。
- 它不直接提交 `WorldState` 或 `NPCMemory`。

本次新增验证：

- Guard report to Qin Duke is valid after guard observes audience request.
- Guard cannot withdraw Qin army.
- Yi Zhi Hu can report/request_meeting Zheng Duke after observing grievance.
- Yi Zhi Hu cannot directly update Zheng Duke memory.
- Qin Duke can question player after full Qin tent argument.
- Qin Duke cannot directly mutate `qinTentDiplomacyOccurred` or make withdrawal a committed fact through intention alone.
- Jin Envoy can request meeting/warn after partial suspicion.
- Jin Envoy cannot include hidden Qin tent content.
- Zheng Duke without report cannot react to Qin tent details.

验证结果：

- `npm run test` 通过，99 个测试全部通过。
- `npm run build` 通过。

未包含内容：

- 未实现 WorldDirector scheduling。
- 未接入任何 LLM / API key / 模型提供方。
- 未修改 UI。
- 未让 validator 直接提交 `WorldState` 或 `NPCMemory`。

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

### 2026-04-24 Task 08.3/09 main fix confirmation

本次改动：

- 确认并保留 `src/game/npcEvaluation.ts` 中 `evaluateGoalPriority()` 的可读中文关键词修复。
- 乱码关键词已替换为：`国危`、`围郑`、`利晋`、`秦远晋近`、`停留时间偏长`、`请求通报`、`请为我通报`。
- 确认 Task 09 已在本地 `main` 实现：`src/game/npcProposalValidator.ts` 与 `src/game/npcProposalValidator.test.ts` 已存在并通过测试。
- 本次追加记录用于说明 8.3 mojibake cleanup 与 Task 09 validator 将一起推送到远端 `main`。

NPC Proposal Validator 说明：

- validator 只校验 `NPCIntentionProposal` / `MemoryPatchProposal` 是否可进入后续流程。
- 它检查 NPC 归属、可见事件来源、affordance、authority、target 与隐藏信息泄漏风险。
- 合法 NPC intention 只会转换为带 `proposedOnly` 标记的 `GameEvent` proposal，不直接让其他 NPC 获知事实。
- Memory patch 校验与 `applyMemoryPatchProposal` 规则保持一致，不允许一个 NPC 更新另一个 NPC 的 memory。

边界说明：

- 未接入任何 LLM / API key / 模型提供方。
- 未实现 WorldDirector scheduling。
- 未实现 UI。
- 未实现 Task 10。
- 未改变现有架构；本次是 8.3 修复确认与 Task 09 推送前确认。

### 2026-04-24 Task 10 WorldDirector Scheduler

本次改动：

- 新增 `src/game/worldDirector.ts`。
- 新增 `src/game/worldDirector.test.ts`。
- 实现 `runWorldDirector(input)`，用于从 `ObservableEvent` 列出需要唤醒的 NPC kernels，并对已验证的 NPC proposal events 做确定性排序。
- 实现 scheduled follow-up event proposals，用于承接已验证的 report / request_meeting / warn 等事件提案。
- 实现时间推进提案：重要 report chain、report travel、delay 与秦帐关键外交链只提出 `nextTimeStageProposal`，不直接修改 `timeStage`。

设计说明：

- WorldDirector Scheduler 只做调度、排序与后续事件 proposal。
- 它不替代 NPC kernels，不替 NPC 思考，不创造新的 NPC 主观意图。
- 它不直接提交 `WorldState` 或 `NPCMemory`。
- 它不会直接决定事实，例如“秦伯已撤军”。
- 所有 scheduled events 都保留 proposal 语义，并带有 `proposedOnly` / `scheduledByWorldDirector` 标记，仍需后续 reducer / validator 流程处理。

本次新增验证：

- WorldDirector schedules yi_zhihu report/request_meeting to zheng_duke without updating Zheng Duke memory.
- WorldDirector schedules guard report to qin_duke without directly giving Qin Duke knowledge.
- Qin Duke question to player is ordered before Jin Envoy warning if both exist.
- Jin Envoy warning/request_meeting is delayed behind immediate Qin Duke response.
- DirectorOutput contains proposals only and does not mutate runtime.
- shouldAdvanceTime is true for report travel / important report chains.
- WorldDirector does not create new NPC thoughts.

未包含内容：

- 未接入任何 LLM / API key / 模型提供方。
- 未实现 UI。
- 未实现 Task 11 full mock game loop。
- 未让 WorldDirector 直接修改 `WorldState` 或 `NPCMemory`。
### 2026-04-24 Task 11 Full Mock Game Loop

本次改动：
- 新增 `src/game/gameLoop.ts`。
- 新增 `src/game/gameLoop.test.ts`。
- 实现 `runPlayerTurn(runtime, rawInput)`，把单轮玩家输入串过 mock 管线：
  - `parserMock`
  - safety / `validateActionProposal`
  - `reduceValidatedResult`
  - `observationFilter`
  - `runNpcKernelMock`
  - `validateNpcMemoryPatchProposal`
  - `validateNpcIntentionProposal`
  - `applyMemoryPatchProposal`
  - `runWorldDirector`
  - mock narrative / debug 汇总
- `GameTurnResult` 会返回下一步 runtime、玩家 action、action proposal、validator 结果、已落盘玩家事件、ObservableEvents、NPC kernel 输出、memory patch 结果、NPC proposal 校验结果、Director 输出、mock narrative lines 与 debug summary。
- 在秦伯主帐内为未显式点名但属于直接外交发言的玩家输入补足当前场景默认听者 `qin_duke`，使“秦远晋近”类论证可以通过既有 parser/validator/observation 机制进入秦伯视角，而不是新增剧情分支。

设计说明：
- 这是完整 mock loop 的 orchestration 层，不替代已有 parser、validator、reducer、NPC kernels、proposal validator 或 WorldDirector。
- `WorldState` 只通过 `reduceValidatedResult` 等 reducer 路径变化。
- `NPCMemory` 只通过 `applyMemoryPatchProposal` 变化，且先经过可见 `ObservableEvent` 与 proposal validator 校验。
- WorldDirector 仍然只是 scheduler，只输出 proposal / schedule，不直接落盘 scheduled events。
- 示例输入只作为回归测试，不是 hardcoded story branch。

本次新增验证：
- Opening refusal：玩家事件在 `zhu_home` 落盘，佚之狐可见并更新自身 memory，郑伯 memory 不被直接更新。
- Grievance：佚之狐识别怨气，memory patch 落到佚之狐，面向郑伯的 intention 被校验，WorldDirector 只调度 follow-up proposal。
- Qin tent argument：秦伯获得 full observation 并更新 memory；晋使只获得 partial cue，不泄漏主帐具体内容。
- Unsafe input：拒绝且不改变 `WorldState` / `NPCMemory`，不唤醒 NPC kernel。
- Ambiguous input：转换为 no-effect event，不产生重大状态变化。
- 额外验证：
  - `runPlayerTurn` 不直接 mutate 输入 runtime。
  - eventLog 只在 accepted / converted 玩家事件经 reducer 后增长。
  - NPCMemory 只经 validated visible ObservableEvent 更新。
  - Director scheduled events 全部保持 proposal-only。

验证结果：
- `npm run test` 通过：114 个测试全部通过。
- `npm run build` 通过。
- build 过程中 Next.js 仍提示 workspace root lockfile warning；该 warning 与本次 Task 11 改动无关。

未包含内容：
- 未接入任何 LLM / API key / 模型提供方。
- 未实现 UI。
- 未实现 checkpoint。
- 未实现 ending composer。
- 未让 WorldDirector 替代 NPC kernels。
- 未让 WorldDirector 直接修改 `WorldState` 或 `NPCMemory`。
### 2026-04-24 Task 11.5 Minimal Playable UI Binding

本次改动：
- 更新 `src/app/page.tsx`，将 Next.js 首页从 Task 01 占位 UI 改为最小可玩界面。
- 更新 `src/app/globals.css`，提供简洁的地图、场景、输入栏和紧凑 debug 布局。
- UI 当前直接使用：
  - `initialGameRuntimeState`
  - `runPlayerTurn(runtime, rawInput)`
- React state 暂存当前 `runtime`、历史 turn result 和输入框内容。

界面行为：
- 左侧显示地点节点图。
- 当前地点高亮。
- 与当前地点相连的地点可点击。
- 点击相连地点会生成类似“我前往郑伯宫室。”的移动输入，并走同一个 `runPlayerTurn` 管线。
- 右侧显示：
  - 当前地点名称与描述
  - 在场 NPC
  - 最新 narrative / formal messages
  - 最近 event log summary
- 底部输入框支持提交按钮与 Enter 提交。
- 紧凑 debug mini-view 显示：
  - validator status
  - committedEvents count
  - observableEvents count
  - npcOutputs count
  - memoryPatches count
  - directorScheduled count

设计说明：
- UI 不直接修改 `WorldState`。
- 移动不直接改 `currentLocation`，而是转成玩家输入后通过 `runPlayerTurn`、validator 和 reducer 生效。
- unsafe input 会显示由 game loop 返回的拒绝/无效反馈，且 runtime 不会被 mutation。
- 该 UI 只展示紧凑 debug 摘要，不展示完整 NPC 私有记忆，不展示隐藏推理链。

验证结果：
- `npm run test` 通过：114 个测试全部通过。
- `npm run build` 通过。
- build 过程中 Next.js 仍提示 workspace root lockfile warning；该 warning 与本次 Task 11.5 改动无关。

未包含内容：
- 未接入任何 LLM / API key / OpenRouter / OpenAI。
- 未新增数据库或持久化。
- 未实现完整 Debug / Director Panel。
- 未实现 checkpoint。
- 未实现 ending composer。
- 未新增故事分支或 UI hardcoded branch。
### 2026-04-24 Task 11.6 MUD-style Scene Interaction UI

本次改动：
- 更新 `src/app/page.tsx`，将最小可玩 UI 调整为更接近放置江湖 / MUD 的场景交互界面。
- 更新 `src/app/globals.css`，重做地点图谱、场景面板、人物互动、消息流、事件摘要和折叠 debug 的层级与间距。

界面行为：
- 左侧地点列表改为 node-link 风格地点图谱。
- 当前地点位于图谱中心并高亮。
- 相连地点通过线条连接，可点击前往。
- 未连接已知地点以弱化节点显示。
- 点击相连地点仍会生成自然语言移动输入，例如“我前往郑伯宫室。”，并通过 `runPlayerTurn` 推进。
- 当前场景面板显示：
  - 当前地点名称
  - 地点描述
  - 当前 `timeStage`
  - 在场 NPC
  - 相连出口
- 在场 NPC 以可点击人物卡显示。
- 点击人物会打开轻量人物详情面板，展示公开身份、公开目标与可用动作按钮：
  - 交谈
  - 试探
  - 请求会面
  - 交付信息
- 人物动作按钮会生成自然语言输入，例如“我与佚之狐交谈。”、“我试探守卫的态度。”，再交给 `runPlayerTurn`。
- 底部叙事反馈改为滚动消息流，包含玩家输入与系统 / 场景 / NPC 反馈。
- event log 保留为次要折叠摘要。
- compact debug mini-view 保留为折叠面板，不展示完整 NPC 私有记忆，也不展示隐藏推理链。

设计说明：
- 这是 UI/UX binding 改进，不新增游戏系统。
- 移动和 NPC action buttons 仍然全部通过 `runPlayerTurn`，不直接修改 `WorldState`。
- UI 只显示当前 `timeStage` 和 WorldDirector 的时间推进 proposal；即使出现“可能进入下一时段”的提示，也不由 UI 直接 mutation `timeStage`。
- 未新增故事分支或硬编码剧情结果。

验证结果：
- `npm run test` 通过：114 个测试全部通过。
- `npm run build` 通过。
- build 过程中 Next.js 仍提示 workspace root lockfile warning；该 warning 与本次 Task 11.6 改动无关。

未包含内容：
- 未接入任何 LLM / API key / OpenRouter / OpenAI。
- 未新增数据库或持久化。
- 未实现 checkpoint。
- 未实现 ending composer。
- 未绕过 `runPlayerTurn`。
- 未直接修改 `WorldState`。

### 2026-04-24 Task 11.6 Scene Interaction Polish

本次改动：
- 继续收敛 `src/app/page.tsx` 的浏览器界面，使其更接近 MUD / 放置江湖式的“场景 -> 出口 -> 人物 -> 行动日志 -> 输入”交互语法。
- 将地点图谱整理为稳定的本地场景图：当前地点保持居中并标注“当前”，相连地点作为“出口”环绕显示，远处已知地点弱化为背景上下文。
- 人物交互面板继续只展示公开姓名、身份、公开目标和可见动作；人物动作会生成自然语言输入，例如“我请求与郑伯详谈。”，再交给 `runPlayerTurn`。
- 消息流继续区分玩家输入、场景/系统反馈，并在 Debug 面板展开时额外显示一条 debug-only 摘要行。
- 时间显示只展示当前 `timeStage` 与 WorldDirector 的时间推进 proposal；提示文案为“局势正在推进，可能进入：{nextTimeStageProposal}”。

设计说明：
- 移动和 NPC action buttons 仍然全部通过 `runPlayerTurn`，不直接修改 `currentLocation` 或其他 `WorldState`。
- UI 只展示时间推进 proposal，不由 UI 直接 mutation `timeStage`。
- Debug 面板保持折叠和紧凑，不展示完整 NPC 私有记忆，也不展示隐藏推理链。

未包含内容：
- 未接入任何 LLM / API key / OpenRouter / OpenAI。
- 未新增数据库或持久化。
- 未实现 3D。
- 未实现 checkpoint。
- 未实现 ending composer。

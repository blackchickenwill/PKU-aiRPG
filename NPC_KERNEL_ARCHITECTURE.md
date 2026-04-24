# NPC_KERNEL_ARCHITECTURE.md

# 多 NPC 独立心智内核架构

## 1. 总览

本项目的核心架构不是“一个全知 LLM 讲故事”，而是：

```text
客观世界状态机
+ 事件日志
+ 事件可见性过滤器
+ 多个 NPC 私有心智内核
+ 世界调度器
+ 硬约束校验器
+ 叙事表现器
```

## 2. 一轮输入的完整流程

```text
1. PlayerInput
2. ActionParser
3. SafetyClassifier
4. Validator
5. GameEvent
6. Reducer commits objective event
7. ObservationFilter creates NPC-specific ObservableEvents
8. Relevant NPC Kernels wake up
9. Each NPC Kernel produces:
   - MemoryPatchProposal
   - BeliefUpdateProposal
   - NPCIntentionProposal
   - DialogueProposal if directly interacting
10. Validator checks NPC proposals
11. Reducer commits accepted NPC events / memory patches
12. WorldDirector schedules delayed events or time advancement
13. Narrator generates formal-mode output
```

## 3. WorldState：客观世界账本

WorldState 保存客观事实：

```text
timeStage
currentLocation
locations
NPC positions
known objective events
public flags
eventLog
checkpoints
ending dimensions
```

WorldState 不应保存一个 NPC 不应知道的“全知心理解释”。

## 4. NPCMemory：主观心智账本

每个关键 NPC 有自己的 NPCMemory：

```text
npcId
profileId
episodicMemory
beliefs
doubts
attitudes
promisesMade
promisesReceived
lastPlayerInteraction
privateFlags
```

NPCMemory 是 NPC 的主观世界，不等于客观事实。

例如，秦伯可以“相信晋国可能坐大”，但这不等于客观事实已经证明晋国一定会独占郑地。

## 5. ObservationFilter：事件可见性过滤器

`ObservationFilter` 决定每个 NPC 能知道什么。

输入：

```text
GameEvent
WorldState
NPCState
NPCMemory
```

输出：

```text
ObservableEvent | null
```

示例：

```text
GameEvent:
烛之武在秦伯主帐中提出亡郑利晋之论。

秦伯 ObservableEvent:
听到完整内容。

守卫 ObservableEvent:
郑使与秦伯谈话时间较长。

晋使 ObservableEvent:
郑使进入秦伯主帐且未很快离开。

郑伯 ObservableEvent:
null。
```

## 6. NPC Kernel

NPC Kernel 是单个 NPC 的“脑子”。

它的输入只能是：

```text
NPC profile
NPC private memory
ObservableEvent
limited public world summary
local scene context
```

它的输出只能是提案：

```text
MemoryPatchProposal
BeliefUpdateProposal
AttitudeShiftProposal
NPCIntentionProposal
DialogueProposal
VisibleReaction
```

NPC Kernel 不得：

```text
读取全局隐藏事实
替其他 NPC 思考
直接修改 WorldState
直接生成结局
绕过 Validator
```

## 7. WorldDirector

WorldDirector 是调度器。

它可以：

```text
决定哪些 NPC 需要被事件唤醒
调度延迟事件
推进时间阶段
解决多个 NPC 行动提案的优先级
判断是否进入结局裁决
```

它不可以：

```text
成为所有 NPC 的共同大脑
直接决定秦伯内心
直接决定晋使是否怀疑
直接让秦军撤退
直接修改状态
```

## 8. Validator / Reducer

Validator 是规则裁判。

它检查：

```text
位置
时间
权限
角色身份
信息可见性
NPC 是否有权行动
是否违反时代技术
是否提示词攻击
是否与已落盘事实冲突
```

Reducer 是唯一落盘器。

它负责：

```text
更新 WorldState
追加 EventLog
更新 NPCMemoryStore
创建 Checkpoint
推进 TimeStage
更新 EndingState
```

## 9. LLM 和硬规则的分工

### LLM 控制

```text
理解自然语言意图
判断话术策略
在单个 NPC 上下文中推演主观反应
生成 NPC 台词
生成文学化叙事
辅助总结结局文本
```

### 硬规则控制

```text
客观事实
地点与可见性
谁知道什么
是否能行动
是否能改状态
提示词攻击拒绝
角色身份边界
事件日志
检查点
结局维度
```

## 10. 第一版实现策略

第一版不需要常驻多进程 agent。

可以用“按需唤醒”的函数式 kernel：

```ts
runNpcKernel(input: NPCKernelInput): NPCKernelOutput
```

先用 mock kernel 跑通逻辑，再用 feature flag 接 LLM kernel。

关键是：即使用同一个 LLM API，也必须每次只装载一个 NPC 的私有上下文。

## 11. 必须写的测试

```text
秦伯能听到主帐内完整论证。
晋使不能知道主帐内具体话语。
郑伯不能知道秦伯反应，除非有 report event。
守卫只知道出入和秩序信息。
NPCMemory 不能因不可见事件更新。
WorldDirector 不能直接改 WorldState。
LLM 输出不能绕过 Validator。
```

## 12. 例子是回归测试，不是分支

项目里会不断出现一些高辨识度例子，例如：

```text
烛之武拒绝佚之狐
烛之武抱怨郑伯迟用
烛之武附条件接受
烛之武以“秦远晋近”说动秦伯
晋使因主帐久谈而起疑
```

这些例子的重要性在于：

```text
它们是 regression tests，
用来检查系统的一般机制是否真的能处理合理的世界内自由输入。
```

它们不应该被实现为：

```text
if 玩家说了这句
and 当前是这个 NPC
and 当前是这个场景
then 走专门分支
```

正确方向应该是：

```text
语义动作分类
→ 世界规则校验
→ 事件落盘
→ 观察过滤
→ NPC memory 更新
→ affordance 选择
→ goal / pressure 驱动的主观评估
→ NPC intention proposal
→ NPC proposal validator
→ WorldDirector 调度
→ reducer commit
```

也就是说：

```text
系统要通过通用机制泛化，而不是通过不断追加 one-off branch 来“支持自由度”。
```

例如“佚之狐开场遭遇拒绝”，应当被视为：

```text
一个检验 refusal / grievance / conditional acceptance / loyalty conflict
等一般反应模式是否成立的回归场景，
而不是要求代码里出现“佚之狐拒绝分支”。
```

同理，未来接入 LLM 时，LLM 的作用也不是替项目生成分支树，
而是在单个 NPC 的私有上下文中进行主观推理，
在 affordance 和 validator 约束下输出结构化 proposal。

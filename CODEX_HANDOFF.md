# CODEX_HANDOFF.md

# 给 Codex 的交付说明

## 1. 你要交给 Codex 哪些文件

把以下文件放到仓库根目录：

```text
PROJECT_BRIEF.md
AGENTS.md
MVP_SPEC.md
NPC_KERNEL_ARCHITECTURE.md
TASKS.md
CODEX_HANDOFF.md
REPORT.md
```

把 `prompts/`、`drafts/`、`codex_prompts/` 也放进去，作为参考资料。

## 2. 不要这样交付

不要对 Codex 说：

```text
帮我做一个语言行动开放世界 RPG。
```

这个任务太大，Codex 会倾向于做成普通聊天 UI 或全知剧情生成器。

## 3. 应该这样交付

每次只让 Codex 做一个 Task。

第一条建议发：

```text
Read PROJECT_BRIEF.md, AGENTS.md, MVP_SPEC.md, NPC_KERNEL_ARCHITECTURE.md, and TASKS.md first.

Implement Task 01 only.

Initialize the project skeleton for the 《烛之武退秦师》 language-action RPG research demo.

Do not implement LLM calls.
Do not implement NPC kernels yet.
Do not invent lore.
Do not make this a generic chatbot.

After completing, summarize changed files and how to run the app.
```

第二条再发 Task 02。

## 4. 必须强调的新约束

给 Codex 的每个任务都要反复强调：

```text
Do not use one omniscient LLM to decide all NPC behavior.
Each key NPC must have independent memory and kernel context.
WorldDirector is only a scheduler.
LLM outputs are proposals, not state mutations.
WorldState and NPCMemory update only through Validator + Reducer.
```

## 5. 推荐迭代顺序

```text
Task 01 UI 骨架
Task 02 类型和 schema
Task 03 初始世界 + NPC memories
Task 04 parserMock + safety
Task 05 validator + reducer
Task 06 observationFilter
Task 07 npcMemory reducer
Task 08 mock NPC kernels
Task 09 worldDirector
Task 10 游戏循环
Task 11 debug panel
Task 12 checkpoint
Task 13 ending composer
Task 14 prompt files
Task 15 LLM feature flag
```

## 6. 每次 Codex 提交后你让我检查什么

你可以把 PR / diff 发给我，让我重点检查：

```text
它有没有做成全知旁白？
NPC 是否独立记忆？
晋使是否凭空知道秦伯主帐内容？
LLM 是否直接改了 WorldState？
状态变化是否经过 event/reducer？
提示词攻击测试是否存在？
烛之武身份边界是否被破坏？
```

## 7. 最小第一轮验收

在没有真实 LLM 时，也应做到：

```text
玩家输入“秦伯若灭郑，实利尽归于晋”
→ parserMock 识别为 interest_analysis
→ validator 确认秦伯在场
→ eventLog 写入说服事件
→ observationFilter 给秦伯完整事件
→ qinDukeMock 更新疑虑
→ jinEnvoyMock 不知道具体内容，只因谈话久而警觉
→ narrator 输出正式文本
```

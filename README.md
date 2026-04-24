# 《烛之武退秦师》MVP 开发包 v0.1：NPC Kernel 重制版

这是一个给 Codex 执行的仓库级开发包。

本版相对上一版的核心修正：

> 不是由一个全知 LLM 统一揣测所有剧情和所有人物，而是由“客观世界状态机 + 事件分发器 + 多个 NPC 独立心智内核”共同运作。

关键原则：

```text
WorldState 是客观世界账本。
EventLog 是世界发生过什么的唯一记录。
ObservationFilter 决定每个 NPC 能看到什么。
每个关键 NPC 有自己的 NPC Mind Kernel。
NPC Kernel 只能基于自己的身份、记忆、信念和可见事件提出反应。
World Director 只调度事件、时间和冲突，不替 NPC 思考。
Validator / Reducer 是唯一能让事实落盘的硬规则层。
Narrator 只负责把已落盘结果文学化呈现给玩家。
```

你交给 Codex 时，优先放进仓库根目录的文件：

```text
PROJECT_BRIEF.md
AGENTS.md
MVP_SPEC.md
NPC_KERNEL_ARCHITECTURE.md
TASKS.md
CODEX_HANDOFF.md
REPORT.md
```

然后按 `TASKS.md` 一项一项让 Codex 做，不要让它一次性做完整游戏。

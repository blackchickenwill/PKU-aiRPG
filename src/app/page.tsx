const mapNodes = [
  { name: "烛之武宅", status: "起点", detail: "玩家行动将从这里被组织起来。" },
  { name: "郑伯宫室", status: "宫廷", detail: "后续用于会见郑伯与承接国内反馈。" },
  { name: "城墙 / 城门", status: "关隘", detail: "连接城内与外营的关键行动节点。" },
  { name: "秦营外", status: "前线", detail: "可在此请求通报、等待回应与观察营中动静。" },
  { name: "秦伯主帐", status: "目标场景", detail: "后续利害分析与说服事件的主要场所。" },
  { name: "晋军营方向", status: "势力边界", detail: "用于承接晋使、风向与间接观察。" }
] as const;

const sceneFeed = [
  {
    speaker: "系统场景",
    text: "这里是 Task 01 的界面骨架。当前只展示研究 Demo 的布局，不接入 LLM、NPC 心智或世界状态机。"
  },
  {
    speaker: "场景提示",
    text: "左侧区域是节点地图占位，右侧区域是正式模式下的场景 / 对话面板。"
  },
  {
    speaker: "开发提示",
    text: "下方输入框将作为未来玩家语言行动入口，但现在不会触发任何解析或世界事件。"
  }
] as const;

const debugItems = [
  "ActionProposal",
  "SafetyClassification",
  "ValidatorResult",
  "GameEvent",
  "ObservableEvent per NPC"
] as const;

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Task 01 / Project Skeleton</p>
        <h1>《烛之武退秦师》语言行动 RPG</h1>
        <p className="hero-copy">
          这是研究 Demo 的首个可运行界面骨架。它强调地图节点、场景叙事与玩家输入三块核心区域，
          明确避免把产品做成通用聊天窗口。
        </p>
      </section>

      <section className="workspace">
        <aside className="panel map-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">节点地图</p>
              <h2>局势位置图</h2>
            </div>
            <span className="panel-badge">占位</span>
          </div>

          <div className="map-legend">
            <span>城内</span>
            <span>通路</span>
            <span>敌营</span>
          </div>

          <div className="map-grid" aria-label="节点地图占位">
            {mapNodes.map((node, index) => (
              <article
                key={node.name}
                className={`map-node ${index === 3 || index === 4 ? "map-node-accent" : ""}`}
              >
                <div className="map-node-title-row">
                  <h3>{node.name}</h3>
                  <span>{node.status}</span>
                </div>
                <p>{node.detail}</p>
              </article>
            ))}
          </div>
        </aside>

        <section className="panel scene-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">场景 / 对话</p>
              <h2>正式模式展示区</h2>
            </div>
            <span className="panel-badge">无逻辑占位</span>
          </div>

          <div className="scene-card">
            <p className="scene-label">当前场景</p>
            <h3>未接入世界状态</h3>
            <p>
              后续这里会根据验证后的世界状态展示叙事文本、可见 NPC 反应与局势变化。现在仅保留结构位置，
              不虚构剧情，不代替系统链路做任何推演。
            </p>
          </div>

          <div className="scene-feed" aria-label="场景对话面板占位">
            {sceneFeed.map((entry) => (
              <article key={entry.speaker} className="scene-entry">
                <p className="scene-speaker">{entry.speaker}</p>
                <p className="scene-text">{entry.text}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="panel composer-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">玩家输入</p>
            <h2>语言行动入口</h2>
          </div>
          <span className="panel-badge">未接线</span>
        </div>

        <label className="input-shell" htmlFor="player-input">
          <textarea
            id="player-input"
            name="player-input"
            rows={4}
            placeholder="在这里输入烛之武的行动语言。Task 01 只提供界面骨架，不执行解析。"
          />
        </label>

        <div className="composer-footer">
          <p>后续将接入 ActionParser / Safety / Validator 链路。</p>
          <button type="button" disabled>
            暂不可提交
          </button>
        </div>
      </section>

      <aside className="panel debug-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Debug Panel</p>
            <h2>导演台占位</h2>
          </div>
          <span className="panel-badge">可选面板</span>
        </div>

        <div className="debug-grid">
          {debugItems.map((item) => (
            <div key={item} className="debug-chip">
              {item}
            </div>
          ))}
        </div>

        <p className="debug-copy">
          这些调试信息会在后续任务中接入。Task 01 只预留结构，不展示任何真实游戏内部状态。
        </p>
      </aside>
    </main>
  );
}

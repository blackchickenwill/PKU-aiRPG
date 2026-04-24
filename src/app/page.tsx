"use client";

import { FormEvent, useMemo, useState } from "react";

import { runPlayerTurn } from "@/game/gameLoop";
import type { GameTurnResult } from "@/game/gameLoop";
import { initialGameRuntimeState } from "@/game/initialWorld";
import type {
  GameEvent,
  GameRuntimeState,
  LocationId,
  NPCId,
  TimeStage
} from "@/game/types";

type MessageKind = "player" | "scene" | "system";

interface MessageLine {
  id: string;
  kind: MessageKind;
  text: string;
}

interface GraphNode {
  id: LocationId;
  x: number;
  y: number;
  relation: "current" | "connected" | "known";
}

const LOCATION_LABELS: Record<LocationId, { name: string; description: string }> = {
  zhu_home: {
    name: "烛之武宅",
    description: "城内旧宅，夜色沉沉。佚之狐在此劝请烛之武临危出使。"
  },
  zheng_palace: {
    name: "郑伯宫室",
    description: "郑伯与近臣议事之所，国势危急，宫中等待破局之策。"
  },
  market: {
    name: "郑国市井",
    description: "城中百姓聚散其间，流言、焦虑与求生心态交织。"
  },
  city_gate: {
    name: "城门",
    description: "出入郑城的关键通道，通往敌营与使行之路。"
  },
  qin_camp_exterior: {
    name: "秦营外",
    description: "秦军营门之外，来使必须先经守卫通报。"
  },
  qin_main_tent: {
    name: "秦伯主帐",
    description: "秦伯处理军政与会客的主帐，关键外交交锋在此发生。"
  },
  jin_camp_direction: {
    name: "晋军营地方向",
    description: "通向晋军驻地的方向，象征盟军压力与旁观视线。"
  }
};

const NPC_LABELS: Record<NPCId, string> = {
  zheng_duke: "郑伯",
  yi_zhihu: "佚之狐",
  qin_duke: "秦伯",
  jin_envoy: "晋使",
  guard: "守卫",
  commoner_rep: "百姓代表"
};

const NPC_PUBLIC_INFO: Record<NPCId, { identity: string; goal: string }> = {
  zheng_duke: {
    identity: "郑国国君",
    goal: "保全郑国，尽快找到可行的破局之策。"
  },
  yi_zhihu: {
    identity: "郑国大夫，推荐烛之武出使的人",
    goal: "促成烛之武出使，争取郑国一线生机。"
  },
  qin_duke: {
    identity: "秦国国君",
    goal: "判断灭郑是否真正符合秦国利益。"
  },
  jin_envoy: {
    identity: "晋国代表",
    goal: "防止秦国私下与郑国议和。"
  },
  guard: {
    identity: "秦营秩序维护者",
    goal: "守门、通报，并维持营中秩序。"
  },
  commoner_rep: {
    identity: "郑国市井民意的代表",
    goal: "求生保家，理解当前危局。"
  }
};

const TIME_LABELS: Record<string, string> = {
  "澶滃垵": "夜初",
  "澶滃崐": "夜半",
  "榛庢槑鍓?": "黎明前",
  "娓呮櫒": "清晨"
};

const INITIAL_MESSAGES: MessageLine[] = [
  {
    id: "initial-scene",
    kind: "scene",
    text: "夜色压城。你是烛之武，局势仍在等待第一句真正的行动。"
  }
];

function cloneInitialRuntime(): GameRuntimeState {
  return structuredClone(initialGameRuntimeState);
}

function displayTimeStage(timeStage: TimeStage | undefined): string {
  return timeStage ? TIME_LABELS[timeStage] ?? timeStage : "未知";
}

function describeTarget(event: GameEvent): string {
  if (!event.target) {
    return "";
  }

  if (event.target in LOCATION_LABELS) {
    return ` -> ${LOCATION_LABELS[event.target as LocationId].name}`;
  }

  if (event.target in NPC_LABELS) {
    return ` -> ${NPC_LABELS[event.target as NPCId]}`;
  }

  return ` -> ${event.target}`;
}

function readableEventType(event: GameEvent): string {
  switch (event.type) {
    case "dialogue":
      return "对话";
    case "movement":
      return "移动";
    case "safety_rejection":
      return "拒绝";
    case "npc_intention":
      return "意图";
    default:
      return event.type;
  }
}

function buildGraphNodes(
  currentLocationId: LocationId,
  allLocationIds: LocationId[],
  connectedLocationIds: LocationId[]
): GraphNode[] {
  const connectedPositions = [
    { x: 50, y: 14 },
    { x: 83, y: 35 },
    { x: 69, y: 78 },
    { x: 31, y: 78 },
    { x: 17, y: 35 }
  ];
  const knownPositions = [
    { x: 13, y: 12 },
    { x: 88, y: 12 },
    { x: 90, y: 88 },
    { x: 10, y: 88 },
    { x: 50, y: 92 },
    { x: 8, y: 54 },
    { x: 92, y: 54 }
  ];

  const connected = connectedLocationIds.map((id, index) => ({
    id,
    relation: "connected" as const,
    ...(connectedPositions[index % connectedPositions.length] ?? connectedPositions[0])
  }));
  const known = allLocationIds
    .filter((id) => id !== currentLocationId && !connectedLocationIds.includes(id))
    .map((id, index) => ({
      id,
      relation: "known" as const,
      ...(knownPositions[index % knownPositions.length] ?? knownPositions[0])
    }));

  return [
    { id: currentLocationId, relation: "current", x: 50, y: 50 },
    ...connected,
    ...known
  ];
}

function DebugMiniView({ turn }: { turn?: GameTurnResult }) {
  const rows = [
    ["validator", turn?.validatorResult.status ?? "none"],
    ["committedEvents", String(turn?.committedEvents.length ?? 0)],
    ["observableEvents", String(turn?.observableEvents.length ?? 0)],
    ["npcOutputs", String(turn?.npcKernelOutputs.length ?? 0)],
    [
      "memoryPatches",
      String(
        turn?.memoryPatchResults.filter((result) => result.status === "accepted")
          .length ?? 0
      )
    ],
    ["directorScheduled", String(turn?.directorOutput.scheduledEvents.length ?? 0)]
  ];

  return (
    <dl className="debug-mini" aria-label="本轮调试摘要">
      {rows.map(([label, value]) => (
        <div className="debug-row" key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function HomePage() {
  const [runtime, setRuntime] = useState<GameRuntimeState>(() => cloneInitialRuntime());
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<GameTurnResult[]>([]);
  const [messages, setMessages] = useState<MessageLine[]>(INITIAL_MESSAGES);
  const [selectedNpcId, setSelectedNpcId] = useState<NPCId | null>(null);
  const currentLocation = runtime.world.locations[runtime.world.currentLocation];
  const currentLocationLabel = LOCATION_LABELS[runtime.world.currentLocation];
  const latestTurn = turns.at(-1);
  const connectedLocations = currentLocation.connectedTo;
  const selectedNpc = selectedNpcId ? runtime.world.npcs[selectedNpcId] : null;
  const eventLog = runtime.world.eventLog.slice(-6);
  const graphNodes = useMemo(
    () =>
      buildGraphNodes(
        runtime.world.currentLocation,
        Object.keys(runtime.world.locations) as LocationId[],
        connectedLocations
      ),
    [connectedLocations, runtime.world.currentLocation, runtime.world.locations]
  );

  function runRawInput(rawInput: string) {
    const trimmed = rawInput.trim();

    if (!trimmed) {
      return;
    }

    const result = runPlayerTurn(runtime, trimmed);
    const responseKind: MessageKind =
      result.validatorResult.status === "rejected" ? "system" : "scene";
    setRuntime(result.nextRuntime);
    setTurns((current) => [...current, result]);
    setMessages((current) => [
      ...current,
      {
        id: `player-${current.length}-${result.playerAction.timestamp}`,
        kind: "player",
        text: `你：${trimmed}`
      },
      ...result.mockNarrativeLines.map((line, index) => ({
        id: `scene-${current.length}-${result.playerAction.timestamp}-${index}`,
        kind: responseKind,
        text: line
      }))
    ]);
    setInput("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runRawInput(input);
  }

  function moveTo(locationId: LocationId) {
    runRawInput(`我前往${LOCATION_LABELS[locationId].name}。`);
  }

  function interactWithNpc(npcId: NPCId, action: "talk" | "probe" | "meeting" | "info") {
    const name = NPC_LABELS[npcId];
    const actionInput = {
      talk: `我与${name}交谈。`,
      probe: `我试探${name}的态度。`,
      meeting: `我请求与${name}会面。`,
      info: `我向${name}交付所知信息。`
    }[action];

    setSelectedNpcId(null);
    runRawInput(actionInput);
  }

  return (
    <main className="mud-shell">
      <section className="graph-panel" aria-label="地点图谱">
        <header className="panel-heading">
          <p>行路</p>
          <h1>烛之武退秦师</h1>
        </header>

        <div className="location-graph">
          <svg aria-hidden="true" className="graph-lines" viewBox="0 0 100 100">
            {graphNodes
              .filter((node) => node.relation === "connected")
              .map((node) => (
                <line
                  key={node.id}
                  x1="50"
                  x2={node.x}
                  y1="50"
                  y2={node.y}
                />
              ))}
          </svg>

          {graphNodes.map((node) => {
            const isConnected = node.relation === "connected";
            const isCurrent = node.relation === "current";

            return (
              <button
                className={`graph-node ${node.relation}`}
                disabled={!isConnected}
                key={node.id}
                onClick={() => moveTo(node.id)}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`
                }}
                type="button"
              >
                <span>{LOCATION_LABELS[node.id].name}</span>
                <small>{isCurrent ? "所在" : isConnected ? "出口" : "远处"}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="scene-panel" aria-label="当前场景">
        <div className="scene-main">
          <section className="scene-card primary-scene">
            <div className="scene-title-row">
              <div>
                <p className="kicker">当前场景</p>
                <h2>{currentLocationLabel.name}</h2>
              </div>
              <div className="time-pill">
                <span>时辰</span>
                <strong>{displayTimeStage(runtime.world.timeStage)}</strong>
              </div>
            </div>

            <p className="scene-description">{currentLocationLabel.description}</p>

            {latestTurn?.directorOutput.shouldAdvanceTime ? (
              <p className="time-proposal">
                局势似乎正在推进：可能进入{" "}
                {displayTimeStage(latestTurn.directorOutput.nextTimeStageProposal)}。
              </p>
            ) : null}

            <div className="scene-subgrid">
              <div>
                <p className="subhead">出口</p>
                <div className="exit-row">
                  {connectedLocations.map((locationId) => (
                    <button
                      className="exit-button"
                      key={locationId}
                      onClick={() => moveTo(locationId)}
                      type="button"
                    >
                      {LOCATION_LABELS[locationId].name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="subhead">此间人物</p>
                <div className="npc-row">
                  {currentLocation.presentNPCs.length > 0 ? (
                    currentLocation.presentNPCs.map((npcId) => (
                      <button
                        className="npc-card"
                        key={npcId}
                        onClick={() => setSelectedNpcId(npcId)}
                        type="button"
                      >
                        <span>{NPC_LABELS[npcId]}</span>
                        <small>{NPC_PUBLIC_INFO[npcId].identity}</small>
                      </button>
                    ))
                  ) : (
                    <span className="empty-chip">无人</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="message-panel" aria-label="消息流">
            <header className="panel-heading compact">
              <p>消息</p>
              <h2>场景回响</h2>
            </header>
            <div className="message-feed">
              {messages.slice(-12).map((message) => (
                <p className={`message-line ${message.kind}`} key={message.id}>
                  {message.text}
                </p>
              ))}
            </div>
          </section>
        </div>

        <aside className="side-stack">
          {selectedNpc ? (
            <section className="npc-detail" aria-label="人物互动">
              <div className="npc-detail-header">
                <div>
                  <p className="kicker">人物</p>
                  <h2>{NPC_LABELS[selectedNpc.id]}</h2>
                </div>
                <button
                  aria-label="关闭人物面板"
                  className="ghost-button"
                  onClick={() => setSelectedNpcId(null)}
                  type="button"
                >
                  关闭
                </button>
              </div>
              <p>{NPC_PUBLIC_INFO[selectedNpc.id].identity}</p>
              <p className="public-goal">{NPC_PUBLIC_INFO[selectedNpc.id].goal}</p>
              <div className="npc-actions">
                <button onClick={() => interactWithNpc(selectedNpc.id, "talk")} type="button">
                  交谈
                </button>
                <button onClick={() => interactWithNpc(selectedNpc.id, "probe")} type="button">
                  试探
                </button>
                <button onClick={() => interactWithNpc(selectedNpc.id, "meeting")} type="button">
                  请求会面
                </button>
                <button onClick={() => interactWithNpc(selectedNpc.id, "info")} type="button">
                  交付信息
                </button>
              </div>
            </section>
          ) : (
            <section className="npc-detail muted-detail">
              <p className="kicker">人物</p>
              <h2>选择在场人物</h2>
              <p>点击场景中的人物，可查看公开身份与可用动作。</p>
            </section>
          )}

          <section className="event-panel" aria-label="事件摘要">
            <details>
              <summary>事件摘要</summary>
              {eventLog.length > 0 ? (
                <ol className="event-log">
                  {eventLog.map((event) => (
                    <li key={event.id}>
                      <span>{readableEventType(event)}</span>
                      {event.summary}
                      {describeTarget(event)}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="empty-copy">暂无已落盘事件。</p>
              )}
            </details>
          </section>

          <section className="debug-panel" aria-label="紧凑调试摘要">
            <details>
              <summary>Debug 摘要</summary>
              <DebugMiniView turn={latestTurn} />
              <p className="debug-summary">
                {latestTurn ? latestTurn.debugSummary : "尚未执行玩家行动。"}
              </p>
            </details>
          </section>
        </aside>
      </section>

      <form className="input-bar" onSubmit={handleSubmit}>
        <label htmlFor="player-input">行动</label>
        <input
          autoComplete="off"
          id="player-input"
          onChange={(event) => setInput(event.target.value)}
          placeholder="例如：我老矣，无能为也已。"
          value={input}
        />
        <button disabled={input.trim().length === 0} type="submit">
          发送
        </button>
      </form>
    </main>
  );
}

"use client";

import { FormEvent, useMemo, useState } from "react";

import { runPlayerTurn } from "@/game/gameLoop";
import type { GameTurnResult } from "@/game/gameLoop";
import { initialGameRuntimeState } from "@/game/initialWorld";
import type {
  GameEvent,
  GameRuntimeState,
  LocationId,
  NPCId
} from "@/game/types";

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
  guard: "秦营守卫",
  commoner_rep: "郑国百姓代表"
};

function cloneInitialRuntime(): GameRuntimeState {
  return structuredClone(initialGameRuntimeState);
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
  const currentLocation = runtime.world.locations[runtime.world.currentLocation];
  const currentLocationLabel = LOCATION_LABELS[runtime.world.currentLocation];
  const latestTurn = turns.at(-1);
  const connectedLocations = currentLocation.connectedTo;
  const latestMessages = latestTurn?.mockNarrativeLines.length
    ? latestTurn.mockNarrativeLines
    : ["夜色压城。你是烛之武，局势仍在等待第一句真正的行动。"];
  const eventLog = runtime.world.eventLog.slice(-8);

  const orderedLocations = useMemo(
    () =>
      Object.values(runtime.world.locations).sort((left, right) =>
        LOCATION_LABELS[left.id].name.localeCompare(LOCATION_LABELS[right.id].name)
      ),
    [runtime]
  );

  function runRawInput(rawInput: string) {
    const trimmed = rawInput.trim();

    if (!trimmed) {
      return;
    }

    const result = runPlayerTurn(runtime, trimmed);
    setRuntime(result.nextRuntime);
    setTurns((current) => [...current, result]);
    setInput("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runRawInput(input);
  }

  function moveTo(locationId: LocationId) {
    runRawInput(`我前往${LOCATION_LABELS[locationId].name}。`);
  }

  return (
    <main className="game-shell">
      <section className="map-panel" aria-label="地点地图">
        <header className="section-header">
          <p>地点地图</p>
          <h1>烛之武退秦师</h1>
        </header>

        <div className="location-list">
          {orderedLocations.map((location) => {
            const isCurrent = location.id === runtime.world.currentLocation;
            const isConnected = connectedLocations.includes(location.id);

            return (
              <button
                className={[
                  "location-node",
                  isCurrent ? "is-current" : "",
                  isConnected ? "is-connected" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={isCurrent || !isConnected}
                key={location.id}
                onClick={() => moveTo(location.id)}
                type="button"
              >
                <span>{LOCATION_LABELS[location.id].name}</span>
                <small>
                  {isCurrent ? "当前位置" : isConnected ? "可前往" : "未连接"}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="main-panel" aria-label="当前场景">
        <div className="scene-layout">
          <section className="scene-section">
            <header className="section-header">
              <p>当前地点</p>
              <h2>{currentLocationLabel.name}</h2>
            </header>
            <p className="scene-description">{currentLocationLabel.description}</p>

            <div className="inline-group">
              <span>在场 NPC</span>
              <div className="tag-row">
                {currentLocation.presentNPCs.length > 0 ? (
                  currentLocation.presentNPCs.map((npcId) => (
                    <span className="tag" key={npcId}>
                      {NPC_LABELS[npcId]}
                    </span>
                  ))
                ) : (
                  <span className="tag muted">无人</span>
                )}
              </div>
            </div>
          </section>

          <section className="scene-section">
            <header className="section-header">
              <p>叙事反馈</p>
              <h2>最新消息</h2>
            </header>
            <div className="message-list">
              {latestMessages.map((message, index) => (
                <p key={`${message}-${index}`}>{message}</p>
              ))}
            </div>
          </section>

          <section className="scene-section">
            <header className="section-header">
              <p>事件日志</p>
              <h2>最近事件</h2>
            </header>
            {eventLog.length > 0 ? (
              <ol className="event-log">
                {eventLog.map((event) => (
                  <li key={event.id}>
                    <span>{event.type}</span>
                    {event.summary}
                    {describeTarget(event)}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-copy">暂无已落盘事件。</p>
            )}
          </section>
        </div>

        <aside className="debug-panel" aria-label="紧凑调试摘要">
          <header className="section-header">
            <p>Debug</p>
            <h2>本轮摘要</h2>
          </header>
          <DebugMiniView turn={latestTurn} />
          {latestTurn ? (
            <p className="debug-summary">{latestTurn.debugSummary}</p>
          ) : (
            <p className="debug-summary">尚未执行玩家行动。</p>
          )}
        </aside>
      </section>

      <form className="input-bar" onSubmit={handleSubmit}>
        <label htmlFor="player-input">玩家行动</label>
        <input
          autoComplete="off"
          id="player-input"
          onChange={(event) => setInput(event.target.value)}
          placeholder="例如：我老矣，无能为也已。"
          value={input}
        />
        <button disabled={input.trim().length === 0} type="submit">
          提交
        </button>
      </form>
    </main>
  );
}

// Draft only. Codex should adapt this into src/game/observationFilter.ts.

import type { GameEvent, NPCId, ObservableEvent, WorldState } from "./types";

function makeObservable(
  event: GameEvent,
  observerNpcId: NPCId,
  visibility: ObservableEvent["visibility"],
  summaryForNpc: string,
  knownDetails: string[],
  hiddenDetails: string[],
): ObservableEvent {
  return {
    id: `${event.id}:${observerNpcId}`,
    originalEventId: event.id,
    observerNpcId,
    visibility,
    summaryForNpc,
    knownDetails,
    hiddenDetails,
    credibility: visibility === "rumor" ? "low" : "high",
  };
}

export function filterEventForNpc(
  event: GameEvent,
  observerNpcId: NPCId,
  world: WorldState,
): ObservableEvent | null {
  // Example special case: Zhu Zhiwu speaks to Qin Duke inside Qin main tent.
  if (
    event.type === "dialogue" &&
    event.location === "qin_main_tent" &&
    event.actor === "player" &&
    event.target === "qin_duke"
  ) {
    if (observerNpcId === "qin_duke") {
      return makeObservable(
        event,
        observerNpcId,
        "full",
        "烛之武在主帐中向你陈说秦晋伐郑的利害。",
        [event.summary, String(event.payload?.rawInput ?? "")],
        [],
      );
    }

    if (observerNpcId === "guard") {
      return makeObservable(
        event,
        observerNpcId,
        "partial",
        "郑国使者正在主帐内与秦伯谈话，时间较寻常通报更久。",
        ["郑使仍在帐中", "谈话持续"],
        ["谈话具体内容"],
      );
    }

    if (observerNpcId === "jin_envoy") {
      return makeObservable(
        event,
        observerNpcId,
        "partial",
        "郑国使者进入秦伯主帐后久未离开，秦营传令声似乎变少。",
        ["郑使进入秦伯主帐", "停留时间偏长"],
        ["烛之武具体说了什么", "秦伯的真实心理反应"],
      );
    }

    if (observerNpcId === "zheng_duke" || observerNpcId === "commoner_rep") {
      return null;
    }
  }

  // Default: only NPCs at the same location observe partial/public events.
  const observer = world.npcs[observerNpcId];
  if (observer && event.location && observer.location === event.location) {
    return makeObservable(
      event,
      observerNpcId,
      "partial",
      `你注意到：${event.summary}`,
      [event.summary],
      ["事件背后的真实动机"],
    );
  }

  return null;
}

export function filterEventForAllNpcs(
  event: GameEvent,
  world: WorldState,
): ObservableEvent[] {
  return Object.keys(world.npcs)
    .map((npcId) => filterEventForNpc(event, npcId as NPCId, world))
    .filter((x): x is ObservableEvent => x !== null);
}

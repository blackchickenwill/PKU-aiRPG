import { observableEventSchema } from "./schemas";
import type {
  GameEvent,
  GameRuntimeState,
  NPCId,
  ObservableEvent
} from "./types";

function makeObservable(
  event: GameEvent,
  observerNpcId: NPCId,
  visibility: ObservableEvent["visibility"],
  summaryForNpc: string,
  knownDetails: string[],
  hiddenDetails: string[],
  credibility: ObservableEvent["credibility"] = visibility === "rumor"
    ? "low"
    : "high"
): ObservableEvent {
  return observableEventSchema.parse({
    id: `${event.id}:${observerNpcId}`,
    originalEventId: event.id,
    observerNpcId,
    visibility,
    summaryForNpc,
    knownDetails,
    hiddenDetails,
    credibility
  });
}

function isNpcPresentAtLocation(
  runtime: GameRuntimeState,
  npcId: NPCId,
  locationId: GameEvent["location"]
): boolean {
  if (!locationId) {
    return false;
  }

  return runtime.world.locations[locationId]?.presentNPCs.includes(npcId) ?? false;
}

function getFullDialogueDetails(event: GameEvent): string[] {
  const details = [event.summary];
  const rawInput = event.payload.rawInput;

  if (typeof rawInput === "string" && rawInput.length > 0) {
    details.push(rawInput);
  }

  return details;
}

function filterOpeningHomeDialogue(
  event: GameEvent,
  npcId: NPCId
): ObservableEvent | null | undefined {
  if (
    event.type !== "dialogue" ||
    event.location !== "zhu_home" ||
    event.target !== "yi_zhihu"
  ) {
    return undefined;
  }

  if (npcId !== "yi_zhihu") {
    return null;
  }

  return makeObservable(
    event,
    npcId,
    "full",
    "烛之武在宅中向你当面表明心意。",
    getFullDialogueDetails(event),
    []
  );
}

function filterZhengPalaceDialogue(
  event: GameEvent,
  npcId: NPCId,
  runtime: GameRuntimeState
): ObservableEvent | null | undefined {
  if (
    event.type !== "dialogue" ||
    event.location !== "zheng_palace" ||
    event.target !== "zheng_duke"
  ) {
    return undefined;
  }

  if (npcId === "zheng_duke") {
    return makeObservable(
      event,
      npcId,
      "full",
      "烛之武在宫室中向你陈说当前局势与心意。",
      getFullDialogueDetails(event),
      []
    );
  }

  if (
    npcId === "yi_zhihu" &&
    isNpcPresentAtLocation(runtime, "yi_zhihu", "zheng_palace")
  ) {
    return makeObservable(
      event,
      npcId,
      "partial",
      "你在宫室中听见烛之武正在向郑伯陈说局势。",
      ["烛之武正在向郑伯进言", "郑伯正在听取回应"],
      ["烛之武完整措辞", "郑伯未明言的内心判断"]
    );
  }

  return null;
}

function filterQinMainTentDialogue(
  event: GameEvent,
  npcId: NPCId
): ObservableEvent | null | undefined {
  if (
    event.type !== "dialogue" ||
    event.location !== "qin_main_tent" ||
    event.target !== "qin_duke"
  ) {
    return undefined;
  }

  if (npcId === "qin_duke") {
    return makeObservable(
      event,
      npcId,
      "full",
      "烛之武在主帐中当面向你陈说利害。",
      getFullDialogueDetails(event),
      []
    );
  }

  if (npcId === "guard") {
    return makeObservable(
      event,
      npcId,
      "partial",
      "郑国使者正在主帐中与秦伯谈话，停留时间明显延长。",
      ["郑国使者已进入主帐", "帐中谈话仍在继续"],
      ["谈话的具体论证内容", "秦伯对论证的真实判断"]
    );
  }

  if (npcId === "jin_envoy") {
    return makeObservable(
      event,
      npcId,
      "partial",
      "你察觉郑国使者进入秦伯主帐后停留偏久，秦营气氛略有异动。",
      ["郑国使者进入秦伯主帐", "停留时间偏长"],
      ["烛之武具体说了什么", "秦伯是否已被说动"]
    );
  }

  return null;
}

function filterQinCampExteriorRequest(
  event: GameEvent,
  npcId: NPCId
): ObservableEvent | null | undefined {
  if (
    event.type !== "dialogue" ||
    event.location !== "qin_camp_exterior" ||
    event.payload.requestAudience !== true
  ) {
    return undefined;
  }

  if (npcId === "guard") {
    return makeObservable(
      event,
      npcId,
      "full",
      "烛之武在营外当面请求你代为通报秦伯。",
      getFullDialogueDetails(event),
      []
    );
  }

  if (npcId === "qin_duke") {
    return makeObservable(
      event,
      npcId,
      "partial",
      "守卫向你递来消息：郑国使者在营外请求入见。",
      ["郑国使者正在营外请求会见", "守卫需要决定是否通报"],
      ["烛之武原话的完整措辞"]
    );
  }

  if (npcId === "jin_envoy") {
    return null;
  }

  return null;
}

function filterMovementObservation(
  event: GameEvent,
  npcId: NPCId,
  runtime: GameRuntimeState
): ObservableEvent | null | undefined {
  if (event.type !== "movement") {
    return undefined;
  }

  const destination =
    typeof event.payload.to === "string" ? event.payload.to : undefined;
  const origin = typeof event.payload.from === "string" ? event.payload.from : undefined;

  if (
    destination &&
    isNpcPresentAtLocation(
      runtime,
      npcId,
      destination as GameEvent["location"]
    )
  ) {
    return makeObservable(
      event,
      npcId,
      "partial",
      "你注意到烛之武来到此地。",
      ["烛之武抵达当前地点"],
      ["他此行的完整盘算"]
    );
  }

  if (
    origin &&
    isNpcPresentAtLocation(runtime, npcId, origin as GameEvent["location"])
  ) {
    return makeObservable(
      event,
      npcId,
      "partial",
      "你看到烛之武离开了此地。",
      ["烛之武从此处离开"],
      ["他接下来将前往何处的全盘安排"]
    );
  }

  return null;
}

function filterGenericSameLocationEvent(
  event: GameEvent,
  npcId: NPCId,
  runtime: GameRuntimeState
): ObservableEvent | null {
  if (!event.location || !isNpcPresentAtLocation(runtime, npcId, event.location)) {
    return null;
  }

  return makeObservable(
    event,
    npcId,
    "partial",
    `你注意到：${event.summary}`,
    [event.summary],
    ["事件的全部背景与隐含动机"]
  );
}

export function filterEventForNpc(
  event: GameEvent,
  npcId: NPCId,
  runtime: GameRuntimeState
): ObservableEvent | null {
  const specialCases = [
    filterOpeningHomeDialogue(event, npcId),
    filterZhengPalaceDialogue(event, npcId, runtime),
    filterQinMainTentDialogue(event, npcId),
    filterQinCampExteriorRequest(event, npcId),
    filterMovementObservation(event, npcId, runtime)
  ];

  for (const observation of specialCases) {
    if (observation !== undefined) {
      return observation;
    }
  }

  return filterGenericSameLocationEvent(event, npcId, runtime);
}

export function filterEventForAllNpcs(
  event: GameEvent,
  runtime: GameRuntimeState
): ObservableEvent[] {
  return Object.keys(runtime.world.npcs)
    .map((npcId) => filterEventForNpc(event, npcId as NPCId, runtime))
    .filter((observation): observation is ObservableEvent => observation !== null);
}

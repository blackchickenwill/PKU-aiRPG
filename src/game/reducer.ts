import type {
  GameEvent,
  GameRuntimeState,
  TimeStage,
  ValidatorResult,
  WorldState
} from "./types";

const TIME_STAGES: TimeStage[] = ["夜初", "夜半", "黎明前", "清晨"];

function isTimeStage(value: unknown): value is TimeStage {
  return typeof value === "string" && TIME_STAGES.includes(value as TimeStage);
}

function applyEventToWorld(world: WorldState, event: GameEvent): WorldState {
  const nextWorld: WorldState = {
    ...world,
    eventLog: [...world.eventLog, event],
    flags: { ...world.flags }
  };

  if (event.type === "movement") {
    const targetLocation =
      typeof event.target === "string" && event.target in world.locations
        ? (event.target as keyof typeof world.locations)
        : undefined;

    if (targetLocation) {
      nextWorld.currentLocation = targetLocation;
      if (targetLocation !== "zhu_home") {
        nextWorld.flags.playerLeftCity = true;
      }
    }
  }

  if (
    event.type === "dialogue" &&
    event.location === "qin_camp_exterior" &&
    event.payload.requestAudience === true
  ) {
    nextWorld.flags.audienceRequestedAtQinCamp = true;
  }

  if (
    event.type === "dialogue" &&
    event.location === "qin_main_tent" &&
    ["persuade", "exchange_interest", "negotiate", "probe"].includes(
      String(event.payload.intent ?? "")
    )
  ) {
    nextWorld.flags.qinTentDiplomacyOccurred = true;
  }

  if (event.type === "time_advanced") {
    const to = event.payload.to;

    if (isTimeStage(to)) {
      nextWorld.timeStage = to;
    }
  }

  return nextWorld;
}

export function createTimeAdvancementValidatorResult(
  runtime: GameRuntimeState,
  nextTimeStage: TimeStage | undefined
): ValidatorResult | undefined {
  if (!nextTimeStage || nextTimeStage === runtime.world.timeStage) {
    return undefined;
  }

  const currentIndex = TIME_STAGES.indexOf(runtime.world.timeStage);
  const nextIndex = TIME_STAGES.indexOf(nextTimeStage);

  if (currentIndex < 0 || nextIndex !== currentIndex + 1) {
    return undefined;
  }

  const event: GameEvent = {
    id: `time-advanced-${runtime.world.eventLog.length + 1}`,
    type: "time_advanced",
    actor: "world_director",
    summary: `时势推移，局势进入${nextTimeStage}。`,
    payload: {
      from: runtime.world.timeStage,
      to: nextTimeStage,
      source: "world_director_proposal"
    },
    important: true
  };

  return {
    status: "accepted",
    reason: "WorldDirector time advancement proposal validated.",
    generatedEvents: [event],
    debugHints: ["time advancement validated from world director proposal"]
  };
}

export function reduceValidatedResult(
  runtime: GameRuntimeState,
  result: ValidatorResult
): GameRuntimeState {
  if (result.status === "rejected") {
    return runtime;
  }

  const nextWorld = result.generatedEvents.reduce(
    (currentWorld, event) => applyEventToWorld(currentWorld, event),
    runtime.world
  );

  return {
    ...runtime,
    world: nextWorld
  };
}

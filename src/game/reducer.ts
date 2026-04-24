import type { GameEvent, GameRuntimeState, ValidatorResult, WorldState } from "./types";

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

  return nextWorld;
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

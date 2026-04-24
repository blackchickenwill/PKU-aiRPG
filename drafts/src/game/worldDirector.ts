// Draft only. Codex should adapt this into src/game/worldDirector.ts.

import type {
  GameEvent,
  ObservableEvent,
  NPCIntentionProposal,
  WorldState,
} from "./types";
import { filterEventForAllNpcs } from "./observationFilter";

export interface DirectorSchedule {
  observableEvents: ObservableEvent[];
  npcKernelIdsToWake: string[];
  delayedEventProposals: GameEvent[];
  shouldAdvanceTime: boolean;
  debugSummary: string;
}

export function planAfterCommittedEvent(
  event: GameEvent,
  world: WorldState,
): DirectorSchedule {
  const observableEvents = filterEventForAllNpcs(event, world);

  return {
    observableEvents,
    npcKernelIdsToWake: observableEvents.map((e) => e.observerNpcId),
    delayedEventProposals: [],
    shouldAdvanceTime: Boolean(event.important),
    debugSummary:
      "WorldDirector scheduled NPC kernels based on event visibility. It did not decide NPC thoughts directly.",
  };
}

export function orderNpcIntentions(
  intentions: NPCIntentionProposal[],
): NPCIntentionProposal[] {
  // MVP: deterministic ordering.
  // Later this can consider urgency, authority, time, and location.
  return [...intentions].sort((a, b) => a.npcId.localeCompare(b.npcId));
}

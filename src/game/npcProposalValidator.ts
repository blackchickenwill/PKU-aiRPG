import { getAvailableAffordances } from "./npcAffordances";
import { applyMemoryPatchProposal } from "./npcMemory";
import {
  memoryPatchProposalSchema,
  npcIntentionProposalSchema,
  observableEventSchema
} from "./schemas";
import type { NPCAffordance } from "./npcAffordances";
import type { ReactionPattern } from "./reactionPatterns";
import type {
  GameEvent,
  GameRuntimeState,
  MemoryPatchProposal,
  NPCId,
  NPCIntentionProposal,
  ObservableEvent,
  ValidatorStatus
} from "./types";

export interface NPCProposalValidationContext {
  runtime: GameRuntimeState;
  observableEvent: ObservableEvent | null;
  reactionPattern?: ReactionPattern;
  pressureHints?: string[];
}

export interface NPCProposalValidationResult {
  status: ValidatorStatus;
  reason: string;
  generatedEvents: GameEvent[];
  debugHints: string[];
}

function makeResult(
  status: ValidatorStatus,
  reason: string,
  generatedEvents: GameEvent[] = [],
  debugHints: string[] = []
): NPCProposalValidationResult {
  return {
    status,
    reason,
    generatedEvents,
    debugHints
  };
}

function makeRejected(reason: string, debugHints: string[] = []): NPCProposalValidationResult {
  return makeResult("rejected", reason, [], debugHints);
}

function createNpcProposalEvent(
  runtime: GameRuntimeState,
  proposal: NPCIntentionProposal,
  observableEvent: ObservableEvent
): GameEvent {
  const eventType: GameEvent["type"] =
    ["question", "request_meeting", "warn", "report"].includes(proposal.intentionType)
      ? "dialogue"
      : "npc_intention";

  return {
    id: `npc-proposal-${proposal.npcId}-${runtime.world.eventLog.length + 1}`,
    type: eventType,
    summary: proposal.summary,
    actor: proposal.npcId,
    target: proposal.target === "player" ? undefined : proposal.target,
    location: runtime.world.npcs[proposal.npcId].location,
    payload: {
      npcIntentionProposal: true,
      intentionType: proposal.intentionType,
      sourceObservableEventId: proposal.sourceObservableEventId,
      sourceOriginalEventId: observableEvent.originalEventId,
      proposedOnly: true,
      targetPlayer: proposal.target === "player"
    },
    important: proposal.intentionType !== "do_nothing"
  };
}

function targetExists(
  runtime: GameRuntimeState,
  target: NPCIntentionProposal["target"]
): boolean {
  if (target === undefined || target === "player") {
    return true;
  }

  return (
    target in runtime.world.npcs ||
    target in runtime.world.locations ||
    ["zheng", "qin", "jin", "commoners"].includes(target)
  );
}

function isNpcId(runtime: GameRuntimeState, value: string): value is NPCId {
  return value in runtime.world.npcs;
}

function isTargetMeaningful(
  runtime: GameRuntimeState,
  proposal: NPCIntentionProposal
): boolean {
  switch (proposal.intentionType) {
    case "report":
      return proposal.target !== undefined && proposal.target !== "player";
    case "request_meeting":
      return proposal.target !== undefined && proposal.target !== proposal.npcId;
    case "question":
    case "warn":
    case "detain":
      return proposal.target !== undefined;
    case "delay":
    case "withdraw_conditionally":
    case "do_nothing":
    case "speak":
      return true;
    default:
      return false;
  }
}

function authorityAllows(proposal: NPCIntentionProposal): boolean {
  const allowedByNpc: Record<NPCId, NPCIntentionProposal["intentionType"][]> = {
    guard: ["report", "delay", "do_nothing"],
    yi_zhihu: ["speak", "question", "report", "request_meeting", "do_nothing"],
    qin_duke: ["speak", "question", "delay", "withdraw_conditionally", "detain", "do_nothing"],
    jin_envoy: ["request_meeting", "warn", "report", "do_nothing"],
    zheng_duke: ["speak", "request_meeting", "delay", "do_nothing"],
    commoner_rep: ["speak", "report", "do_nothing"]
  };

  return allowedByNpc[proposal.npcId]?.includes(proposal.intentionType) ?? false;
}

function affordancesForIntention(
  proposal: NPCIntentionProposal
): NPCAffordance[] {
  switch (proposal.intentionType) {
    case "report":
      return ["report"];
    case "request_meeting":
      return ["request_meeting"];
    case "question":
      return ["question"];
    case "warn":
      return ["warn"];
    case "delay":
      return ["delay", "defer_decision"];
    case "withdraw_conditionally":
      return ["withdraw_conditionally"];
    case "detain":
      return ["detain"];
    case "do_nothing":
      return ["do_nothing", "observe_silently"];
    case "speak":
      return [
        "acknowledge_grievance",
        "persuade_again",
        "apologize_or_acknowledge_late_use",
        "authorize_mission",
        "urge",
        "negotiate",
        "question"
      ];
    default:
      return [];
  }
}

function proposalMatchesAffordance(
  proposal: NPCIntentionProposal,
  availableAffordances: NPCAffordance[]
): boolean {
  const affordances = affordancesForIntention(proposal);
  return affordances.some((affordance) => availableAffordances.includes(affordance));
}

function containsHiddenDetails(
  proposal: NPCIntentionProposal,
  observableEvent: ObservableEvent
): boolean {
  return observableEvent.hiddenDetails
    .filter((detail) => detail.trim().length > 0)
    .some((detail) => proposal.summary.includes(detail));
}

function claimsDirectMutation(proposal: NPCIntentionProposal): boolean {
  return [
    "WorldState",
    "NPCMemory",
    "qinTentDiplomacyOccurred",
    "直接修改",
    "直接更新",
    "已经撤军",
    "撤军已成事实",
    "秦军已经撤退"
  ].some((pattern) => proposal.summary.includes(pattern));
}

export function validateNpcIntentionProposal(
  context: NPCProposalValidationContext,
  proposalInput: NPCIntentionProposal
): NPCProposalValidationResult {
  let proposal: NPCIntentionProposal;
  let observableEvent: ObservableEvent;

  try {
    proposal = npcIntentionProposalSchema.parse(proposalInput);
  } catch {
    return makeRejected("NPC intention proposal schema validation failed.", [
      "invalid npc intention proposal shape"
    ]);
  }

  if (!(proposal.npcId in context.runtime.world.npcs)) {
    return makeRejected("NPC intention proposal references an unknown npcId.", [
      "npcId does not exist"
    ]);
  }

  if (context.observableEvent === null) {
    return makeRejected("NPC intention proposal has no visible ObservableEvent source.", [
      "observable event is null"
    ]);
  }

  try {
    observableEvent = observableEventSchema.parse(context.observableEvent);
  } catch {
    return makeRejected("ObservableEvent schema validation failed.", [
      "invalid observable event shape"
    ]);
  }

  if (proposal.sourceObservableEventId !== observableEvent.id) {
    return makeRejected("NPC intention proposal sourceObservableEventId does not match.", [
      "source observable event id mismatch"
    ]);
  }

  if (proposal.npcId !== observableEvent.observerNpcId) {
    return makeRejected("NPC intention proposal npcId must match the observer NPC.", [
      "proposal npcId does not match observerNpcId"
    ]);
  }

  if (observableEvent.visibility === "none") {
    return makeRejected("Invisible events cannot authorize NPC proposals.", [
      "observable event visibility is none"
    ]);
  }

  if (!targetExists(context.runtime, proposal.target)) {
    return makeRejected("NPC intention proposal target is not valid.", [
      "target does not exist"
    ]);
  }

  if (!isTargetMeaningful(context.runtime, proposal)) {
    return makeRejected("NPC intention proposal target is not meaningful for this action.", [
      "target is not meaningful"
    ]);
  }

  if (!authorityAllows(proposal)) {
    return makeRejected("NPC lacks authority for the proposed intention.", [
      "npc authority does not allow intention"
    ]);
  }

  if (containsHiddenDetails(proposal, observableEvent)) {
    return makeRejected("NPC intention proposal includes hidden event details.", [
      "proposal summary includes hidden observable details"
    ]);
  }

  if (claimsDirectMutation(proposal)) {
    return makeRejected("NPC intention proposal cannot directly mutate state.", [
      "proposal summary claims direct WorldState or NPCMemory mutation"
    ]);
  }

  const npcState = context.runtime.world.npcs[proposal.npcId];
  const npcMemory = context.runtime.npcMemories[proposal.npcId];
  const availableAffordances = getAvailableAffordances({
    npcState,
    npcMemory,
    currentLocation: npcState.location,
    observableEvent,
    reactionPattern: context.reactionPattern,
    pressureHints: context.pressureHints
  });

  if (!proposalMatchesAffordance(proposal, availableAffordances)) {
    return makeRejected("NPC intention proposal is outside current affordances.", [
      `available affordances: ${availableAffordances.join(", ")}`
    ]);
  }

  if (
    proposal.target &&
    typeof proposal.target === "string" &&
    isNpcId(context.runtime, proposal.target) &&
    proposal.target === proposal.npcId
  ) {
    return makeRejected("NPC intention proposal cannot target itself for this action.", [
      "self target rejected"
    ]);
  }

  return makeResult(
    "accepted",
    "NPC intention proposal is valid and converted to an event proposal.",
    [createNpcProposalEvent(context.runtime, proposal, observableEvent)],
    ["npc intention validated without committing world or memory state"]
  );
}

export function validateNpcMemoryPatchProposal(
  context: NPCProposalValidationContext,
  patchInput: MemoryPatchProposal
): NPCProposalValidationResult {
  let patch: MemoryPatchProposal;

  try {
    patch = memoryPatchProposalSchema.parse(patchInput);
  } catch {
    return makeRejected("NPC memory patch proposal schema validation failed.", [
      "invalid memory patch proposal shape"
    ]);
  }

  const result = applyMemoryPatchProposal(
    context.runtime.npcMemories,
    patch,
    context.observableEvent
  );

  if (result.status === "rejected") {
    return makeRejected(result.reason, result.debugHints);
  }

  return makeResult("accepted", "NPC memory patch proposal is valid.", [], [
    ...result.debugHints,
    "memory patch validated but not committed by npc proposal validator"
  ]);
}

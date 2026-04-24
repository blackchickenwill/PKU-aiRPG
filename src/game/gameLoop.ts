import { filterEventForAllNpcs } from "./observationFilter";
import { parsePlayerActionMock } from "./parserMock";
import { reduceValidatedResult } from "./reducer";
import { applyMemoryPatchProposal } from "./npcMemory";
import type { MemoryPatchApplicationResult } from "./npcMemory";
import { runNpcKernelMock } from "./npcKernel";
import {
  validateNpcIntentionProposal,
  validateNpcMemoryPatchProposal
} from "./npcProposalValidator";
import type { NPCProposalValidationResult } from "./npcProposalValidator";
import { detectReactionPatternFromObservation } from "./reactionPatterns";
import { validateActionProposal } from "./validator";
import { runWorldDirector } from "./worldDirector";
import type { DirectorOutput } from "./worldDirector";
import type {
  ActionIntent,
  ActionProposal,
  GameEvent,
  GameRuntimeState,
  LocationId,
  NPCId,
  NPCKernelInput,
  NPCKernelOutput,
  ObservableEvent,
  PlayerAction,
  ValidatorResult
} from "./types";

export interface GameTurnResult {
  nextRuntime: GameRuntimeState;
  playerAction: PlayerAction;
  actionProposal: ActionProposal;
  validatorResult: ValidatorResult;
  committedEvents: GameEvent[];
  observableEvents: ObservableEvent[];
  npcKernelOutputs: NPCKernelOutput[];
  memoryPatchResults: MemoryPatchApplicationResult[];
  npcProposalValidationResults: NPCProposalValidationResult[];
  directorOutput: DirectorOutput;
  formalMessages: string[];
  mockNarrativeLines: string[];
  debugSummary: string;
}

const DIRECT_SPEECH_INTENTS: ActionIntent[] = [
  "persuade",
  "negotiate",
  "probe",
  "exchange_interest",
  "defend",
  "give_item_or_info"
];

function createPlayerAction(
  runtime: GameRuntimeState,
  rawInput: string
): PlayerAction {
  return {
    rawInput,
    currentLocation: runtime.world.currentLocation,
    timestamp: runtime.world.eventLog.length + 1
  };
}

function locationHasNpc(
  runtime: GameRuntimeState,
  locationId: LocationId,
  npcId: NPCId
): boolean {
  return runtime.world.locations[locationId]?.presentNPCs.includes(npcId) ?? false;
}

function withSceneDefaultTarget(
  runtime: GameRuntimeState,
  proposal: ActionProposal
): ActionProposal {
  const isDirectSpeech =
    DIRECT_SPEECH_INTENTS.includes(proposal.intent) || proposal.intent === "speak";

  if (proposal.targetNPC || !isDirectSpeech) {
    return proposal;
  }

  if (
    runtime.world.currentLocation === "qin_main_tent" &&
    locationHasNpc(runtime, "qin_main_tent", "qin_duke")
  ) {
    return {
      ...proposal,
      targetNPC: "qin_duke"
    };
  }

  return proposal;
}

function collectObservableEvents(
  runtime: GameRuntimeState,
  committedEvents: GameEvent[]
): ObservableEvent[] {
  return committedEvents.flatMap((event) => filterEventForAllNpcs(event, runtime));
}

function relevantKnownFactsForNpc(
  runtime: GameRuntimeState,
  npcId: NPCId
): string[] {
  return Object.values(runtime.world.knowledge)
    .filter((item) => item.knownByPlayer || item.knownByNPCs.includes(npcId))
    .map((item) => item.content);
}

function buildKernelInput(
  runtime: GameRuntimeState,
  observableEvent: ObservableEvent
): NPCKernelInput {
  const npcState = runtime.world.npcs[observableEvent.observerNpcId];
  const npcMemory = runtime.npcMemories[observableEvent.observerNpcId];
  const localScene =
    runtime.world.locations[npcState.location] ??
    runtime.world.locations[runtime.world.currentLocation];

  return {
    npcState,
    npcMemory,
    observableEvent,
    publicWorldSummary: [
      `time=${runtime.world.timeStage}`,
      `currentLocation=${runtime.world.currentLocation}`,
      `flags=${Object.keys(runtime.world.flags).join(",") || "none"}`
    ].join("; "),
    localSceneSummary: localScene.description,
    relevantKnownFacts: relevantKnownFactsForNpc(runtime, npcState.id)
  };
}

function pressureHintsForNpc(npcId: NPCId): string[] {
  switch (npcId) {
    case "yi_zhihu":
      return ["zheng_crisis", "time_urgent"];
    case "guard":
      return ["gatekeeping", "authority_limited"];
    case "qin_duke":
      return ["strategic_importance", "alliance_fragile"];
    case "jin_envoy":
      return ["alliance_pressure", "suspicion_rising"];
    default:
      return [];
  }
}

function rejectedMemoryPatchApplication(
  runtime: GameRuntimeState,
  validationResult: NPCProposalValidationResult
): MemoryPatchApplicationResult {
  return {
    status: "rejected",
    reason: validationResult.reason,
    nextStore: runtime.npcMemories,
    debugHints: validationResult.debugHints
  };
}

function buildNarrativeLines(input: {
  validatorResult: ValidatorResult;
  committedEvents: GameEvent[];
  npcKernelOutputs: NPCKernelOutput[];
  directorOutput: DirectorOutput;
}): string[] {
  const lines: string[] = [];

  if (input.validatorResult.formalHint) {
    lines.push(input.validatorResult.formalHint);
  }

  for (const event of input.committedEvents) {
    lines.push(event.summary);
  }

  for (const output of input.npcKernelOutputs) {
    if (output.visibleReaction) {
      lines.push(output.visibleReaction);
    }
    if (output.dialogue) {
      lines.push(output.dialogue);
    }
  }

  if (input.directorOutput.scheduledEvents.length > 0) {
    lines.push(
      `WorldDirector scheduled ${input.directorOutput.scheduledEvents.length} follow-up proposal(s).`
    );
  }

  return lines;
}

export function runPlayerTurn(
  runtime: GameRuntimeState,
  rawInput: string
): GameTurnResult {
  const playerAction = createPlayerAction(runtime, rawInput);
  const parsedActionProposal = parsePlayerActionMock(playerAction);
  const actionProposal = withSceneDefaultTarget(runtime, parsedActionProposal);
  const validatorResult = validateActionProposal(runtime, actionProposal);
  let workingRuntime = reduceValidatedResult(runtime, validatorResult);
  const committedEvents =
    validatorResult.status === "rejected" ? [] : validatorResult.generatedEvents;
  const observableEvents = collectObservableEvents(workingRuntime, committedEvents);
  const npcKernelOutputs: NPCKernelOutput[] = [];
  const memoryPatchResults: MemoryPatchApplicationResult[] = [];
  const npcProposalValidationResults: NPCProposalValidationResult[] = [];
  const validatedProposalEvents: GameEvent[] = [];

  for (const observableEvent of observableEvents) {
    const kernelInput = buildKernelInput(workingRuntime, observableEvent);
    const reactionPattern = detectReactionPatternFromObservation(kernelInput);
    const pressureHints = pressureHintsForNpc(observableEvent.observerNpcId);
    const kernelOutput = runNpcKernelMock(kernelInput);
    npcKernelOutputs.push(kernelOutput);

    if (kernelOutput.memoryPatch) {
      const memoryValidationResult = validateNpcMemoryPatchProposal(
        {
          runtime: workingRuntime,
          observableEvent,
          reactionPattern,
          pressureHints
        },
        kernelOutput.memoryPatch
      );

      if (memoryValidationResult.status === "accepted") {
        const memoryPatchResult = applyMemoryPatchProposal(
          workingRuntime.npcMemories,
          kernelOutput.memoryPatch,
          observableEvent
        );
        memoryPatchResults.push(memoryPatchResult);

        if (memoryPatchResult.status === "accepted") {
          workingRuntime = {
            ...workingRuntime,
            npcMemories: memoryPatchResult.nextStore
          };
        }
      } else {
        memoryPatchResults.push(
          rejectedMemoryPatchApplication(workingRuntime, memoryValidationResult)
        );
      }
    }

    if (kernelOutput.intention) {
      const proposalValidationResult = validateNpcIntentionProposal(
        {
          runtime: workingRuntime,
          observableEvent,
          reactionPattern,
          pressureHints
        },
        kernelOutput.intention
      );
      npcProposalValidationResults.push(proposalValidationResult);

      if (proposalValidationResult.status === "accepted") {
        validatedProposalEvents.push(...proposalValidationResult.generatedEvents);
      }
    }
  }

  const directorOutput = runWorldDirector({
    runtime: workingRuntime,
    observableEvents,
    validatedProposalEvents
  });
  const mockNarrativeLines = buildNarrativeLines({
    validatorResult,
    committedEvents,
    npcKernelOutputs,
    directorOutput
  });

  return {
    nextRuntime: workingRuntime,
    playerAction,
    actionProposal,
    validatorResult,
    committedEvents,
    observableEvents,
    npcKernelOutputs,
    memoryPatchResults,
    npcProposalValidationResults,
    directorOutput,
    formalMessages: mockNarrativeLines,
    mockNarrativeLines,
    debugSummary: [
      `validator=${validatorResult.status}`,
      `committedEvents=${committedEvents.length}`,
      `observableEvents=${observableEvents.length}`,
      `npcOutputs=${npcKernelOutputs.length}`,
      `memoryPatches=${memoryPatchResults.filter((result) => result.status === "accepted").length}`,
      `npcProposalEvents=${validatedProposalEvents.length}`,
      `directorScheduled=${directorOutput.scheduledEvents.length}`
    ].join("; ")
  };
}

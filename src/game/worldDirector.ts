import type {
  GameEvent,
  GameRuntimeState,
  NPCId,
  ObservableEvent,
  TimeStage
} from "./types";

export type ScheduledEventTiming =
  | "immediate_follow_up"
  | "after_current_exchange"
  | "next_time_stage";

export interface ScheduledWorldEvent {
  id: string;
  sourceProposalEventId: string;
  timing: ScheduledEventTiming;
  event: GameEvent;
  reason: string;
}

export type DirectorSchedule = ScheduledWorldEvent[];

export interface DirectorInput {
  runtime: GameRuntimeState;
  observableEvents?: ObservableEvent[];
  validatedProposalEvents?: GameEvent[];
}

export interface DirectorOutput {
  npcKernelIdsToWake: NPCId[];
  orderedProposalEvents: GameEvent[];
  scheduledEvents: DirectorSchedule;
  shouldAdvanceTime: boolean;
  nextTimeStageProposal?: TimeStage;
  debugSummary: string;
}

const RULER_NPCS = new Set<NPCId>(["zheng_duke", "qin_duke"]);

const timeStageOrder: TimeStage[] = ["夜初", "夜半", "黎明前", "清晨"];

function uniqueNpcIdsInOrder(npcIds: NPCId[]): NPCId[] {
  const seen = new Set<NPCId>();
  const result: NPCId[] = [];

  for (const npcId of npcIds) {
    if (!seen.has(npcId)) {
      seen.add(npcId);
      result.push(npcId);
    }
  }

  return result;
}

function isNpcId(value: unknown): value is NPCId {
  return (
    value === "zheng_duke" ||
    value === "yi_zhihu" ||
    value === "qin_duke" ||
    value === "jin_envoy" ||
    value === "guard" ||
    value === "commoner_rep"
  );
}

function intentionTypeOf(event: GameEvent): string {
  return String(event.payload.intentionType ?? "");
}

function isProposalEvent(event: GameEvent): boolean {
  return event.payload.proposedOnly === true;
}

function isImmediatePlayerFacingDialogue(event: GameEvent): boolean {
  return (
    isProposalEvent(event) &&
    event.type === "dialogue" &&
    event.payload.targetPlayer === true
  );
}

function isReportToRuler(event: GameEvent): boolean {
  return (
    isProposalEvent(event) &&
    intentionTypeOf(event) === "report" &&
    isNpcId(event.target) &&
    RULER_NPCS.has(event.target)
  );
}

function isWarningOrMeetingRequest(event: GameEvent): boolean {
  const intentionType = intentionTypeOf(event);
  return (
    isProposalEvent(event) &&
    (intentionType === "warn" || intentionType === "request_meeting")
  );
}

function priorityOfProposalEvent(event: GameEvent): number {
  if (isImmediatePlayerFacingDialogue(event)) {
    return 0;
  }

  if (isReportToRuler(event)) {
    return 1;
  }

  if (isWarningOrMeetingRequest(event)) {
    return 2;
  }

  if (intentionTypeOf(event) === "do_nothing") {
    return 4;
  }

  return 3;
}

export function listNpcKernelsToWake(observableEvents: ObservableEvent[]): NPCId[] {
  return uniqueNpcIdsInOrder(
    observableEvents
      .filter((event) => event.visibility !== "none")
      .map((event) => event.observerNpcId)
  );
}

export function orderProposalEvents(proposalEvents: GameEvent[]): GameEvent[] {
  return proposalEvents
    .map((event, index) => ({ event, index }))
    .sort((left, right) => {
      const priorityDelta =
        priorityOfProposalEvent(left.event) - priorityOfProposalEvent(right.event);

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return left.index - right.index;
    })
    .map(({ event }) => event);
}

function nextTimeStage(current: TimeStage): TimeStage | undefined {
  const currentIndex = timeStageOrder.indexOf(current);
  if (currentIndex < 0 || currentIndex >= timeStageOrder.length - 1) {
    return undefined;
  }

  return timeStageOrder[currentIndex + 1];
}

function shouldDelayBehindCurrentExchange(event: GameEvent): boolean {
  return (
    event.actor === "jin_envoy" &&
    event.target === "qin_duke" &&
    isWarningOrMeetingRequest(event)
  );
}

function shouldScheduleFollowUp(event: GameEvent): boolean {
  if (!isProposalEvent(event)) {
    return false;
  }

  if (
    event.actor === "yi_zhihu" &&
    event.target === "zheng_duke" &&
    ["report", "request_meeting"].includes(intentionTypeOf(event))
  ) {
    return true;
  }

  if (event.actor === "guard" && event.target === "qin_duke" && isReportToRuler(event)) {
    return true;
  }

  return shouldDelayBehindCurrentExchange(event);
}

function scheduledTimingFor(event: GameEvent): ScheduledEventTiming {
  if (shouldDelayBehindCurrentExchange(event)) {
    return "after_current_exchange";
  }

  return "immediate_follow_up";
}

function scheduledReasonFor(event: GameEvent): string {
  if (event.actor === "yi_zhihu" && event.target === "zheng_duke") {
    return "Schedule Yi Zhi Hu's validated report or meeting request toward Zheng Duke.";
  }

  if (event.actor === "guard" && event.target === "qin_duke") {
    return "Schedule guard's validated report toward Qin Duke.";
  }

  if (event.actor === "jin_envoy" && event.target === "qin_duke") {
    return "Delay Jin envoy warning or meeting request behind immediate Qin Duke response.";
  }

  return "Schedule validated NPC proposal as a follow-up event proposal.";
}

function createScheduledEvent(sourceEvent: GameEvent, index: number): ScheduledWorldEvent {
  const event: GameEvent = {
    ...sourceEvent,
    id: `director-scheduled-${index + 1}-${sourceEvent.id}`,
    payload: {
      ...sourceEvent.payload,
      proposedOnly: true,
      scheduledByWorldDirector: true,
      sourceProposalEventId: sourceEvent.id,
      requiresReducerCommit: true
    }
  };

  return {
    id: `schedule-${index + 1}-${sourceEvent.id}`,
    sourceProposalEventId: sourceEvent.id,
    timing: scheduledTimingFor(sourceEvent),
    event,
    reason: scheduledReasonFor(sourceEvent)
  };
}

function eventSuggestsTimeAdvancement(event: GameEvent): boolean {
  const intentionType = intentionTypeOf(event);

  if (intentionType === "delay") {
    return true;
  }

  if (isReportToRuler(event)) {
    return true;
  }

  if (
    event.actor === "yi_zhihu" &&
    event.target === "zheng_duke" &&
    intentionType === "request_meeting"
  ) {
    return true;
  }

  if (event.location === "qin_main_tent" && event.important) {
    return true;
  }

  return false;
}

export function runWorldDirector(input: DirectorInput): DirectorOutput {
  const observableEvents = input.observableEvents ?? [];
  const proposalEvents = input.validatedProposalEvents ?? [];
  const npcKernelIdsToWake = listNpcKernelsToWake(observableEvents);
  const orderedProposalEvents = orderProposalEvents(proposalEvents);
  const scheduledEvents = orderedProposalEvents
    .filter(shouldScheduleFollowUp)
    .map(createScheduledEvent);
  const shouldAdvanceTime = orderedProposalEvents.some(eventSuggestsTimeAdvancement);
  const nextTimeStageProposal = shouldAdvanceTime
    ? nextTimeStage(input.runtime.world.timeStage)
    : undefined;

  return {
    npcKernelIdsToWake,
    orderedProposalEvents,
    scheduledEvents,
    shouldAdvanceTime,
    nextTimeStageProposal,
    debugSummary: [
      `wake=${npcKernelIdsToWake.join(",") || "none"}`,
      `ordered=${orderedProposalEvents.length}`,
      `scheduled=${scheduledEvents.length}`,
      `advanceTime=${shouldAdvanceTime ? "yes" : "no"}`
    ].join("; ")
  };
}

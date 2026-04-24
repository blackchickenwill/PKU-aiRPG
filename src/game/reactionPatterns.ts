import type { NPCKernelInput, ObservableEvent, NPCState, NPCMemory } from "./types";

export type ReactionPattern =
  | "refusal"
  | "grievance"
  | "conditional_acceptance"
  | "loyalty_conflict"
  | "ambiguous_speech"
  | "probing"
  | "none";

export type ReactionAffordance =
  | "acknowledge_grievance"
  | "persuade_again"
  | "report"
  | "request_meeting"
  | "question"
  | "observe_silently"
  | "do_nothing";

type ReactionObservationInput =
  | Pick<NPCKernelInput, "observableEvent">
  | { observableEvent: ObservableEvent };

type AffordanceInput = Pick<
  NPCKernelInput,
  "npcState" | "npcMemory" | "observableEvent"
> & {
  pattern?: ReactionPattern;
};

function normalizeText(text: string): string {
  return text.replace(/\s+/g, "");
}

function collectObservationText(observableEvent: ObservableEvent): string {
  return normalizeText(
    [
      observableEvent.summaryForNpc,
      ...observableEvent.knownDetails
    ].join(" ")
  );
}

function hasAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern));
}

function isLowAuthorityMediator(npcState: NPCState): boolean {
  return (
    !npcState.possibleActions.some((action) => action.includes("命")) &&
    !npcState.identity.includes("国君")
  );
}

function feelsTimePressure(npcMemory: NPCMemory, observableEvent: ObservableEvent): boolean {
  return (
    npcMemory.episodicMemory.some(
      (entry) => entry.includes("局势危急") || entry.includes("围郑")
    ) ||
    observableEvent.summaryForNpc.includes("心意") ||
    observableEvent.knownDetails.some(
      (detail) => detail.includes("国危") || detail.includes("郑国不可亡")
    )
  );
}

export function detectReactionPatternFromObservation(
  input: ReactionObservationInput
): ReactionPattern {
  const text = collectObservationText(input.observableEvent);

  if (
    hasAny(text, ["虽怨", "心存怨", "有怨"]) &&
    hasAny(text, ["郑国不可亡", "郑不可亡", "国不可亡", "仍以郑国存亡为念"])
  ) {
    return "loyalty_conflict";
  }

  if (
    hasAny(text, ["若", "如果", "倘", "如"]) &&
    hasAny(text, ["再考虑", "方可", "亲自见我", "说明其意", "然后再议"])
  ) {
    return "conditional_acceptance";
  }

  if (hasAny(text, ["早不用我", "迟用", "国危才想起我", "怨其不用", "怨郑伯"])) {
    return "grievance";
  }

  if (hasAny(text, ["老矣", "无能为也", "无能为", "不愿受命", "不敢奉命"])) {
    return "refusal";
  }

  if (hasAny(text, ["敢问", "何意", "何以", "何故", "欲何为", "究竟何意"])) {
    return "probing";
  }

  if (
    text.length <= 8 ||
    hasAny(text, ["嗯", "……", "...", "再想想", "未置可否"])
  ) {
    return "ambiguous_speech";
  }

  return "none";
}

export function suggestNpcAffordanceFromPattern(
  input: AffordanceInput
): ReactionAffordance[] {
  const pattern = input.pattern ?? detectReactionPatternFromObservation(input);
  const lowAuthorityMediator = isLowAuthorityMediator(input.npcState);
  const timePressure = feelsTimePressure(input.npcMemory, input.observableEvent);

  switch (pattern) {
    case "refusal":
      return timePressure
        ? ["persuade_again", "question", "observe_silently"]
        : ["question", "observe_silently", "do_nothing"];
    case "grievance":
      return lowAuthorityMediator
        ? ["acknowledge_grievance", "request_meeting", "report"]
        : ["acknowledge_grievance", "question", "observe_silently"];
    case "conditional_acceptance":
      return lowAuthorityMediator
        ? ["request_meeting", "report", "question"]
        : ["question", "observe_silently", "do_nothing"];
    case "loyalty_conflict":
      return lowAuthorityMediator
        ? ["persuade_again", "request_meeting", "acknowledge_grievance"]
        : ["acknowledge_grievance", "question", "observe_silently"];
    case "ambiguous_speech":
      return ["question", "observe_silently", "do_nothing"];
    case "probing":
      return ["question", "observe_silently", "do_nothing"];
    case "none":
    default:
      return ["do_nothing", "observe_silently"];
  }
}

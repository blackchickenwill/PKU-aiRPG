import { getAvailableAffordances } from "./npcAffordances";
import type { NPCAffordance } from "./npcAffordances";
import type { NPCKernelInput, ObservableEvent } from "./types";

export type ReactionPattern =
  | "refusal"
  | "grievance"
  | "conditional_acceptance"
  | "loyalty_conflict"
  | "ambiguous_speech"
  | "probing"
  | "none";

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
): NPCAffordance[] {
  const pattern = input.pattern ?? detectReactionPatternFromObservation(input);

  return getAvailableAffordances({
    npcState: input.npcState,
    npcMemory: input.npcMemory,
    currentLocation: input.npcState.location,
    observableEvent: input.observableEvent,
    reactionPattern: pattern,
    pressureHints: []
  });
}

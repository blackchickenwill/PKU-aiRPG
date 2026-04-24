import type { NPCKernelInput, NPCMemory, NPCState, ObservableEvent } from "./types";
import type { ReactionPattern } from "./reactionPatterns";

export type NPCAffordance =
  | "acknowledge_grievance"
  | "persuade_again"
  | "report"
  | "request_meeting"
  | "question"
  | "warn"
  | "delay"
  | "block"
  | "admit_conditionally"
  | "negotiate"
  | "defer_decision"
  | "withdraw_conditionally"
  | "detain"
  | "pressure_qin"
  | "apologize_or_acknowledge_late_use"
  | "authorize_mission"
  | "urge"
  | "wait_for_report"
  | "observe_silently"
  | "do_nothing";

export interface AffordanceContext {
  npcState: NPCState;
  npcMemory: NPCMemory;
  currentLocation: NPCKernelInput["npcState"]["location"];
  observableEvent: ObservableEvent;
  reactionPattern?: ReactionPattern;
  pressureHints?: string[];
}

function uniqueAffordances(values: NPCAffordance[]): NPCAffordance[] {
  return [...new Set(values)];
}

function textOf(observableEvent: ObservableEvent): string {
  return [observableEvent.summaryForNpc, ...observableEvent.knownDetails].join(" ");
}

function hasAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern));
}

function baseAffordancesForNpc(npcId: NPCState["id"]): NPCAffordance[] {
  switch (npcId) {
    case "yi_zhihu":
      return [
        "acknowledge_grievance",
        "persuade_again",
        "report",
        "request_meeting",
        "question",
        "observe_silently",
        "do_nothing"
      ];
    case "guard":
      return [
        "report",
        "block",
        "delay",
        "admit_conditionally",
        "observe_silently",
        "do_nothing"
      ];
    case "qin_duke":
      return [
        "question",
        "negotiate",
        "defer_decision",
        "withdraw_conditionally",
        "detain",
        "observe_silently",
        "do_nothing"
      ];
    case "jin_envoy":
      return [
        "warn",
        "request_meeting",
        "pressure_qin",
        "report",
        "observe_silently",
        "do_nothing"
      ];
    case "zheng_duke":
      return [
        "request_meeting",
        "apologize_or_acknowledge_late_use",
        "authorize_mission",
        "urge",
        "wait_for_report",
        "observe_silently",
        "do_nothing"
      ];
    default:
      return ["observe_silently", "do_nothing"];
  }
}

function isQinCampWithoutReport(context: AffordanceContext): boolean {
  const text = textOf(context.observableEvent);

  return (
    context.npcState.id === "zheng_duke" &&
    context.observableEvent.visibility !== "full" &&
    hasAny(text, ["秦伯主帐", "秦营", "郑国使者进入秦伯主帐", "停留时间偏长"]) &&
    !hasAny(text, ["来报", "有人回报", "通报", "报称", "使者回告"])
  );
}

function addByReactionPattern(
  context: AffordanceContext,
  base: NPCAffordance[]
): NPCAffordance[] {
  const pattern = context.reactionPattern;
  const next = [...base];

  switch (pattern) {
    case "grievance":
      next.unshift("acknowledge_grievance");
      if (context.npcState.id === "yi_zhihu") {
        next.unshift("request_meeting", "report");
      }
      break;
    case "refusal":
      next.unshift("persuade_again", "question");
      break;
    case "conditional_acceptance":
      next.unshift("request_meeting", "report");
      break;
    case "loyalty_conflict":
      next.unshift("persuade_again");
      if (context.npcState.id === "yi_zhihu") {
        next.unshift("request_meeting");
      }
      break;
    case "ambiguous_speech":
      next.unshift("question", "observe_silently");
      break;
    case "probing":
      next.unshift("question");
      break;
    case "none":
    default:
      break;
  }

  return next;
}

function addByLocationAndEvent(
  context: AffordanceContext,
  base: NPCAffordance[]
): NPCAffordance[] {
  const next = [...base];
  const text = textOf(context.observableEvent);
  const pressureHints = context.pressureHints ?? [];

  if (
    context.npcState.id === "guard" &&
    context.currentLocation === "qin_camp_exterior" &&
    hasAny(text, ["请求你代为通报秦伯", "请求通报秦伯", "求一见"]) 
  ) {
    next.unshift("report", "block", "delay", "admit_conditionally");
  }

  if (
    context.npcState.id === "qin_duke" &&
    context.observableEvent.visibility === "full" &&
    hasAny(text, ["利晋", "秦远晋近", "东道主", "利害"])
  ) {
    next.unshift("question", "negotiate", "defer_decision");
    if (
      context.npcMemory.privateFlags.qinDukeWavering === true ||
      pressureHints.includes("alliance_fragile")
    ) {
      next.unshift("withdraw_conditionally");
    }
  }

  if (
    context.npcState.id === "jin_envoy" &&
    context.observableEvent.visibility === "partial" &&
    hasAny(text, ["停留时间偏长", "谈话仍在继续", "进入秦伯主帐"])
  ) {
    next.unshift("warn", "request_meeting", "pressure_qin", "report");
  }

  if (
    context.npcState.id === "zheng_duke" &&
    context.observableEvent.visibility === "full" &&
    hasAny(text, ["宫室中向你陈说", "烛之武已入宫陈说", "说明其意"])
  ) {
    next.unshift(
      "request_meeting",
      "apologize_or_acknowledge_late_use",
      "authorize_mission",
      "urge"
    );
  }

  return next;
}

export function getAvailableAffordances(
  context: AffordanceContext
): NPCAffordance[] {
  if (isQinCampWithoutReport(context)) {
    return ["wait_for_report", "observe_silently", "do_nothing"];
  }

  const base = baseAffordancesForNpc(context.npcState.id);
  const patternAdjusted = addByReactionPattern(context, base);
  const contextAdjusted = addByLocationAndEvent(context, patternAdjusted);

  return uniqueAffordances(contextAdjusted);
}

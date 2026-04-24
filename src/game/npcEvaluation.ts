import type { AffordanceContext, NPCAffordance } from "./npcAffordances";

export type PressureLevel = "none" | "low" | "medium" | "high" | "critical";
export type InformationConfidence = "unknown" | "low" | "medium" | "high";

export interface EvaluationContext extends AffordanceContext {}

export interface NPCPressureEvaluation {
  goalPriority: PressureLevel;
  timePressure: PressureLevel;
  authorityConstraint: PressureLevel;
  relationshipRisk: PressureLevel;
  informationConfidence: InformationConfidence;
  escalationNeed: PressureLevel;
}

const pressureScore: Record<PressureLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

const confidenceScore: Record<InformationConfidence, number> = {
  unknown: 0,
  low: 1,
  medium: 2,
  high: 3
};

function maxPressure(...levels: PressureLevel[]): PressureLevel {
  return levels.reduce((best, current) =>
    pressureScore[current] > pressureScore[best] ? current : best
  , "none");
}

function textOf(context: EvaluationContext): string {
  return [context.observableEvent.summaryForNpc, ...context.observableEvent.knownDetails].join(" ");
}

function hasAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern));
}

export function evaluateTimePressure(context: EvaluationContext): PressureLevel {
  const text = textOf(context);
  const hints = context.pressureHints ?? [];

  if (
    hints.includes("time_urgent") ||
    hints.includes("zheng_crisis") ||
    hasAny(text, ["国危", "围郑", "国势危急", "郑国不可亡"])
  ) {
    return "high";
  }

  if (hasAny(text, ["请为我通报", "求一见", "停留时间偏长", "谈话仍在继续"])) {
    return "medium";
  }

  return "low";
}

export function evaluateGoalPriority(context: EvaluationContext): PressureLevel {
  const text = textOf(context);
  const hints = context.pressureHints ?? [];

  if (
    hints.includes("state_survival") ||
    hints.includes("strategic_importance") ||
    hints.includes("zheng_crisis") ||
    hasAny(text, ["鍥藉嵄", "鍥撮儜", "鍒╂檵", "绉﹁繙鏅嬭繎"])
  ) {
    return "high";
  }

  if (
    hints.includes("alliance_pressure") ||
    hints.includes("suspicion_rising") ||
    hints.includes("gatekeeping") ||
    hasAny(text, ["鍋滅暀鏃堕棿鍋忛暱", "璇锋眰閫氭姤", "璇蜂负鎴戦€氭姤"])
  ) {
    return "medium";
  }

  if (context.reactionPattern === "ambiguous_speech" || context.observableEvent.visibility === "rumor") {
    return "low";
  }

  return "medium";
}

export function evaluateAuthorityConstraint(context: EvaluationContext): PressureLevel {
  switch (context.npcState.id) {
    case "guard":
      return "medium";
    case "yi_zhihu":
      return "medium";
    case "jin_envoy":
      return "medium";
    case "qin_duke":
    case "zheng_duke":
      return "low";
    default:
      return "low";
  }
}

export function evaluateRelationshipRisk(context: EvaluationContext): PressureLevel {
  const text = textOf(context);
  const pattern = context.reactionPattern;

  if (
    pattern === "grievance" ||
    pattern === "loyalty_conflict" ||
    hasAny(text, ["早不用我", "怨其不用", "国危才想起我"])
  ) {
    return "high";
  }

  if (pattern === "refusal" || pattern === "conditional_acceptance") {
    return "medium";
  }

  if (pattern === "ambiguous_speech") {
    return "low";
  }

  return "low";
}

export function evaluateInformationConfidence(context: EvaluationContext): InformationConfidence {
  const credibility = context.observableEvent.credibility;
  const visibility = context.observableEvent.visibility;
  const text = textOf(context);

  if (visibility === "full" && credibility === "high") {
    return "high";
  }

  if (
    context.npcState.id === "zheng_duke" &&
    visibility !== "full" &&
    hasAny(text, ["秦伯主帐", "秦营", "郑国使者进入秦伯主帐", "停留时间偏长"]) &&
    !hasAny(text, ["有人回报", "前来回报", "报称", "通报", "使者回告"])
  ) {
    return "low";
  }

  if (visibility === "partial" || credibility === "medium") {
    return "medium";
  }

  if (credibility === "unknown" || visibility === "rumor") {
    return "low";
  }

  return "medium";
}

export function evaluateEscalationNeed(context: EvaluationContext): PressureLevel {
  const pattern = context.reactionPattern;
  const timePressure = evaluateTimePressure(context);
  const relationshipRisk = evaluateRelationshipRisk(context);

  if (pattern === "grievance") {
    return maxPressure("high", timePressure, relationshipRisk);
  }

  if (pattern === "conditional_acceptance" || pattern === "loyalty_conflict") {
    return maxPressure("medium", timePressure);
  }

  if (pattern === "refusal") {
    return relationshipRisk === "high" ? "high" : "medium";
  }

  if (context.npcState.id === "jin_envoy" && hasAny(textOf(context), ["停留时间偏长", "进入秦伯主帐"])) {
    return "high";
  }

  return "low";
}

function evaluateAll(context: EvaluationContext): NPCPressureEvaluation {
  return {
    goalPriority: evaluateGoalPriority(context),
    timePressure: evaluateTimePressure(context),
    authorityConstraint: evaluateAuthorityConstraint(context),
    relationshipRisk: evaluateRelationshipRisk(context),
    informationConfidence: evaluateInformationConfidence(context),
    escalationNeed: evaluateEscalationNeed(context)
  };
}

function scoreAffordance(
  context: EvaluationContext,
  affordance: NPCAffordance,
  evaluation: NPCPressureEvaluation
): number {
  let score = 0;

  switch (affordance) {
    case "report":
    case "request_meeting":
      score += pressureScore[evaluation.escalationNeed] * 3;
      break;
    case "persuade_again":
    case "question":
    case "warn":
    case "negotiate":
    case "defer_decision":
    case "wait_for_report":
      score += pressureScore[evaluation.timePressure] * 2;
      break;
    case "block":
    case "delay":
    case "admit_conditionally":
    case "detain":
      score += pressureScore[evaluation.authorityConstraint] * 2;
      break;
    case "acknowledge_grievance":
    case "apologize_or_acknowledge_late_use":
      score += pressureScore[evaluation.relationshipRisk] * 3;
      break;
    case "withdraw_conditionally":
      score += Math.min(
        confidenceScore[evaluation.informationConfidence],
        pressureScore[evaluation.timePressure]
      );
      break;
    case "pressure_qin":
    case "urge":
    case "authorize_mission":
      score +=
        pressureScore[evaluation.goalPriority] +
        pressureScore[evaluation.escalationNeed] +
        pressureScore[evaluation.timePressure];
      break;
    case "observe_silently":
    case "do_nothing":
      score += 0;
      break;
    default:
      score += 0;
  }

  if (
    context.npcState.id === "yi_zhihu" &&
    context.reactionPattern === "refusal" &&
    !["grievance", "loyalty_conflict"].includes(String(context.reactionPattern))
  ) {
    if (affordance === "persuade_again" || affordance === "question") {
      score += 5;
    }
    if (affordance === "report") {
      score -= 2;
    }
  }

  if (context.npcState.id === "guard") {
    if (["report", "delay", "block"].includes(affordance)) {
      score += 4;
    }
    if (affordance === "admit_conditionally") {
      score += 2;
    }
  }

  if (context.npcState.id === "qin_duke") {
    if (["question", "defer_decision", "negotiate"].includes(affordance)) {
      score += 4;
    }
    if (
      affordance === "withdraw_conditionally" &&
      context.npcMemory.privateFlags.qinDukeWavering !== true
    ) {
      score -= 4;
    }
  }

  if (context.npcState.id === "jin_envoy") {
    if (["request_meeting", "warn"].includes(affordance)) {
      score += 6;
    }
    if (affordance === "pressure_qin") {
      score += 3;
    }
    if (affordance === "report") {
      score -= 2;
    }
  }

  if (context.npcState.id === "zheng_duke" && evaluation.informationConfidence === "low") {
    if (affordance === "wait_for_report") {
      score += 8;
    }
    if (
      ["request_meeting", "authorize_mission", "urge", "apologize_or_acknowledge_late_use"].includes(
        affordance
      )
    ) {
      score -= 3;
    }
  }

  return score;
}

export function rankAffordancesByEvaluation(
  context: EvaluationContext,
  affordances: NPCAffordance[]
): NPCAffordance[] {
  const evaluation = evaluateAll(context);

  return [...affordances].sort((left, right) => {
    const rightScore = scoreAffordance(context, right, evaluation);
    const leftScore = scoreAffordance(context, left, evaluation);

    return rightScore - leftScore;
  });
}

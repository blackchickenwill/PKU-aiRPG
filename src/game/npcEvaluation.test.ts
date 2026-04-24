import assert from "node:assert/strict";
import test from "node:test";

import { initialGameRuntimeState } from "./initialWorld";
import { getAvailableAffordances } from "./npcAffordances";
import {
  evaluateAuthorityConstraint,
  evaluateEscalationNeed,
  evaluateGoalPriority,
  evaluateInformationConfidence,
  rankAffordancesByEvaluation
} from "./npcEvaluation";
import type { EvaluationContext } from "./npcEvaluation";

function makeContext(
  npcId: keyof typeof initialGameRuntimeState.world.npcs,
  overrides: Partial<EvaluationContext> = {}
): EvaluationContext {
  const npcState = initialGameRuntimeState.world.npcs[npcId];
  const npcMemory = structuredClone(initialGameRuntimeState.npcMemories[npcId]);

  return {
    npcState,
    npcMemory,
    currentLocation: npcState.location,
    observableEvent: {
      id: `obs-${npcId}`,
      originalEventId: `event-${npcId}`,
      observerNpcId: npcId,
      visibility: "full",
      summaryForNpc: "默认观察事件。",
      knownDetails: [],
      hiddenDetails: [],
      credibility: "high"
    },
    reactionPattern: "none",
    pressureHints: [],
    ...overrides
  };
}

test("goal priority recognizes readable Chinese strategic interest keywords", () => {
  const qinNearJinFarContext = makeContext("qin_duke", {
    observableEvent: {
      id: "obs-readable-qin-far-jin-near",
      originalEventId: "event-readable-qin-far-jin-near",
      observerNpcId: "qin_duke",
      visibility: "full",
      summaryForNpc: "烛之武说明秦远晋近，亡郑未必利秦。",
      knownDetails: ["秦远晋近，亡郑主要利晋。"],
      hiddenDetails: [],
      credibility: "high"
    }
  });
  const jinBenefitContext = makeContext("qin_duke", {
    observableEvent: {
      id: "obs-readable-benefit-jin",
      originalEventId: "event-readable-benefit-jin",
      observerNpcId: "qin_duke",
      visibility: "full",
      summaryForNpc: "烛之武指出灭郑反而利晋。",
      knownDetails: ["若亡郑，则其地近晋而利晋。"],
      hiddenDetails: [],
      credibility: "high"
    }
  });

  assert.equal(evaluateGoalPriority(qinNearJinFarContext), "high");
  assert.equal(evaluateGoalPriority(jinBenefitContext), "high");
});

test("goal priority recognizes readable Chinese state-crisis keywords", () => {
  const stateCrisisContext = makeContext("yi_zhihu", {
    observableEvent: {
      id: "obs-readable-state-crisis",
      originalEventId: "event-readable-state-crisis",
      observerNpcId: "yi_zhihu",
      visibility: "full",
      summaryForNpc: "佚之狐听见国危之言。",
      knownDetails: ["秦晋围郑，国危在即。"],
      hiddenDetails: [],
      credibility: "high"
    }
  });

  assert.equal(evaluateGoalPriority(stateCrisisContext), "high");
});

test("goal priority recognizes readable Chinese request and delay cues as medium", () => {
  const audienceRequestContext = makeContext("guard", {
    observableEvent: {
      id: "obs-readable-request-report",
      originalEventId: "event-readable-request-report",
      observerNpcId: "guard",
      visibility: "full",
      summaryForNpc: "郑国使者请求通报。",
      knownDetails: ["请为我通报秦伯，愿求一见。"],
      hiddenDetails: [],
      credibility: "high"
    }
  });
  const suspiciousDelayContext = makeContext("jin_envoy", {
    observableEvent: {
      id: "obs-readable-suspicious-delay",
      originalEventId: "event-readable-suspicious-delay",
      observerNpcId: "jin_envoy",
      visibility: "partial",
      summaryForNpc: "郑国使者进入秦伯主帐后停留时间偏长。",
      knownDetails: ["停留时间偏长"],
      hiddenDetails: ["主帐内具体谈话内容"],
      credibility: "medium"
    }
  });

  assert.equal(evaluateGoalPriority(audienceRequestContext), "medium");
  assert.equal(evaluateGoalPriority(suspiciousDelayContext), "medium");
});

test("yi zhihu grievance context produces high escalation need", () => {
  const context = makeContext("yi_zhihu", {
    observableEvent: {
      id: "obs-yi-grievance",
      originalEventId: "event-yi-grievance",
      observerNpcId: "yi_zhihu",
      visibility: "full",
      summaryForNpc: "烛之武在宅中向你当面表明心意。",
      knownDetails: ["郑伯早不用我，如今国危才想起我？"],
      hiddenDetails: [],
      credibility: "high"
    },
    reactionPattern: "grievance",
    pressureHints: ["zheng_crisis", "time_urgent"]
  });

  assert.equal(evaluateEscalationNeed(context), "high");
});

test("yi zhihu mild refusal prefers persuade again and question over report when grievance is absent", () => {
  const context = makeContext("yi_zhihu", {
    observableEvent: {
      id: "obs-yi-refusal",
      originalEventId: "event-yi-refusal",
      observerNpcId: "yi_zhihu",
      visibility: "full",
      summaryForNpc: "烛之武在宅中向你当面表明心意。",
      knownDetails: ["我老矣，无能为也已。"],
      hiddenDetails: [],
      credibility: "high"
    },
    reactionPattern: "refusal",
    pressureHints: ["zheng_crisis", "time_urgent"]
  });

  const ranked = rankAffordancesByEvaluation(context, getAvailableAffordances(context));

  assert.ok(ranked.indexOf("persuade_again") < ranked.indexOf("report"));
  assert.ok(ranked.indexOf("question") < ranked.indexOf("report"));
});

test("guard audience request shows authority constraint and ranks report delay block", () => {
  const context = makeContext("guard", {
    currentLocation: "qin_camp_exterior",
    observableEvent: {
      id: "obs-guard-audience",
      originalEventId: "event-guard-audience",
      observerNpcId: "guard",
      visibility: "full",
      summaryForNpc: "烛之武在营外当面请求你代为通报秦伯。",
      knownDetails: ["请为我通报秦伯，愿求一见。"],
      hiddenDetails: [],
      credibility: "high"
    },
    pressureHints: ["gatekeeping", "authority_limited"]
  });

  const ranked = rankAffordancesByEvaluation(context, getAvailableAffordances(context));

  assert.equal(evaluateAuthorityConstraint(context), "medium");
  assert.ok(ranked.slice(0, 3).includes("report"));
  assert.ok(ranked.slice(0, 4).includes("delay"));
  assert.ok(ranked.slice(0, 4).includes("block"));
});

test("qin duke interest argument ranks question defer decision negotiate before withdraw conditionally unless wavering", () => {
  const baseContext = makeContext("qin_duke", {
    currentLocation: "qin_main_tent",
    observableEvent: {
      id: "obs-qin-interest",
      originalEventId: "event-qin-interest",
      observerNpcId: "qin_duke",
      visibility: "full",
      summaryForNpc: "烛之武在主帐中当面向你陈说利害。",
      knownDetails: ["秦远晋近，若亡郑，则利尽归于晋。"],
      hiddenDetails: [],
      credibility: "high"
    },
    pressureHints: ["strategic_importance"]
  });

  const baseRanked = rankAffordancesByEvaluation(
    baseContext,
    getAvailableAffordances(baseContext)
  );

  assert.equal(evaluateGoalPriority(baseContext), "high");
  assert.ok(baseRanked.indexOf("question") < baseRanked.indexOf("withdraw_conditionally"));
  assert.ok(baseRanked.indexOf("defer_decision") < baseRanked.indexOf("withdraw_conditionally"));
  assert.ok(baseRanked.indexOf("negotiate") < baseRanked.indexOf("withdraw_conditionally"));

  const waveringContext = {
    ...baseContext,
    npcMemory: {
      ...baseContext.npcMemory,
      privateFlags: {
        ...baseContext.npcMemory.privateFlags,
        qinDukeWavering: true
      }
    }
  };
  const waveringRanked = rankAffordancesByEvaluation(
    waveringContext,
    getAvailableAffordances(waveringContext)
  );

  assert.ok(waveringRanked.includes("withdraw_conditionally"));
});

test("jin envoy partial cue produces alliance pressure and ranks request meeting and warn", () => {
  const context = makeContext("jin_envoy", {
    currentLocation: "jin_camp_direction",
    observableEvent: {
      id: "obs-jin-cue",
      originalEventId: "event-jin-cue",
      observerNpcId: "jin_envoy",
      visibility: "partial",
      summaryForNpc: "你察觉郑国使者进入秦伯主帐后停留偏久。",
      knownDetails: ["郑国使者进入秦伯主帐", "停留时间偏长"],
      hiddenDetails: ["烛之武具体说了什么"],
      credibility: "medium"
    },
    pressureHints: ["alliance_pressure", "suspicion_rising"]
  });

  const ranked = rankAffordancesByEvaluation(context, getAvailableAffordances(context));

  assert.ok(ranked.slice(0, 3).includes("request_meeting"));
  assert.ok(ranked.slice(0, 3).includes("warn"));
});

test("zheng duke without report has low information confidence and ranks wait for report", () => {
  const context = makeContext("zheng_duke", {
    currentLocation: "zheng_palace",
    observableEvent: {
      id: "obs-zheng-no-report",
      originalEventId: "event-zheng-no-report",
      observerNpcId: "zheng_duke",
      visibility: "partial",
      summaryForNpc: "营外暂无可供你确认的回报。",
      knownDetails: ["郑国使者进入秦伯主帐", "停留时间偏长"],
      hiddenDetails: ["秦伯主帐内真实谈话内容"],
      credibility: "unknown"
    }
  });

  const ranked = rankAffordancesByEvaluation(context, getAvailableAffordances(context));

  assert.equal(evaluateInformationConfidence(context), "low");
  assert.equal(ranked[0], "wait_for_report");
});

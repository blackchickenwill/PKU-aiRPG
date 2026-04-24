import assert from "node:assert/strict";
import test from "node:test";

import { initialGameRuntimeState } from "./initialWorld";
import {
  validateNpcIntentionProposal,
  validateNpcMemoryPatchProposal
} from "./npcProposalValidator";
import type {
  GameRuntimeState,
  MemoryPatchProposal,
  NPCId,
  NPCIntentionProposal,
  ObservableEvent
} from "./types";

function cloneRuntime(): GameRuntimeState {
  return structuredClone(initialGameRuntimeState);
}

function setNpcLocation(
  runtime: GameRuntimeState,
  npcId: NPCId,
  location: GameRuntimeState["world"]["currentLocation"]
): GameRuntimeState {
  return {
    ...runtime,
    world: {
      ...runtime.world,
      npcs: {
        ...runtime.world.npcs,
        [npcId]: {
          ...runtime.world.npcs[npcId],
          location
        }
      }
    }
  };
}

function observable(
  npcId: NPCId,
  overrides: Partial<ObservableEvent> = {}
): ObservableEvent {
  return {
    id: `obs-${npcId}`,
    originalEventId: `event-${npcId}`,
    observerNpcId: npcId,
    visibility: "full",
    summaryForNpc: "Visible event for NPC proposal validation.",
    knownDetails: [],
    hiddenDetails: [],
    credibility: "high",
    ...overrides
  };
}

function intention(
  npcId: NPCId,
  source: ObservableEvent,
  intentionType: NPCIntentionProposal["intentionType"],
  target: NPCIntentionProposal["target"],
  summary: string
): NPCIntentionProposal {
  return {
    npcId,
    sourceObservableEventId: source.id,
    intentionType,
    target,
    summary,
    requiresValidation: true
  };
}

function guardAudienceObservation(): ObservableEvent {
  return observable("guard", {
    originalEventId: "event-guard-audience",
    summaryForNpc: "郑国使者在营外请求守卫代为通报秦伯。",
    knownDetails: ["请求通报秦伯", "郑国使者愿求一见"]
  });
}

function yiZhihuGrievanceObservation(): ObservableEvent {
  return observable("yi_zhihu", {
    originalEventId: "event-yi-grievance",
    summaryForNpc: "烛之武在宅中向佚之狐表达不平。",
    knownDetails: ["郑伯早不用我，如今国危才想起我。"]
  });
}

function qinFullArgumentObservation(): ObservableEvent {
  return observable("qin_duke", {
    originalEventId: "event-qin-argument",
    summaryForNpc: "烛之武在秦伯主帐中当面陈说利害。",
    knownDetails: ["秦远晋近，亡郑主要利晋。"]
  });
}

function jinPartialSuspicionObservation(): ObservableEvent {
  return observable("jin_envoy", {
    originalEventId: "event-jin-suspicion",
    visibility: "partial",
    summaryForNpc: "晋使察觉郑国使者进入秦伯主帐后停留偏久。",
    knownDetails: ["郑国使者进入秦伯主帐", "停留时间偏长"],
    hiddenDetails: ["秦帐内具体谈判内容"],
    credibility: "medium"
  });
}

test("guard report to Qin Duke is valid after guard observes audience request", () => {
  const runtime = setNpcLocation(cloneRuntime(), "guard", "qin_camp_exterior");
  const source = guardAudienceObservation();
  const result = validateNpcIntentionProposal(
    {
      runtime,
      observableEvent: source,
      pressureHints: ["gatekeeping", "authority_limited"]
    },
    intention("guard", source, "report", "qin_duke", "向秦伯通报郑国使者请求入见。")
  );

  assert.equal(result.status, "accepted");
  assert.equal(result.generatedEvents[0].type, "dialogue");
  assert.equal(result.generatedEvents[0].actor, "guard");
  assert.equal(result.generatedEvents[0].target, "qin_duke");
  assert.equal(result.generatedEvents[0].payload.proposedOnly, true);
  assert.equal(runtime.world.flags.audienceRequestedAtQinCamp, false);
});

test("guard cannot withdraw Qin army", () => {
  const runtime = setNpcLocation(cloneRuntime(), "guard", "qin_camp_exterior");
  const source = guardAudienceObservation();
  const result = validateNpcIntentionProposal(
    { runtime, observableEvent: source },
    intention("guard", source, "withdraw_conditionally", "qin", "守卫决定秦军已经撤军。")
  );

  assert.equal(result.status, "rejected");
  assert.match(result.reason, /authority|lacks/i);
});

test("Yi Zhi Hu can report and request meeting Zheng Duke after observing grievance", () => {
  const runtime = setNpcLocation(cloneRuntime(), "yi_zhihu", "zhu_home");
  const source = yiZhihuGrievanceObservation();

  for (const intentionType of ["report", "request_meeting"] as const) {
    const result = validateNpcIntentionProposal(
      {
        runtime,
        observableEvent: source,
        reactionPattern: "grievance",
        pressureHints: ["zheng_crisis", "time_urgent"]
      },
      intention(
        "yi_zhihu",
        source,
        intentionType,
        "zheng_duke",
        "向郑伯说明烛之武心有积怨，或需亲自相请。"
      )
    );

    assert.equal(result.status, "accepted");
    assert.equal(result.generatedEvents[0].actor, "yi_zhihu");
    assert.equal(result.generatedEvents[0].target, "zheng_duke");
  }
});

test("Yi Zhi Hu cannot directly update Zheng Duke memory", () => {
  const runtime = cloneRuntime();
  const source = yiZhihuGrievanceObservation();
  const patch: MemoryPatchProposal = {
    npcId: "zheng_duke",
    sourceObservableEventId: source.id,
    addBeliefs: ["烛之武已经愿意出使。"]
  };
  const result = validateNpcMemoryPatchProposal({ runtime, observableEvent: source }, patch);

  assert.equal(result.status, "rejected");
  assert.deepEqual(
    runtime.npcMemories.zheng_duke,
    initialGameRuntimeState.npcMemories.zheng_duke
  );
});

test("Qin Duke can question player after full Qin tent argument", () => {
  const runtime = setNpcLocation(cloneRuntime(), "qin_duke", "qin_main_tent");
  const source = qinFullArgumentObservation();
  const result = validateNpcIntentionProposal(
    {
      runtime,
      observableEvent: source,
      pressureHints: ["strategic_importance", "alliance_fragile"]
    },
    intention(
      "qin_duke",
      source,
      "question",
      "player",
      "追问郑国若存，究竟能为秦国带来何种实际利益。"
    )
  );

  assert.equal(result.status, "accepted");
  assert.equal(result.generatedEvents[0].type, "dialogue");
  assert.equal(result.generatedEvents[0].actor, "qin_duke");
  assert.equal(result.generatedEvents[0].payload.targetPlayer, true);
});

test("Qin Duke cannot directly mutate flags or make withdrawal a committed fact through intention alone", () => {
  const runtime = setNpcLocation(cloneRuntime(), "qin_duke", "qin_main_tent");
  const source = qinFullArgumentObservation();
  const result = validateNpcIntentionProposal(
    { runtime, observableEvent: source },
    intention(
      "qin_duke",
      source,
      "withdraw_conditionally",
      "qin",
      "直接修改 WorldState：qinTentDiplomacyOccurred=true，秦军已经撤退。"
    )
  );

  assert.equal(result.status, "rejected");
  assert.equal(runtime.world.flags.qinTentDiplomacyOccurred, undefined);
});

test("Jin Envoy can request meeting and warn after partial suspicion", () => {
  const runtime = setNpcLocation(cloneRuntime(), "jin_envoy", "jin_camp_direction");
  const source = jinPartialSuspicionObservation();

  for (const intentionType of ["request_meeting", "warn"] as const) {
    const result = validateNpcIntentionProposal(
      {
        runtime,
        observableEvent: source,
        pressureHints: ["alliance_pressure", "suspicion_rising"]
      },
      intention(
        "jin_envoy",
        source,
        intentionType,
        "qin_duke",
        "提醒秦方：郑国使者久留主帐，秦晋同盟不可被动摇。"
      )
    );

    assert.equal(result.status, "accepted");
    assert.equal(result.generatedEvents[0].actor, "jin_envoy");
    assert.equal(result.generatedEvents[0].target, "qin_duke");
  }
});

test("Jin Envoy cannot include hidden Qin tent content", () => {
  const runtime = setNpcLocation(cloneRuntime(), "jin_envoy", "jin_camp_direction");
  const source = jinPartialSuspicionObservation();
  const result = validateNpcIntentionProposal(
    {
      runtime,
      observableEvent: source,
      pressureHints: ["alliance_pressure", "suspicion_rising"]
    },
    intention(
      "jin_envoy",
      source,
      "request_meeting",
      "qin_duke",
      "请求会见秦伯，并复述秦帐内具体谈判内容。"
    )
  );

  assert.equal(result.status, "rejected");
  assert.match(result.reason, /hidden/i);
});

test("Zheng Duke without report cannot react to Qin tent details", () => {
  const runtime = setNpcLocation(cloneRuntime(), "zheng_duke", "zheng_palace");
  const source = observable("zheng_duke", {
    id: "obs-zheng-without-report",
    originalEventId: "event-qin-tent",
    visibility: "partial",
    summaryForNpc: "郑伯尚未收到秦营回报。",
    knownDetails: [],
    hiddenDetails: ["秦帐内谈判细节"],
    credibility: "unknown"
  });
  const result = validateNpcIntentionProposal(
    { runtime, observableEvent: source },
    intention(
      "zheng_duke",
      source,
      "request_meeting",
      "player",
      "郑伯直接追问秦帐内谈判细节。"
    )
  );

  assert.equal(result.status, "rejected");
  assert.match(result.reason, /hidden|affordance/i);
});

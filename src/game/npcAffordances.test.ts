import assert from "node:assert/strict";
import test from "node:test";

import { initialGameRuntimeState } from "./initialWorld";
import { getAvailableAffordances } from "./npcAffordances";
import type { AffordanceContext } from "./npcAffordances";

function makeContext(
  npcId: keyof typeof initialGameRuntimeState.world.npcs,
  overrides: Partial<AffordanceContext> = {}
): AffordanceContext {
  const npcState = initialGameRuntimeState.world.npcs[npcId];
  const npcMemory = initialGameRuntimeState.npcMemories[npcId];

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

test("yi zhihu grievance context includes acknowledge grievance report and request meeting", () => {
  const affordances = getAvailableAffordances(
    makeContext("yi_zhihu", {
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
    })
  );

  assert.ok(affordances.includes("acknowledge_grievance"));
  assert.ok(affordances.includes("report"));
  assert.ok(affordances.includes("request_meeting"));
  assert.ok(!affordances.includes("detain"));
});

test("guard audience request context includes report block delay but not withdraw conditionally", () => {
  const affordances = getAvailableAffordances(
    makeContext("guard", {
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
      }
    })
  );

  assert.ok(affordances.includes("report"));
  assert.ok(affordances.includes("block"));
  assert.ok(affordances.includes("delay"));
  assert.ok(!affordances.includes("withdraw_conditionally"));
});

test("qin duke interest-analysis context includes question negotiate defer decision without direct withdrawal commit", () => {
  const affordances = getAvailableAffordances(
    makeContext("qin_duke", {
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
      }
    })
  );

  assert.ok(affordances.includes("question"));
  assert.ok(affordances.includes("negotiate"));
  assert.ok(affordances.includes("defer_decision"));
  assert.ok(!affordances.includes("authorize_mission"));
});

test("jin envoy partial suspicion context includes warn request meeting pressure qin but no hidden-content actions", () => {
  const affordances = getAvailableAffordances(
    makeContext("jin_envoy", {
      currentLocation: "jin_camp_direction",
      observableEvent: {
        id: "obs-jin-suspicion",
        originalEventId: "event-jin-suspicion",
        observerNpcId: "jin_envoy",
        visibility: "partial",
        summaryForNpc: "你察觉郑国使者进入秦伯主帐后停留偏久。",
        knownDetails: ["郑国使者进入秦伯主帐", "停留时间偏长"],
        hiddenDetails: ["烛之武具体说了什么"],
        credibility: "medium"
      }
    })
  );

  assert.ok(affordances.includes("warn"));
  assert.ok(affordances.includes("request_meeting"));
  assert.ok(affordances.includes("pressure_qin"));
  assert.ok(!affordances.includes("negotiate"));
});

test("zheng duke without report cannot react to qin tent events", () => {
  const affordances = getAvailableAffordances(
    makeContext("zheng_duke", {
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
    })
  );

  assert.deepEqual(affordances, ["wait_for_report", "observe_silently", "do_nothing"]);
});

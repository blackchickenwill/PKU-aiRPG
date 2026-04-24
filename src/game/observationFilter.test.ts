import assert from "node:assert/strict";
import test from "node:test";

import { initialGameRuntimeState } from "./initialWorld";
import { filterEventForAllNpcs, filterEventForNpc } from "./observationFilter";
import { parsePlayerActionMock } from "./parserMock";
import { validateActionProposal } from "./validator";
import type { GameRuntimeState, GameEvent } from "./types";

function cloneRuntime(runtime: GameRuntimeState): GameRuntimeState {
  return structuredClone(runtime);
}

function setLocation(
  runtime: GameRuntimeState,
  currentLocation: GameRuntimeState["world"]["currentLocation"]
): GameRuntimeState {
  return {
    ...runtime,
    world: {
      ...runtime.world,
      currentLocation
    }
  };
}

function makeValidatedEvent(
  runtime: GameRuntimeState,
  rawInput: string,
  overrides: Partial<ReturnType<typeof parsePlayerActionMock>> = {}
): GameEvent {
  const proposal = {
    ...parsePlayerActionMock({
      rawInput,
      currentLocation: runtime.world.currentLocation,
      timestamp: 0
    }),
    ...overrides
  };
  const result = validateActionProposal(runtime, proposal);

  assert.notEqual(result.status, "rejected");

  return result.generatedEvents[0];
}

test("yi zhihu fully observes opening refusal at zhu home", () => {
  const runtime = cloneRuntime(initialGameRuntimeState);
  const event = makeValidatedEvent(runtime, "我老矣，无能为也已。");

  const observation = filterEventForNpc(event, "yi_zhihu", runtime);

  assert.ok(observation);
  assert.equal(observation.visibility, "full");
  assert.equal(observation.observerNpcId, "yi_zhihu");
  assert.match(observation.knownDetails.join(" "), /我老矣/u);
});

test("zheng duke does not observe opening refusal at zhu home", () => {
  const runtime = cloneRuntime(initialGameRuntimeState);
  const event = makeValidatedEvent(runtime, "我老矣，无能为也已。");

  const observation = filterEventForNpc(event, "zheng_duke", runtime);

  assert.equal(observation, null);
});

test("qin duke does not observe opening refusal at zhu home", () => {
  const runtime = cloneRuntime(initialGameRuntimeState);
  const event = makeValidatedEvent(runtime, "我老矣，无能为也已。");

  const observation = filterEventForNpc(event, "qin_duke", runtime);

  assert.equal(observation, null);
});

test("qin duke fully observes direct qin main tent diplomacy", () => {
  const runtime = setLocation(cloneRuntime(initialGameRuntimeState), "qin_main_tent");
  const event = makeValidatedEvent(
    runtime,
    "秦远晋近，若亡郑，则利尽归于晋，请君熟思。",
    { targetNPC: "qin_duke" }
  );

  const observation = filterEventForNpc(event, "qin_duke", runtime);

  assert.ok(observation);
  assert.equal(observation.visibility, "full");
  assert.match(observation.knownDetails.join(" "), /利尽归于晋/u);
});

test("jin envoy does not know exact qin tent dialogue content", () => {
  const runtime = setLocation(cloneRuntime(initialGameRuntimeState), "qin_main_tent");
  const rawInput = "秦远晋近，若亡郑，则利尽归于晋，请君熟思。";
  const event = makeValidatedEvent(runtime, rawInput, { targetNPC: "qin_duke" });

  const observation = filterEventForNpc(event, "jin_envoy", runtime);

  assert.ok(observation);
  assert.equal(observation.visibility, "partial");
  assert.deepEqual(
    observation.knownDetails,
    ["郑国使者进入秦伯主帐", "停留时间偏长"]
  );
  assert.ok(observation.hiddenDetails.some((detail) => /具体/u.test(detail)));
  assert.ok(!observation.knownDetails.some((detail) => detail.includes(rawInput)));
});

test("guard only has partial visibility of qin tent dialogue", () => {
  const runtime = setLocation(cloneRuntime(initialGameRuntimeState), "qin_main_tent");
  const event = makeValidatedEvent(
    runtime,
    "秦远晋近，若亡郑，则利尽归于晋，请君熟思。",
    { targetNPC: "qin_duke" }
  );

  const observation = filterEventForNpc(event, "guard", runtime);

  assert.ok(observation);
  assert.equal(observation.visibility, "partial");
  assert.ok(observation.knownDetails.includes("帐中谈话仍在继续"));
  assert.ok(observation.hiddenDetails.some((detail) => /具体|真实判断/u.test(detail)));
});

test("unrelated npcs get null for qin tent diplomacy", () => {
  const runtime = setLocation(cloneRuntime(initialGameRuntimeState), "qin_main_tent");
  const event = makeValidatedEvent(
    runtime,
    "秦远晋近，若亡郑，则利尽归于晋，请君熟思。",
    { targetNPC: "qin_duke" }
  );

  assert.equal(filterEventForNpc(event, "zheng_duke", runtime), null);
  assert.equal(filterEventForNpc(event, "yi_zhihu", runtime), null);
  assert.equal(filterEventForNpc(event, "commoner_rep", runtime), null);
});

test("filterEventForAllNpcs returns only non-null observations", () => {
  const runtime = setLocation(cloneRuntime(initialGameRuntimeState), "qin_main_tent");
  const event = makeValidatedEvent(
    runtime,
    "秦远晋近，若亡郑，则利尽归于晋，请君熟思。",
    { targetNPC: "qin_duke" }
  );

  const observations = filterEventForAllNpcs(event, runtime);

  assert.deepEqual(
    observations.map((observation) => observation.observerNpcId).sort(),
    ["guard", "jin_envoy", "qin_duke"]
  );
  assert.ok(observations.every((observation) => observation !== null));
});

test("qin camp exterior request is fully visible only to guard", () => {
  const runtime = setLocation(
    cloneRuntime(initialGameRuntimeState),
    "qin_camp_exterior"
  );
  const event = makeValidatedEvent(runtime, "请为我通报秦伯，愿求一见。");

  const guardObservation = filterEventForNpc(event, "guard", runtime);
  const qinDukeObservation = filterEventForNpc(event, "qin_duke", runtime);
  const jinEnvoyObservation = filterEventForNpc(event, "jin_envoy", runtime);
  const zhengObservation = filterEventForNpc(event, "zheng_duke", runtime);

  assert.ok(guardObservation);
  assert.equal(guardObservation.visibility, "full");
  assert.equal(qinDukeObservation, null);
  assert.equal(jinEnvoyObservation, null);
  assert.equal(zhengObservation, null);
});

test("movement creates destination-side partial observation for npcs present there", () => {
  const runtime = cloneRuntime(initialGameRuntimeState);
  const event: GameEvent = {
    id: "movement-1",
    type: "movement",
    summary: "烛之武前往郑伯宫室。",
    actor: "player",
    target: "zheng_palace",
    location: "zheng_palace",
    payload: {
      from: "zhu_home",
      to: "zheng_palace",
      rawInput: "我去郑伯宫室。"
    },
    important: true
  };

  const zhengDukeObservation = filterEventForNpc(event, "zheng_duke", runtime);
  const qinDukeObservation = filterEventForNpc(event, "qin_duke", runtime);

  assert.ok(zhengDukeObservation);
  assert.equal(zhengDukeObservation.visibility, "partial");
  assert.match(zhengDukeObservation.summaryForNpc, /来到此地/u);
  assert.equal(qinDukeObservation, null);
});

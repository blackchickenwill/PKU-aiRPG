import assert from "node:assert/strict";
import test from "node:test";

import { initialGameRuntimeState } from "./initialWorld";
import { runNpcKernelMock } from "./npcKernel";
import { filterEventForNpc } from "./observationFilter";
import { parsePlayerActionMock } from "./parserMock";
import { validateActionProposal } from "./validator";
import type { GameRuntimeState, GameEvent, NPCId, NPCKernelInput } from "./types";

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

function buildKernelInput(
  runtime: GameRuntimeState,
  npcId: NPCId,
  event: GameEvent
): NPCKernelInput {
  const observableEvent = filterEventForNpc(event, npcId, runtime);
  assert.ok(observableEvent);

  return {
    npcState: runtime.world.npcs[npcId],
    npcMemory: runtime.npcMemories[npcId],
    observableEvent,
    publicWorldSummary: `当前时段：${runtime.world.timeStage}。地点：${runtime.world.currentLocation}。`,
    localSceneSummary: runtime.world.locations[runtime.world.currentLocation].description,
    relevantKnownFacts: []
  };
}

test("qin duke kernel becomes cautious after hearing full interest argument", () => {
  const runtime = setLocation(cloneRuntime(initialGameRuntimeState), "qin_main_tent");
  const event = makeValidatedEvent(
    runtime,
    "秦远晋近，若亡郑，则利尽归于晋，请君熟思。",
    { targetNPC: "qin_duke" }
  );
  const input = buildKernelInput(runtime, "qin_duke", event);

  const output = runNpcKernelMock(input);

  assert.equal(output.npcId, "qin_duke");
  assert.ok(output.memoryPatch);
  assert.ok(output.intention);
  assert.equal(output.intention?.intentionType, "question");
  assert.equal(output.intention?.target, "player");
  assert.equal(output.memoryPatch?.privateFlagUpdates?.qinDukeWavering, true);
  assert.ok(output.dialogue?.includes("郑若得存"));
});

test("jin envoy kernel reacts only to suspicious external cue, not hidden content", () => {
  const runtime = setLocation(cloneRuntime(initialGameRuntimeState), "qin_main_tent");
  const rawInput = "秦远晋近，若亡郑，则利尽归于晋，请君熟思。";
  const event = makeValidatedEvent(runtime, rawInput, { targetNPC: "qin_duke" });
  const input = buildKernelInput(runtime, "jin_envoy", event);

  const output = runNpcKernelMock(input);

  assert.equal(output.npcId, "jin_envoy");
  assert.ok(output.memoryPatch);
  assert.ok(output.intention);
  assert.equal(output.intention?.target, "qin_duke");
  assert.equal(output.memoryPatch?.privateFlagUpdates?.jinEnvoySuspicious, true);
  assert.ok(
    !output.memoryPatch?.addEpisodicMemory?.some((detail) => detail.includes(rawInput))
  );
});

test("zheng duke kernel does not update qin tent event without report", () => {
  const runtime = setLocation(cloneRuntime(initialGameRuntimeState), "qin_main_tent");
  const event = makeValidatedEvent(
    runtime,
    "秦远晋近，若亡郑，则利尽归于晋，请君熟思。",
    { targetNPC: "qin_duke" }
  );

  const output = runNpcKernelMock({
    npcState: runtime.world.npcs.zheng_duke,
    npcMemory: runtime.npcMemories.zheng_duke,
    observableEvent: {
      id: "manual-zheng-null-like",
      originalEventId: event.id,
      observerNpcId: "zheng_duke",
      visibility: "partial",
      summaryForNpc: "营外暂无可供你确认的回报。",
      knownDetails: [],
      hiddenDetails: ["秦伯主帐内真实谈话内容"],
      credibility: "unknown"
    },
    publicWorldSummary: `当前时段：${runtime.world.timeStage}。`,
    localSceneSummary: runtime.world.locations.zheng_palace.description,
    relevantKnownFacts: []
  });

  assert.equal(output.npcId, "zheng_duke");
  assert.equal(output.memoryPatch, undefined);
  assert.equal(output.intention, undefined);
});

test("guard kernel turns audience request into a report proposal", () => {
  const runtime = setLocation(
    cloneRuntime(initialGameRuntimeState),
    "qin_camp_exterior"
  );
  const event = makeValidatedEvent(runtime, "请为我通报秦伯，愿求一见。");
  const input = buildKernelInput(runtime, "guard", event);

  const output = runNpcKernelMock(input);

  assert.equal(output.npcId, "guard");
  assert.ok(output.memoryPatch);
  assert.ok(output.intention);
  assert.equal(output.intention?.intentionType, "report");
  assert.equal(output.intention?.target, "qin_duke");
  assert.equal(output.memoryPatch?.privateFlagUpdates?.pendingAudienceRequest, true);
});

test("dispatcher returns no-op output when input observer does not match npc state", () => {
  const runtime = setLocation(cloneRuntime(initialGameRuntimeState), "qin_main_tent");
  const event = makeValidatedEvent(
    runtime,
    "秦远晋近，若亡郑，则利尽归于晋，请君熟思。",
    { targetNPC: "qin_duke" }
  );
  const qinObservation = filterEventForNpc(event, "qin_duke", runtime);

  assert.ok(qinObservation);

  const output = runNpcKernelMock({
    npcState: runtime.world.npcs.jin_envoy,
    npcMemory: runtime.npcMemories.jin_envoy,
    observableEvent: qinObservation,
    publicWorldSummary: `当前时段：${runtime.world.timeStage}。`,
    localSceneSummary: runtime.world.locations.qin_main_tent.description,
    relevantKnownFacts: []
  });

  assert.equal(output.npcId, "jin_envoy");
  assert.equal(output.memoryPatch, undefined);
  assert.equal(output.intention, undefined);
  assert.match(output.debugSummary, /mismatch/i);
});

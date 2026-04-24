import assert from "node:assert/strict";
import test from "node:test";

import { initialGameRuntimeState } from "./initialWorld";
import {
  applyMemoryPatchProposal,
  restoreNpcMemoryStore
} from "./npcMemory";
import { filterEventForNpc } from "./observationFilter";
import { parsePlayerActionMock } from "./parserMock";
import { validateActionProposal } from "./validator";
import type { GameRuntimeState, GameEvent, MemoryPatchProposal } from "./types";

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

test("memory patch applies only when sourced from the observer's observable event", () => {
  const runtime = setLocation(cloneRuntime(initialGameRuntimeState), "qin_main_tent");
  const beforeStore = structuredClone(runtime.npcMemories);
  const event = makeValidatedEvent(
    runtime,
    "秦远晋近，若亡郑，则利尽归于晋，请君熟思。",
    { targetNPC: "qin_duke" }
  );
  const observableEvent = filterEventForNpc(event, "qin_duke", runtime);

  assert.ok(observableEvent);

  const patch: MemoryPatchProposal = {
    npcId: "qin_duke",
    sourceObservableEventId: observableEvent.id,
    addEpisodicMemory: ["烛之武提出灭郑未必利秦、实利或归晋。"],
    addBeliefs: ["灭郑未必最利秦，晋国可能因郑亡而坐大。"],
    addDoubts: ["郑国若存，是否真能为秦带来实际利益？"],
    attitudeUpdates: {
      player: "wary_but_listening",
      jin: "ally_but_needs_reassessment"
    },
    lastPlayerInteraction: "烛之武以秦晋利害分歧说服秦伯。",
    privateFlagUpdates: {
      qinDukeWavering: true
    }
  };

  const result = applyMemoryPatchProposal(runtime.npcMemories, patch, observableEvent);

  assert.equal(result.status, "accepted");
  assert.ok(result.appliedMemory);
  assert.ok(
    result.nextStore.qin_duke.episodicMemory.includes(
      "烛之武提出灭郑未必利秦、实利或归晋。"
    )
  );
  assert.ok(
    result.nextStore.qin_duke.beliefs.includes(
      "灭郑未必最利秦，晋国可能因郑亡而坐大。"
    )
  );
  assert.equal(result.nextStore.qin_duke.privateFlags.qinDukeWavering, true);
  assert.equal(runtime.npcMemories.qin_duke.privateFlags.qinDukeWavering, undefined);
  assert.deepEqual(runtime.npcMemories, beforeStore);
});

test("invisible events cannot update npc memory", () => {
  const runtime = setLocation(cloneRuntime(initialGameRuntimeState), "qin_main_tent");
  const event = makeValidatedEvent(
    runtime,
    "秦远晋近，若亡郑，则利尽归于晋，请君熟思。",
    { targetNPC: "qin_duke" }
  );
  const invisibleObservation = filterEventForNpc(event, "zheng_duke", runtime);

  const result = applyMemoryPatchProposal(
    runtime.npcMemories,
    {
      npcId: "zheng_duke",
      sourceObservableEventId: "missing-observation",
      addBeliefs: ["秦伯可能已被说动。"]
    },
    invisibleObservation
  );

  assert.equal(result.status, "rejected");
  assert.match(result.reason, /可见事件来源|不能落盘/u);
  assert.deepEqual(result.nextStore, runtime.npcMemories);
});

test("memory patch rejects ownership mismatch between patch and observer", () => {
  const runtime = setLocation(cloneRuntime(initialGameRuntimeState), "qin_main_tent");
  const event = makeValidatedEvent(
    runtime,
    "秦远晋近，若亡郑，则利尽归于晋，请君熟思。",
    { targetNPC: "qin_duke" }
  );
  const observableEvent = filterEventForNpc(event, "jin_envoy", runtime);

  assert.ok(observableEvent);

  const result = applyMemoryPatchProposal(
    runtime.npcMemories,
    {
      npcId: "qin_duke",
      sourceObservableEventId: observableEvent.id,
      addDoubts: ["晋使不应知道的内容被错误写入。"]
    },
    observableEvent
  );

  assert.equal(result.status, "rejected");
  assert.match(result.reason, /归属 NPC|观察者/u);
});

test("memory patch rejects mismatched source observable event id", () => {
  const runtime = setLocation(cloneRuntime(initialGameRuntimeState), "qin_main_tent");
  const event = makeValidatedEvent(
    runtime,
    "秦远晋近，若亡郑，则利尽归于晋，请君熟思。",
    { targetNPC: "qin_duke" }
  );
  const observableEvent = filterEventForNpc(event, "guard", runtime);

  assert.ok(observableEvent);

  const result = applyMemoryPatchProposal(
    runtime.npcMemories,
    {
      npcId: "guard",
      sourceObservableEventId: "wrong-id",
      addEpisodicMemory: ["错误引用的观察事件。"]
    },
    observableEvent
  );

  assert.equal(result.status, "rejected");
  assert.match(result.reason, /ObservableEvent/u);
});

test("memory store snapshot can be restored for rollback", () => {
  const runtime = setLocation(cloneRuntime(initialGameRuntimeState), "qin_main_tent");
  const snapshot = restoreNpcMemoryStore(runtime.npcMemories);
  const event = makeValidatedEvent(
    runtime,
    "秦远晋近，若亡郑，则利尽归于晋，请君熟思。",
    { targetNPC: "qin_duke" }
  );
  const observableEvent = filterEventForNpc(event, "qin_duke", runtime);

  assert.ok(observableEvent);

  const result = applyMemoryPatchProposal(
    runtime.npcMemories,
    {
      npcId: "qin_duke",
      sourceObservableEventId: observableEvent.id,
      addBeliefs: ["郑若存，或可为秦国东方往来之助。"]
    },
    observableEvent
  );

  assert.equal(result.status, "accepted");

  const restored = restoreNpcMemoryStore(snapshot);

  assert.deepEqual(restored, runtime.npcMemories);
  assert.ok(
    !restored.qin_duke.beliefs.includes("郑若存，或可为秦国东方往来之助。")
  );
});

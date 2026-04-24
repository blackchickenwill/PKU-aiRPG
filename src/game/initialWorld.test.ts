import test from "node:test";
import assert from "node:assert/strict";

import {
  initialGameRuntimeState,
  initialKnowledge,
  initialLocations,
  initialNpcMemories,
  initialNpcs,
  initialWorldState
} from "./initialWorld";
import {
  gameRuntimeStateSchema,
  npcMemoryStoreSchema,
  worldStateSchema
} from "./schemas";

test("initial world state passes schema validation", () => {
  const result = worldStateSchema.safeParse(initialWorldState);
  assert.equal(result.success, true);
});

test("initial npc memory store passes schema validation", () => {
  const result = npcMemoryStoreSchema.safeParse(initialNpcMemories);
  assert.equal(result.success, true);
});

test("initial runtime state passes schema validation", () => {
  const result = gameRuntimeStateSchema.safeParse(initialGameRuntimeState);
  assert.equal(result.success, true);
});

test("all required initial npc ids and location ids exist", () => {
  assert.deepEqual(Object.keys(initialNpcs).sort(), [
    "commoner_rep",
    "guard",
    "jin_envoy",
    "qin_duke",
    "yi_zhihu",
    "zheng_duke"
  ]);

  assert.deepEqual(Object.keys(initialLocations).sort(), [
    "city_gate",
    "jin_camp_direction",
    "market",
    "qin_camp_exterior",
    "qin_main_tent",
    "zheng_palace",
    "zhu_home"
  ]);
});

test("key npcs have independent memory objects", () => {
  assert.notStrictEqual(
    initialNpcMemories.qin_duke,
    initialNpcMemories.zheng_duke
  );
  assert.notStrictEqual(
    initialNpcMemories.qin_duke.episodicMemory,
    initialNpcMemories.zheng_duke.episodicMemory
  );
  assert.notStrictEqual(
    initialNpcMemories.jin_envoy.beliefs,
    initialNpcMemories.qin_duke.beliefs
  );
});

test("initial knowledge is available and anchored to opening state", () => {
  assert.ok(initialKnowledge.qin_jin_besiege_zheng);
  assert.ok(initialKnowledge.opening_briefing_player_context);
  assert.equal(initialWorldState.timeStage, "夜初");
  assert.equal(initialGameRuntimeState.world.currentLocation, "zhu_home");
});

test("yi zhi hu starts at zhu home for the opening inform scene", () => {
  assert.equal(initialNpcs.yi_zhihu.location, "zhu_home");
  assert.deepEqual(initialLocations.zhu_home.presentNPCs, ["yi_zhihu"]);
  assert.deepEqual(initialLocations.zheng_palace.presentNPCs, ["zheng_duke"]);
});

test("qin far jin near starts as high credibility and eastern host is not yet qin duke knowledge", () => {
  assert.equal(initialKnowledge.qin_far_jin_near.credibility, "high");
  assert.equal(
    initialKnowledge.qin_far_jin_near.knownByNPCs.includes("qin_duke"),
    true
  );
  assert.equal(
    initialKnowledge.zheng_as_eastern_host.knownByNPCs.includes("qin_duke"),
    false
  );
});

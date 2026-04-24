import assert from "node:assert/strict";
import test from "node:test";

import {
  detectReactionPatternFromObservation,
  suggestNpcAffordanceFromPattern
} from "./reactionPatterns";
import { initialGameRuntimeState } from "./initialWorld";

function makeObservation(rawInput: string) {
  return {
    observableEvent: {
      id: "obs-1",
      originalEventId: "event-1",
      observerNpcId: "yi_zhihu" as const,
      visibility: "full" as const,
      summaryForNpc: "烛之武在宅中向你当面表明心意。",
      knownDetails: ["烛之武当面作答", rawInput],
      hiddenDetails: [],
      credibility: "high" as const
    }
  };
}

test("generic reaction pattern detects refusal", () => {
  const pattern = detectReactionPatternFromObservation(
    makeObservation("我老矣，无能为也已。")
  );

  assert.equal(pattern, "refusal");
});

test("generic reaction pattern detects grievance", () => {
  const pattern = detectReactionPatternFromObservation(
    makeObservation("郑伯早不用我，如今国危才想起我？")
  );

  assert.equal(pattern, "grievance");
});

test("generic reaction pattern detects conditional acceptance", () => {
  const pattern = detectReactionPatternFromObservation(
    makeObservation("若郑伯亲自见我，说明其意，我再考虑。")
  );

  assert.equal(pattern, "conditional_acceptance");
});

test("generic reaction pattern detects loyalty conflict", () => {
  const pattern = detectReactionPatternFromObservation(
    makeObservation("我虽怨其不用，然郑国不可亡。")
  );

  assert.equal(pattern, "loyalty_conflict");
});

test("generic affordance suggestion remains reusable and non-branchy", () => {
  const affordances = suggestNpcAffordanceFromPattern({
    npcState: initialGameRuntimeState.world.npcs.yi_zhihu,
    npcMemory: initialGameRuntimeState.npcMemories.yi_zhihu,
    observableEvent: makeObservation("郑伯早不用我，如今国危才想起我？").observableEvent,
    pattern: "grievance"
  });

  assert.ok(affordances.includes("acknowledge_grievance"));
  assert.ok(
    affordances.includes("request_meeting") || affordances.includes("report")
  );
});

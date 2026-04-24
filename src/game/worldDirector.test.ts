import assert from "node:assert/strict";
import test from "node:test";

import { initialGameRuntimeState } from "./initialWorld";
import { runWorldDirector } from "./worldDirector";
import type {
  ActorId,
  GameEvent,
  GameRuntimeState,
  LocationId,
  NPCId,
  NPCIntentionProposal,
  ObservableEvent
} from "./types";

function cloneRuntime(): GameRuntimeState {
  return structuredClone(initialGameRuntimeState);
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
    summaryForNpc: "Visible event for world director scheduling.",
    knownDetails: [],
    hiddenDetails: [],
    credibility: "high",
    ...overrides
  };
}

function proposalEvent(input: {
  id: string;
  actor: ActorId;
  intentionType: NPCIntentionProposal["intentionType"];
  target?: NPCId;
  targetPlayer?: boolean;
  location?: LocationId;
  summary?: string;
  important?: boolean;
}): GameEvent {
  return {
    id: input.id,
    type: ["report", "request_meeting", "warn", "question"].includes(
      input.intentionType
    )
      ? "dialogue"
      : "npc_intention",
    actor: input.actor,
    target: input.target,
    location: input.location,
    summary: input.summary ?? `${input.actor} proposes ${input.intentionType}.`,
    payload: {
      npcIntentionProposal: true,
      intentionType: input.intentionType,
      proposedOnly: true,
      targetPlayer: input.targetPlayer === true,
      sourceObservableEventId: `obs-${input.actor}`,
      sourceOriginalEventId: `event-${input.actor}`
    },
    important: input.important ?? input.intentionType !== "do_nothing"
  };
}

test("WorldDirector schedules yi_zhihu report/request_meeting to zheng_duke without updating Zheng Duke memory", () => {
  const runtime = cloneRuntime();
  const beforeZhengMemory = structuredClone(runtime.npcMemories.zheng_duke);
  const report = proposalEvent({
    id: "proposal-yi-report",
    actor: "yi_zhihu",
    intentionType: "report",
    target: "zheng_duke",
    location: "zhu_home",
    summary: "Yi Zhi Hu reports Zhu Zhiwu grievance to Zheng Duke."
  });
  const requestMeeting = proposalEvent({
    id: "proposal-yi-request-meeting",
    actor: "yi_zhihu",
    intentionType: "request_meeting",
    target: "zheng_duke",
    location: "zhu_home",
    summary: "Yi Zhi Hu requests a meeting with Zheng Duke."
  });

  const output = runWorldDirector({
    runtime,
    validatedProposalEvents: [requestMeeting, report]
  });

  assert.equal(output.scheduledEvents.length, 2);
  assert.deepEqual(
    output.scheduledEvents.map((scheduled) => scheduled.event.target),
    ["zheng_duke", "zheng_duke"]
  );
  assert.ok(
    output.scheduledEvents.every(
      (scheduled) => scheduled.event.payload.proposedOnly === true
    )
  );
  assert.deepEqual(runtime.npcMemories.zheng_duke, beforeZhengMemory);
});

test("WorldDirector schedules guard report to qin_duke without directly giving Qin Duke knowledge", () => {
  const runtime = cloneRuntime();
  const beforeQinMemory = structuredClone(runtime.npcMemories.qin_duke);
  const guardReport = proposalEvent({
    id: "proposal-guard-report",
    actor: "guard",
    intentionType: "report",
    target: "qin_duke",
    location: "qin_camp_exterior",
    summary: "Guard reports audience request to Qin Duke."
  });

  const output = runWorldDirector({
    runtime,
    validatedProposalEvents: [guardReport]
  });

  assert.equal(output.scheduledEvents.length, 1);
  assert.equal(output.scheduledEvents[0].event.actor, "guard");
  assert.equal(output.scheduledEvents[0].event.target, "qin_duke");
  assert.equal(output.scheduledEvents[0].event.payload.scheduledByWorldDirector, true);
  assert.deepEqual(runtime.npcMemories.qin_duke, beforeQinMemory);
});

test("Qin Duke question to player is ordered before Jin Envoy warning if both exist", () => {
  const runtime = cloneRuntime();
  const jinWarning = proposalEvent({
    id: "proposal-jin-warning",
    actor: "jin_envoy",
    intentionType: "warn",
    target: "qin_duke",
    location: "jin_camp_direction",
    summary: "Jin envoy warns Qin Duke about alliance pressure."
  });
  const qinQuestion = proposalEvent({
    id: "proposal-qin-question",
    actor: "qin_duke",
    intentionType: "question",
    targetPlayer: true,
    location: "qin_main_tent",
    summary: "Qin Duke questions the player."
  });

  const output = runWorldDirector({
    runtime,
    validatedProposalEvents: [jinWarning, qinQuestion]
  });

  assert.deepEqual(
    output.orderedProposalEvents.map((event) => event.id),
    ["proposal-qin-question", "proposal-jin-warning"]
  );
});

test("Jin Envoy warning/request_meeting is delayed behind immediate Qin Duke response", () => {
  const runtime = cloneRuntime();
  const qinQuestion = proposalEvent({
    id: "proposal-qin-question",
    actor: "qin_duke",
    intentionType: "question",
    targetPlayer: true,
    location: "qin_main_tent"
  });
  const jinRequest = proposalEvent({
    id: "proposal-jin-request",
    actor: "jin_envoy",
    intentionType: "request_meeting",
    target: "qin_duke",
    location: "jin_camp_direction"
  });

  const output = runWorldDirector({
    runtime,
    validatedProposalEvents: [jinRequest, qinQuestion]
  });
  const scheduledJinEvent = output.scheduledEvents.find(
    (scheduled) => scheduled.sourceProposalEventId === "proposal-jin-request"
  );

  assert.equal(output.orderedProposalEvents[0].id, "proposal-qin-question");
  assert.equal(scheduledJinEvent?.timing, "after_current_exchange");
});

test("DirectorOutput contains proposals only and does not mutate runtime", () => {
  const runtime = cloneRuntime();
  const before = structuredClone(runtime);
  const guardReport = proposalEvent({
    id: "proposal-guard-report",
    actor: "guard",
    intentionType: "report",
    target: "qin_duke",
    location: "qin_camp_exterior"
  });

  const output = runWorldDirector({
    runtime,
    validatedProposalEvents: [guardReport]
  });

  assert.ok(
    output.orderedProposalEvents.every((event) => event.payload.proposedOnly === true)
  );
  assert.ok(
    output.scheduledEvents.every(
      (scheduled) => scheduled.event.payload.proposedOnly === true
    )
  );
  assert.deepEqual(runtime, before);
});

test("shouldAdvanceTime is true for report travel and important report chains", () => {
  const runtime = cloneRuntime();
  const yiReport = proposalEvent({
    id: "proposal-yi-report",
    actor: "yi_zhihu",
    intentionType: "report",
    target: "zheng_duke",
    location: "zhu_home"
  });

  const output = runWorldDirector({
    runtime,
    validatedProposalEvents: [yiReport]
  });

  assert.equal(output.shouldAdvanceTime, true);
  assert.equal(output.nextTimeStageProposal, "夜半");
  assert.equal(runtime.world.timeStage, "夜初");
});

test("WorldDirector does not create new NPC thoughts from observable events alone", () => {
  const runtime = cloneRuntime();
  const output = runWorldDirector({
    runtime,
    observableEvents: [
      observable("qin_duke"),
      observable("jin_envoy"),
      observable("zheng_duke", { visibility: "none" })
    ],
    validatedProposalEvents: []
  });

  assert.deepEqual(output.npcKernelIdsToWake, ["qin_duke", "jin_envoy"]);
  assert.deepEqual(output.orderedProposalEvents, []);
  assert.deepEqual(output.scheduledEvents, []);
  assert.equal(output.shouldAdvanceTime, false);
});

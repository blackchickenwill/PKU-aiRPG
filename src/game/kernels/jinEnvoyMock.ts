import { npcKernelOutputSchema } from "../schemas";
import { getAvailableAffordances } from "../npcAffordances";
import { rankAffordancesByEvaluation } from "../npcEvaluation";
import type { NPCKernelInput, NPCKernelOutput } from "../types";

function sawSuspiciousDelay(input: NPCKernelInput): boolean {
  return input.observableEvent.knownDetails.some(
    (detail) =>
      detail.includes("停留时间偏长") ||
      detail.includes("谈话仍在继续") ||
      detail.includes("久未") ||
      detail.includes("进入秦伯主帐")
  );
}

export function runJinEnvoyKernelMock(input: NPCKernelInput): NPCKernelOutput {
  if (sawSuspiciousDelay(input)) {
    const primaryAffordance = rankAffordancesByEvaluation(
      {
        npcState: input.npcState,
        npcMemory: input.npcMemory,
        currentLocation: input.npcState.location,
        observableEvent: input.observableEvent,
        pressureHints: ["alliance_pressure", "suspicion_rising"]
      },
      getAvailableAffordances({
        npcState: input.npcState,
        npcMemory: input.npcMemory,
        currentLocation: input.npcState.location,
        observableEvent: input.observableEvent,
        pressureHints: ["alliance_pressure", "suspicion_rising"]
      })
    )[0];

    return npcKernelOutputSchema.parse({
      npcId: "jin_envoy",
      memoryPatch: {
        npcId: "jin_envoy",
        sourceObservableEventId: input.observableEvent.id,
        addEpisodicMemory: ["郑国使者进入秦伯主帐后停留时间偏长。"],
        addDoubts: ["秦伯是否正在听取郑国离间秦晋的说辞？"],
        attitudeUpdates: {
          qin: "concerned_ally",
          zheng: "suspicious_enemy"
        },
        privateFlagUpdates: {
          jinEnvoySuspicious: true
        }
      },
      intention: {
        npcId: "jin_envoy",
        sourceObservableEventId: input.observableEvent.id,
        intentionType: primaryAffordance === "warn" ? "warn" : "request_meeting",
        target: "qin_duke",
        summary:
          primaryAffordance === "warn"
            ? "立即警示秦方，郑国使者可能正试图离间秦晋。"
            : "请求会见秦伯，提醒秦晋同盟不可被郑国游说动摇。",
        requiresValidation: true
      },
      visibleReaction: "晋使在营中停步侧听，疑色渐深。",
      debugSummary: "Jin envoy cannot hear the content, but becomes suspicious from external cues."
    });
  }

  return npcKernelOutputSchema.parse({
    npcId: "jin_envoy",
    debugSummary: "No sufficient observable cue was available for Jin envoy."
  });
}

import { npcKernelOutputSchema } from "../schemas";
import { getAvailableAffordances } from "../npcAffordances";
import { rankAffordancesByEvaluation } from "../npcEvaluation";
import type { NPCKernelInput, NPCKernelOutput } from "../types";

function sawAudienceRequest(input: NPCKernelInput): boolean {
  return (
    input.observableEvent.visibility === "full" &&
    input.observableEvent.summaryForNpc.includes("请求你代为通报秦伯")
  );
}

function sawTentOrderInfo(input: NPCKernelInput): boolean {
  return input.observableEvent.knownDetails.some(
    (detail) =>
      detail.includes("主帐") ||
      detail.includes("谈话仍在继续") ||
      detail.includes("使者已进入")
  );
}

export function runGuardKernelMock(input: NPCKernelInput): NPCKernelOutput {
  if (sawAudienceRequest(input)) {
    const primaryAffordance = rankAffordancesByEvaluation(
      {
        npcState: input.npcState,
        npcMemory: input.npcMemory,
        currentLocation: input.npcState.location,
        observableEvent: input.observableEvent,
        pressureHints: ["gatekeeping", "authority_limited"]
      },
      getAvailableAffordances({
        npcState: input.npcState,
        npcMemory: input.npcMemory,
        currentLocation: input.npcState.location,
        observableEvent: input.observableEvent,
        pressureHints: ["gatekeeping", "authority_limited"]
      })
    )[0];

    return npcKernelOutputSchema.parse({
      npcId: "guard",
      memoryPatch: {
        npcId: "guard",
        sourceObservableEventId: input.observableEvent.id,
        addEpisodicMemory: ["郑国使者在营外请求通报秦伯。"],
        lastPlayerInteraction: "烛之武在营外请求守卫代为通报。",
        privateFlagUpdates: {
          pendingAudienceRequest: true
        }
      },
      intention: {
        npcId: "guard",
        sourceObservableEventId: input.observableEvent.id,
        intentionType: primaryAffordance === "delay" ? "delay" : "report",
        target: "qin_duke",
        summary:
          primaryAffordance === "delay"
            ? "先拖住来使，再决定是否立即通报秦伯。"
            : "向秦伯通报：郑国使者在营外请求入见。",
        requiresValidation: true
      },
      visibleReaction: "守卫神色未改，只是记下请求，准备依例通报。",
      debugSummary: "Guard observed the audience request and prepared a report to Qin Duke."
    });
  }

  if (sawTentOrderInfo(input)) {
    return npcKernelOutputSchema.parse({
      npcId: "guard",
      memoryPatch: {
        npcId: "guard",
        sourceObservableEventId: input.observableEvent.id,
        addEpisodicMemory: [input.observableEvent.summaryForNpc]
      },
      visibleReaction: "守卫继续维持帐外秩序，只记下可见动静。",
      debugSummary: "Guard records only observable camp-order information."
    });
  }

  return npcKernelOutputSchema.parse({
    npcId: "guard",
    debugSummary: "Guard noticed nothing that required a stronger reaction."
  });
}

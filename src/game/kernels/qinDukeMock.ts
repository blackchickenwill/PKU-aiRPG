import { npcKernelOutputSchema } from "../schemas";
import type { NPCKernelInput, NPCKernelOutput } from "../types";

function sawInterestArgument(input: NPCKernelInput): boolean {
  return (
    input.observableEvent.visibility === "full" &&
    input.observableEvent.knownDetails.some(
      (detail) =>
        detail.includes("利晋") ||
        detail.includes("秦远晋近") ||
        detail.includes("东道主") ||
        detail.includes("利害")
    )
  );
}

export function runQinDukeKernelMock(input: NPCKernelInput): NPCKernelOutput {
  if (sawInterestArgument(input)) {
    return npcKernelOutputSchema.parse({
      npcId: "qin_duke",
      memoryPatch: {
        npcId: "qin_duke",
        sourceObservableEventId: input.observableEvent.id,
        addEpisodicMemory: ["烛之武在主帐中提出灭郑未必利秦，实利或将归晋。"],
        addBeliefs: ["灭郑未必最利秦，晋国可能因郑亡而坐大。"],
        addDoubts: ["郑国若存，是否真能为秦国东方往来提供助益？"],
        attitudeUpdates: {
          player: "wary_but_listening",
          jin: "ally_but_needs_reassessment"
        },
        lastPlayerInteraction: "烛之武以秦晋利害分歧说服秦伯。",
        privateFlagUpdates: {
          qinDukeWavering: true
        }
      },
      intention: {
        npcId: "qin_duke",
        sourceObservableEventId: input.observableEvent.id,
        intentionType: "question",
        target: "player",
        summary: "追问郑国若存，究竟能为秦国带来何种实际利益。",
        requiresValidation: true
      },
      dialogue: "你说亡郑未必真利于秦，那么郑若得存，于秦又能有何所助？",
      visibleReaction: "秦伯沉吟未答，神色从审视转为权衡。",
      debugSummary: "Qin Duke heard the full interest argument and became cautious but receptive."
    });
  }

  return npcKernelOutputSchema.parse({
    npcId: "qin_duke",
    visibleReaction: "秦伯仍在观察事态，没有显露更多心意。",
    debugSummary: "Qin Duke observed the event, but no strong update was triggered."
  });
}

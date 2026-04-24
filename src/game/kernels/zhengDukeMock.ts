import { npcKernelOutputSchema } from "../schemas";
import type { NPCKernelInput, NPCKernelOutput } from "../types";

function heardDirectCounsel(input: NPCKernelInput): boolean {
  return (
    input.observableEvent.visibility === "full" &&
    input.observableEvent.summaryForNpc.includes("烛之武在宫室中向你陈说")
  );
}

export function runZhengDukeKernelMock(input: NPCKernelInput): NPCKernelOutput {
  if (heardDirectCounsel(input)) {
    return npcKernelOutputSchema.parse({
      npcId: "zheng_duke",
      memoryPatch: {
        npcId: "zheng_duke",
        sourceObservableEventId: input.observableEvent.id,
        addEpisodicMemory: ["烛之武已入宫陈说局势与方略。"],
        addBeliefs: ["当下仍需依赖烛之武出使破局。"],
        addDoubts: ["秦营是否仍留有回旋余地？"],
        attitudeUpdates: {
          player: "dependent_but_regretful"
        },
        lastPlayerInteraction: "郑伯在宫室中亲闻烛之武陈说局势。",
        privateFlagUpdates: {
          zhengDukeHeardCounsel: true
        }
      },
      intention: {
        npcId: "zheng_duke",
        sourceObservableEventId: input.observableEvent.id,
        intentionType: "speak",
        target: "player",
        summary: "回应烛之武，并请求其尽力为郑国谋一线生机。",
        requiresValidation: true
      },
      dialogue: "国势至此，孤知前失用卿之过。若尚有一线可图，愿闻其详。",
      visibleReaction: "郑伯神情沉重，语气里掺着悔意与急切。",
      debugSummary: "Zheng Duke directly heard counsel and reaffirmed reliance on Zhu Zhiwu."
    });
  }

  return npcKernelOutputSchema.parse({
    npcId: "zheng_duke",
    debugSummary: "Zheng Duke received no direct report-worthy event and remains without update."
  });
}

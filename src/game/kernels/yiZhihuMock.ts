import { npcKernelOutputSchema } from "../schemas";
import { getAvailableAffordances } from "../npcAffordances";
import { detectReactionPatternFromObservation } from "../reactionPatterns";
import type {
  NPCKernelInput,
  NPCKernelOutput,
  NPCIntentionProposal
} from "../types";

function buildIntention(
  input: NPCKernelInput,
  intentionType: NPCIntentionProposal["intentionType"],
  target: NPCIntentionProposal["target"] | undefined,
  summary: string
): NPCIntentionProposal {
  return {
    npcId: "yi_zhihu",
    sourceObservableEventId: input.observableEvent.id,
    intentionType,
    target,
    summary,
    requiresValidation: true
  };
}

export function runYiZhihuKernelMock(input: NPCKernelInput): NPCKernelOutput {
  const pattern = detectReactionPatternFromObservation(input);
  const affordances = getAvailableAffordances({
    npcState: input.npcState,
    npcMemory: input.npcMemory,
    currentLocation: input.npcState.location,
    observableEvent: input.observableEvent,
    reactionPattern: pattern,
    pressureHints: ["zheng_crisis", "time_urgent"]
  });
  const primaryAffordance = affordances[0] ?? "do_nothing";

  switch (pattern) {
    case "refusal":
      return npcKernelOutputSchema.parse({
        npcId: "yi_zhihu",
        memoryPatch: {
          npcId: "yi_zhihu",
          sourceObservableEventId: input.observableEvent.id,
          addEpisodicMemory: ["烛之武以年老无能为辞，暂不愿受命。"],
          addDoubts: ["烛之武未必会立刻答应出使。"],
          lastPlayerInteraction: "烛之武以自谦之辞表现犹豫。",
          privateFlagUpdates: {
            openingMissionResistanceSeen: true
          }
        },
        intention: buildIntention(
          input,
          primaryAffordance === "question" ? "question" : "speak",
          "player",
          "承认烛之武心有迟疑，并再次指出郑国局势危急。"
        ),
        dialogue: "吾知子未肯轻诺，然今秦晋围郑，国势危急，实非可久迟之时。",
        visibleReaction: "佚之狐先收住催促，改以危局相劝。",
        debugSummary: `Yi Zhi Hu recognized a generic ${pattern} pattern and responded with persuasion-oriented mediation.`
      });
    case "grievance":
      return npcKernelOutputSchema.parse({
        npcId: "yi_zhihu",
        memoryPatch: {
          npcId: "yi_zhihu",
          sourceObservableEventId: input.observableEvent.id,
          addEpisodicMemory: ["烛之武明确流露出对郑伯迟用其才的不平。"],
          addDoubts: ["若郑伯不亲自出面，烛之武未必愿即刻尽力。"],
          lastPlayerInteraction: "烛之武把怨气指向郑伯迟用。",
          privateFlagUpdates: {
            zhuGrievanceRecognized: true
          }
        },
        intention: buildIntention(
          input,
          primaryAffordance === "report" ? "report" : "request_meeting",
          "zheng_duke",
          "向郑伯说明烛之武心有积怨，或需亲自出面相请。"
        ),
        dialogue: "子之怨，我亦知之。此事恐非他人片语可解，或须郑伯亲自当面说明其意。",
        visibleReaction: "佚之狐没有否认这份怨气，而是立刻想到该如何转呈郑伯。",
        debugSummary: `Yi Zhi Hu recognized a generic ${pattern} pattern and escalated toward Zheng Duke involvement.`
      });
    case "conditional_acceptance":
      return npcKernelOutputSchema.parse({
        npcId: "yi_zhihu",
        memoryPatch: {
          npcId: "yi_zhihu",
          sourceObservableEventId: input.observableEvent.id,
          addEpisodicMemory: ["烛之武表示若条件得当，仍愿考虑出使。"],
          addBeliefs: ["烛之武并非断然拒绝，条件可转化为行动路径。"],
          lastPlayerInteraction: "烛之武提出了可执行的前置条件。",
          privateFlagUpdates: {
            conditionalPathAvailable: true
          }
        },
        intention: buildIntention(
          input,
          primaryAffordance === "report" ? "report" : "request_meeting",
          "zheng_duke",
          "向郑伯转告烛之武愿在特定条件下再作决定。"
        ),
        dialogue: "既有条件，便非绝辞。我当设法转达，使此言可落到实处。",
        visibleReaction: "佚之狐把这番话当成可推进的条件，而不是退却。",
        debugSummary: `Yi Zhi Hu recognized a generic ${pattern} pattern and treated the condition as actionable.`
      });
    case "loyalty_conflict":
      return npcKernelOutputSchema.parse({
        npcId: "yi_zhihu",
        memoryPatch: {
          npcId: "yi_zhihu",
          sourceObservableEventId: input.observableEvent.id,
          addEpisodicMemory: ["烛之武虽有怨意，仍以郑国存亡为念。"],
          addBeliefs: ["烛之武仍可被国家大义说动。"],
          addDoubts: ["如何让这份忠诚转化为立即行动，仍需拿捏分寸。"],
          lastPlayerInteraction: "烛之武显出怨与忠并存的心态。",
          privateFlagUpdates: {
            loyaltyConflictSeen: true
          }
        },
        intention: buildIntention(
          input,
          primaryAffordance === "request_meeting" ? "request_meeting" : "speak",
          primaryAffordance === "request_meeting" ? "zheng_duke" : "player",
          "顺着烛之武仍念郑国的心意，推动其尽快与郑伯会面或继续陈说。"
        ),
        dialogue: "子心虽有未平，然终不忍郑国坐亡。既念宗国，便仍有可为之机。",
        visibleReaction: "佚之狐听出了怨气之下尚存的忠念。",
        debugSummary: `Yi Zhi Hu recognized a generic ${pattern} pattern and moved toward duty-based persuasion.`
      });
    case "ambiguous_speech":
      return npcKernelOutputSchema.parse({
        npcId: "yi_zhihu",
        intention: buildIntention(
          input,
          primaryAffordance === "observe_silently" ? "do_nothing" : "question",
          primaryAffordance === "observe_silently" ? undefined : "player",
          primaryAffordance === "observe_silently"
            ? "暂且观察烛之武的神色与态度。"
            : "轻声追问烛之武是否另有顾虑。"
        ),
        dialogue:
          primaryAffordance === "observe_silently"
            ? undefined
            : "子若尚有未尽之意，不妨直言，我愿代为斡旋。",
        visibleReaction:
          primaryAffordance === "observe_silently"
            ? "佚之狐先静候片刻，留意烛之武是否还有后话。"
            : "佚之狐略略放缓语气，试探烛之武未明之意。",
        debugSummary: `Yi Zhi Hu recognized a generic ${pattern} pattern and avoided a strong mission-state update.`
      });
    case "probing":
      return npcKernelOutputSchema.parse({
        npcId: "yi_zhihu",
        intention: buildIntention(
          input,
          "question",
          "player",
          "回应烛之武的试探，并说明自己此来是为郑国求一线生机。"
        ),
        dialogue: "子若有所问，我自可尽言。此来非为虚礼，只为求郑国一线生机。",
        visibleReaction: "佚之狐顺势应答，没有急于逼迫表态。",
        debugSummary: "Yi Zhi Hu recognized a generic probing pattern and answered with further clarification."
      });
    case "none":
    default:
      return npcKernelOutputSchema.parse({
        npcId: "yi_zhihu",
        debugSummary: "Yi Zhi Hu found no strong reusable reaction pattern in the observation."
      });
  }
}

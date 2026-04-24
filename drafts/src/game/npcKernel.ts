// Draft only. Codex should adapt this into src/game/npcKernel.ts.

import type {
  NPCKernelInput,
  NPCKernelOutput,
  NPCId,
} from "./types";

export function runNpcKernelMock(input: NPCKernelInput): NPCKernelOutput {
  switch (input.npcState.id) {
    case "qin_duke":
      return runQinDukeKernelMock(input);
    case "jin_envoy":
      return runJinEnvoyKernelMock(input);
    case "zheng_duke":
      return runZhengDukeKernelMock(input);
    case "guard":
      return runGuardKernelMock(input);
    default:
      return {
        npcId: input.npcState.id,
        visibleReaction: "",
        debugSummary: "No significant reaction.",
      };
  }
}

function runQinDukeKernelMock(input: NPCKernelInput): NPCKernelOutput {
  const sawInterestArgument =
    input.observableEvent.summaryForNpc.includes("利害") ||
    input.observableEvent.knownDetails.some((d) => d.includes("利晋") || d.includes("秦晋"));

  if (sawInterestArgument) {
    return {
      npcId: "qin_duke",
      memoryPatch: {
        npcId: "qin_duke",
        sourceObservableEventId: input.observableEvent.id,
        addEpisodicMemory: ["烛之武提出灭郑未必利秦、实利或归晋。"],
        addBeliefs: ["灭郑未必最利秦，晋国可能因郑亡而坐大。"],
        addDoubts: ["郑国若存，是否真能为秦带来实际利益？"],
        attitudeUpdates: { player: "wary_but_listening", jin: "ally_but_needs_reassessment" },
        lastPlayerInteraction: "烛之武以秦晋利害分歧说服秦伯。",
        privateFlagUpdates: { qinDukeWavering: true },
      },
      intention: {
        npcId: "qin_duke",
        sourceObservableEventId: input.observableEvent.id,
        intentionType: "question",
        target: "player",
        summary: "追问郑国若存究竟能为秦国带来何利。",
        requiresValidation: true,
      },
      dialogue: "你是说，郑亡之后，得其利者未必是秦？那么郑若得存，于秦又有何益？",
      visibleReaction: "秦伯没有立刻反驳，目光短暂移向帐外晋军旗帜。",
      debugSummary: "Qin Duke heard full interest argument and became cautious but receptive.",
    };
  }

  return {
    npcId: "qin_duke",
    visibleReaction: "秦伯神色未变，仍在审视你的来意。",
    debugSummary: "Qin Duke observed event but no major belief shift.",
  };
}

function runJinEnvoyKernelMock(input: NPCKernelInput): NPCKernelOutput {
  const longTalk = input.observableEvent.knownDetails.some((d) =>
    d.includes("停留时间") || d.includes("谈话持续") || d.includes("久"),
  );

  if (longTalk) {
    return {
      npcId: "jin_envoy",
      memoryPatch: {
        npcId: "jin_envoy",
        sourceObservableEventId: input.observableEvent.id,
        addEpisodicMemory: ["郑国使者入秦伯主帐后停留时间偏长。"],
        addDoubts: ["秦伯是否正在听取郑国离间秦晋的说辞？"],
        attitudeUpdates: { qin: "concerned_ally", zheng: "suspicious_enemy" },
        privateFlagUpdates: { jinEnvoySuspicious: true },
      },
      intention: {
        npcId: "jin_envoy",
        sourceObservableEventId: input.observableEvent.id,
        intentionType: "request_meeting",
        target: "qin_duke",
        summary: "请求会见秦伯，提醒秦晋同盟不可被郑国离间。",
        requiresValidation: true,
      },
      visibleReaction: "晋使在帐外停步，似乎开始留意秦营传令的迟缓。",
      debugSummary: "Jin envoy does not know content; only becomes suspicious from external cues.",
    };
  }

  return {
    npcId: "jin_envoy",
    debugSummary: "No sufficient observable cue for Jin envoy.",
  };
}

function runZhengDukeKernelMock(input: NPCKernelInput): NPCKernelOutput {
  return {
    npcId: "zheng_duke",
    debugSummary: "Zheng Duke only reacts to reports or events in his location; no omniscience.",
  };
}

function runGuardKernelMock(input: NPCKernelInput): NPCKernelOutput {
  return {
    npcId: "guard",
    memoryPatch: {
      npcId: "guard",
      sourceObservableEventId: input.observableEvent.id,
      addEpisodicMemory: [input.observableEvent.summaryForNpc],
    },
    debugSummary: "Guard records observable camp-order information only.",
  };
}

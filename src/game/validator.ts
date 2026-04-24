import { validatorResultSchema } from "./schemas";
import type {
  ActionProposal,
  GameEvent,
  GameRuntimeState,
  LocationId,
  NPCId,
  ValidatorResult
} from "./types";

function createEvent(
  id: string,
  type: GameEvent["type"],
  summary: string,
  partial: Partial<GameEvent> = {}
): GameEvent {
  return {
    id,
    type,
    summary,
    payload: {},
    important: true,
    ...partial
  };
}

function makeRejection(
  proposal: ActionProposal,
  reason: string,
  formalHint?: string
): ValidatorResult {
  return validatorResultSchema.parse({
    status: "rejected",
    reason,
    generatedEvents: [
      createEvent(
        `safety-${proposal.intent}-${Date.now()}`,
        "safety_rejection",
        reason,
        {
          actor: "player",
          location: proposal.targetLocation,
          payload: {
            intent: proposal.intent,
            safety: proposal.safety,
            rawInput: proposal.rawInput
          },
          important: false
        }
      )
    ],
    formalHint,
    debugHints: [reason]
  });
}

function makeConverted(
  proposal: ActionProposal,
  runtime: GameRuntimeState,
  reason: string,
  summary: string,
  formalHint = "你的话意尚不明确，旁人一时不知如何接续。"
): ValidatorResult {
  return validatorResultSchema.parse({
    status: "converted",
    reason,
    generatedEvents: [
      createEvent(
        `converted-${proposal.intent}-${runtime.world.eventLog.length + 1}`,
        "dialogue",
        summary,
        {
          actor: "player",
          location: runtime.world.currentLocation,
          payload: {
            intent: proposal.intent,
            rawInput: proposal.rawInput,
            converted: true,
            noEffect: true
          },
          important: false
        }
      )
    ],
    formalHint,
    debugHints: [reason]
  });
}

function currentLocationHasNpc(
  runtime: GameRuntimeState,
  npcId: NPCId,
  locationId: LocationId
): boolean {
  return runtime.world.locations[locationId]?.presentNPCs.includes(npcId) ?? false;
}

function requiresDirectPresence(intent: ActionProposal["intent"]): boolean {
  return [
    "persuade",
    "negotiate",
    "probe",
    "exchange_interest",
    "defend",
    "give_item_or_info"
  ].includes(intent);
}

function buildAcceptedDialogueEvent(
  proposal: ActionProposal,
  runtime: GameRuntimeState
): GameEvent {
  return createEvent(
    `player-dialogue-${runtime.world.eventLog.length + 1}`,
    "dialogue",
    proposal.summary,
    {
      actor: "player",
      target: proposal.targetNPC,
      location: runtime.world.currentLocation,
      payload: {
        intent: proposal.intent,
        strategies: proposal.strategies,
        rawInput: proposal.rawInput,
        referencedKnowledgeIds: proposal.referencedKnowledgeIds
      }
    }
  );
}

function resolveOpeningListener(runtime: GameRuntimeState): NPCId | undefined {
  if (
    runtime.world.currentLocation === "zhu_home" &&
    currentLocationHasNpc(runtime, "yi_zhihu", "zhu_home")
  ) {
    return "yi_zhihu";
  }

  return undefined;
}

function validateMeetingRequest(
  runtime: GameRuntimeState,
  proposal: ActionProposal
): ValidatorResult {
  const location = runtime.world.currentLocation;
  const targetNpc = proposal.targetNPC;

  if (!targetNpc) {
    return makeRejection(
      proposal,
      "请求会面必须明确目标人物。",
      "你需要说明想见谁。"
    );
  }

  if (currentLocationHasNpc(runtime, targetNpc, location)) {
    return validatorResultSchema.parse({
      status: "accepted",
      reason: "目标人物已在场，可直接请求会面或交谈。",
      generatedEvents: [
        createEvent(
          `player-meeting-${runtime.world.eventLog.length + 1}`,
          "dialogue",
          proposal.summary,
          {
            actor: "player",
            target: targetNpc,
            location,
            payload: {
              intent: proposal.intent,
              rawInput: proposal.rawInput,
              directAudience: true
            }
          }
        )
      ],
      debugHints: ["direct meeting target present"]
    });
  }

  if (
    location === "qin_camp_exterior" &&
    targetNpc === "qin_duke" &&
    currentLocationHasNpc(runtime, "guard", location)
  ) {
    return validatorResultSchema.parse({
      status: "accepted",
      reason: "可在秦营外通过守卫请求通报秦伯。",
      generatedEvents: [
        createEvent(
          `player-meeting-request-${runtime.world.eventLog.length + 1}`,
          "dialogue",
          "烛之武在秦营外请求守卫通报秦伯。",
          {
            actor: "player",
            target: "guard",
            location,
            payload: {
              intent: proposal.intent,
              originalTargetNpc: targetNpc,
              rawInput: proposal.rawInput,
              requestAudience: true
            }
          }
        )
      ],
      debugHints: ["guard can relay qin duke audience request"]
    });
  }

  return makeRejection(
    proposal,
    "当前地点无法向目标人物发起有效会面请求。",
    "你可能需要先移动到合适地点，或先请求通报。"
  );
}

export function validateActionProposal(
  runtime: GameRuntimeState,
  proposal: ActionProposal
): ValidatorResult {
  if (proposal.safety === "ambiguous_in_world_action") {
    return makeConverted(
      proposal,
      runtime,
      "输入含义暂不明确，未形成可执行行动。",
      "烛之武低声含混了一句，旁人一时难以接话。"
    );
  }

  if (proposal.safety !== "safe_in_world_action") {
    return makeRejection(
      proposal,
      `安全分类为 ${proposal.safety}，不能进入世界事实。`,
      "这句话未能成为有效行动。"
    );
  }

  if (proposal.intent === "move") {
    if (!proposal.targetLocation) {
      return makeRejection(
        proposal,
        "移动行动缺少目标地点。",
        "你需要说明要去哪里。"
      );
    }

    if (
      !runtime.world.locations[runtime.world.currentLocation].connectedTo.includes(
        proposal.targetLocation
      )
    ) {
      return makeRejection(
        proposal,
        "目标地点与当前位置不连通。",
        "你暂时不能直接去那里。"
      );
    }

    return validatorResultSchema.parse({
      status: "accepted",
      reason: "移动路径有效。",
      generatedEvents: [
        createEvent(
          `player-move-${runtime.world.eventLog.length + 1}`,
          "movement",
          `烛之武前往${runtime.world.locations[proposal.targetLocation].name}。`,
          {
            actor: "player",
            target: proposal.targetLocation,
            location: proposal.targetLocation,
            payload: {
              from: runtime.world.currentLocation,
              to: proposal.targetLocation,
              rawInput: proposal.rawInput
            }
          }
        )
      ],
      debugHints: ["connected movement"]
    });
  }

  if (proposal.intent === "request_meeting") {
    return validateMeetingRequest(runtime, proposal);
  }

  if (
    ["refuse_mission", "delay_commitment", "conditional_acceptance"].includes(
      proposal.intent
    )
  ) {
    const directTargetPresent =
      proposal.targetNPC !== undefined &&
      currentLocationHasNpc(
        runtime,
        proposal.targetNPC,
        runtime.world.currentLocation
      );
    const openingListener = resolveOpeningListener(runtime);

    if (directTargetPresent || openingListener) {
      return validatorResultSchema.parse({
        status: "accepted",
        reason: "该表态已被在场人物听见，属于有效对话。",
        generatedEvents: [
          buildAcceptedDialogueEvent(
            {
              ...proposal,
              targetNPC: directTargetPresent
                ? proposal.targetNPC
                : openingListener
            },
            runtime
          )
        ],
        debugHints: ["listener present for opening stance"]
      });
    }

    return makeConverted(
      proposal,
      runtime,
      "当前没有明确听者，这更像是一段自言或未被接住的表态。",
      "烛之武低声表明心意，却无人立即应答。",
      "你的话尚未落到明确听者耳中，眼前暂时无人接续。"
    );
  }

  if (requiresDirectPresence(proposal.intent)) {
    if (!proposal.targetNPC) {
      return makeRejection(
        proposal,
        "该行动需要明确目标 NPC。",
        "你需要说明是在对谁说。"
      );
    }

    if (
      !currentLocationHasNpc(
        runtime,
        proposal.targetNPC,
        runtime.world.currentLocation
      )
    ) {
      return makeRejection(
        proposal,
        "目标 NPC 当前不在场，无法直接进行此行动。",
        "你需要先抵达对方在场的地点。"
      );
    }
  }

  if (
    proposal.intent === "persuade" ||
    proposal.intent === "exchange_interest" ||
    proposal.intent === "negotiate" ||
    proposal.intent === "probe"
  ) {
    return validatorResultSchema.parse({
      status: "accepted",
      reason: "目标在场，允许进行外交言语行动。",
      generatedEvents: [buildAcceptedDialogueEvent(proposal, runtime)],
      debugHints: ["direct diplomacy accepted"]
    });
  }

  if (
    [
      "speak",
      "observe",
      "investigate",
      "defend",
      "give_item_or_info",
      "wait"
    ].includes(proposal.intent)
  ) {
    return validatorResultSchema.parse({
      status: "accepted",
      reason: "该行动符合当前身份与场景约束。",
      generatedEvents: [buildAcceptedDialogueEvent(proposal, runtime)],
      debugHints: ["generic accepted in-world action"]
    });
  }

  return makeRejection(
    proposal,
    "该行动当前未被世界规则接受。",
    "这一步暂时不能成立。"
  );
}

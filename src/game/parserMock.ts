import { classifyPlayerInputSafety, isUnsafeClassification } from "./safety";
import type {
  ActionIntent,
  ActionProposal,
  LocationId,
  NPCId,
  PlayerAction,
  StrategyTag
} from "./types";

const NPC_NAME_TO_ID: Array<[RegExp, NPCId]> = [
  [/郑伯/u, "zheng_duke"],
  [/佚之狐/u, "yi_zhihu"],
  [/秦伯/u, "qin_duke"],
  [/晋使/u, "jin_envoy"],
  [/(守卫|传令官)/u, "guard"]
];

const LOCATION_NAME_TO_ID: Array<[RegExp, LocationId]> = [
  [/(烛之武宅|回宅|归宅)/u, "zhu_home"],
  [/(郑伯宫室|宫中|宫室)/u, "zheng_palace"],
  [/(市井|街市)/u, "market"],
  [/(城门|城墙)/u, "city_gate"],
  [/(秦营外|秦营)/u, "qin_camp_exterior"],
  [/(秦伯主帐|主帐)/u, "qin_main_tent"],
  [/(晋军营方向|晋营方向|晋营)/u, "jin_camp_direction"]
];

const KNOWLEDGE_RULES: Array<[RegExp, string]> = [
  [/(秦远晋近|亡郑利晋|利尽归于晋|利晋)/u, "qin_far_jin_near"],
  [/(东道主|东方往来之助|东方往来|东行之助)/u, "zheng_as_eastern_host"],
  [/(老臣|久有才具|久未被用|久不用我)/u, "opening_briefing_player_context"],
  [/(烛之武是郑国老臣|郑国老臣)/u, "zhu_is_zheng_elder"]
];

function extractTargetNpc(input: string): NPCId | undefined {
  const match = NPC_NAME_TO_ID.find(([pattern]) => pattern.test(input));
  return match?.[1];
}

function extractTargetLocation(input: string): LocationId | undefined {
  const match = LOCATION_NAME_TO_ID.find(([pattern]) => pattern.test(input));
  return match?.[1];
}

function extractKnowledgeIds(input: string): string[] {
  return KNOWLEDGE_RULES.filter(([pattern]) => pattern.test(input)).map(
    ([, id]) => id
  );
}

function detectStrategies(input: string): StrategyTag[] {
  const strategies = new Set<StrategyTag>();

  if (/(利晋|亡郑利晋|秦远晋近)/u.test(input)) {
    strategies.add("interest_analysis");
    strategies.add("qin_jin_divergence");
  }

  if (/(东道主|东方往来之助|东方往来|东行之助)/u.test(input)) {
    strategies.add("zheng_as_eastern_host");
    strategies.add("offer_benefit");
  }

  if (/(敢请|愿闻|求见|请见|伏惟)/u.test(input)) {
    strategies.add("humble_plea");
  }

  if (/(敢问|可知|究竟|何意|意在)/u.test(input)) {
    strategies.add("probe_intention");
  }

  if (/(忠|郑国不可亡|不忍坐视|社稷)/u.test(input)) {
    strategies.add("explain_loyalty");
  }

  if (/(早不用我|国危才想起我|久未被用|今日方知我)/u.test(input)) {
    strategies.add("grievance_expression");
    strategies.add("demand_recognition");
  }

  if (/(老矣|无能为也|不堪此任)/u.test(input)) {
    strategies.add("self_deprecation");
  }

  if (/(虽怨|然郑国不可亡|虽不平|终不忍)/u.test(input)) {
    strategies.add("loyalty_conflict");
    strategies.add("reluctant_acceptance");
  }

  if (/(若.+我再考虑|若.+我便|若.+方可|若.+然后)/u.test(input)) {
    strategies.add("demand_recognition");
  }

  if (strategies.size === 0) {
    if (/^[\s，。！？、…]*$/u.test(input) || input.length <= 2) {
      strategies.add("incoherent");
    } else {
      strategies.add("none");
    }
  }

  return [...strategies];
}

function detectIntent(input: string): ActionIntent {
  if (/(我老矣|无能为也|不愿受命|不去|不愿出使|早不用我|国危才想起我|久未被用)/u.test(input)) {
    return "refuse_mission";
  }

  if (/(容我再想|且容我想|稍待|片刻后再议|再考虑一下)/u.test(input)) {
    return "delay_commitment";
  }

  if (/(若.+再考虑|若.+方可|若.+我便|我虽怨其不用，然郑国不可亡)/u.test(input)) {
    return "conditional_acceptance";
  }

  if (/(东道主|东方往来之助|若郑存|可为秦助)/u.test(input)) {
    return "exchange_interest";
  }

  if (/(亡郑利晋|秦远晋近|请君熟思|劝秦伯|说服秦伯)/u.test(input)) {
    return "persuade";
  }

  if (/(议和|讲条件|商议|交换条件|谈判)/u.test(input)) {
    return "negotiate";
  }

  if (/(敢问|何意|试探|探一探)/u.test(input)) {
    return "probe";
  }

  if (/(我虽怨其不用，然郑国不可亡|忠于郑国|为郑国辩|自陈忠心)/u.test(input)) {
    return "defend";
  }

  if (/(告知|转告|献上|奉上|交付|递上)/u.test(input)) {
    return "give_item_or_info";
  }

  if (/(稍候|等等|等待|先静候)/u.test(input)) {
    return "wait";
  }

  if (/(前往|动身去|出城去|去往|去秦营|去主帐|去城门|去宫中|去市井)/u.test(input)) {
    return "move";
  }

  if (/(观察|看看|留心|瞧瞧)/u.test(input)) {
    return "observe";
  }

  if (/(调查|打探|探明|查问)/u.test(input)) {
    return "investigate";
  }

  if (/(求见|请见|请求会面|请求通报|通报秦伯|入见郑伯|见郑伯)/u.test(input)) {
    return "request_meeting";
  }

  return "negotiate";
}

function detectTone(input: string): string {
  if (/(老矣|无能为也|不堪)/u.test(input)) {
    return "self-deprecating";
  }

  if (/(早不用我|国危才想起我|久未被用)/u.test(input)) {
    return "resentful";
  }

  if (/(若.+再考虑|若.+方可)/u.test(input)) {
    return "conditional";
  }

  if (/(容我再想|片刻后再议)/u.test(input)) {
    return "hesitant";
  }

  if (/(忠|不可亡|社稷)/u.test(input)) {
    return "loyal";
  }

  if (/(求见|请见|敢请)/u.test(input)) {
    return "formal";
  }

  return "measured";
}

function buildUnsafeActionProposal(
  playerAction: PlayerAction
): ActionProposal {
  const safety = classifyPlayerInputSafety(playerAction.rawInput);
  const intent =
    safety === "impossible_action" ? "impossible_action" : "out_of_world_instruction";

  return {
    rawInput: playerAction.rawInput,
    intent,
    strategies: ["none"],
    referencedKnowledgeIds: [],
    safety,
    tone: "invalid",
    summary: "该输入未形成可接受的世界内行动提案。"
  };
}

export function parsePlayerActionMock(playerAction: PlayerAction): ActionProposal {
  const safety = classifyPlayerInputSafety(playerAction.rawInput);

  if (isUnsafeClassification(safety)) {
    return buildUnsafeActionProposal(playerAction);
  }

  const input = playerAction.rawInput.trim();

  return {
    rawInput: playerAction.rawInput,
    intent: detectIntent(input),
    strategies: detectStrategies(input),
    targetNPC: extractTargetNpc(input),
    targetLocation: extractTargetLocation(input),
    referencedKnowledgeIds: extractKnowledgeIds(input),
    safety,
    tone: detectTone(input),
    summary: input.length > 40 ? `${input.slice(0, 40)}...` : input
  };
}

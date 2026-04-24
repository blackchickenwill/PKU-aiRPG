import test from "node:test";
import assert from "node:assert/strict";

import {
  npcKernelOutputSchema,
  npcMemoryStoreSchema,
  worldStateSchema
} from "./schemas";

test("worldState schema accepts a minimal valid world", () => {
  const world = {
    timeStage: "\u591c\u521d",
    currentLocation: "zhu_home",
    playerRole: "zhu_zhiwu",
    locations: {
      zhu_home: {
        id: "zhu_home",
        name: "烛之武宅",
        description: "起始位置",
        connectedTo: ["zheng_palace"],
        presentNPCs: [],
        tags: ["home"],
        stateTags: ["quiet"]
      },
      zheng_palace: {
        id: "zheng_palace",
        name: "郑伯宫室",
        description: "宫室",
        connectedTo: ["zhu_home", "market"],
        presentNPCs: ["zheng_duke", "yi_zhihu"],
        tags: ["palace"],
        stateTags: []
      },
      market: {
        id: "market",
        name: "郑国市井",
        description: "市井",
        connectedTo: ["zheng_palace", "city_gate"],
        presentNPCs: ["commoner_rep"],
        tags: ["city"],
        stateTags: []
      },
      city_gate: {
        id: "city_gate",
        name: "城墙 / 城门",
        description: "城门",
        connectedTo: ["market", "qin_camp_exterior"],
        presentNPCs: [],
        tags: ["gate"],
        stateTags: []
      },
      qin_camp_exterior: {
        id: "qin_camp_exterior",
        name: "秦营外",
        description: "秦营外",
        connectedTo: ["city_gate", "qin_main_tent"],
        presentNPCs: ["guard"],
        tags: ["camp"],
        stateTags: []
      },
      qin_main_tent: {
        id: "qin_main_tent",
        name: "秦伯主帐",
        description: "主帐",
        connectedTo: ["qin_camp_exterior"],
        presentNPCs: ["qin_duke"],
        tags: ["tent"],
        stateTags: []
      },
      jin_camp_direction: {
        id: "jin_camp_direction",
        name: "晋军营方向",
        description: "晋营方向",
        connectedTo: ["qin_camp_exterior"],
        presentNPCs: ["jin_envoy"],
        tags: ["jin"],
        stateTags: []
      }
    },
    npcs: {
      zheng_duke: {
        id: "zheng_duke",
        name: "郑伯",
        faction: "zheng",
        location: "zheng_palace",
        identity: "郑国国君",
        currentGoal: "保全国都",
        longTermGoal: "维持郑国存续",
        personality: ["谨慎"],
        publicAttitudeToPlayer: "信任但焦虑",
        possibleActions: ["会见", "命令"],
        isKeyNPC: true
      },
      yi_zhihu: {
        id: "yi_zhihu",
        name: "佚之狐",
        faction: "zheng",
        location: "zheng_palace",
        identity: "郑国大夫",
        currentGoal: "推荐烛之武",
        longTermGoal: "稳定郑国局势",
        personality: ["机敏"],
        publicAttitudeToPlayer: "支持",
        possibleActions: ["建议"],
        isKeyNPC: true
      },
      qin_duke: {
        id: "qin_duke",
        name: "秦伯",
        faction: "qin",
        location: "qin_main_tent",
        identity: "秦国国君",
        currentGoal: "评估灭郑收益",
        longTermGoal: "维护秦国利益",
        personality: ["审慎"],
        publicAttitudeToPlayer: "未定",
        possibleActions: ["召见", "询问"],
        isKeyNPC: true
      },
      jin_envoy: {
        id: "jin_envoy",
        name: "晋使",
        faction: "jin",
        location: "jin_camp_direction",
        identity: "晋国使者",
        currentGoal: "维护秦晋协作",
        longTermGoal: "避免秦国独得利益",
        personality: ["警觉"],
        publicAttitudeToPlayer: "戒备",
        possibleActions: ["观察", "上报"],
        isKeyNPC: true
      },
      guard: {
        id: "guard",
        name: "守卫",
        faction: "qin",
        location: "qin_camp_exterior",
        identity: "秦营守卫",
        currentGoal: "维持秩序",
        longTermGoal: "执行命令",
        personality: ["服从"],
        publicAttitudeToPlayer: "审视",
        possibleActions: ["通报", "阻拦"],
        isKeyNPC: false
      },
      commoner_rep: {
        id: "commoner_rep",
        name: "郑国百姓代表",
        faction: "commoners",
        location: "market",
        identity: "民间代表",
        currentGoal: "求存",
        longTermGoal: "保全家园",
        personality: ["忧惧"],
        publicAttitudeToPlayer: "期待",
        possibleActions: ["议论"],
        isKeyNPC: false
      }
    },
    knowledge: {
      opening_context: {
        id: "opening_context",
        content: "秦晋围郑",
        source: "开局背景",
        credibility: "high",
        knownByPlayer: true,
        knownByNPCs: ["zheng_duke"],
        tags: ["opening"]
      }
    },
    eventLog: [],
    checkpoints: [],
    flags: {
      missionAccepted: true
    }
  };

  const result = worldStateSchema.safeParse(world);
  assert.equal(result.success, true);
});

test("npcMemoryStore schema rejects mismatched store key and npcId", () => {
  const result = npcMemoryStoreSchema.safeParse({
    qin_duke: {
      npcId: "jin_envoy",
      episodicMemory: [],
      beliefs: [],
      doubts: [],
      attitudes: {},
      promisesMade: [],
      promisesReceived: [],
      privateFlags: {}
    }
  });

  assert.equal(result.success, false);
});

test("npcKernelOutput schema enforces proposal ownership", () => {
  const result = npcKernelOutputSchema.safeParse({
    npcId: "qin_duke",
    memoryPatch: {
      npcId: "jin_envoy",
      sourceObservableEventId: "obs-1"
    },
    debugSummary: "invalid ownership"
  });

  assert.equal(result.success, false);
});

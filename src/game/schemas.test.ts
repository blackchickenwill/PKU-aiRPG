import test from "node:test";
import assert from "node:assert/strict";

import {
  gameRuntimeStateSchema,
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

test("gameRuntimeState schema accepts objective world plus private memory store", () => {
  const runtime = {
    world: {
      timeStage: "\u591c\u521d",
      currentLocation: "zhu_home",
      playerRole: "zhu_zhiwu",
      locations: {
        zhu_home: {
          id: "zhu_home",
          name: "\u70db\u4e4b\u6b66\u5b85",
          description: "\u8d77\u70b9",
          connectedTo: ["zheng_palace"],
          presentNPCs: [],
          tags: ["home"],
          stateTags: []
        },
        zheng_palace: {
          id: "zheng_palace",
          name: "\u90d1\u4f2f\u5bab\u5ba4",
          description: "\u5bab\u5ba4",
          connectedTo: ["zhu_home", "market"],
          presentNPCs: ["zheng_duke", "yi_zhihu"],
          tags: ["palace"],
          stateTags: []
        },
        market: {
          id: "market",
          name: "\u90d1\u56fd\u5e02\u4e95",
          description: "\u5e02\u4e95",
          connectedTo: ["zheng_palace", "city_gate"],
          presentNPCs: ["commoner_rep"],
          tags: ["city"],
          stateTags: []
        },
        city_gate: {
          id: "city_gate",
          name: "\u57ce\u5899 / \u57ce\u95e8",
          description: "\u57ce\u95e8",
          connectedTo: ["market", "qin_camp_exterior"],
          presentNPCs: [],
          tags: ["gate"],
          stateTags: []
        },
        qin_camp_exterior: {
          id: "qin_camp_exterior",
          name: "\u79e6\u8425\u5916",
          description: "\u79e6\u8425\u5916",
          connectedTo: ["city_gate", "qin_main_tent"],
          presentNPCs: ["guard"],
          tags: ["camp"],
          stateTags: []
        },
        qin_main_tent: {
          id: "qin_main_tent",
          name: "\u79e6\u4f2f\u4e3b\u5e10",
          description: "\u4e3b\u5e10",
          connectedTo: ["qin_camp_exterior"],
          presentNPCs: ["qin_duke"],
          tags: ["tent"],
          stateTags: []
        },
        jin_camp_direction: {
          id: "jin_camp_direction",
          name: "\u664b\u519b\u8425\u65b9\u5411",
          description: "\u664b\u8425\u65b9\u5411",
          connectedTo: ["qin_camp_exterior"],
          presentNPCs: ["jin_envoy"],
          tags: ["jin"],
          stateTags: []
        }
      },
      npcs: {
        zheng_duke: {
          id: "zheng_duke",
          name: "\u90d1\u4f2f",
          faction: "zheng",
          location: "zheng_palace",
          identity: "\u90d1\u56fd\u56fd\u541b",
          currentGoal: "\u4fdd\u5168\u90d1\u56fd",
          longTermGoal: "\u7ef4\u6301\u90d1\u56fd\u5b58\u7eed",
          personality: ["\u7136\u8651", "\u73b0\u5b9e"],
          publicAttitudeToPlayer: "\u4fe1\u4efb",
          possibleActions: ["\u4f1a\u89c1"],
          isKeyNPC: true
        },
        yi_zhihu: {
          id: "yi_zhihu",
          name: "\u4f5a\u4e4b\u72d0",
          faction: "zheng",
          location: "zheng_palace",
          identity: "\u90d1\u56fd\u5927\u592b",
          currentGoal: "\u63a8\u8350\u70db\u4e4b\u6b66",
          longTermGoal: "\u4fc3\u6210\u51fa\u4f7f",
          personality: ["\u673a\u654f"],
          publicAttitudeToPlayer: "\u652f\u6301",
          possibleActions: ["\u5efa\u8bae"],
          isKeyNPC: true
        },
        qin_duke: {
          id: "qin_duke",
          name: "\u79e6\u4f2f",
          faction: "qin",
          location: "qin_main_tent",
          identity: "\u79e6\u56fd\u56fd\u541b",
          currentGoal: "\u5224\u65ad\u706d\u90d1\u5229\u5bb3",
          longTermGoal: "\u7ef4\u62a4\u79e6\u56fd\u5229\u76ca",
          personality: ["\u52a1\u5b9e"],
          publicAttitudeToPlayer: "\u672a\u5b9a",
          possibleActions: ["\u53ec\u89c1"],
          isKeyNPC: true
        },
        jin_envoy: {
          id: "jin_envoy",
          name: "\u664b\u4f7f",
          faction: "jin",
          location: "jin_camp_direction",
          identity: "\u664b\u56fd\u4ee3\u8868",
          currentGoal: "\u9632\u6b62\u79e6\u56fd\u72ec\u548c",
          longTermGoal: "\u7ef4\u6301\u8054\u76df\u8868\u8c61",
          personality: ["\u8b66\u89c9"],
          publicAttitudeToPlayer: "\u6212\u5907",
          possibleActions: ["\u89c2\u5bdf"],
          isKeyNPC: true
        },
        guard: {
          id: "guard",
          name: "\u5b88\u536b",
          faction: "qin",
          location: "qin_camp_exterior",
          identity: "\u79e6\u8425\u79e9\u5e8f\u7ef4\u62a4\u8005",
          currentGoal: "\u5b88\u95e8",
          longTermGoal: "\u6267\u884c\u547d\u4ee4",
          personality: ["\u670d\u4ece"],
          publicAttitudeToPlayer: "\u5ba1\u89c6",
          possibleActions: ["\u901a\u62a5"],
          isKeyNPC: false
        },
        commoner_rep: {
          id: "commoner_rep",
          name: "\u767e\u59d3\u4ee3\u8868",
          faction: "commoners",
          location: "market",
          identity: "\u90d1\u56fd\u767e\u59d3\u4ee3\u8868",
          currentGoal: "\u6c42\u751f",
          longTermGoal: "\u4fdd\u5168\u5bb6\u56ed",
          personality: ["\u60ca\u60e7"],
          publicAttitudeToPlayer: "\u671f\u5f85",
          possibleActions: ["\u8bae\u8bba"],
          isKeyNPC: false
        }
      },
      knowledge: {},
      eventLog: [],
      flags: {}
    },
    npcMemories: {
      zheng_duke: {
        npcId: "zheng_duke",
        episodicMemory: [],
        beliefs: [],
        doubts: [],
        attitudes: {},
        promisesMade: [],
        promisesReceived: [],
        privateFlags: {}
      },
      yi_zhihu: {
        npcId: "yi_zhihu",
        episodicMemory: [],
        beliefs: [],
        doubts: [],
        attitudes: {},
        promisesMade: [],
        promisesReceived: [],
        privateFlags: {}
      },
      qin_duke: {
        npcId: "qin_duke",
        episodicMemory: [],
        beliefs: [],
        doubts: [],
        attitudes: {},
        promisesMade: [],
        promisesReceived: [],
        privateFlags: {}
      },
      jin_envoy: {
        npcId: "jin_envoy",
        episodicMemory: [],
        beliefs: [],
        doubts: [],
        attitudes: {},
        promisesMade: [],
        promisesReceived: [],
        privateFlags: {}
      },
      guard: {
        npcId: "guard",
        episodicMemory: [],
        beliefs: [],
        doubts: [],
        attitudes: {},
        promisesMade: [],
        promisesReceived: [],
        privateFlags: {}
      },
      commoner_rep: {
        npcId: "commoner_rep",
        episodicMemory: [],
        beliefs: [],
        doubts: [],
        attitudes: {},
        promisesMade: [],
        promisesReceived: [],
        privateFlags: {}
      }
    },
    checkpoints: []
  };

  const result = gameRuntimeStateSchema.safeParse(runtime);
  assert.equal(result.success, true);
});

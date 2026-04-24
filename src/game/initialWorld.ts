import rawInitialKnowledge from "../data/initialKnowledge.json";
import rawInitialLocations from "../data/locations.json";
import rawInitialNpcMemories from "../data/npcMemories.json";
import rawInitialNpcs from "../data/npcs.json";
import {
  gameRuntimeStateSchema,
  knowledgeItemSchema,
  locationStateSchema,
  npcMemoryStoreSchema,
  npcStateSchema,
  worldStateSchema
} from "./schemas";
import type {
  GameRuntimeState,
  KnowledgeItem,
  LocationId,
  LocationState,
  NPCId,
  NPCMemoryStore,
  NPCState,
  WorldState
} from "./types";

const parseRecord = <TKey extends string, TValue>(
  input: Record<TKey, unknown>,
  itemSchema: { parse: (value: unknown) => TValue }
): Record<TKey, TValue> => {
  const entries = Object.entries(input).map(([key, value]) => [
    key,
    itemSchema.parse(value)
  ]);

  return Object.fromEntries(entries) as Record<TKey, TValue>;
};

export const initialNpcs = parseRecord<NPCId, NPCState>(
  rawInitialNpcs as Record<NPCId, unknown>,
  npcStateSchema
);

export const initialLocations = parseRecord<LocationId, LocationState>(
  rawInitialLocations as Record<LocationId, unknown>,
  locationStateSchema
);

export const initialKnowledge = parseRecord<string, KnowledgeItem>(
  rawInitialKnowledge as Record<string, unknown>,
  knowledgeItemSchema
);

export const initialNpcMemories = npcMemoryStoreSchema.parse(
  rawInitialNpcMemories
) as NPCMemoryStore;

export const initialWorldState: WorldState = worldStateSchema.parse({
  timeStage: "夜初",
  currentLocation: "zhu_home",
  playerRole: "zhu_zhiwu",
  locations: initialLocations,
  npcs: initialNpcs,
  knowledge: initialKnowledge,
  eventLog: [],
  flags: {
    briefingCompleted: false,
    playerLeftCity: false,
    audienceRequestedAtQinCamp: false
  }
});

export const initialGameRuntimeState: GameRuntimeState =
  gameRuntimeStateSchema.parse({
    world: initialWorldState,
    npcMemories: initialNpcMemories,
    checkpoints: []
  });

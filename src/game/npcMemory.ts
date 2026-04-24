import {
  memoryPatchProposalSchema,
  npcMemoryStoreSchema,
  observableEventSchema
} from "./schemas";
import type {
  MemoryPatchProposal,
  NPCMemory,
  NPCMemoryStore,
  ObservableEvent
} from "./types";

export interface MemoryPatchApplicationResult {
  status: "accepted" | "rejected";
  reason: string;
  nextStore: NPCMemoryStore;
  appliedMemory?: NPCMemory;
  debugHints: string[];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function mergeStringArray(
  current: string[],
  additions?: string[]
): string[] {
  if (!additions || additions.length === 0) {
    return current;
  }

  return uniqueStrings([...current, ...additions]);
}

function removeStrings(current: string[], removals?: string[]): string[] {
  if (!removals || removals.length === 0) {
    return current;
  }

  const removalSet = new Set(removals);
  return current.filter((value) => !removalSet.has(value));
}

function reject(
  store: NPCMemoryStore,
  reason: string,
  debugHints: string[]
): MemoryPatchApplicationResult {
  return {
    status: "rejected",
    reason,
    nextStore: store,
    debugHints
  };
}

function buildNextMemory(
  current: NPCMemory,
  patch: MemoryPatchProposal
): NPCMemory {
  return {
    ...current,
    episodicMemory: mergeStringArray(
      current.episodicMemory,
      patch.addEpisodicMemory
    ),
    beliefs: mergeStringArray(current.beliefs, patch.addBeliefs),
    doubts: mergeStringArray(current.doubts, patch.addDoubts),
    attitudes: {
      ...current.attitudes,
      ...(patch.attitudeUpdates ?? {})
    },
    promisesMade: current.promisesMade,
    promisesReceived: current.promisesReceived,
    lastPlayerInteraction:
      patch.lastPlayerInteraction ?? current.lastPlayerInteraction,
    privateFlags: {
      ...current.privateFlags,
      ...(patch.privateFlagUpdates ?? {})
    }
  };
}

export function applyMemoryPatchProposal(
  store: NPCMemoryStore,
  patchInput: MemoryPatchProposal,
  observableEventInput: ObservableEvent | null
): MemoryPatchApplicationResult {
  const parsedStore = npcMemoryStoreSchema.parse(store);
  const patch = memoryPatchProposalSchema.parse(patchInput);

  if (observableEventInput === null) {
    return reject(
      parsedStore,
      "该 memory patch 没有对应的可见事件来源，不能落盘。",
      ["observable event is null"]
    );
  }

  const observableEvent = observableEventSchema.parse(observableEventInput);

  if (patch.npcId !== observableEvent.observerNpcId) {
    return reject(
      parsedStore,
      "memory patch 的归属 NPC 与可见事件观察者不一致。",
      ["patch npcId does not match observerNpcId"]
    );
  }

  if (patch.sourceObservableEventId !== observableEvent.id) {
    return reject(
      parsedStore,
      "memory patch 必须引用触发它的同一条 ObservableEvent。",
      ["source observable event id mismatch"]
    );
  }

  if (observableEvent.visibility === "none") {
    return reject(
      parsedStore,
      "不可见事件不能更新 NPC memory。",
      ["observable event visibility is none"]
    );
  }

  const currentMemory = parsedStore[patch.npcId];
  const nextMemory = buildNextMemory(
    {
      ...currentMemory,
      beliefs: removeStrings(currentMemory.beliefs, patch.removeBeliefs)
    },
    patch
  );

  const nextStore = npcMemoryStoreSchema.parse({
    ...parsedStore,
    [patch.npcId]: nextMemory
  });

  return {
    status: "accepted",
    reason: "memory patch 来源合法，已写入对应 NPC 私有记忆。",
    nextStore,
    appliedMemory: nextMemory,
    debugHints: ["memory patch validated against observable event"]
  };
}

export function restoreNpcMemoryStore(snapshot: NPCMemoryStore): NPCMemoryStore {
  return npcMemoryStoreSchema.parse(structuredClone(snapshot));
}

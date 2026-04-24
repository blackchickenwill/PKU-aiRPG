import { z } from "zod";

const timeStageValues = ["夜初", "夜半", "黎明前", "清晨"] as const;
const factionValues = ["zheng", "qin", "jin", "commoners"] as const;
const npcValues = [
  "zheng_duke",
  "yi_zhihu",
  "qin_duke",
  "jin_envoy",
  "guard",
  "commoner_rep"
] as const;
const locationValues = [
  "zhu_home",
  "zheng_palace",
  "market",
  "city_gate",
  "qin_camp_exterior",
  "qin_main_tent",
  "jin_camp_direction"
] as const;
const actionIntentValues = [
  "move",
  "observe",
  "investigate",
  "request_meeting",
  "speak",
  "persuade",
  "negotiate",
  "probe",
  "exchange_interest",
  "defend",
  "give_item_or_info",
  "wait",
  "refuse_mission",
  "delay_commitment",
  "conditional_acceptance",
  "impossible_action",
  "out_of_world_instruction"
] as const;
const strategyValues = [
  "interest_analysis",
  "qin_jin_divergence",
  "zheng_as_eastern_host",
  "humble_plea",
  "probe_intention",
  "offer_benefit",
  "explain_loyalty",
  "grievance_expression",
  "self_deprecation",
  "loyalty_conflict",
  "demand_recognition",
  "reluctant_acceptance",
  "incoherent",
  "none"
] as const;
const safetyValues = [
  "safe_in_world_action",
  "ambiguous_in_world_action",
  "impossible_action",
  "role_violation",
  "prompt_injection_attempt",
  "out_of_world_instruction_attempt",
  "request_for_hidden_system_info"
] as const;
const credibilityValues = ["high", "medium", "low", "unknown"] as const;
const attitudeTargetValues = [...npcValues, ...factionValues, "player"] as const;
const eventVisibilityValues = ["full", "partial", "rumor", "none"] as const;
const gameEventTypeValues = [
  "dialogue",
  "movement",
  "knowledge_gained",
  "npc_belief_changed",
  "npc_memory_patch",
  "npc_intention",
  "attitude_changed",
  "time_advanced",
  "checkpoint_created",
  "ending_triggered",
  "safety_rejection"
] as const;
const actorValues = [...npcValues, "player", "system", "world_director"] as const;
const npcIntentionTypeValues = [
  "speak",
  "question",
  "request_meeting",
  "warn",
  "detain",
  "delay",
  "withdraw_conditionally",
  "report",
  "do_nothing"
] as const;
const validatorStatusValues = ["accepted", "rejected", "converted"] as const;
const flagValueSchema = z.union([z.boolean(), z.number(), z.string()]);

export const timeStageSchema = z.enum(timeStageValues);
export const factionIdSchema = z.enum(factionValues);
export const npcIdSchema = z.enum(npcValues);
export const locationIdSchema = z.enum(locationValues);
export const playerRoleIdSchema = z.literal("zhu_zhiwu");
export const actionIntentSchema = z.enum(actionIntentValues);
export const strategyTagSchema = z.enum(strategyValues);
export const safetyClassificationSchema = z.enum(safetyValues);
export const credibilitySchema = z.enum(credibilityValues);
export const attitudeTargetSchema = z.enum(attitudeTargetValues);
export const eventVisibilitySchema = z.enum(eventVisibilityValues);
export const gameEventTypeSchema = z.enum(gameEventTypeValues);
export const actorIdSchema = z.enum(actorValues);
export const npcIntentionTypeSchema = z.enum(npcIntentionTypeValues);
export const validatorStatusSchema = z.enum(validatorStatusValues);

export const knowledgeItemSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  source: z.string().min(1),
  credibility: credibilitySchema,
  knownByPlayer: z.boolean(),
  knownByNPCs: z.array(npcIdSchema),
  tags: z.array(z.string())
});

export const npcStateSchema = z.object({
  id: npcIdSchema,
  name: z.string().min(1),
  faction: factionIdSchema,
  location: locationIdSchema,
  identity: z.string().min(1),
  currentGoal: z.string().min(1),
  longTermGoal: z.string().min(1),
  personality: z.array(z.string()),
  publicAttitudeToPlayer: z.string().min(1),
  possibleActions: z.array(z.string()),
  isKeyNPC: z.boolean()
});

export const npcMemorySchema = z.object({
  npcId: npcIdSchema,
  episodicMemory: z.array(z.string()),
  beliefs: z.array(z.string()),
  doubts: z.array(z.string()),
  attitudes: z.partialRecord(attitudeTargetSchema, z.string()),
  promisesMade: z.array(z.string()),
  promisesReceived: z.array(z.string()),
  lastPlayerInteraction: z.string().optional(),
  privateFlags: z.record(z.string(), flagValueSchema)
});

export const npcMemoryStoreSchema = z.record(npcIdSchema, npcMemorySchema).superRefine((store, ctx) => {
  for (const [npcId, memory] of Object.entries(store)) {
    if (memory.npcId !== npcId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `NPCMemory key ${npcId} must match npcId ${memory.npcId}`,
        path: [npcId, "npcId"]
      });
    }
  }
});

export const locationStateSchema = z.object({
  id: locationIdSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  connectedTo: z.array(locationIdSchema),
  presentNPCs: z.array(npcIdSchema),
  tags: z.array(z.string()),
  stateTags: z.array(z.string())
});

export const playerActionSchema = z.object({
  rawInput: z.string().min(1),
  currentLocation: locationIdSchema,
  timestamp: z.number().int().nonnegative()
});

export const actionProposalSchema = z.object({
  rawInput: z.string().min(1),
  intent: actionIntentSchema,
  strategies: z.array(strategyTagSchema),
  targetNPC: npcIdSchema.optional(),
  targetLocation: locationIdSchema.optional(),
  referencedKnowledgeIds: z.array(z.string()),
  safety: safetyClassificationSchema,
  tone: z.string().min(1),
  summary: z.string().min(1)
});

export const gameEventSchema = z.object({
  id: z.string().min(1),
  type: gameEventTypeSchema,
  summary: z.string().min(1),
  actor: actorIdSchema.optional(),
  target: z.union([npcIdSchema, locationIdSchema, factionIdSchema]).optional(),
  location: locationIdSchema.optional(),
  payload: z.record(z.string(), z.unknown()),
  important: z.boolean()
});

export const observableEventSchema = z.object({
  id: z.string().min(1),
  originalEventId: z.string().min(1),
  observerNpcId: npcIdSchema,
  visibility: eventVisibilitySchema,
  summaryForNpc: z.string().min(1),
  knownDetails: z.array(z.string()),
  hiddenDetails: z.array(z.string()),
  credibility: credibilitySchema
});

export const memoryPatchProposalSchema = z.object({
  npcId: npcIdSchema,
  sourceObservableEventId: z.string().min(1),
  addEpisodicMemory: z.array(z.string()).optional(),
  addBeliefs: z.array(z.string()).optional(),
  removeBeliefs: z.array(z.string()).optional(),
  addDoubts: z.array(z.string()).optional(),
  attitudeUpdates: z.partialRecord(attitudeTargetSchema, z.string()).optional(),
  lastPlayerInteraction: z.string().optional(),
  privateFlagUpdates: z.record(z.string(), flagValueSchema).optional()
});

export const npcIntentionProposalSchema = z.object({
  npcId: npcIdSchema,
  sourceObservableEventId: z.string().min(1),
  intentionType: npcIntentionTypeSchema,
  target: z.union([npcIdSchema, factionIdSchema, locationIdSchema, z.literal("player")]).optional(),
  summary: z.string().min(1),
  requiresValidation: z.literal(true)
});

export const npcKernelInputSchema = z.object({
  npcState: npcStateSchema,
  npcMemory: npcMemorySchema,
  observableEvent: observableEventSchema,
  publicWorldSummary: z.string().min(1),
  localSceneSummary: z.string().min(1),
  relevantKnownFacts: z.array(z.string())
});

export const npcKernelOutputSchema = z.object({
  npcId: npcIdSchema,
  memoryPatch: memoryPatchProposalSchema.optional(),
  intention: npcIntentionProposalSchema.optional(),
  dialogue: z.string().optional(),
  visibleReaction: z.string().optional(),
  debugSummary: z.string().min(1)
}).superRefine((output, ctx) => {
  if (
    output.memoryPatch !== undefined &&
    output.memoryPatch.npcId !== output.npcId
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "memoryPatch.npcId must match output.npcId",
      path: ["memoryPatch", "npcId"]
    });
  }

  if (
    output.intention !== undefined &&
    output.intention.npcId !== output.npcId
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "intention.npcId must match output.npcId",
      path: ["intention", "npcId"]
    });
  }
});

export const validatorResultSchema = z.object({
  status: validatorStatusSchema,
  reason: z.string().min(1),
  generatedEvents: z.array(gameEventSchema),
  formalHint: z.string().optional(),
  debugHints: z.array(z.string())
});

export const endingStateSchema = z.object({
  zhengFate: z.string().optional(),
  qinJinRelation: z.string().optional(),
  zhuZhiwuFate: z.string().optional(),
  zhengDukeEvaluation: z.string().optional(),
  qinDukeEvaluation: z.string().optional(),
  jinSideResponse: z.string().optional(),
  historicalEvaluation: z.string().optional(),
  reasons: z.array(z.string())
});

export const worldStateSchema: z.ZodType<import("./types").WorldState> = z.lazy(() =>
  z.object({
    timeStage: timeStageSchema,
    currentLocation: locationIdSchema,
    playerRole: playerRoleIdSchema,
    locations: z.record(locationIdSchema, locationStateSchema),
    npcs: z.record(npcIdSchema, npcStateSchema),
    knowledge: z.record(z.string(), knowledgeItemSchema),
    eventLog: z.array(gameEventSchema),
    flags: z.record(z.string(), flagValueSchema),
    ending: endingStateSchema.optional()
  })
);

export const checkpointSchema: z.ZodType<import("./types").Checkpoint> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    createdAtEventId: z.string().optional(),
    worldStateSnapshot: worldStateSchema,
    npcMemoryStoreSnapshot: npcMemoryStoreSchema
  })
);

export const gameRuntimeStateSchema: z.ZodType<import("./types").GameRuntimeState> = z.lazy(() =>
  z.object({
    world: worldStateSchema,
    npcMemories: npcMemoryStoreSchema,
    checkpoints: z.array(checkpointSchema)
  })
);

// This is the only LLM-facing envelope in Task 02: it contains proposals only,
// never committed WorldState or NPCMemory mutations.
export const llmStructuredProposalEnvelopeSchema = z.object({
  actionProposal: actionProposalSchema.optional(),
  memoryPatchProposal: memoryPatchProposalSchema.optional(),
  npcIntentionProposal: npcIntentionProposalSchema.optional()
});

export type TimeStage = z.infer<typeof timeStageSchema>;
export type FactionId = z.infer<typeof factionIdSchema>;
export type NPCId = z.infer<typeof npcIdSchema>;
export type LocationId = z.infer<typeof locationIdSchema>;
export type PlayerRoleId = z.infer<typeof playerRoleIdSchema>;
export type ActionIntent = z.infer<typeof actionIntentSchema>;
export type StrategyTag = z.infer<typeof strategyTagSchema>;
export type SafetyClassification = z.infer<typeof safetyClassificationSchema>;
export type Credibility = z.infer<typeof credibilitySchema>;
export type KnowledgeItem = z.infer<typeof knowledgeItemSchema>;
export type NPCState = z.infer<typeof npcStateSchema>;
export type NPCMemory = z.infer<typeof npcMemorySchema>;
export type NPCMemoryStore = z.infer<typeof npcMemoryStoreSchema>;
export type LocationState = z.infer<typeof locationStateSchema>;
export type PlayerAction = z.infer<typeof playerActionSchema>;
export type ActionProposal = z.infer<typeof actionProposalSchema>;
export type GameEvent = z.infer<typeof gameEventSchema>;
export type ObservableEvent = z.infer<typeof observableEventSchema>;
export type MemoryPatchProposal = z.infer<typeof memoryPatchProposalSchema>;
export type NPCIntentionProposal = z.infer<typeof npcIntentionProposalSchema>;
export type NPCKernelInput = z.infer<typeof npcKernelInputSchema>;
export type NPCKernelOutput = z.infer<typeof npcKernelOutputSchema>;
export type ValidatorResult = z.infer<typeof validatorResultSchema>;
export type Checkpoint = z.infer<typeof checkpointSchema>;
export type EndingState = z.infer<typeof endingStateSchema>;
export type WorldState = z.infer<typeof worldStateSchema>;
export type GameRuntimeState = z.infer<typeof gameRuntimeStateSchema>;

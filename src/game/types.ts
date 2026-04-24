export type TimeStage = "夜初" | "夜半" | "黎明前" | "清晨";

export type FactionId = "zheng" | "qin" | "jin" | "commoners";

export type NPCId =
  | "zheng_duke"
  | "yi_zhihu"
  | "qin_duke"
  | "jin_envoy"
  | "guard"
  | "commoner_rep";

export type LocationId =
  | "zhu_home"
  | "zheng_palace"
  | "market"
  | "city_gate"
  | "qin_camp_exterior"
  | "qin_main_tent"
  | "jin_camp_direction";

export type PlayerRoleId = "zhu_zhiwu";

export type ActorId = NPCId | "player" | "system" | "world_director";

export type ActionIntent =
  | "move"
  | "observe"
  | "investigate"
  | "request_meeting"
  | "speak"
  | "persuade"
  | "negotiate"
  | "probe"
  | "exchange_interest"
  | "defend"
  | "give_item_or_info"
  | "wait"
  | "impossible_action"
  | "out_of_world_instruction";

export type StrategyTag =
  | "interest_analysis"
  | "qin_jin_divergence"
  | "zheng_as_eastern_host"
  | "humble_plea"
  | "probe_intention"
  | "offer_benefit"
  | "explain_loyalty"
  | "incoherent"
  | "none";

export type SafetyClassification =
  | "safe_in_world_action"
  | "ambiguous_in_world_action"
  | "impossible_action"
  | "role_violation"
  | "prompt_injection_attempt"
  | "out_of_world_instruction_attempt"
  | "request_for_hidden_system_info";

export type Credibility = "high" | "medium" | "low" | "unknown";

export type AttitudeTarget = NPCId | FactionId | "player";

export type EventVisibility = "full" | "partial" | "rumor" | "none";

export type GameEventType =
  | "dialogue"
  | "movement"
  | "knowledge_gained"
  | "npc_belief_changed"
  | "npc_memory_patch"
  | "npc_intention"
  | "attitude_changed"
  | "time_advanced"
  | "checkpoint_created"
  | "ending_triggered"
  | "safety_rejection";

export type NPCIntentionType =
  | "speak"
  | "question"
  | "request_meeting"
  | "warn"
  | "detain"
  | "delay"
  | "withdraw_conditionally"
  | "report"
  | "do_nothing";

export type ValidatorStatus = "accepted" | "rejected" | "converted";

export interface KnowledgeItem {
  id: string;
  content: string;
  source: string;
  credibility: Credibility;
  knownByPlayer: boolean;
  knownByNPCs: NPCId[];
  tags: string[];
}

export interface NPCState {
  id: NPCId;
  name: string;
  faction: FactionId;
  location: LocationId;
  identity: string;
  currentGoal: string;
  longTermGoal: string;
  personality: string[];
  publicAttitudeToPlayer: string;
  possibleActions: string[];
  isKeyNPC: boolean;
}

export interface NPCMemory {
  npcId: NPCId;
  episodicMemory: string[];
  beliefs: string[];
  doubts: string[];
  attitudes: Partial<Record<AttitudeTarget, string>>;
  promisesMade: string[];
  promisesReceived: string[];
  lastPlayerInteraction?: string;
  privateFlags: Record<string, boolean | number | string>;
}

export type NPCMemoryStore = Record<NPCId, NPCMemory>;

export interface LocationState {
  id: LocationId;
  name: string;
  description: string;
  connectedTo: LocationId[];
  presentNPCs: NPCId[];
  tags: string[];
  stateTags: string[];
}

export interface PlayerAction {
  rawInput: string;
  currentLocation: LocationId;
  timestamp: number;
}

export interface ActionProposal {
  rawInput: string;
  intent: ActionIntent;
  strategies: StrategyTag[];
  targetNPC?: NPCId;
  targetLocation?: LocationId;
  referencedKnowledgeIds: string[];
  safety: SafetyClassification;
  tone: string;
  summary: string;
}

export interface GameEvent {
  id: string;
  type: GameEventType;
  summary: string;
  actor?: ActorId;
  target?: NPCId | LocationId | FactionId;
  location?: LocationId;
  payload: Record<string, unknown>;
  important: boolean;
}

export interface ObservableEvent {
  id: string;
  originalEventId: string;
  observerNpcId: NPCId;
  visibility: EventVisibility;
  summaryForNpc: string;
  knownDetails: string[];
  hiddenDetails: string[];
  credibility: Credibility;
}

export interface MemoryPatchProposal {
  npcId: NPCId;
  sourceObservableEventId: string;
  addEpisodicMemory?: string[];
  addBeliefs?: string[];
  removeBeliefs?: string[];
  addDoubts?: string[];
  attitudeUpdates?: Partial<Record<AttitudeTarget, string>>;
  lastPlayerInteraction?: string;
  privateFlagUpdates?: Record<string, boolean | number | string>;
}

export interface NPCIntentionProposal {
  npcId: NPCId;
  sourceObservableEventId: string;
  intentionType: NPCIntentionType;
  target?: NPCId | FactionId | LocationId | "player";
  summary: string;
  requiresValidation: true;
}

export interface NPCKernelInput {
  npcState: NPCState;
  npcMemory: NPCMemory;
  observableEvent: ObservableEvent;
  publicWorldSummary: string;
  localSceneSummary: string;
  relevantKnownFacts: string[];
}

export interface NPCKernelOutput {
  npcId: NPCId;
  memoryPatch?: MemoryPatchProposal;
  intention?: NPCIntentionProposal;
  dialogue?: string;
  visibleReaction?: string;
  debugSummary: string;
}

export interface ValidatorResult {
  status: ValidatorStatus;
  reason: string;
  generatedEvents: GameEvent[];
  formalHint?: string;
  debugHints: string[];
}

export interface EndingState {
  zhengFate?: string;
  qinJinRelation?: string;
  zhuZhiwuFate?: string;
  zhengDukeEvaluation?: string;
  qinDukeEvaluation?: string;
  jinSideResponse?: string;
  historicalEvaluation?: string;
  reasons: string[];
}

export interface WorldState {
  timeStage: TimeStage;
  currentLocation: LocationId;
  playerRole: PlayerRoleId;
  locations: Record<LocationId, LocationState>;
  npcs: Record<NPCId, NPCState>;
  knowledge: Record<string, KnowledgeItem>;
  eventLog: GameEvent[];
  checkpoints: Checkpoint[];
  flags: Record<string, boolean | number | string>;
  ending?: EndingState;
}

export interface Checkpoint {
  id: string;
  label: string;
  createdAtEventId?: string;
  worldStateSnapshot: WorldState;
  npcMemoryStoreSnapshot: NPCMemoryStore;
}

// LLM or mock kernels may only return proposals. They never directly mutate
// WorldState or NPCMemory; those mutations must be committed by later systems.
export interface LLMStructuredProposalEnvelope {
  actionProposal?: ActionProposal;
  memoryPatchProposal?: MemoryPatchProposal;
  npcIntentionProposal?: NPCIntentionProposal;
}

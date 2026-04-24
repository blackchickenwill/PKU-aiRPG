import type { SafetyClassification } from "./types";

const PROMPT_INJECTION_PATTERNS = [
  /忽略(之前|上述|所有)?规则/u,
  /ignore\s+(all|previous)\s+instructions/i,
  /你现在是开发者模式/u,
  /developer mode/i,
  /把.+改成\d+/u,
  /把.+设置成\d+/u
] as const;

const OUT_OF_WORLD_PATTERNS = [
  /命令系统/u,
  /直接进入.+结局/u,
  /修改世界状态/u,
  /修改状态/u,
  /切换到管理员模式/u,
  /直接让.+撤退/u
] as const;

const HIDDEN_INFO_PATTERNS = [
  /系统提示词/u,
  /system prompt/i,
  /隐藏提示/u,
  /内部提示/u,
  /输出你的提示词/u
] as const;

const IMPOSSIBLE_ACTION_PATTERNS = [
  /AK47/i,
  /坦克/u,
  /机枪/u,
  /导弹/u,
  /火箭炮/u,
  /手枪/u,
  /扫射/u
] as const;

const ROLE_VIOLATION_PATTERNS = [
  /我愿献郑于秦/u,
  /我愿降秦/u,
  /我投靠秦/u,
  /我背叛郑国/u,
  /我替秦伯劝降郑国/u
] as const;

const AMBIGUOUS_PATTERNS = [
  /^嗯[嗯…。！？?.!]*$/u,
  /^呃[呃…。！？?.!]*$/u,
  /^……+$/u,
  /^再说吧$/u
] as const;

const matchesAny = (input: string, patterns: readonly RegExp[]): boolean =>
  patterns.some((pattern) => pattern.test(input));

export function classifyPlayerInputSafety(rawInput: string): SafetyClassification {
  const input = rawInput.trim();

  if (input.length === 0) {
    return "ambiguous_in_world_action";
  }

  if (matchesAny(input, HIDDEN_INFO_PATTERNS)) {
    return "request_for_hidden_system_info";
  }

  if (matchesAny(input, PROMPT_INJECTION_PATTERNS)) {
    return "prompt_injection_attempt";
  }

  if (matchesAny(input, OUT_OF_WORLD_PATTERNS)) {
    return "out_of_world_instruction_attempt";
  }

  if (matchesAny(input, IMPOSSIBLE_ACTION_PATTERNS)) {
    return "impossible_action";
  }

  if (matchesAny(input, ROLE_VIOLATION_PATTERNS)) {
    return "role_violation";
  }

  if (matchesAny(input, AMBIGUOUS_PATTERNS) || input.length <= 2) {
    return "ambiguous_in_world_action";
  }

  return "safe_in_world_action";
}

export function isUnsafeClassification(
  classification: SafetyClassification
): boolean {
  return ![
    "safe_in_world_action",
    "ambiguous_in_world_action"
  ].includes(classification);
}

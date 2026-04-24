import { npcKernelInputSchema, npcKernelOutputSchema } from "./schemas";
import { runGuardKernelMock } from "./kernels/guardMock";
import { runJinEnvoyKernelMock } from "./kernels/jinEnvoyMock";
import { runQinDukeKernelMock } from "./kernels/qinDukeMock";
import { runYiZhihuKernelMock } from "./kernels/yiZhihuMock";
import { runZhengDukeKernelMock } from "./kernels/zhengDukeMock";
import type { NPCKernelInput, NPCKernelOutput } from "./types";

function createNoOpOutput(input: NPCKernelInput, debugSummary: string): NPCKernelOutput {
  return npcKernelOutputSchema.parse({
    npcId: input.npcState.id,
    debugSummary
  });
}

export function runNpcKernelMock(input: NPCKernelInput): NPCKernelOutput {
  const parsedInput = npcKernelInputSchema.parse(input);

  if (parsedInput.npcState.id !== parsedInput.observableEvent.observerNpcId) {
    return createNoOpOutput(
      parsedInput,
      "Kernel input mismatch: npcState.id does not match observable event observer."
    );
  }

  if (parsedInput.npcMemory.npcId !== parsedInput.npcState.id) {
    return createNoOpOutput(
      parsedInput,
      "Kernel input mismatch: npcMemory.npcId does not match npcState.id."
    );
  }

  switch (parsedInput.npcState.id) {
    case "qin_duke":
      return runQinDukeKernelMock(parsedInput);
    case "jin_envoy":
      return runJinEnvoyKernelMock(parsedInput);
    case "zheng_duke":
      return runZhengDukeKernelMock(parsedInput);
    case "guard":
      return runGuardKernelMock(parsedInput);
    case "yi_zhihu":
      return runYiZhihuKernelMock(parsedInput);
    case "commoner_rep":
      return createNoOpOutput(
        parsedInput,
        "Commoner representative mock kernel is not implemented yet; no proposal emitted."
      );
    default:
      return createNoOpOutput(parsedInput, "No matching mock kernel was found.");
  }
}

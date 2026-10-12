import { z } from "zod";
import { haikuSchema, type Haiku } from "./haiku";

export const HAIKU_TOOL = "generate_haiku";
export const HAIKU_TOOL_DESCRIPTION = "Display a new Japanese haiku with its English translation in the garden.";

/** CopilotKit parses tool arguments; validate them before changing the garden. */
export function createHaikuHandler(show: (haiku: Haiku, toolCallId: string) => void) {
  const results = new Map<string, string>();
  return (args: unknown, toolCallId: string): string => {
    const previous = results.get(toolCallId);
    if (previous !== undefined) return previous;
    const parsed = haikuSchema.safeParse(args);
    let result: string;
    if (parsed.success) {
      show(parsed.data, toolCallId);
      result = "Haiku displayed in the garden.";
    } else {
      result = `The haiku was not displayed: ${z.prettifyError(parsed.error)}`;
    }
    results.set(toolCallId, result);
    return result;
  };
}

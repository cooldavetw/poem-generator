import { z } from "zod";
import { poemSchema, type Poem } from "./poem";

export const POEM_TOOL = "generate_poem";
export const POEM_TOOL_DESCRIPTION = "Display an original Traditional Chinese modern poem in the studio.";

/** CopilotKit parses tool arguments; validate them before changing the studio. */
export function createPoemHandler(show: (poem: Poem, toolCallId: string) => void) {
  const results = new Map<string, string>();
  return (args: unknown, toolCallId: string): string => {
    const previous = results.get(toolCallId);
    if (previous !== undefined) return previous;
    const parsed = poemSchema.safeParse(args);
    let result: string;
    if (parsed.success) {
      show(parsed.data, toolCallId);
      result = "Poem displayed in the studio.";
    } else {
      result = `The poem was not displayed: ${z.prettifyError(parsed.error)}`;
    }
    results.set(toolCallId, result);
    return result;
  };
}

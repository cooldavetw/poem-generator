import { z } from "zod";

export const poemSchema = z.object({
  title: z.string().trim().min(1).max(80).describe("A short title in Traditional Chinese"),
  lines: z.array(z.string().trim().min(1).max(200)).min(2).max(16)
    .describe("2–16 lines of original modern Chinese free verse, in Traditional Chinese"),
});

export type Poem = z.infer<typeof poemSchema>;
export type SavedPoem = Poem & { id: string; illustration?: string; painting?: boolean };

export function addPoem(history: SavedPoem[], poem: Poem, id: string, extra: Partial<SavedPoem> = {}): SavedPoem[] {
  return [{ ...extra, ...poemSchema.parse(poem), id }, ...history].slice(0, 50);
}

export function updatePoem(history: SavedPoem[], id: string, changes: Partial<SavedPoem>): SavedPoem[] {
  return history.map((poem) => (poem.id === id ? { ...poem, ...changes, id } : poem));
}

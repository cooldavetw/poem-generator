import assert from "node:assert/strict";
import test from "node:test";
import { createHaikuHandler } from "../src/lib/agent";
import { sampleHaiku, type Haiku } from "../src/lib/haiku";

test("a valid tool call displays once even if CopilotKit retries its handler", () => {
  const shown: [Haiku, string][] = [];
  const handler = createHaikuHandler((haiku, id) => shown.push([haiku, id]));
  assert.equal(handler(sampleHaiku, "c1"), "Haiku displayed in the garden.");
  assert.equal(handler(sampleHaiku, "c1"), "Haiku displayed in the garden.");
  assert.deepEqual(shown, [[sampleHaiku, "c1"]]);
  handler(sampleHaiku, "c2");
  assert.equal(shown.length, 2);
});

test("invalid arguments produce a tool result without changing the garden", () => {
  const shown: Haiku[] = [];
  const handler = createHaikuHandler((haiku) => shown.push(haiku));
  for (const [index, args] of [null, {}, { ...sampleHaiku, japanese: ["one"] }, { ...sampleHaiku, image_name: "bad.svg" }].entries()) {
    const result = handler(args, `bad-${index}`);
    assert.match(result, /The haiku was not displayed:/);
    assert.equal(handler(args, `bad-${index}`), result);
  }
  assert.equal(shown.length, 0);
});

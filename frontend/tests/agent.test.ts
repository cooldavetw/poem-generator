import assert from "node:assert/strict";
import test from "node:test";
import { createPoemHandler } from "../src/lib/agent";
import type { Poem } from "../src/lib/poem";
import { samplePoem } from "./fixture";

test("a valid tool call displays once even if CopilotKit retries its handler", () => {
  const shown: [Poem, string][] = [];
  const handler = createPoemHandler((poem, id) => shown.push([poem, id]));
  assert.equal(handler(samplePoem, "c1"), "Poem displayed in the studio.");
  assert.equal(handler(samplePoem, "c1"), "Poem displayed in the studio.");
  assert.deepEqual(shown, [[samplePoem, "c1"]]);
  handler(samplePoem, "c2");
  assert.equal(shown.length, 2);
});

test("invalid arguments produce a tool result without changing the studio", () => {
  const shown: Poem[] = [];
  const handler = createPoemHandler((poem) => shown.push(poem));
  for (const [index, args] of [null, {}, { ...samplePoem, lines: ["one"] }, { ...samplePoem, title: " " }].entries()) {
    const result = handler(args, `bad-${index}`);
    assert.match(result, /The poem was not displayed:/);
    assert.equal(handler(args, `bad-${index}`), result);
  }
  assert.equal(shown.length, 0);
});

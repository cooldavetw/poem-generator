import assert from "node:assert/strict";
import test from "node:test";
import { addPoem, poemSchema, updatePoem } from "../src/lib/poem";
import { samplePoem } from "./fixture";

test("accepts flexible free verse and rejects empty, excessive or oversized content", () => {
  for (const lines of [[], ["一行"], ["一行", " "], Array(17).fill("一行"), ["x".repeat(201), "一行"]]) {
    assert.equal(poemSchema.safeParse({ ...samplePoem, lines }).success, false);
  }
  assert.equal(poemSchema.safeParse({ ...samplePoem, title: " " }).success, false);
  assert.equal(poemSchema.safeParse(samplePoem).success, true);
  assert.equal(poemSchema.safeParse({ ...samplePoem, lines: Array(16).fill("一行") }).success, true);
});

test("new poems come first and poems with matching text are retained", () => {
  const first = addPoem([], samplePoem, "first");
  assert.deepEqual(addPoem(first, samplePoem, "second").map((poem) => poem.id), ["second", "first"]);
  assert.equal(first.length, 1);
});

test("bounds session history to the most recent 50 poems", () => {
  let history = addPoem([], samplePoem, "0");
  for (let index = 1; index < 60; index++) history = addPoem(history, samplePoem, String(index));
  assert.equal(history.length, 50);
  assert.equal(history[0].id, "59");
  assert.equal(history[49].id, "10");
});

test("an illustration lands on its own poem only", () => {
  const history = addPoem(addPoem([], samplePoem, "a", { painting: true }), samplePoem, "b", { painting: true });
  const updated = updatePoem(history, "a", { illustration: "blob:x", painting: false });
  assert.deepEqual(updated.map((p) => [p.id, p.illustration, p.painting]), [["b", undefined, true], ["a", "blob:x", false]]);
  assert.equal(history[1].illustration, undefined);
});

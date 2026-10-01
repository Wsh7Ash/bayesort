import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tokenize } from "../src/token.ts";
import { NaiveBayes } from "../src/nb.ts";

describe("tokenize", () => {
  it("lowercases and splits on non-alphanumerics", () => {
    assert.deepEqual(tokenize("Hello, WORLD!! foo-bar"), [
      "hello",
      "world",
      "foo",
      "bar",
    ]);
  });
  it("drops 1-letter tokens and >30-letter tokens", () => {
    assert.deepEqual(tokenize("a bb 1 22 " + "x".repeat(31)), ["bb", "22"]);
  });
  it("keeps digit runs", () => {
    assert.deepEqual(tokenize("invoice 2026 q4"), ["invoice", "2026", "q4"]);
  });
});

function trainTiny(): NaiveBayes {
  const nb = new NaiveBayes();
  nb.train("spam", "buy pills cheap now");
  nb.train("spam", "cheap pills offer");
  nb.train("work", "quarterly report meeting");
  nb.train("work", "meeting agenda report");
  return nb;
}

describe("NaiveBayes", () => {
  it("classifies obvious spam words as spam", () => {
    const nb = trainTiny();
    assert.equal(nb.classify("cheap pills now").label, "spam");
  });
  it("classifies obvious work words as work", () => {
    const nb = trainTiny();
    assert.equal(nb.classify("meeting report").label, "work");
  });
  it("scores unseen words without crashing (smoothing)", () => {
    const nb = trainTiny();
    const scores = nb.score("zzzq unseen");
    assert.equal(scores.size, 2);
    for (const v of scores.values()) assert.ok(Number.isFinite(v));
  });
  it("empty model has no labels and classify throws", () => {
    const nb = new NaiveBayes();
    assert.throws(() => nb.classify("x"), /no labels/);
  });
  it("rejects non-positive alpha", () => {
    assert.throws(() => new NaiveBayes(0), /alpha/);
  });
  it("roundtrips through JSON with digest", () => {
    const nb = trainTiny();
    const restored = NaiveBayes.fromJSON(JSON.parse(JSON.stringify(nb.toJSON())));
    assert.equal(
      restored.classify("cheap pills").label,
      nb.classify("cheap pills").label,
    );
  });
  it("rejects a tampered model", () => {
    const nb = trainTiny();
    const json = nb.toJSON() as unknown as Record<string, unknown>;
    json.totalDocs = 999; // tamper
    assert.throws(() => NaiveBayes.fromJSON(json), /digest mismatch/);
  });
  it("rejects foreign JSON", () => {
    assert.throws(() => NaiveBayes.fromJSON({ hello: 1 }), /not a bayesort/);
  });
});

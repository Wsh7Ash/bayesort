import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { after, describe, it } from "node:test";

function makeCorpus(): string {
  const root = mkdtempSync(join(tmpdir(), "bayesort-"));
  const seed = (label: string, word: string) => {
    const dir = join(root, "corpus", label);
    mkdirSync(dir, { recursive: true });
    for (let i = 0; i < 8; i++) {
      writeFileSync(
        join(dir, `${label}-${i}.txt`),
        `${word} ${word} doc number ${i} ${label}file\n`,
      );
    }
  };
  seed("ops", "server deploy outage runbook");
  seed("sales", "invoice quote customer deal");
  return join(root, "corpus");
}

const corpus = makeCorpus();
const modelPath = join(tmpdir(), `bayesort-model-${process.pid}.json`);

after(() => {
  rmSync(corpus, { recursive: true, force: true });
  rmSync(modelPath, { force: true });
});

const CLI = new URL("../src/cli.ts", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1",
);

function run(args: string[], input?: string): string {
  return execFileSync(process.execPath, [CLI, ...args], {
    input,
    encoding: "utf8",
  });
}

describe("CLI end-to-end", () => {
  it("train writes a model", () => {
    const out = run(["train", "--corpus", corpus, "--model", modelPath]);
    assert.match(out, /trained on 16 docs, 2 labels/);
  });

  it("eval reports accuracy and split check", () => {
    const out = run(["eval", "--corpus", corpus, "--folds", "4"]);
    assert.match(out, /split check: train=\d+ inference=\d+/);
    assert.match(out, /overall accuracy=1\.0000/);
  });

  it("classify labels via --text", () => {
    const out = run(
      ["classify", "--model", modelPath, "--text", "deploy the server runbook"],
    );
    assert.equal(out.trim().split("\n")[0], "ops");
  });

  it("classify labels via stdin", () => {
    const out = run(["classify", "--model", modelPath], "invoice for customer deal\n");
    assert.equal(out.trim().split("\n")[0], "sales");
  });

  it("train without --corpus exits nonzero", () => {
    assert.throws(() => run(["train"]), /--corpus/);
  });
});

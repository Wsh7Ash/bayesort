/** Seeds a small synthetic 3-label corpus under demo/corpus for the demo. */
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "corpus");
rmSync(ROOT, { recursive: true, force: true });

const vocab: Record<string, string[]> = {
  work: ["standup", "sprint", "deadline", "quarterly", "review", "deploy",
    "meeting", "roadmap", "ticket", "release"],
  personal: ["birthday", "dinner", "family", "weekend", "hike", "movie",
    "groceries", "gym", "recipe", "vacation"],
  newsletters: ["unsubscribe", "digest", "weekly", "roundup", "issue",
    "subscribe", "newsletter", "edition", "headline", "feature"],
};

for (const [label, words] of Object.entries(vocab)) {
  const dir = join(ROOT, label);
  mkdirSync(dir, { recursive: true });
  for (let i = 0; i < 25; i++) {
    const lines: string[] = [];
    for (let j = 0; j < 12; j++) {
      // Deterministic pseudo-text: rotate the label vocabulary.
      const w1 = words[(i + j) % words.length]!;
      const w2 = words[(i * 3 + j * 7) % words.length]!;
      const w3 = words[(i * 5 + j * 11) % words.length]!;
      lines.push(`memo ${i}${j} about ${w1} and ${w2} with ${w3} notes`);
    }
    writeFileSync(join(dir, `${label}-memo-${String(i).padStart(2, "0")}.txt`),
      lines.join("\n") + "\n");
  }
}
console.log(`seeded 75 memos under ${ROOT}`);

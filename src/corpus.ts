import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export interface Doc {
  id: string;
  label: string;
  text: string;
}

/**
 * Load a corpus laid out as: corpusDir/<label>/<doc>.txt
 * The document id is its path relative to the corpus dir (stable across runs).
 */
export function loadCorpus(corpusDir: string): Doc[] {
  const docs: Doc[] = [];
  for (const label of readdirSync(corpusDir).sort()) {
    const labelDir = join(corpusDir, label);
    if (!statSync(labelDir).isDirectory()) continue;
    for (const file of readdirSync(labelDir).sort()) {
      if (!file.toLowerCase().endsWith(".txt")) continue;
      const full = join(labelDir, file);
      if (!statSync(full).isFile()) continue;
      docs.push({
        id: `${label}/${file}`,
        label,
        text: readFileSync(full, "utf8"),
      });
    }
  }
  if (docs.length === 0) {
    throw new Error(`corpus ${corpusDir} contains no .txt documents`);
  }
  return docs;
}

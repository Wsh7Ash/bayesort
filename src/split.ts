import { createHash } from "node:crypto";

export interface SplitResult<T> {
  train: T[];
  inference: T[];
}

/**
 * Deterministic split: an item goes to "train" when
 * sha256(id + salt) mod 100 < trainPercent.
 * Same items + same salt + same percent => same split, forever.
 */
export function hashSplit<T extends { id: string }>(
  items: T[],
  trainPercent: number,
  salt: string,
): SplitResult<T> {
  if (trainPercent < 0 || trainPercent > 100) {
    throw new Error("trainPercent must be 0..100");
  }
  const train: T[] = [];
  const inference: T[] = [];
  for (const item of items) {
    const h = createHash("sha256").update(item.id + salt).digest();
    const bucket = h.readUInt32BE(0) % 100;
    (bucket < trainPercent ? train : inference).push(item);
  }
  return { train, inference };
}

/** Verify train and inference sets share no ids; throws on contamination. */
export function assertDisjoint<T extends { id: string }>(
  train: T[],
  inference: T[],
): void {
  const trainIds = new Set(train.map((d) => d.id));
  for (const d of inference) {
    if (trainIds.has(d.id)) {
      throw new Error(
        `contamination: document ${d.id} appears in both train and inference sets`,
      );
    }
  }
}

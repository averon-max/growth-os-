/**
 * Only newly verified claims count as evidence progress.
 * No verification thresholds or evidence classifications change.
 */
export function nextEvidenceRecoveryStagnantWavesV1({
  before,
  after,
  consecutive,
}: {
  before: ReadonlySet<string>;
  after: ReadonlySet<string>;
  consecutive: number;
}): number {
  for (const claimId of after) {
    if (!before.has(claimId)) {
      return 0;
    }
  }

  return consecutive + 1;
}

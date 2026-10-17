import { describe, expect, it } from "vitest";

import {
  nextEvidenceRecoveryStagnantWavesV1,
} from "./evidence-recovery-stagnation-v1";

describe("Evidence recovery no-progress protection", () => {
  it("counts a wave with no newly verified claims", () => {
    expect(nextEvidenceRecoveryStagnantWavesV1({
      before: new Set(["claim-1", "claim-2"]),
      after: new Set(["claim-1", "claim-2"]),
      consecutive: 0,
    })).toBe(1);
  });

  it("stops after two consecutive stagnant waves", () => {
    const before = new Set(["claim-1", "claim-2"]);
    const after = new Set(["claim-1", "claim-2"]);

    const first = nextEvidenceRecoveryStagnantWavesV1({
      before, after, consecutive: 0,
    });

    const second = nextEvidenceRecoveryStagnantWavesV1({
      before, after, consecutive: first,
    });

    expect(first).toBe(1);
    expect(second).toBe(2);
  });

  it("resets stagnation on genuine verification progress", () => {
    expect(nextEvidenceRecoveryStagnantWavesV1({
      before: new Set(["claim-1"]),
      after: new Set(["claim-1", "claim-2"]),
      consecutive: 1,
    })).toBe(0);
  });
});

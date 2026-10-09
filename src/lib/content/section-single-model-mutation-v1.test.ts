import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const source =
  readFileSync(
    new URL(
      "./master-section-repair.ts",
      import.meta.url
    ),
    "utf8"
  );


function windowBetween(
  start:
    string,
  end:
    string
) {
  const a =
    source.indexOf(
      start
    );

  const b =
    source.indexOf(
      end,
      a + 1
    );

  expect(
    a
  ).toBeGreaterThanOrEqual(
    0
  );

  expect(
    b
  ).toBeGreaterThan(
    a
  );

  return source.slice(
    a,
    b
  );
}


describe(
  "section single model mutation V1",
  () => {
    it(
      "declares one model mutation ownership per writer section",
      () => {
        expect(
          source
        ).toContain(
          "SECTION_SINGLE_MODEL_MUTATION_PER_SECTION_V1"
        );

        expect(
          source
        ).toContain(
          "let modelRepairUsed"
        );
      }
    );


    it(
      "merges section depth into the first model repair",
      () => {
        expect(
          source
        ).toContain(
          "depthRepair:\n            initialDepthRepair ??"
        );
      }
    );


    it(
      "allows only one deterministic semantic cleanup pass",
      () => {
        expect(
          source
        ).toMatch(
          /MAX_DETERMINISTIC_SEMANTIC_PASSES\s*=\s*4;/
        );
      }
    );


    it(
      "forbids semantic self-heal as a second model mutation",
      () => {
        const block =
          windowBetween(
            "SECTION_SEMANTIC_MODEL_SELF_HEAL_V1",
            "SECTION_SEMANTIC_CLEAN_ROOM_FALLBACK_V1"
          );

        expect(
          block
        ).toContain(
          "!modelRepairUsed"
        );
      }
    );


    it(
      "forbids clean-room reconstruction as a second model mutation",
      () => {
        const start =
          source.indexOf(
            "SECTION_SEMANTIC_CLEAN_ROOM_FALLBACK_V1"
          );

        const block =
          source.slice(
            start,
            start + 9000
          );

        expect(
          start
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          block
        ).toContain(
          "!modelRepairUsed"
        );
      }
    );


    it(
      "forbids terminal depth repair as a second model mutation",
      () => {
        const start =
          source.indexOf(
            "SECTION_DEPTH_SINGLE_MODEL_PASS_V1"
          );

        const block =
          source.slice(
            start,
            start + 6500
          );

        expect(
          block
        ).toContain(
          "!modelRepairUsed"
        );
      }
    );
  }
);

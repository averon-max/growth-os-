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


function between(
  startMarker:
    string,
  endMarker:
    string
): string {
  const start =
    source.indexOf(
      startMarker
    );

  const end =
    source.indexOf(
      endMarker,
      start + startMarker.length
    );


  if (
    start < 0 ||
    end <= start
  ) {
    throw new Error(
      `BOUNDARY_NOT_FOUND:${startMarker}:${endMarker}`
    );
  }


  return source.slice(
    start,
    end
  );
}


describe(
  "semantic convergence final production boundary",
  () => {
    it(
      "allows bounded deterministic semantic cleanup convergence",
      () => {
        const match =
          source.match(
            /MAX_DETERMINISTIC_SEMANTIC_PASSES\s*=\s*(\d+)/
          );


        expect(
          match
        ).not.toBeNull();


        const value =
          Number(
            match?.[1]
          );


        expect(
          value
        ).toBe(
          4
        );
      }
    );


    it(
      "does not invoke model repair inside deterministic semantic convergence",
      () => {
        const block =
          between(
            "SEMANTIC_REPAIR_DETERMINISTIC_CONVERGENCE_V2",
            "SECTION_SEMANTIC_MODEL_SELF_HEAL_V1"
          );


        expect(
          block
        ).toContain(
          "deterministicSemanticDeleteRepairV1"
        );


        expect(
          block
        ).not.toContain(
          ".repairSection({"
        );
      }
    );


    it(
      "bounds model self-heal to targeted plus clean-room section repair",
      () => {
        const block =
          between(
            "SECTION_SEMANTIC_MODEL_SELF_HEAL_V1",
            "SECTION_DEPTH_TERMINAL_GATE_V1"
          );


        expect(
          block.match(
            /\.repairSection\(\{/g
          ) ??
          []
        ).toHaveLength(
          2
        );


        expect(
          block
        ).not.toMatch(
          /\bwhile\s*\(/
        );


        expect(
          block
        ).not.toMatch(
          /\bfor\s*\(/
        );


        expect(
          block
        ).not.toContain(
          "rewriteArticle("
        );
      }
    );


    it(
      "keeps depth after semantic terminal safety",
      () => {
        expect(
          source.indexOf(
            "SECTION_DEPTH_TERMINAL_GATE_V1"
          )
        ).toBeGreaterThan(
          source.indexOf(
            "SECTION_SEMANTIC_MODEL_SELF_HEAL_V1"
          )
        );


        expect(
          source
        ).toContain(
          "SECTION_DEPTH_LOCAL_CONVERGENCE_V2"
        );
      }
    );
  }
);

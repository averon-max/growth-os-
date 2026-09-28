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
      "./service.ts",
      import.meta.url
    ),
    "utf8"
  );


function indexOfOrFail(
  needle:
    string
) {
  const index =
    source.indexOf(
      needle
    );


  expect(
    index,
    `Missing source marker: ${needle}`
  ).toBeGreaterThanOrEqual(
    0
  );


  return index;
}


describe(
  "Production Master Brief service boundary",
  () => {
    it(
      "fails closed before AI brief generation",
      () => {
        const guard =
          indexOfOrFail(
            "assertProductionMasterBriefReady("
          );

        const generate =
          indexOfOrFail(
            "await generator.generateBrief("
          );


        expect(
          guard
        ).toBeLessThan(
          generate
        );
      }
    );


    it(
      "fails closed before ContentBrief persistence",
      () => {
        const guard =
          indexOfOrFail(
            "assertProductionMasterBriefReady("
          );

        const create =
          indexOfOrFail(
            "await prisma.contentBrief.create("
          );


        expect(
          guard
        ).toBeLessThan(
          create
        );
      }
    );


    it(
      "does not reconstruct master runtime from legacy shadow artifacts",
      () => {
        const start =
          source.indexOf(
            "export async function createContentBrief("
          );

        const end =
          source.indexOf(
            "export async function generateArticleFromBrief("
          );


        expect(
          start
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          end
        ).toBeGreaterThan(
          start
        );


        const fn =
          source.slice(
            start,
            end
          );


        expect(
          fn
        ).toContain(
          "prepareProductionMasterBriefRuntime("
        );


        expect(
          fn
        ).toContain(
          "assertProductionMasterBriefReady("
        );
      }
    );
  }
);

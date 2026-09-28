import {
  describe,
  expect,
  it,
} from "vitest";

import {
  readFileSync,
} from "node:fs";

import {
  join,
} from "node:path";


const source =
  readFileSync(
    join(
      process.cwd(),
      "src/lib/keywords/gsc-provider.ts"
    ),
    "utf8"
  );


describe(
  "GSC revoked authorization boundary",
  () => {
    it(
      "recognizes invalid_grant",
      () => {
        expect(
          source
        ).toContain(
          '"invalid_grant"'
        );

        expect(
          source
        ).toContain(
          "isInvalidGrantError"
        );
      }
    );


    it(
      "marks revoked authorization as ERROR",
      () => {
        expect(
          source
        ).toContain(
          'status:\n        "ERROR"'
        );

        expect(
          source
        ).toContain(
          "markGscReconnectRequired"
        );
      }
    );


    it(
      "requires reconnect when refresh token is unavailable",
      () => {
        expect(
          source
        ).toMatch(
          /isExpired[\s\S]*!refreshToken[\s\S]*throwReconnectRequired/
        );
      }
    );


    it(
      "requires reconnect when Google returns invalid_grant",
      () => {
        expect(
          source
        ).toMatch(
          /catch[\s\S]*isInvalidGrantError[\s\S]*throwReconnectRequired/
        );
      }
    );


    it(
      "keeps successful refresh token persistence",
      () => {
        expect(
          source
        ).toContain(
          "persistRefreshedTokens"
        );

        expect(
          source
        ).toContain(
          'status: "CONNECTED"'
        );
      }
    );
  }
);

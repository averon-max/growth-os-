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


const settings =
  readFileSync(
    join(
      process.cwd(),
      "src/app/dashboard/settings/page.tsx"
    ),
    "utf8"
  );


describe(
  "GSC reconnect settings boundary",
  () => {
    it(
      "uses the production Google OAuth connect route",
      () => {
        expect(
          settings
        ).toContain(
          "/api/integrations/google/connect"
        );
      }
    );


    it(
      "can reconnect by website id",
      () => {
        expect(
          settings
        ).toContain(
          "websiteId="
        );

        expect(
          settings
        ).toContain(
          "gscConnectHref"
        );
      }
    );


    it(
      "has a workspace fallback",
      () => {
        expect(
          settings
        ).toContain(
          "workspaceId="
        );
      }
    );


    it(
      "shows ERROR using the danger status mapping",
      () => {
        expect(
          settings
        ).toContain(
          "CMS_STATUS_TONE"
        );

        expect(
          settings
        ).toContain(
          'ERROR:'
        );

        expect(
          settings
        ).toContain(
          '"danger"'
        );
      }
    );


    it(
      "renders a reconnect action",
      () => {
        expect(
          settings
        ).toContain(
          '"Reconnect"'
        );

        expect(
          settings
        ).toContain(
          "href={gscConnectHref}"
        );
      }
    );
  }
);

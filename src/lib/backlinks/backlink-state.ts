export const BACKLINK_STATE_VERSION =
  "BACKLINK_STATE_V1" as const;


export type BacklinkLifecycleState =
  | "BASELINE"
  | "NEW"
  | "ACTIVE"
  | "LOST"
  | "RESTORED";


export type BacklinkSnapshotExecutionStatus =
  | "SUCCEEDED"
  | "PARTIAL"
  | "FAILED";


export interface BacklinkIdentityInput {
  sourceUrl:
    string;

  targetUrl:
    string;

  anchorText?:
    string | null;
}


export interface BacklinkSnapshotInput {
  executionStatus:
    BacklinkSnapshotExecutionStatus;

  links:
    readonly Readonly<BacklinkIdentityInput>[];
}


export interface BacklinkStateItem {
  key:
    string;

  sourceUrl:
    string;

  targetUrl:
    string;

  anchorText:
    string | null;

  state:
    BacklinkLifecycleState;
}


export interface BacklinkStateResult {
  version:
    typeof BACKLINK_STATE_VERSION;

  links:
    readonly Readonly<BacklinkStateItem>[];

  counts: Readonly<{
    baseline:
      number;

    new:
      number;

    active:
      number;

    lost:
      number;

    restored:
      number;
  }>;

  provenance: Readonly<{
    derivedOnlyFromSuccessfulSnapshots:
      true;

    noAuthorityScore:
      true;

    noCausalInference:
      true;

    noSyntheticLinks:
      true;
  }>;
}


export function normalizeBacklinkUrl(
  raw:
    string
) {
  const value =
    raw.trim();


  if (
    !value
  ) {
    throw new Error(
      "BACKLINK_URL_REQUIRED"
    );
  }


  let url:
    URL;


  try {
    url =
      new URL(
        value
      );
  } catch {
    throw new Error(
      "BACKLINK_URL_INVALID"
    );
  }


  if (
    url.protocol !==
      "https:" &&
    url.protocol !==
      "http:"
  ) {
    throw new Error(
      "BACKLINK_URL_PROTOCOL_UNSUPPORTED"
    );
  }


  url.hash =
    "";


  url.hostname =
    url.hostname
      .toLowerCase();


  if (
    (
      url.protocol ===
        "https:" &&
      url.port ===
        "443"
    ) ||
    (
      url.protocol ===
        "http:" &&
      url.port ===
        "80"
    )
  ) {
    url.port =
      "";
  }


  if (
    url.pathname.length >
      1 &&
    url.pathname.endsWith(
      "/"
    )
  ) {
    url.pathname =
      url.pathname.slice(
        0,
        -1
      );
  }


  return url.toString();
}


export function backlinkIdentityKey({
  sourceUrl,
  targetUrl,
}: {
  sourceUrl:
    string;

  targetUrl:
    string;
}) {
  return [
    normalizeBacklinkUrl(
      sourceUrl
    ),
    normalizeBacklinkUrl(
      targetUrl
    ),
  ].join(
    " -> "
  );
}


function normalizeLink(
  link:
    Readonly<BacklinkIdentityInput>
) {
  const sourceUrl =
    normalizeBacklinkUrl(
      link.sourceUrl
    );

  const targetUrl =
    normalizeBacklinkUrl(
      link.targetUrl
    );


  return Object.freeze({
    key:
      backlinkIdentityKey({
        sourceUrl,
        targetUrl,
      }),

    sourceUrl,

    targetUrl,

    anchorText:
      link.anchorText
        ?.trim() ||
      null,
  });
}


function snapshotMap(
  snapshot:
    Readonly<BacklinkSnapshotInput>,
  label:
    string
) {
  if (
    snapshot.executionStatus !==
    "SUCCEEDED"
  ) {
    throw new Error(
      `BACKLINK_${label}_SNAPSHOT_NOT_SUCCESSFUL`
    );
  }


  const result =
    new Map<
      string,
      ReturnType<
        typeof normalizeLink
      >
    >();


  for (
    const raw
    of snapshot.links
  ) {
    const link =
      normalizeLink(
        raw
      );


    if (
      result.has(
        link.key
      )
    ) {
      throw new Error(
        `BACKLINK_DUPLICATE_LINK:${link.key}`
      );
    }


    result.set(
      link.key,
      link
    );
  }


  return result;
}


export function deriveBacklinkStateV1({
  previous,
  current,
  historicallySeenKeys = [],
}: {
  previous:
    Readonly<BacklinkSnapshotInput> |
    null;

  current:
    Readonly<BacklinkSnapshotInput>;

  historicallySeenKeys?:
    readonly string[];
}):
  Readonly<BacklinkStateResult> {
  const currentMap =
    snapshotMap(
      current,
      "CURRENT"
    );


  const previousMap =
    previous
      ? snapshotMap(
          previous,
          "PREVIOUS"
        )
      : new Map();


  const history =
    new Set(
      historicallySeenKeys
    );


  const output:
    BacklinkStateItem[] =
      [];


  if (
    previous ===
    null
  ) {
    for (
      const link
      of currentMap.values()
    ) {
      output.push({
        ...link,

        state:
          "BASELINE",
      });
    }
  } else {
    for (
      const [
        key,
        link,
      ]
      of currentMap
    ) {
      if (
        previousMap.has(
          key
        )
      ) {
        output.push({
          ...link,

          state:
            "ACTIVE",
        });

        continue;
      }


      if (
        history.has(
          key
        )
      ) {
        output.push({
          ...link,

          state:
            "RESTORED",
        });

        continue;
      }


      output.push({
        ...link,

        state:
          "NEW",
      });
    }


    for (
      const [
        key,
        link,
      ]
      of previousMap
    ) {
      if (
        currentMap.has(
          key
        )
      ) {
        continue;
      }


      output.push({
        ...link,

        state:
          "LOST",
      });
    }
  }


  output.sort(
    (
      a,
      b
    ) =>
      a.key.localeCompare(
        b.key
      )
  );


  const count =
    (
      state:
        BacklinkLifecycleState
    ) =>
      output.filter(
        (
          item
        ) =>
          item.state ===
          state
      ).length;


  return Object.freeze({
    version:
      BACKLINK_STATE_VERSION,

    links:
      Object.freeze(
        output.map(
          (
            item
          ) =>
            Object.freeze({
              ...item,
            })
        )
      ),

    counts:
      Object.freeze({
        baseline:
          count(
            "BASELINE"
          ),

        new:
          count(
            "NEW"
          ),

        active:
          count(
            "ACTIVE"
          ),

        lost:
          count(
            "LOST"
          ),

        restored:
          count(
            "RESTORED"
          ),
      }),

    provenance:
      Object.freeze({
        derivedOnlyFromSuccessfulSnapshots:
          true,

        noAuthorityScore:
          true,

        noCausalInference:
          true,

        noSyntheticLinks:
          true,
      }),
  });
}

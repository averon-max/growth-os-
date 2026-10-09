import {
  classifyRejectedRecoveryV1,
  type RejectedRecoveryV1,
} from "./rejected-recovery-v1";


export const ARTICLE_RECOVERY_ORCHESTRATOR_V1 =
  "ARTICLE_RECOVERY_ORCHESTRATOR_V1" as const;


/*
 * ARTICLE_RECOVERY_CONVERGENCE_V2
 *
 * No arbitrary article recovery attempt ceiling.
 *
 * Recoverable REJECTED state continues through the same
 * logical ContentArticle while meaningful state changes.
 *
 * Stop only when:
 * - article leaves REJECTED
 * - blocker is genuinely non-recoverable
 * - a previously seen rejected state repeats (proven cycle)
 *
 * Evidence, semantic and Final Readiness gates remain strict.
 */

export interface RecoverableArticleV1 {
  readonly status:
    string;

  readonly publishError?:
    string |
    null;

  readonly title?:
    string |
    null;

  readonly metaDescription?:
    string |
    null;

  readonly h1?:
    string |
    null;

  readonly bodyMarkdown?:
    string |
    null;
}


export interface ArticleRecoveryTransitionV1 {
  readonly version:
    typeof ARTICLE_RECOVERY_ORCHESTRATOR_V1;

  readonly attempt:
    number;

  readonly recovery:
    Readonly<RejectedRecoveryV1>;
}


export interface ArticleRecoveryExecutionV1<
  TArticle extends
    RecoverableArticleV1,
> {
  readonly article:
    TArticle;

  readonly attempts:
    number;

  readonly recoveryAttempted:
    boolean;

  readonly transitions:
    readonly Readonly<
      ArticleRecoveryTransitionV1
    >[];
}


/*
 * AUTOMATIC_WHOLE_ARTICLE_RECOVERY_DISABLED_V1
 *
 * Content Writer v1 repairs failures at their owning stage:
 *
 * - evidence -> evidence owner
 * - reconciliation -> section owner
 * - semantic -> bounded section self-heal
 * - depth -> local depth convergence
 * - critic -> critic-local convergence
 * - SERP -> SERP-local repair
 *
 * A persisted REJECTED result means those bounded local stages
 * have already exhausted or a non-recoverable boundary was hit.
 *
 * Do not automatically regenerate the complete article here.
 * That would discard accepted work, introduce stochastic drift
 * and multiply provider cost.
 *
 * Manual user-requested regeneration is a separate action.
 */
const RECOVERABLE_ARTICLE_FAILURES_V2 =
  new Set<string>();


export function shouldRunTier2ArticleRecoveryV1(
  recovery:
    Readonly<RejectedRecoveryV1>
): boolean {
  if (
    recovery.autoRetryAllowed
  ) {
    return false;
  }


  if (
    recovery.owner ===
      "ENGINEERING" ||
    recovery.owner ===
      "BUDGET" ||
    recovery.owner ===
      "SERP" ||
    recovery.owner ===
      "TRANSPORT"
  ) {
    return false;
  }


  return (
    RECOVERABLE_ARTICLE_FAILURES_V2.has(
      recovery.failureClass
    )
  );
}


function normalizedTextV2(
  value:
    string |
    null |
    undefined
): string {
  return (
    value
      ?.replace(
        /\s+/g,
        " "
      )
      .trim() ??
    ""
  );
}


function rejectedStateFingerprintV2({
  article,
  recovery,
}: {
  article:
    Readonly<RecoverableArticleV1>;

  recovery:
    Readonly<RejectedRecoveryV1>;
}): string {
  return JSON.stringify({
    failureClass:
      recovery.failureClass,

    owner:
      recovery.owner,

    nextAction:
      recovery.nextAction,

    publishError:
      normalizedTextV2(
        article.publishError
      ),

    title:
      normalizedTextV2(
        article.title
      ),

    metaDescription:
      normalizedTextV2(
        article.metaDescription
      ),

    h1:
      normalizedTextV2(
        article.h1
      ),

    bodyMarkdown:
      normalizedTextV2(
        article.bodyMarkdown
      ),
  });
}


export async function executeArticleRecoveryOrchestratorV1<
  TArticle extends
    RecoverableArticleV1,
>({
  run,
  onTransition,
}: {
  run:
    () =>
      Promise<TArticle>;

  onTransition?:
    (
      transition:
        Readonly<ArticleRecoveryTransitionV1>
    ) =>
      void |
      Promise<void>;
}): Promise<
  Readonly<
    ArticleRecoveryExecutionV1<TArticle>
  >
> {
  const transitions:
    ArticleRecoveryTransitionV1[] =
      [];


  const seenRejectedStates =
    new Set<string>();


  let attempts =
    1;


  let article =
    await run();


  while (
    article.status ===
    "REJECTED"
  ) {
    const recovery =
      classifyRejectedRecoveryV1(
        new Error(
          article.publishError ??
            "Article generation rejected"
        )
      );


    if (
      !shouldRunTier2ArticleRecoveryV1(
        recovery
      )
    ) {
      return Object.freeze({
        article,

        attempts,

        recoveryAttempted:
          transitions.length >
          0,

        transitions:
          Object.freeze(
            transitions
          ),
      });
    }


    const fingerprint =
      rejectedStateFingerprintV2({
        article,
        recovery,
      });


    /*
     * NO_PROGRESS_CYCLE_GUARD_V2
     *
     * This is not an attempt limit.
     *
     * A -> B -> C -> D may continue.
     *
     * A -> A or A -> B -> A stops because the same
     * meaningful failure state has already occurred.
     */
    if (
      seenRejectedStates.has(
        fingerprint
      )
    ) {
      console.warn(
        "[content article recovery] no-progress cycle detected",
        {
          version:
            ARTICLE_RECOVERY_ORCHESTRATOR_V1,

          attempts,

          failureClass:
            recovery.failureClass,

          owner:
            recovery.owner,

          nextAction:
            recovery.nextAction,
        }
      );


      return Object.freeze({
        article,

        attempts,

        recoveryAttempted:
          transitions.length >
          0,

        transitions:
          Object.freeze(
            transitions
          ),
      });
    }


    seenRejectedStates.add(
      fingerprint
    );


    const nextAttempt =
      attempts +
      1;


    const transition:
      ArticleRecoveryTransitionV1 = {
        version:
          ARTICLE_RECOVERY_ORCHESTRATOR_V1,

        attempt:
          nextAttempt,

        recovery,
      };


    transitions.push(
      transition
    );


    await onTransition?.(
      transition
    );


    attempts =
      nextAttempt;


    article =
      await run();
  }


  return Object.freeze({
    article,

    attempts,

    recoveryAttempted:
      transitions.length >
      0,

    transitions:
      Object.freeze(
        transitions
      ),
  });
}

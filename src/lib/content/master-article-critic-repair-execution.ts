import type {
  ArticleGenerationContractV1,
} from "./article-generation-contract";

import {
  tryRecoverMissingKeywordV1,
} from "./rank-ready-keyword-recovery-v1";

import {
  composeMasterArticleV1,
} from "./master-article-composer";

import type {
  MasterArticleCriticExecutionV1,
} from "./master-article-critic-fusion";

import {
  assertMasterArticleCriticExecutionPassed,
  executeMasterArticleCriticsV1,
} from "./master-article-critic-fusion";

import type {
  MasterArticleSemanticCriticContextV1,
} from "./master-article-semantic-critics";

import type {
  MasterArticleCriticRepairPlanV1,
} from "./master-article-critic-repair-plan";

import {
  assertMasterArticleCriticRepairPlanExecutableV1,
  buildMasterArticleCriticRepairPlanV1,
} from "./master-article-critic-repair-plan";

import type {
  MasterWriterRunV1,
} from "./master-writer-orchestrator";

import {
  countSectionWordsV1,
  supportsMasterSectionRepairGenerator,
  verifyGeneratedSectionOnlyV1,
} from "./master-section-repair";

import {
  supportsMasterSectionSemanticVerifier,
} from "./master-section-semantic-verifier";

import {
  ContentGenerationError,
} from "./generator";

import {detectHighConfidenceEditorialRepetitionV1}
  from "./editorial-repetition-guard-v1";
import {createMasterArticleCriticFindingV1}
  from "./master-article-critic";
import {removeUnsupportedPriceSentenceV1}
  from "./unsupported-price-sentence-recovery-v1";


export interface MasterArticleCriticSectionRepairAuditV1 {
  version:
    "MASTER_ARTICLE_CRITIC_SECTION_REPAIR_AUDIT_V1";

  sectionIndex:
    number;

  sectionNumber:
    number;

  heading:
    string;

  attempted:
    true;

  attemptCount:
    1;

  modelName:
    string;

  criticIds:
    readonly string[];

  findingCodes:
    readonly string[];

  findingCount:
    number;
}


export interface MasterArticleCriticRepairExecutionV1 {
  version:
    "MASTER_ARTICLE_CRITIC_REPAIR_EXECUTION_V1";

  initialCritics:
    Readonly<
      MasterArticleCriticExecutionV1
    >;

  repairPlan:
    Readonly<
      MasterArticleCriticRepairPlanV1
    >;

  run:
    Readonly<
      MasterWriterRunV1
    >;

  finalCritics:
    Readonly<
      MasterArticleCriticExecutionV1
    >;

  repairs:
    readonly Readonly<
      MasterArticleCriticSectionRepairAuditV1
    >[];

  provenance:
    Readonly<{
      criticReplayCount:
        number;

      repairedSectionCount:
        number;

      repairAttemptCount:
        number;

      wholeArticleRewriteCount:
        0;
    }>;
}


function failureMessage(
  error:
    unknown
): string {
  return error instanceof
    Error
    ? error.message
    : String(
        error
      );
}


export function rebuildWriterRunV1({
  contract,
  run,
  sections,
  reconciliations,
  semanticVerifications,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  run:
    Readonly<MasterWriterRunV1>;

  sections:
    MasterWriterRunV1[
      "sections"
    ];

  reconciliations:
    MasterWriterRunV1[
      "reconciliations"
    ];

  semanticVerifications:
    MasterWriterRunV1[
      "semanticVerifications"
    ];
}): Readonly<
  MasterWriterRunV1
> {
  const frozenSections =
    Object.freeze([
      ...sections,
    ]);


  const frozenReconciliations =
    Object.freeze([
      ...reconciliations,
    ]);


  const frozenSemanticVerifications =
    Object.freeze([
      ...semanticVerifications,
    ]);


  if (
    frozenSections.length !==
      contract.sectionContracts.length ||
    frozenReconciliations.length !==
      frozenSections.length ||
    frozenSemanticVerifications.length !==
      frozenSections.length
  ) {
    throw new ContentGenerationError(
      "MASTER_CRITIC_REPAIR_RUN_CARDINALITY_INVALID"
    );
  }


  const article =
    composeMasterArticleV1({
      contract,

      shell:
        run.shell,

      sections:
        frozenSections,
    });


  const sectionModelNames =
    Object.freeze(
      Array.from(
        new Set(
          frozenSections.map(
            (section) =>
              section.provenance
                .modelName
          )
        )
      )
    );


  const reconciliationWarnCount =
    frozenReconciliations
      .filter(
        (result) =>
          result.status ===
          "WARN"
      )
      .length;


  const semanticWarnCount =
    frozenSemanticVerifications
      .filter(
        (result) =>
          result.status ===
          "WARN"
      )
      .length;


  return Object.freeze({
    ...run,

    sections:
      frozenSections,

    reconciliations:
      frozenReconciliations,

    semanticVerifications:
      frozenSemanticVerifications,

    article,

    provenance:
      Object.freeze({
        ...run.provenance,

        sectionModelNames,

        sectionCount:
          frozenSections.length,

        reconciliationCount:
          frozenReconciliations.length,

        reconciliationWarnCount,

        reconciliationBlockCount:
          0 as const,

        semanticVerificationCount:
          frozenSemanticVerifications.length,

        semanticWarnCount,

        semanticBlockCount:
          0 as const,
      }),
  });
}


/**
 * PRE-CRITIC VERIFIED EDITORIAL RECOVERY.
 *
 * An expensive 9-critic review must NOT be dispatched against a Writer
 * run that already has high-confidence multi-section recycled prose.
 * Repair a bounded number of distinct offender sections from the SAME
 * contract, verifying claim reconciliation and evidence after EACH
 * change, then replay the complete existing Editorial guard.
 *
 * Any unresolved duplication fails closed BEFORE the first paid
 * whole-article semantic critic. Only changed verified sections are
 * persisted via the caller's isolated, contract-hash-bound checkpoint.
 */
export async function repairPreCriticEditorialRepetitionV1({
  contract,run,generator,onProgress,
}:{
  contract:Readonly<ArticleGenerationContractV1>;
  run:Readonly<MasterWriterRunV1>;
  generator:unknown;
  onProgress?:(run:Readonly<MasterWriterRunV1>)=>Promise<void>;
}):Promise<Readonly<MasterWriterRunV1>>{
  const detect=(sections:MasterWriterRunV1["sections"])=>
    detectHighConfidenceEditorialRepetitionV1(sections.map(s=>({
      heading:s.heading,bodyMarkdown:s.bodyMarkdown,
    })));
  let findings=detect(run.sections);
  if(!findings.length){
    console.info("[content precritic editorial]",{
      status:"CLEAN",repairs:0,paidWholeArticleCriticsAvoided:0,
    });
    return run;
  }
  if(!supportsMasterSectionRepairGenerator(generator)||
    !supportsMasterSectionSemanticVerifier(generator))
    throw new ContentGenerationError(
      "PRECRITIC_EDITORIAL_REPAIR_GENERATOR_UNAVAILABLE");
  const attempted=new Set<number>();
  const sections=[...run.sections];
  const reconciliations=[...run.reconciliations];
  const semantics=[...run.semanticVerifications];
  const maxEdits=Math.min(4,sections.length);
  for(let step=0;step<maxEdits&&findings.length>0;step++){
    const issue=findings[0];
    // Prefer an actual reported owner. Once edited, don't pay to
    // paraphrase the same section again. The final alert-response
    // section owns step-by-step advice, so edit non-action sections first.
    const options=[
      issue.sectionIndex,
      ...issue.affectedSections.filter(i=>i!==sections.length-1),
      ...issue.affectedSections,
    ];
    const index=options.find(i=>
      i>=0&&i<sections.length&&!attempted.has(i));
    if(index===undefined)break;
    attempted.add(index);
    const sectionContract=contract.sectionContracts[index];
    const original=sections[index];
    const currentReconciliation=reconciliations[index];
    const currentSemantic=semantics[index];
    if(!sectionContract||!original||
      !currentReconciliation||!currentSemantic)
      throw new ContentGenerationError(
        "PRECRITIC_EDITORIAL_INCOMPLETE_VERIFIED_SECTION");
    const reason=createMasterArticleCriticFindingV1({
      criticId:"EDITORIAL",code:issue.code,severity:"BLOCK",
      location:{
        scope:"SECTION",sectionIndex:index,
        sectionNumber:sectionContract.sectionNumber,
        heading:sectionContract.blueprint.heading,
      },
      repairScope:"SECTION",
      message:"Cross-section recycled prose already exists before "+
        "Master Critic. Repeated phrases: "+
        issue.repeatedPhrases.join(" / ")+
        ". Affected sections: "+issue.affectedSections.join(", "),
      recommendation:"Rewrite ONLY this section to answer its distinct "+
        "H2 reader question without repeating advice already owned "+
        "by other sections. Keep all verified required claims and "+
        "their material qualifications. Do not add unsupported facts.",
      evidence:{claimIds:[],evidenceIds:[],
        queryNodeIds:[],sourceIds:[]},
    });
    const words=countSectionWordsV1(original.bodyMarkdown);
    const depth=(sectionContract as typeof sectionContract & {
      executionPlanAuthority?:{targetWords?:{
        min:number;preferred:number;max:number;
      }};
    }).executionPlanAuthority?.targetWords;
    const depthRepair=depth?{
      currentWords:words,
      minWords:Math.max(depth.min,Math.min(words,depth.preferred)),
      preferredWords:depth.preferred,maxWords:depth.max,
    }:undefined;
    const revised=await generator.repairSection({
      contract:sectionContract,section:original,
      reconciliation:currentReconciliation,
      semanticVerification:currentSemantic,
      attempt:1,depthRepair,
      criticFindings:[reason],
      crossSectionEditorialContext:sections.flatMap((neighbor,j)=>{
        if(j===index)return [];
        const t=neighbor.bodyMarkdown;
        return [{
          sectionIndex:j,heading:neighbor.heading,
          prosePreview:t.length<=2200?t:
            t.slice(0,1100)+"\n[...omitted...]\n"+t.slice(-1050),
        }];
      }),
    });
    const verified=await verifyGeneratedSectionOnlyV1({
      contract:sectionContract,section:revised,generator,
    });
    if(verified.section.bodyMarkdown===original.bodyMarkdown)
      throw new ContentGenerationError(
        "PRECRITIC_EDITORIAL_REPAIR_NO_CHANGE:"+index);
    sections[index]=verified.section;
    reconciliations[index]=verified.reconciliation;
    semantics[index]=verified.semanticVerification;
    const rebuilt=rebuildWriterRun({
      contract,run,
      sections,reconciliations,semanticVerifications:semantics,
    });
    findings=detect(rebuilt.sections);
    console.info("[content precritic editorial repair]",{
      changedSectionIndex:index,
      verifiedStatus:verified.semanticVerification.status,
      outstandingCodes:findings.map(x=>x.code),
      outstandingPhrases:findings.flatMap(x=>x.repeatedPhrases).slice(0,6),
      repairsAttempted:attempted.size,
    });
    // Checkpoint after each verified change. A crash or later
    // keyword/critic/Replay failure must never re-bill for this edit.
    if(onProgress)await onProgress(rebuilt);
  }
  if(findings.length){
    console.warn("[content precritic editorial unresolved]",{
      findings:findings.map(x=>({
        code:x.code,
        affectedSections:x.affectedSections,
        repeatedPhrases:x.repeatedPhrases,
      })),
      repairedSections:[...attempted],
    });
    throw new ContentGenerationError(
      "PRECRITIC_EDITORIAL_REPETITION_REMAINS_AFTER_BOUNDED_REPAIR");
  }
  const rebuilt=rebuildWriterRun({
    contract,run,sections,reconciliations,semanticVerifications:semantics,
  });
  console.info("[content precritic editorial]",{
    status:"CLEAN",repairs:attempted.size,
    preservedUnchangedSections:sections.length-attempted.size,
  });
  return rebuilt;
}


/**
 * PRE-CRITIC UNSUPPORTED PRICE CLAIM PRUNE V1
 *
 * The independent final Publication Policy has ALREADY rejected
 * a single concrete numeric price sentence, and no other issues.
 * Delete precisely that sentence only when it is not a required
 * source-backed fact and all existing exact keywords/H2/section
 * depth remain valid. One canonical current-source semantic verify,
 * then replay the real final policy. Never bypass it.
 */
export async function recoverUnsupportedPriceSentenceV1({
  contract,run,generator,sentence,plannedKeywords,onProgress,
}:{
  contract:Readonly<ArticleGenerationContractV1>;
  run:Readonly<MasterWriterRunV1>;
  generator:unknown;
  sentence:string;
  plannedKeywords:readonly string[];
  onProgress?:(updated:Readonly<MasterWriterRunV1>)=>Promise<void>;
}):Promise<Readonly<MasterWriterRunV1>>{
  if(!supportsMasterSectionRepairGenerator(generator) ||
     !supportsMasterSectionSemanticVerifier(generator))
    throw new ContentGenerationError(
      "PRECRITIC_PRICE_REPAIR_VERIFIER_UNAVAILABLE");
  const matches=run.sections.map((section,index)=>({
    index,found:section.bodyMarkdown.includes(sentence),
  })).filter(item=>item.found);
  if(matches.length!==1)
    throw new ContentGenerationError(
      "PRECRITIC_PRICE_SENTENCE_OWNER_AMBIGUOUS");
  const index=matches[0].index;
  const sectionContract=contract.sectionContracts[index];
  const original=run.sections[index];
  if(!sectionContract||!original)
    throw new ContentGenerationError(
      "PRECRITIC_PRICE_SECTION_NOT_FOUND");
  const requiredIds=new Set(sectionContract.blueprint.requiredClaims);
  const requiredClaimTexts=sectionContract.claimLedger.claims
    .filter(claim=>requiredIds.has(claim.id))
    .map(claim=>claim.text);
  const bounds=(sectionContract as typeof sectionContract & {
    executionPlanAuthority?:{targetWords?:{min:number;max:number}};
  }).executionPlanAuthority?.targetWords;
  const revisedBody=removeUnsupportedPriceSentenceV1({
    bodyMarkdown:original.bodyMarkdown,sentence,
    requiredClaimTexts,plannedKeywords,
    sectionMinWords:bounds?.min,
  });
  if(revisedBody===null)
    throw new ContentGenerationError(
      "PRECRITIC_PRICE_SENTENCE_REMOVAL_UNSAFE");
  const verified=await verifyGeneratedSectionOnlyV1({
    contract:sectionContract,
    section:{...original,bodyMarkdown:revisedBody},
    generator,
  });
  const sections=[...run.sections];
  sections[index]=verified.section;
  const repeated=detectHighConfidenceEditorialRepetitionV1(
    sections.map(section=>({
      heading:section.heading,bodyMarkdown:section.bodyMarkdown,
    })));
  if(repeated.length)
    throw new ContentGenerationError(
      "PRECRITIC_PRICE_EDIT_REINTRODUCED_REPETITION");
  const reconciliations=[...run.reconciliations];
  reconciliations[index]=verified.reconciliation;
  const semantics=[...run.semanticVerifications];
  semantics[index]=verified.semanticVerification;
  const rebuilt=rebuildWriterRun({
    contract,run,
    sections,reconciliations,
    semanticVerifications:semantics,
  });
  console.info("[content precritic source-safe price removal]",{
    sectionIndex:index,removedExactUnsupportedSentence:true,
    verifiedStatus:verified.semanticVerification.status,
    editorialRepetitionCount:0,
  });
  if(onProgress)await onProgress(rebuilt);
  return rebuilt;
}


/**
 * Select the information-owning H2, never section 0 merely because
 * the exact-match keyword begins with the article primary keyword.
 * Source-backed required claims and consumer decision scope outrank
 * broad topical overlap. This remains candidate-only; semantic checks
 * authorize any subsequent edit.
 */
export function choosePreCriticKeywordSectionV1({
  keyword,contract,sections,
}:{
  keyword:string;
  contract:Readonly<ArticleGenerationContractV1>;
  sections:MasterWriterRunV1["sections"];
}):Readonly<{index:number;score:number}>|null{
  const lower=keyword.toLocaleLowerCase("en-US");
  const tokens=[...new Set(lower.match(/[a-z0-9]+/g)??[])]
    .filter(t=>!["a","the","of","and","what","how","for","in"].includes(t));
  const scores=contract.sectionContracts.map((sc,index)=>{
    const heading=sc.blueprint.heading.toLocaleLowerCase("en-US");
    const body=sections[index]?.bodyMarkdown.toLocaleLowerCase("en-US")??"";
    const ownClaims=new Set(sc.blueprint.requiredClaims);
    const facts=sc.claimLedger.claims.filter(c=>
      ownClaims.has(c.id)&&c.status==="VERIFIED")
      .map(c=>c.text.toLocaleLowerCase("en-US")).join(" ");
    const overlap=(text:string)=>tokens.reduce((n,t)=>
      n+(new RegExp("(?<![a-z0-9])"+t+"(?![a-z0-9])","i")
        .test(text)?1:0),0);
    const bureauOption=lower.includes("bureau")&&
      /\b(?:service|services|choos|compar|look for|plan|plans)\b/.test(heading);
    return {
      index,score:overlap(heading)*4+
        overlap(facts)*5+
        Math.min(overlap(body),3)+
        (bureauOption?18:0),
    };
  }).sort((a,b)=>b.score-a.score||a.index-b.index);
  const choice=scores[0];
  return choice&&choice.score>=4?choice:null;
}

/**
 * PRE-CRITIC PLANNED KEYWORD RECOVERY V1
 *
 * A keyword missing from an otherwise verified Writer must be restored
 * BEFORE the costly full-article semantic critic. Prefer the section
 * whose question and verified claims actually concern that phrase.
 * Preserve the section contract and existing approved facts. A phrase
 * alone never grants evidence authority. Every actual change is
 * verified by the existing source-constrained section semantic gate.
 *
 * No recursive repair, no new headings, no synthetic facts, no
 * relaxation of editorial or final SEO coverage policy.
 */
export async function recoverPreCriticPlannedKeywordV1({
  contract,run,generator,missingKeywords,onProgress,
}:{
  contract:Readonly<ArticleGenerationContractV1>;
  run:Readonly<MasterWriterRunV1>;
  generator:unknown;
  missingKeywords:readonly string[];
  onProgress?:(updated:Readonly<MasterWriterRunV1>)=>Promise<void>;
}):Promise<Readonly<MasterWriterRunV1>>{
  const wanted=[...new Set(missingKeywords.map(k=>k.trim())
    .filter(k=>/^[a-z0-9][a-z0-9 &'/-]{2,100}$/i.test(k)))];
  if(wanted.length===0)return run;
  if(!supportsMasterSectionRepairGenerator(generator)||
    !supportsMasterSectionSemanticVerifier(generator))
    throw new ContentGenerationError(
      "PRECRITIC_KEYWORD_REPAIR_GENERATOR_UNAVAILABLE");
  if(wanted.length>2)
    throw new ContentGenerationError(
      "PRECRITIC_KEYWORD_REPAIR_OVER_BUDGET");
  const sections=[...run.sections];
  const reconciliations=[...run.reconciliations];
  const semantics=[...run.semanticVerifications];
  let working:Readonly<MasterWriterRunV1>=run;
  const keywords=new Set<string>();
  for(const keyword of wanted){
    const choice=choosePreCriticKeywordSectionV1({
      keyword,contract,sections,
    });
    if(!choice||choice.score<4)
      throw new ContentGenerationError(
        "PRECRITIC_KEYWORD_MISSION_UNSUPPORTED:"+keyword);
    const index=choice.index;
    const sectionContract=contract.sectionContracts[index];
    const original=sections[index];
    const originalReconciliation=reconciliations[index];
    const originalSemantic=semantics[index];
    if(!sectionContract||!original||!originalReconciliation||!originalSemantic)
      throw new ContentGenerationError(
        "PRECRITIC_KEYWORD_SECTION_MISSING:"+index);
    const reason=createMasterArticleCriticFindingV1({
      criticId:"TECHNICAL_SEO",
      code:"RANK_READY_PLANNED_KEYWORD_MISSING",
      severity:"WARN",
      location:{
        scope:"SECTION",sectionIndex:index,
        sectionNumber:sectionContract.sectionNumber,
        heading:sectionContract.blueprint.heading,
      },
      repairScope:"SECTION",
      message:'Production-planned keyword "'+keyword+
        '" is missing from the article.',
      recommendation:"Integrate the EXACT phrase naturally ONCE in "+
        "existing explanatory prose answering THIS section's H2. "+
        "Preserve all evidence-backed statements, required claims, "+
        "qualifiers and existing H3 headings. Do NOT add claims, "+
        "unsupported bureau coverage promises, headings, keyword "+
        "lists, standalone boilerplate or repetitive reader advice. "+
        "If the phrase cannot be introduced accurately based on "+
        "the approved evidence, do not force it.",
      evidence:{
        claimIds:[],evidenceIds:[],queryNodeIds:[],sourceIds:[],
      },
    });
    const bounds=(sectionContract as typeof sectionContract & {
      executionPlanAuthority?:{targetWords?:{
        min:number;preferred:number;max:number;
      }};
    }).executionPlanAuthority?.targetWords;
    const currentWords=countSectionWordsV1(original.bodyMarkdown);
    const normalized=tryRecoverMissingKeywordV1({
      markdown:original.bodyMarkdown,
      findings:[reason],maxWords:bounds?.max,
    });
    const draft=normalized!==null
      ?{...original,bodyMarkdown:normalized}
      :await generator.repairSection({
        contract:sectionContract,section:original,
        reconciliation:originalReconciliation,
        semanticVerification:originalSemantic,
        attempt:1,
        depthRepair:bounds?{
          currentWords,
          minWords:Math.max(bounds.min,
            Math.min(currentWords,bounds.preferred)),
          preferredWords:bounds.preferred,maxWords:bounds.max,
        }:undefined,
        criticFindings:[reason],
        crossSectionEditorialContext:sections.flatMap((neighbor,j)=>{
          if(j===index)return [];
          const text=neighbor.bodyMarkdown;
          return [{
            sectionIndex:j,heading:neighbor.heading,
            prosePreview:text.length<=2200?text:
              text.slice(0,1100)+"\n[...existing prose omitted...]\n"+
              text.slice(-1050),
          }];
        }),
      });
    if(draft.bodyMarkdown===original.bodyMarkdown)
      throw new ContentGenerationError(
        "PRECRITIC_KEYWORD_REPAIR_NO_CHANGE:"+keyword);
    const phraseCount=draft.bodyMarkdown.toLocaleLowerCase("en-US")
      .split(keyword.toLocaleLowerCase("en-US")).length-1;
    if(phraseCount!==1)
      throw new ContentGenerationError(
        "PRECRITIC_KEYWORD_NOT_NATURALLY_USED:"+keyword);
    const verified=await verifyGeneratedSectionOnlyV1({
      contract:sectionContract,section:draft,generator,
    });
    sections[index]=verified.section;
    reconciliations[index]=verified.reconciliation;
    semantics[index]=verified.semanticVerification;
    const repeats=detectHighConfidenceEditorialRepetitionV1(
      sections.map(section=>({
        heading:section.heading,bodyMarkdown:section.bodyMarkdown,
      })));
    if(repeats.length)
      throw new ContentGenerationError(
        "PRECRITIC_KEYWORD_REINTRODUCED_EDITORIAL_REPETITION:"+
        repeats[0].code);
    working=rebuildWriterRun({
      contract,run:working,
      sections,reconciliations,semanticVerifications:semantics,
    });
    keywords.add(keyword);
    console.info("[content precritic keyword recovery]",{
      keyword,sectionIndex:index,
      recovered:true,
      method:normalized!==null?"EXACT_SPELLING":"TARGETED_SECTION_REPAIR",
      semanticStatus:verified.semanticVerification.status,
      editorialRepetitionCount:0,
    });
    if(onProgress)await onProgress(working);
  }
  return working;
}


/*
 * MASTER_CRITIC_SINGLE_REPAIR_CYCLE_V1
 *
 * Final critics are a bounded quality-control transaction.
 *
 * Ownership:
 *
 * initial full critic suite
 * -> classify repairability
 * -> ONE scoped model repair per initial section task
 * -> canonical reconciliation + semantic verification
 * -> deterministic semantic cleanup when needed
 * -> ONE full critic replay
 * -> STOP
 *
 * The replay is diagnostic. It does NOT recursively become a new
 * writer/repair planner.
 *
 * Hard safety is still fail-closed:
 * - upstream evidence/context/cannibalization blockers
 * - section reconciliation failures
 * - section semantic/evidence failures
 * - required claim loss
 *
 * Residual repairable SECTION critic findings are preserved in
 * finalCritics for review/final-readiness diagnostics, but they
 * cannot start another authoring loop.
 *
 * No whole-article rewrite.
 */


export async function executeMasterArticleCriticRepairReplayV1({
  contract,
  run,
  initialCritics,
  generator,
  context,
}: {
  contract:
    Readonly<ArticleGenerationContractV1>;

  run:
    Readonly<MasterWriterRunV1>;

  initialCritics:
    Readonly<
      MasterArticleCriticExecutionV1
    >;

  generator:
    unknown;

  context:
    Readonly<
      MasterArticleSemanticCriticContextV1
    >;
}): Promise<
  Readonly<
    MasterArticleCriticRepairExecutionV1
  >
> {
  const repairPlan =
    buildMasterArticleCriticRepairPlanV1({
      contract,

      suite:
        initialCritics.suite,
    });


  /*
   * Upstream/unrepairable BLOCKs fail before any model repair.
   *
   * Repairable SECTION findings are allowed through into the one
   * bounded repair transaction below.
   */
  assertMasterArticleCriticRepairPlanExecutableV1(
    repairPlan
  );


  if (
    repairPlan.disposition ===
    "NO_REPAIR_NEEDED"
  ) {
    assertMasterArticleCriticExecutionPassed(
      initialCritics
    );


    return Object.freeze({
      version:
        "MASTER_ARTICLE_CRITIC_REPAIR_EXECUTION_V1" as const,

      initialCritics,

      repairPlan,

      run,

      finalCritics:
        initialCritics,

      repairs:
        Object.freeze([]),

      provenance:
        Object.freeze({
          criticReplayCount:
            0 as const,

          repairedSectionCount:
            0,

          repairAttemptCount:
            0,

          wholeArticleRewriteCount:
            0 as const,
        }),
    });
  }


  if (
    !supportsMasterSectionRepairGenerator(
      generator
    )
  ) {
    throw new ContentGenerationError(
      "MASTER_CRITIC_SECTION_REPAIR_CAPABILITY_REQUIRED"
    );
  }


  if (
    !supportsMasterSectionSemanticVerifier(
      generator
    )
  ) {
    throw new ContentGenerationError(
      "MASTER_CRITIC_SECTION_SEMANTIC_VERIFIER_REQUIRED"
    );
  }


  const repairGenerator =
    generator;


  const sections =
    [
      ...run.sections,
    ];


  const reconciliations =
    [
      ...run.reconciliations,
    ];


  const semanticVerifications =
    [
      ...run
        .semanticVerifications,
    ];


  const initialRepeat=detectHighConfidenceEditorialRepetitionV1(
    run.sections.map(section=>({
      heading:section.heading,bodyMarkdown:section.bodyMarkdown,
    })));
  console.info("[content master critic pre-repair repetition]",{
    initialFindingCodes:initialRepeat.map(x=>x.code),
    initialAffectedSections:initialRepeat.flatMap(x=>x.affectedSections),
    initialCriticStatus:initialCritics.suite.status,
  });

  const audits:
    MasterArticleCriticSectionRepairAuditV1[] =
      [];


  /*
   * MASTER_CRITIC_SINGLE_MODEL_OWNER_V1
   *
   * Exactly ONE model mutation is allowed for each INITIAL critic
   * repair task.
   *
   * verifyGeneratedSectionOnlyV1 owns ZERO model mutations.
   * It may only:
   *
   * identity
   * -> reconciliation
   * -> semantic verification
   * -> deterministic semantic deletion
   * -> one semantic re-verification.
   */
  for (
    const task
    of repairPlan.repairTasks
  ) {
    const index =
      task.sectionIndex;


    const sectionContract =
      contract.sectionContracts[
        index
      ];


    const currentSection =
      sections[
        index
      ];


    const currentReconciliation =
      reconciliations[
        index
      ];


    const currentSemanticVerification =
      semanticVerifications[
        index
      ];


    if (
      !sectionContract ||
      !currentSection ||
      !currentReconciliation ||
      !currentSemanticVerification
    ) {
      throw new ContentGenerationError(
        `MASTER_CRITIC_SECTION_REPAIR_INPUT_MISSING:${index}`
      );
    }


    /*
     * MASTER_CRITIC_DEPTH_PRESERVATION_V1
     *
     * Critic owns exactly ONE model mutation.
     *
     * Therefore that mutation must know the execution-plan depth
     * contract BEFORE it rewrites the section.
     *
     * We intentionally provide the full section budget even when
     * the incoming section is already above min: the goal is not
     * another depth-repair loop, but preventing critic shrinkage.
     */
    const criticTargetWords =
      (
        sectionContract as
          typeof sectionContract & {
            readonly executionPlanAuthority?: Readonly<{
              readonly targetWords?: Readonly<{
                readonly min: number;
                readonly preferred: number;
                readonly max: number;
              }>;
            }>;
          }
      ).executionPlanAuthority?.targetWords ??
      null;


    /*
     * MASTER_CRITIC_EXISTING_DEPTH_FLOOR_V1
     *
     * A section reaching Master Critic has already passed the
     * Writer depth contract.
     *
     * Critic owns exactly one model mutation. That mutation may
     * fix critic findings, but it must not unnecessarily destroy
     * already-valid useful depth.
     *
     * Preserve existing depth up to the execution-plan preferred
     * target:
     *
     *   preservation floor =
     *     max(
     *       target.min,
     *       min(currentWords, target.preferred)
     *     )
     *
     * No extra repair/model loop is introduced here.
     */
    const criticCurrentWords =
      countSectionWordsV1(
        currentSection.bodyMarkdown
      );


    const criticDepthPreservation =
      criticTargetWords
        ? Object.freeze({
            currentWords:
              criticCurrentWords,

            minWords:
              Math.max(
                criticTargetWords.min,

                Math.min(
                  criticCurrentWords,
                  criticTargetWords.preferred
                )
              ),

            preferredWords:
              criticTargetWords.preferred,

            maxWords:
              criticTargetWords.max,
          })
        : undefined;


    let repairedSection;


    try {
      const deterministicMarkdown =
        tryRecoverMissingKeywordV1({
          markdown: currentSection.bodyMarkdown,
          findings: task.findings,
          maxWords: criticTargetWords?.max,
        });

      if (deterministicMarkdown !== null) {
        repairedSection = Object.freeze({
          ...currentSection,
          bodyMarkdown: deterministicMarkdown,
        });
      } else {
      repairedSection =
        await repairGenerator
          .repairSection({
            contract:
              sectionContract,

            section:
              currentSection,

            reconciliation:
              currentReconciliation,

            semanticVerification:
              currentSemanticVerification,

            depthRepair:
              criticDepthPreservation,

            attempt:
              1,

            criticFindings:
              task.findings,

            // Editorial-only "already explained" context. No
            // additional fact, source or claim is authorized.
            crossSectionEditorialContext:sections.flatMap((other,j)=>{
              if(j===index)return [];
              const text=other.bodyMarkdown;
              return [{
                sectionIndex:j,heading:other.heading,
                prosePreview:text.length<=2200?text:
                  text.slice(0,1100)+"\n[...existing prose omitted...]\n"+
                  text.slice(-1050),
              }];
            }),
          });
      }
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "MASTER_CRITIC_SECTION_REPAIR_FAILED",

          String(
            index
          ),

          failureMessage(
            error
          ),
        ].join(
          ":"
        )
      );
    }


    let verified;


    try {
      /*
       * MASTER_CRITIC_VALIDATION_CONVERGENCE_V2
       *
       * Critic already spent the only model mutation.
       *
       * Canonical verify-only may deterministically self-heal
       * unsupported incidental prose but may never call
       * repairSection() itself.
       */
      verified =
        await verifyGeneratedSectionOnlyV1({
          contract:
            sectionContract,

          section:
            repairedSection,

          generator:
            repairGenerator,
        });
    } catch (
      error
    ) {
      throw new ContentGenerationError(
        [
          "MASTER_CRITIC_SECTION_REPAIR_VERIFICATION_FAILED",

          String(
            index
          ),

          failureMessage(
            error
          ),
        ].join(
          ":"
        )
      );
    }


    sections[
      index
    ] =
      verified.section;


    reconciliations[
      index
    ] =
      verified.reconciliation;


    semanticVerifications[
      index
    ] =
      verified
        .semanticVerification;


    audits.push(
      Object.freeze({
        version:
          "MASTER_ARTICLE_CRITIC_SECTION_REPAIR_AUDIT_V1" as const,

        sectionIndex:
          task.sectionIndex,

        sectionNumber:
          task.sectionNumber,

        heading:
          task.heading,

        attempted:
          true as const,

        attemptCount:
          1 as const,

        modelName:
          repairGenerator
            .modelName,

        criticIds:
          Object.freeze(
            Array.from(
              new Set(
                task.findings.map(
                  (
                    finding
                  ) =>
                    finding
                      .criticId
                )
              )
            )
          ),

        findingCodes:
          Object.freeze(
            task.findings.map(
              (
                finding
              ) =>
                finding.code
            )
          ),

        findingCount:
          task.findings
            .length,
      })
    );
  }


  const repairedRun =
    rebuildWriterRun({
      contract,

      run,

      sections:
        Object.freeze(
          sections
        ),

      reconciliations:
        Object.freeze(
          reconciliations
        ),

      semanticVerifications:
        Object.freeze(
          semanticVerifications
        ),
    });


  const finalDeterministicRepeat=detectHighConfidenceEditorialRepetitionV1(
    sections.map(section=>({
      heading:section.heading,bodyMarkdown:section.bodyMarkdown,
    })));
  console.info("[content master critic post-repair repetition]",{
    before:initialRepeat.map(x=>({
      code:x.code,affectedSections:x.affectedSections,
      repeatedPhrases:x.repeatedPhrases,
    })),
    after:finalDeterministicRepeat.map(x=>({
      code:x.code,affectedSections:x.affectedSections,
      repeatedPhrases:x.repeatedPhrases,
    })),
    repairTaskCount:audits.length,
  });
  // No second whole-article model call when a local revision just
  // INTRODUCED deterministic high-confidence cross-section boilerplate.
  if(initialRepeat.length===0&&finalDeterministicRepeat.length>0)
    throw new ContentGenerationError(
      "MASTER_CRITIC_REPAIR_INTRODUCED_EDITORIAL_REPETITION:"+
      finalDeterministicRepeat[0].code);

  /*
   * ONE complete replay.
   *
   * We still re-run the complete critic suite because a localized
   * edit can expose a new intent/editorial/originality problem.
   *
   * But this replay is validation/diagnostic only.
   * It does NOT create a recursive critic-author loop.
   */
  const finalCritics =
    await executeMasterArticleCriticsV1({
      contract,

      run:
        repairedRun,

      generator,

      context,
    });


  /*
   * Classify residual findings once.
   *
   * This assertion continues to fail closed for genuinely
   * UNREPAIRABLE upstream/context/evidence/cannibalization
   * blockers.
   *
   * REPAIRABLE_SECTION findings are retained as final review
   * diagnostics and are NOT executed again here.
   */
  // Optional keyword coverage work must never make an already
  // acceptable article worse. A model can introduce unsupported
  // material: if its nine-critic replay now BLOCKS, keep the original.
  // Similarly, do not accept an edit that fails to improve coverage.
  const optionalKeywordRepair =
    initialCritics.suite.status !== "BLOCK" &&
    repairPlan.repairTasks.length > 0 &&
    repairPlan.repairTasks.every(task =>
      task.findings.every(finding =>
        finding.severity === "WARN" &&
        finding.code === "RANK_READY_PLANNED_KEYWORD_MISSING"
      )
    );
  if (optionalKeywordRepair) {
    const missingCount = (execution: Readonly<MasterArticleCriticExecutionV1>) =>
      execution.suite.results.flatMap(result => result.findings)
        .filter(finding =>
          finding.code === "RANK_READY_PLANNED_KEYWORD_MISSING"
        ).length;
    if (
      finalCritics.suite.status === "BLOCK" ||
      missingCount(finalCritics) >= missingCount(initialCritics)
    ) {
      // The original passed every mandatory critic. An optional
      // keyword-only WARN repair must not turn it into a failed article.
      // The attempted edit is discarded, not persisted or re-used by
      // SERP Replay or final publication readiness.
      console.warn(
        "[content optional keyword repair rollback]",
        {
          code: "OPTIONAL_KEYWORD_REPAIR_DID_NOT_IMPROVE_SAFELY",
          originalMissingKeywords: missingCount(initialCritics),
          attemptedMissingKeywords: missingCount(finalCritics),
          attemptedCriticStatus: finalCritics.suite.status,
        }
      );
      assertMasterArticleCriticExecutionPassed(initialCritics);
      return Object.freeze({
        version: "MASTER_ARTICLE_CRITIC_REPAIR_EXECUTION_V1" as const,
        initialCritics,
        repairPlan,
        run,
        finalCritics: initialCritics,
        repairs: Object.freeze([]),
        provenance: Object.freeze({
          criticReplayCount: 1 as const,
          repairedSectionCount: 0,
          repairAttemptCount: audits.length,
          wholeArticleRewriteCount: 0 as const,
        }),
      });
    }
  }

  const residualPlan =
    buildMasterArticleCriticRepairPlanV1({
      contract,

      suite:
        finalCritics.suite,
    });


  assertMasterArticleCriticRepairPlanExecutableV1(
    residualPlan
  );


  if (
    residualPlan.disposition ===
    "NO_REPAIR_NEEDED"
  ) {
    assertMasterArticleCriticExecutionPassed(
      finalCritics
    );
  } else if (
    residualPlan.repairTasks.length >
    0
  ) {
    console.warn(
      "[content master critic residual review findings]",
      {
        repairTaskCount:
          residualPlan
            .repairTasks
            .length,

        sectionIndexes:
          Array.from(
            new Set(
              residualPlan
                .repairTasks
                .map(
                  (
                    task
                  ) =>
                    task.sectionIndex
                )
            )
          ),

        findingCodes:
          residualPlan
            .repairTasks
            .flatMap(
              (
                task
              ) =>
                task.findings
                  .map(
                    (
                      finding
                    ) =>
                      finding.code
                  )
            ),
      }
    );
  }


  const repairedSectionCount =
    new Set(
      audits.map(
        (
          audit
        ) =>
          audit.sectionIndex
      )
    ).size;


  return Object.freeze({
    version:
      "MASTER_ARTICLE_CRITIC_REPAIR_EXECUTION_V1" as const,

    initialCritics,

    repairPlan,

    run:
      repairedRun,

    finalCritics,

    repairs:
      Object.freeze([
        ...audits,
      ]),

    provenance:
      Object.freeze({
        criticReplayCount:
          1 as const,

        repairedSectionCount,

        repairAttemptCount:
          audits.length,

        wholeArticleRewriteCount:
          0 as const,
      }),
  });
}

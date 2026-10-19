#!/usr/bin/env node
/**
 * Read-only release dashboard: consume existing V2 preflight, evidence scope
 * and optionally private JSONL-derived SAFE metadata (never --raw).
 * Does not connect to providers, write a database or replay anything.
 *
 * node scripts/content-writer-final-state.mjs \
 *   .growth-os-tmp/v2-review/db-preflight.json \
 *   .growth-os-tmp/v2-review/evidence-scope.json \
 *   [.growth-os-tmp/writer-trace-report.json]
 */
import {readFileSync} from "node:fs";
const files=process.argv.slice(2);
if(files.length<2||files.length>3){
  console.error("USAGE: content-writer-final-state.mjs DB_PREFLIGHT_JSON EVIDENCE_SCOPE_JSON [SAFE_TRACE_REPORT_JSON]");
  process.exitCode=2;
}else{
  const parse=(path)=>JSON.parse(readFileSync(path,"utf8"));
  const pre=parse(files[0]),scope=parse(files[1]);
  if(pre.articleId!==scope.articleId || !pre.articleId){
    throw Error("REPORTS_REFER_TO_DIFFERENT_ARTICLES");
  }
  const traces=files[2]?parse(files[2]):null;
  if(traces && (traces.containsPrivateData || !traces.readOnly)){
    throw Error("TRACE_REPORT_MUST_BE_SAFE_READ_ONLY");
  }
  const issues=[
    ...(!pre.sourceUnchanged?["SAVED_ARTICLE_CHANGED"]:[]),
    ...(!pre.candidateDiffersFromOriginal?["NO_NEW_EDITORIAL_CANDIDATE"]:[]),
    ...(!pre.manifestHashMatches?["V2_TRANSFER_HASH_INVALID"]:[]),
    ...(!scope.originalExportMatchesExpected?["ORIGINAL_SNAPSHOT_CHANGED"]:[]),
    ...(!scope.candidateHeadingsMatchLockedPlan?["SIGNED_SECTION_HEADING_DRIFT"]:[]),
    ...(scope.externalLinksNotMappedToSectionVerifiedEvidence>0?
      ["V2_SECTION_SOURCE_CLAIMS_UNSIGNED"]:[]),
    ...(!pre.gates||pre.gates.newFingerprintCritics!=="PASS"?
      ["V2_FULL_CRITICS_NOT_RUN"]:[]),
    ...(!pre.gates||pre.gates.newFingerprintSerpReplay!=="PASS"?
      ["V2_FINGERPRINT_SERP_REPLAY_NOT_RUN"]:[]),
    ...(!pre.gates||pre.gates.humanQueryApproval!=="APPROVED"?
      ["V2_QUERY_OWNER_REAPPROVAL_MISSING"]:[]),
    ...(!pre.gates||pre.gates.publicationAllowed!==true?
      ["PUBLICATION_NOT_AUTHORIZED"]:[]),
  ];
  const safeTraceSummary=traces?{
    recordedRuns:traces.reportCount??0,
    failures:(traces.reports??[]).filter(r=>r.failureDiagnosis).map(r=>({
      failureClass:r.failureDiagnosis.failureClass,
      reasonCode:r.failureDiagnosis.reasonCode,
      action:r.failureDiagnosis.recommendedAction,
      automaticRetry:false,
    })),
    traceWarnings:[...new Set((traces.reports??[])
      .flatMap(r=>r.warnings??[]))],
    recordedModelExchanges:(traces.reports??[])
      .reduce((n,r)=>n+(r.modelExchangeCount||0),0),
  }:{state:"PRIVATE_LOCAL_TRACE_NOT_YET_REVIEWED"};
  const report={
    version:"WRITER_FINAL_OPERATOR_STATE_V1",
    articleId:pre.articleId,
    canClaimProductionReady:issues.length===0,
    state:issues.length?"BLOCKED_WITH_EXPLICIT_NEXT_ACTIONS":"REVIEW_REQUIRED_BEFORE_PUBLICATION",
    technicalScore:pre.technicalAudit?.score??null,
    candidateWords:pre.technicalAudit?.wordCount??null,
    sourceLinksPreserved:pre.sectionUrlComparison?.every(x=>
      x.lostOriginalUrls.length===0)??false,
    sectionCitationIssues:scope.externalLinksNotMappedToSectionVerifiedEvidence??null,
    distinctUnsignedUrls:scope.distinctUnmappedSourceUrls??null,
    outstandingClaims:(scope.citationRecoveryWorklist??[]).map(row=>({
      url:row.url,sectionIndexes:row.sectionIndexes,
      existingSourceInLedger:row.existingSourceInLedger,
      nextAction:row.nextAction,
    })),
    releaseBlockers:[...new Set(issues)],
    trace:safeTraceSummary,
    noPaidCalls:true,databaseUnchanged:true,
    caution:"Technical PASS is not evidence semantic entailment, search rankings, or human publication approval.",
  };
  console.log(JSON.stringify(report,null,2));
}

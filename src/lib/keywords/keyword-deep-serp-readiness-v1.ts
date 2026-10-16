import type {SerpOpportunityV2} from "./keyword-intelligence-v2";

/**
 * Read-only research quality gate.
 * This is neither a claim verification nor a page-one ranking predictor.
 * A SERP with ten URLs but zero accessible pages does NOT count as deep
 * competitor research. Never silently convert inaccessible pages to PASS.
 */
export function auditDeepSerpReadinessV1(row:SerpOpportunityV2){
  const evidence=row.competitiveResearch;
  const pages=evidence?.competitorPages??[];
  const fetched=evidence?.fetchedCompetitorPages??0;
  const topOne=pages.find(p=>p.rank===1)??null;
  const blockers:string[]=[];
  if(row.error)blockers.push("SERP_PROVIDER_ERROR");
  if(row.organicResults<7)blockers.push("ORGANIC_SERP_COVERAGE_LOW");
  if(row.uniqueDomains<5)blockers.push("SERP_DOMAIN_DIVERSITY_LOW");
  if(!evidence)blockers.push("DEEP_COMPETITOR_SNAPSHOT_MISSING");
  else {
    if(fetched<5)blockers.push("FEWER_THAN_FIVE_FETCHED_COMPETITORS");
    if(!topOne?.fetched)blockers.push("TOP_ONE_PAGE_NOT_FETCHED");
    if(evidence.commonSections.length===0)
      blockers.push("RECURRING_COMPETITOR_SECTIONS_UNOBSERVED");
  }
  return {
    version:"DEEP_SERP_RESEARCH_READINESS_V1" as const,
    query:row.query,
    status:blockers.length===0?"DEEP_COMPETITOR_OBSERVED" as const:
      "DEEP_COMPETITOR_INCOMPLETE" as const,
    organicResults:row.organicResults,
    uniqueDomains:row.uniqueDomains,
    fetchedCompetitorPages:fetched,
    inaccessibleCompetitorPages:evidence?.fetchFailures??null,
    topOneFetched:topOne?.fetched===true,
    observedUserQuestions:evidence?.observedQuestions??[],
    recurringSectionTopics:evidence?.commonSections??[],
    competitorMedianWords:evidence?.benchmark.medianWordCount??null,
    competitorMedianH2:evidence?.benchmark.medianH2??null,
    competitorMedianH3:evidence?.benchmark.medianH3??null,
    blockers,
    verifiedFactualClaims:false,
    canGuaranteeRankOne:false,
    publisherReady:false,
    note:"Observed competitor structure supports page strategy; it does not prove facts, link authority, or ranking results.",
  };
}

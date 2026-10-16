import type {SerpOpportunityV2} from "./keyword-intelligence-v2";
import {
  assessSerpCompetitorPageQualityV1,
  isSubstantiveSerpHeadingV1,
} from "@/lib/content/serp-competitor-page-quality-v1";

/**
 * Deep analysis needs actual rendered source content.
 * Historical "fetched=true" alone is not authority: Cloudflare pages,
 * empty responses and support templates cannot satisfy this gate.
 */
export function auditDeepSerpReadinessV1(row:SerpOpportunityV2){
  const evidence=row.competitiveResearch;
  const pages=evidence?.competitorPages??[];
  const valid=pages.filter(page=>
    assessSerpCompetitorPageQualityV1(page).usable);
  const fetched=valid.length;
  const topOne=valid.find(p=>p.rank===1)??null;
  const cleanSections=(evidence?.commonSections??[])
    .filter(section=>isSubstantiveSerpHeadingV1(section.topic));
  const blockers:string[]=[];
  if(row.error)blockers.push("SERP_PROVIDER_ERROR");
  if(row.organicResults<7)blockers.push("ORGANIC_SERP_COVERAGE_LOW");
  if(row.uniqueDomains<5)blockers.push("SERP_DOMAIN_DIVERSITY_LOW");
  if(!evidence)blockers.push("DEEP_COMPETITOR_SNAPSHOT_MISSING");
  else {
    if(fetched<5)blockers.push("FEWER_THAN_FIVE_USABLE_COMPETITORS");
    if(!topOne)blockers.push("TOP_ONE_PAGE_NOT_USABLE");
    if(cleanSections.length===0)
      blockers.push("SUBSTANTIVE_RECURRING_COMPETITOR_SECTIONS_UNOBSERVED");
  }
  return {
    version:"DEEP_SERP_RESEARCH_READINESS_V2" as const,
    query:row.query,
    status:blockers.length===0?"DEEP_COMPETITOR_OBSERVED" as const:
      "DEEP_COMPETITOR_INCOMPLETE" as const,
    organicResults:row.organicResults,
    uniqueDomains:row.uniqueDomains,
    fetchedCompetitorPages:fetched,
    falselyFetchedOrUnusablePages:pages.filter(page=>
      page.fetched&&!assessSerpCompetitorPageQualityV1(page).usable)
      .map(page=>({rank:page.rank,url:page.url,reasons:
        assessSerpCompetitorPageQualityV1(page).reasons})),
    inaccessibleCompetitorPages:evidence?.fetchFailures??null,
    topOneFetched:topOne!==null,
    observedUserQuestions:evidence?.observedQuestions??[],
    recurringSectionTopics:cleanSections,
    competitorMedianWords:evidence?.benchmark.medianWordCount??null,
    competitorMedianH2:evidence?.benchmark.medianH2??null,
    competitorMedianH3:evidence?.benchmark.medianH3??null,
    blockers,
    verifiedFactualClaims:false,
    canGuaranteeRankOne:false,
    publisherReady:false,
    note:"Challenge/error/empty pages are excluded on replay; historic benchmark values remain observations and should be recomputed from qualified main article text.",
  };
}

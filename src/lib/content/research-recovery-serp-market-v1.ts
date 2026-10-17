/**
 * RESEARCH_RECOVERY_DATAFORSEO_MARKET_V1
 *
 * SearchMission language is a BCP-47 code OR human language name.
 * DataForSEO SERP's language_name requires the human name; passing
 * "en" as language_name causes task error 40501 Invalid Field.
 *
 * Canonicalize once before chargeable searches; unknown locales
 * fail closed instead of silently querying the wrong market.
 */
export interface ResearchRecoverySerpMarketV1{
  readonly locationName:string;
  readonly languageName:string;
}
const knownLanguages=new Map([
  ["en","English"],["english","English"],
  ["fr","French"],["french","French"],
  ["es","Spanish"],["spanish","Spanish"],
  ["de","German"],["german","German"],
  ["pt","Portuguese"],["portuguese","Portuguese"],
  ["it","Italian"],["italian","Italian"],
  ["nl","Dutch"],["dutch","Dutch"],
]);
const countryAliases=new Map([
  ["us","United States"],["usa","United States"],
  ["united states of america","United States"],
  ["united states","United States"],
  ["ca","Canada"],["can","Canada"],["canada","Canada"],
  ["uk","United Kingdom"],["gb","United Kingdom"],
  ["united kingdom","United Kingdom"],
]);
export class ResearchRecoveryMarketErrorV1 extends Error{
  constructor(readonly code:string){
    super("RESEARCH_RECOVERY_MARKET_INVALID:"+code);
    this.name="ResearchRecoveryMarketErrorV1";
  }
}
export function resolveResearchRecoverySerpMarketV1(input:{
  readonly language:string;
  readonly location:string;
}):ResearchRecoverySerpMarketV1{
  if(typeof input.language!=="string"||
    typeof input.location!=="string")
    throw new ResearchRecoveryMarketErrorV1("MISSING_LANGUAGE_OR_LOCATION");
  const locale=input.language.trim().toLowerCase().replace(/_/g,"-");
  const primaryLanguage=locale.split("-")[0];
  const languageName=knownLanguages.get(locale) ??
    knownLanguages.get(primaryLanguage);
  if(!languageName)
    throw new ResearchRecoveryMarketErrorV1("UNRECOGNIZED_LANGUAGE");
  const rawLocation=input.location.trim();
  if(!rawLocation)
    throw new ResearchRecoveryMarketErrorV1("MISSING_LOCATION");
  const locationName=countryAliases.get(rawLocation.toLowerCase()) ??
    rawLocation;
  if(locationName.length>180||/[\n\r\t]/.test(locationName))
    throw new ResearchRecoveryMarketErrorV1("INVALID_LOCATION");
  return {languageName,locationName};
}

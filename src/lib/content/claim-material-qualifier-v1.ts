/**
 * CLAIM_MATERIAL_QUALIFIER_PRESERVATION_V1
 *
 * The lexical verifier by itself can match a source paragraph
 * discussing broadly related events while missing the limiting
 * condition in the asserted claim. Missing WHEN / BEFORE / AFTER
 * / UNEXPECTED context changes the meaning of an instruction.
 *
 * This is a conservative NECESSARY condition, never semantic
 * entailment. Do not add any positive support or invent evidence.
 * Applies to all English topics, not just credit monitoring.
 */
export type ClaimQualifierFindingCodeV1 =
  |"BEFORE_ORDER_NOT_SUPPORTED"
  |"AFTER_ORDER_NOT_SUPPORTED"
  |"UNEXPECTED_CONDITION_NOT_SUPPORTED"
  |"EXCLUSIVE_SCOPE_NOT_SUPPORTED";
export interface ClaimQualifierInspectionV1 {
  readonly passed:boolean;
  readonly findings:readonly ClaimQualifierFindingCodeV1[];
}
const clean=(value:string)=>" "+value.toLowerCase()
  .normalize("NFKC")
  .replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ")+" ";
const contains=(value:string,term:string)=>
  value.includes(" "+term+" ");
const patterns={
  before:["before","prior to","ahead of","first","previously"],
  after:["after","following","subsequent to","once","then"],
  unexpected:["unexpected","unrecognised","unrecognized",
    "unfamiliar","unusual","suspicious","unknown","unauthorized",
    "unapproved","unanticipated"],
  exclusive:["only","exclusively","solely","just","limited to"],
};
function anyTerm(value:string,terms:readonly string[]){
  return terms.some(term=>contains(value,term));
}
export function inspectClaimMaterialQualifiersV1({
  claimText,excerpt,
}:{claimText:string;excerpt:string}):ClaimQualifierInspectionV1{
  const claim=clean(claimText),source=clean(excerpt);
  const findings:ClaimQualifierFindingCodeV1[]=[];
  if(contains(claim,"before")&&!anyTerm(source,patterns.before))
    findings.push("BEFORE_ORDER_NOT_SUPPORTED");
  if(contains(claim,"after")&&!anyTerm(source,patterns.after))
    findings.push("AFTER_ORDER_NOT_SUPPORTED");
  if(anyTerm(claim,patterns.unexpected)&&
      !anyTerm(source,patterns.unexpected))
    findings.push("UNEXPECTED_CONDITION_NOT_SUPPORTED");
  // "only" changes a bounded statement to an exclusive one.
  if(anyTerm(claim,patterns.exclusive)&&
      !anyTerm(source,patterns.exclusive))
    findings.push("EXCLUSIVE_SCOPE_NOT_SUPPORTED");
  return {passed:findings.length===0,findings};
}

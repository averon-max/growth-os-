/**
 * Resume one bounded, explicitly authorized semantic-citation model review.
 * The cache does NOT prove facts or confer publication/DB-write permission.
 * Exact saved article hash, complete signed source excerpts, exact article
 * sentences, section index and review policy all bind the checkpoint.
 */
import {createHash} from "node:crypto";
import type {
  SemanticCitationChoiceV1,
  SemanticCitationSectionV1,
} from "./existing-article-semantic-citation-v1";

export const SEMANTIC_CITATION_REVIEW_POLICY_V1 =
  "SIGNED_SECTION_EXCERPT_FULL_SENTENCE_ENTAILMENT_V1";

export function semanticCitationCheckpointKeyV1(input:{
  articleId:string;originalArticleSha256:string;
  section:SemanticCitationSectionV1;
}):string{
  return createHash("sha256").update(JSON.stringify({
    version:SEMANTIC_CITATION_REVIEW_POLICY_V1,
    articleId:input.articleId,
    originalArticleSha256:input.originalArticleSha256,
    section:input.section,
  })).digest("hex");
}

/**
 * Validate ALL expected verdicts. A malformed or outdated on-disk
 * checkpoint throws rather than silently causing another paid request.
 */
export function validateSemanticCitationChoicesV1(
  section:SemanticCitationSectionV1,
  choices:unknown,
):SemanticCitationChoiceV1[]{
  if(!Array.isArray(choices) ||
    choices.length!==section.availableSources.length)
    throw new Error("SEMANTIC_CITATION_REVIEW_COUNT_MISMATCH");
  const known=new Map(section.availableSources.map(source=>
    [source.evidenceId,source]));
  const sentenceIds=new Set(section.sentences.map(sentence=>sentence.id));
  const seen=new Set<string>();
  return choices.map(item=>{
    if(!item||typeof item!=="object"||Array.isArray(item))
      throw new Error("SEMANTIC_CITATION_REVIEW_SCHEMA_INVALID");
    const row=item as Record<string,unknown>;
    if(typeof row.claimId!=="string" ||
      typeof row.evidenceId!=="string" ||
      typeof row.reason!=="string" ||
      row.reason.trim().length<8||row.reason.length>600 ||
      !["SUPPORTED","PARTIAL","UNSUPPORTED","CONTRADICTORY"]
        .includes(String(row.verdict))||
      !(row.sentenceId===null||Number.isInteger(row.sentenceId)))
      throw new Error("SEMANTIC_CITATION_REVIEW_SCHEMA_INVALID");
    const expected=known.get(row.evidenceId);
    if(!expected||expected.claimId!==row.claimId||
      seen.has(row.evidenceId))
      throw new Error("SEMANTIC_CITATION_REVIEW_NOT_A_SIGNED_PAIR");
    seen.add(row.evidenceId);
    if(row.verdict==="SUPPORTED"){
      if(typeof row.sentenceId!=="number"||
        !sentenceIds.has(row.sentenceId))
        throw new Error("SEMANTIC_CITATION_REVIEW_SENTENCE_NOT_FOUND");
    }else if(row.sentenceId!==null)
      throw new Error("SEMANTIC_CITATION_REVIEW_NON_SUPPORTED_HAS_SENTENCE");
    return {
      claimId:row.claimId,evidenceId:row.evidenceId,
      reason:row.reason,sentenceId:row.sentenceId,
      verdict:row.verdict,
    } as SemanticCitationChoiceV1;
  });
}

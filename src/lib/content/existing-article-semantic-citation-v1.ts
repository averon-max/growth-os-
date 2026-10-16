/**
 * Scoped paraphrase citation review for an UNCHANGED saved article.
 *
 * Research ownership is IMMUTABLE. This never creates claims, URL targets,
 * evidence pairs, queries, or paragraphs. A paid reviewer may SELECT an
 * existing exact sentence in the correct H2 for one previously VERIFIED,
 * section-owned claim/excerpt. Each choice is independently schema-checked.
 *
 * Model verdicts are REVIEW CANDIDATES only, NEVER proof of publication
 * readiness, evidence re-binding, or permission to save a new article.
 */
import type {ArticleExecutionPlanV1} from "./article-execution-plan-v1";
import type {MasterRuntimeSnapshotV1} from "./master-runtime-adapter";
import {splitPersistedArticleByCanonicalH2V1} from "./existing-article-section-rebind-v1";
import {getOwnedVerifiedCitationsV1} from "./existing-article-source-citation-repair-v1";

export type SemanticCitationSentenceV1={
  id:number;paragraphIndex:number;text:string;
};
export type SemanticCitationSourceV1={
  claimId:string;evidenceId:string;url:string;publisher:string;
  claimText:string;verifiedExcerpt:string;
};
export type SemanticCitationSectionV1={
  sectionIndex:number;heading:string;sentences:SemanticCitationSentenceV1[];
  availableSources:SemanticCitationSourceV1[];
};
export type SemanticCitationChoiceV1={
  claimId:string;evidenceId:string;sentenceId:number|null;
  verdict:"SUPPORTED"|"PARTIAL"|"UNSUPPORTED"|"CONTRADICTORY";
  reason:string;
};
const normalize=(s:string)=>s.normalize("NFKC").toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/gu," ").trim();
const splitSentences=(text:string)=>text.match(
  /[^.!?]+[.!?](?:\s|$)|[^.!?]+$/gu)??[];
const sourceKey=(url:string)=>{
  const value=new URL(url);value.hash="";
  return value.toString().replace(/\/$/,"");
};
const completeProse=(text:string)=>text.length>=35&&text.length<=1000 &&
  !/^#{1,6}\s|^[-*]\s|^\d+\.|^>|\[[^\]]+\]\(https?:/u.test(text.trim())&&
  !text.includes("](")&&!text.includes("~~~");
export function buildSignedSemanticCitationWorklistV1(input:{
  bodyMarkdown:string;
  plan:Readonly<ArticleExecutionPlanV1>;
  runtime:Readonly<MasterRuntimeSnapshotV1>;
}):readonly SemanticCitationSectionV1[]{
  const scopes=input.plan.sections.filter(s=>s.state==="WRITABLE");
  const bodies=splitPersistedArticleByCanonicalH2V1(
    input.bodyMarkdown,scopes.map(s=>s.heading));
  const ledger=new Map(input.runtime.evidenceGraph.claimEvidence.map(x=>
    [x.id,x]));
  return bodies.map((body,i)=>{
    const citations=getOwnedVerifiedCitationsV1(input.runtime,input.plan,i);
    const links=new Set([...body.matchAll(
      /\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/gu)]
      .map(match=>sourceKey(match[1]!)));
    const availableSources=citations.flatMap(source=>{
      const evidence=ledger.get(source.evidenceId);
      if(!evidence?.excerpt||links.has(sourceKey(source.url)))return [];
      return [{
        claimId:source.claimId,evidenceId:source.evidenceId,
        url:source.url,publisher:source.publisher,
        claimText:source.claimText,
        verifiedExcerpt:evidence.excerpt.slice(0,1200),
      }];
    });
    let index=0;
    const sentences=body.split(/\n{2,}/u).flatMap((paragraph,paragraphIndex)=>
      !/^#{1,6}\s|^[-*]\s|^\d+\.|^> |^\|/mu.test(paragraph.trim()) &&\n      !paragraph.includes("](") && !paragraph.includes("~~~")\n        ?splitSentences(paragraph)
        .map(text=>({id:index++,paragraphIndex,text:text.trim()}))
        .filter(row=>completeProse(row.text)):[]
    ).slice(0,35);
    return {
      sectionIndex:i,heading:scopes[i]!.heading,
      sentences,availableSources:availableSources.slice(0,12),
    };
  });
}
export function applyReviewedSignedSemanticCitationsV1(input:{
  bodyMarkdown:string;
  plan:Readonly<ArticleExecutionPlanV1>;
  runtime:Readonly<MasterRuntimeSnapshotV1>;
  worklist:readonly SemanticCitationSectionV1[];
  verdicts:readonly {sectionIndex:number;choices:readonly SemanticCitationChoiceV1[]}[];
}){
  const scopes=input.plan.sections.filter(s=>s.state==="WRITABLE");
  const bodies=splitPersistedArticleByCanonicalH2V1(
    input.bodyMarkdown,scopes.map(s=>s.heading));
  if(input.worklist.length!==scopes.length||
    input.verdicts.length!==scopes.length)throw new Error("CITATION_REVIEW_SECTION_COUNT");
  const audit: Array<{sectionIndex:number;added:number;rejected:number;
    approvedPairs:{claimId:string;evidenceId:string;url:string;sentenceId:number}[]}>=[];
  const newBodies=bodies.map((body,i)=>{
    const w=input.worklist[i],result=input.verdicts[i];
    if(!w||!result||w.sectionIndex!==i||result.sectionIndex!==i||
      w.heading!==scopes[i]!.heading)
      throw new Error("CITATION_REVIEW_SECTION_SCOPE_MISMATCH");
    const actual=buildSignedSemanticCitationWorklistV1({
      bodyMarkdown:input.bodyMarkdown,plan:input.plan,runtime:input.runtime,
    })[i]!;
    if(JSON.stringify(actual)!==JSON.stringify(w))
      throw new Error("CITATION_REVIEW_SOURCE_OR_ARTICLE_CHANGED");
    const allowed=new Map(w.availableSources.map(s=>[s.evidenceId,s]));
    const sentenceById=new Map(w.sentences.map(s=>[s.id,s]));
    const usedPairs=new Set<string>(),usedUrls=new Set<string>();
    const paragraphs=body.split(/\n{2,}/u);
    const approvals:{claimId:string;evidenceId:string;url:string;sentenceId:number}[]=[];
    let rejected=0;
    for(const choice of result.choices){
      if(!choice||typeof choice.claimId!=="string"||
        typeof choice.evidenceId!=="string"||
        !["SUPPORTED","PARTIAL","UNSUPPORTED","CONTRADICTORY"]
          .includes(choice.verdict)||
        typeof choice.reason!=="string"||choice.reason.trim().length<8||
        choice.reason.length>600)
        throw new Error("CITATION_REVIEW_INVALID_VERDICT_SCHEMA");
      const pair=allowed.get(choice.evidenceId);
      const key=choice.claimId+"\u0000"+choice.evidenceId;
      if(!pair||pair.claimId!==choice.claimId||usedPairs.has(key))
        throw new Error("CITATION_REVIEW_UNASSIGNED_OR_DUPLICATE_PAIR");
      usedPairs.add(key);
      if(choice.verdict!=="SUPPORTED"||!Number.isInteger(choice.sentenceId)){
        rejected++;continue;
      }
      const sentence=sentenceById.get(choice.sentenceId!);
      if(!sentence||!completeProse(sentence.text)){
        throw new Error("CITATION_REVIEW_UNKNOWN_OR_UNSAFE_SENTENCE");
      }
      const content=paragraphs[sentence.paragraphIndex];
      if(!content||!content.includes(sentence.text)||
        content.split(sentence.text).length!==2)
        throw new Error("CITATION_REVIEW_SENTENCE_NOT_UNIQUE");
      const keyUrl=sourceKey(pair.url);
      if(usedUrls.has(keyUrl)||body.includes("]("+pair.url+")")){
        rejected++;continue;
      }
      const label=pair.publisher.replace(/[[\]()\n]/gu," ").slice(0,70);
      const suffix=" [Source: "+label+"]("+pair.url+")";
      paragraphs[sentence.paragraphIndex]=content.replace(
        sentence.text,sentence.text.trimEnd()+suffix);
      usedUrls.add(keyUrl);
      approvals.push({claimId:choice.claimId,evidenceId:choice.evidenceId,
        sentenceId:choice.sentenceId!,url:pair.url});
    }
    audit.push({sectionIndex:i,added:approvals.length,rejected,approvedPairs:approvals});
    return paragraphs.join("\n\n");
  });
  return {
    version:"READ_ONLY_SEMANTIC_CITATION_REVIEW_V1" as const,
    proposedBodyMarkdown:newBodies.map((body,i)=>
      "## "+scopes[i]!.heading+"\n\n"+body).join("\n\n"),
    addedCitations:audit.reduce((n,a)=>n+a.added,0),
    audit,
    paidModelJudgmentsAreNotFinalEvidence:true,
    formalSectionQueryOwnershipUpdated:false,
    nineCriticsPerformed:false,serpReplayPerformed:false,
    commitAllowed:false,
  };
}

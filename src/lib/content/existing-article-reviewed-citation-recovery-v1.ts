/**
 * Replay explicit, completed, SHA-bound local signed semantic reviews.
 * Never trusts an exported Markdown proposal. Only exact source evidence
 * and sentence IDs reconstructed from signed persisted DB research.
 * No AI, DataForSEO or database mutations.
 */
import {readFile} from "node:fs/promises";
import {join,resolve} from "node:path";
import {createHash} from "node:crypto";
import type {MasterRuntimeSnapshotV1} from "./master-runtime-adapter";
import type {ArticleExecutionPlanV1} from "./article-execution-plan-v1";
import {draftExistingArticleSignedCitationsV1} from
  "./existing-article-source-citation-repair-v1";
import {buildSignedSemanticCitationWorklistV1,
  applyReviewedSignedSemanticCitationsV1} from
  "./existing-article-semantic-citation-v1";
import {semanticCitationCheckpointKeyV1,
  validateSemanticCitationChoicesV1} from
  "./existing-article-semantic-citation-checkpoint-v1";
import {verifyExistingArticleCitationScopeV1} from
  "./existing-article-citation-authority-v1";

const sha=(s:string)=>createHash("sha256").update(s,"utf8").digest("hex");
export async function loadReviewedSignedCitationDraftV1({
  articleId,bodyMarkdown,plan,runtime,checkpointDirectory,
}:{
  articleId:string;
  bodyMarkdown:string;
  plan:Readonly<ArticleExecutionPlanV1>;
  runtime:Readonly<MasterRuntimeSnapshotV1>;
  checkpointDirectory?:string;
}){
  const originalSha256=sha(bodyMarkdown.endsWith("\n")?
    bodyMarkdown:bodyMarkdown+"\n");
  const exact=draftExistingArticleSignedCitationsV1({
    bodyMarkdown,plan,runtime,
  });
  const worklist=buildSignedSemanticCitationWorklistV1({
    bodyMarkdown:exact.proposedBodyMarkdown,plan,runtime,
  });
  const root=checkpointDirectory??resolve(
    ".growth-os-tmp/citation-review/checkpoints",articleId);
  const verdicts=[];
  const checkpointKeys:string[]=[];
  for(const section of worklist){
    if(!section.availableSources.length||!section.sentences.length){
      verdicts.push({sectionIndex:section.sectionIndex,choices:[]});
      continue;
    }
    const key=semanticCitationCheckpointKeyV1({
      articleId,originalArticleSha256:originalSha256,section,
    });
    const path=join(root,section.sectionIndex+"-"+key+".json");
    let content:string;
    try{content=await readFile(path,"utf8");}
    catch{throw new Error(
      "SIGNED_CITATION_REVIEW_CHECKPOINT_MISSING_OR_UNREADABLE_H2:"+
      section.sectionIndex);
    }
    let parsed:unknown;
    try{parsed=JSON.parse(content);}
    catch{throw new Error("SIGNED_CITATION_REVIEW_CHECKPOINT_INVALID_JSON");}
    const record=parsed&&typeof parsed==="object"&&!Array.isArray(parsed)
      ?parsed as Record<string,unknown>:null;
    if(!record||record.reviewKey!==key||
      record.sectionIndex!==section.sectionIndex)
      throw new Error("SIGNED_CITATION_REVIEW_CHECKPOINT_HASH_MISMATCH");
    verdicts.push({
      sectionIndex:section.sectionIndex,
      choices:validateSemanticCitationChoicesV1(section,record.choices),
    });
    checkpointKeys.push(key);
  }
  const reviewed=applyReviewedSignedSemanticCitationsV1({
    bodyMarkdown:exact.proposedBodyMarkdown,plan,runtime,worklist,verdicts,
  });
  const candidate=reviewed.proposedBodyMarkdown;
  const scope=verifyExistingArticleCitationScopeV1({
    candidateBodyMarkdown:candidate,plan,runtime,
  });
  if(scope.unapprovedLinks>0||!scope.completeSectionCitationCoverage)
    throw new Error("SIGNED_CITATION_REVIEW_SECTION_COVERAGE_INCOMPLETE");
  const sections=exact.sections.map((section,i)=>{
    const semantic=reviewed.audit[i]!;
    return {
      sectionIndex:i,heading:section.heading,
      exactClaimAnchorMissing:section.exactClaimAnchorMissing,
      proposedCitationCount:section.proposedCitationCount+semantic.added,
      proposed:[
        ...section.proposed.map(x=>({
          claimId:x.claimId,url:x.url,sectionIndex:i,
        })),
        ...semantic.approvedPairs.map(x=>({
          claimId:x.claimId,url:x.url,sectionIndex:i,
        })),
      ],
    };
  });
  return {
    proposedBodyMarkdown:candidate,
    totalAddedCitations:exact.totalAddedCitations+reviewed.addedCitations,
    sections,
    reviewCheckpointKeys:checkpointKeys,
    originalArticleSha256:originalSha256,
    evidenceSourceScope:scope,
    mode:"READ_ONLY_RECONSTRUCTED_REVIEWED_SIGNED_CITATIONS",
    providerCalls:0,modelCalls:0,commitAllowed:false,
  };
}

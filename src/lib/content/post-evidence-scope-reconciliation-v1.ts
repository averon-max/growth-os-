/**
 * One deterministic, post-verification scope reconciliation BEFORE brief
 * persistence. This is NOT a second planner and never discovers evidence,
 * edits a claim, guesses source authority, mutates DB, or calls a model.
 *
 * Supports exactly one safe mutation: defer a fully unsupported OPTIONAL
 * section that has no required template role and owns no MUST topic/question.
 * Reuses the canonical ArticleExecutionPlan compiler to recalculate budgets.
 */
import { buildArticleExecutionPlanV1, type ArticleExecutionPlanV1,
  type SectionExecutionContractV1 } from "./article-execution-plan-v1";

export type PostEvidenceSectionDecisionV1 = Readonly<{
  sectionId: string;
  index: number;
  action: "KEEP" | "DEFER_OPTIONAL" | "BLOCK";
  reasonCode:
    | "VERIFIED_AUTHORITY_PRESENT"
    | "ALREADY_DEFERRED"
    | "OPTIONAL_SECTION_HAS_NO_AUTHORITY"
    | "MUST_COVERAGE_HAS_NO_AUTHORITY"
    | "REQUIRED_TEMPLATE_ROLE_HAS_NO_AUTHORITY"
    | "PRIMARY_SECTION_HAS_NO_AUTHORITY"
    | "PARTIAL_SECTION_AUTHORITY"
    | "EVIDENCE_NOT_VERIFIED";
}>;

export interface PostEvidenceScopeReconciliationV1 {
  version: "POST_EVIDENCE_SCOPE_RECONCILIATION_V1";
  status: "UNCHANGED" | "RECONCILED" | "BLOCKED";
  decisions: readonly PostEvidenceSectionDecisionV1[];
  /** Never expose a superficially repaired plan if another section is blocked. */
  plan: Readonly<ArticleExecutionPlanV1> | null;
}

export class PostEvidenceScopeReconciliationErrorV1 extends Error {
  readonly code = "RESEARCH_POST_EVIDENCE_SCOPE_BLOCKED" as const;
  constructor(readonly decisions: readonly PostEvidenceSectionDecisionV1[]) {
    super("RESEARCH_POST_EVIDENCE_SCOPE_BLOCKED:" +
      decisions.filter(d=>d.action==="BLOCK")
        .map(d=>d.sectionId+":"+d.reasonCode).join(","));
    this.name="PostEvidenceScopeReconciliationErrorV1";
  }
}

export function reconcilePostEvidenceScopeV1(input: {
  plan: Readonly<ArticleExecutionPlanV1>;
  /** Stable IDs from the SAME selected structural template's required roles. */
  requiredTemplateRoleSectionIds?: readonly string[];
}): PostEvidenceScopeReconciliationV1 {
  const { plan } = input;
  const protectedRoles=new Set(input.requiredTemplateRoleSectionIds??[]);
  const mustTopics=new Set(plan.requiredTopics.filter(r=>r.priority==="MUST").map(r=>r.id));
  const mustQuestions=new Set(plan.requiredQuestions.filter(r=>r.priority==="MUST").map(r=>r.id));
  const mustEntities=new Set(plan.requiredEntities.filter(r=>r.priority==="MUST").map(r=>r.id));
  const verifiedEvidence=new Set(plan.verifiedEvidenceIds);
  const decisions:PostEvidenceSectionDecisionV1[]=[];

  for (const [index,section] of plan.sections.entries()) {
    const hasClaims=section.requiredClaimIds.length>0;
    const hasEvidence=section.evidenceIds.length>0;
    const evidenceVerified=section.evidenceIds.every(id=>verifiedEvidence.has(id));
    let action: PostEvidenceSectionDecisionV1["action"]="KEEP";
    let reasonCode:PostEvidenceSectionDecisionV1["reasonCode"]="VERIFIED_AUTHORITY_PRESENT";

    const primary=index===0;
    const requiredRole=protectedRoles.has(section.id);
    const ownsMust=section.requiredTopicIds.some(id=>mustTopics.has(id)) ||
      section.requiredQuestionIds.some(id=>mustQuestions.has(id)) ||
      section.requiredEntityIds.some(id=>mustEntities.has(id));
    if(section.state!=="WRITABLE"){
      if(primary) {action="BLOCK";reasonCode="PRIMARY_SECTION_HAS_NO_AUTHORITY";}
      else if(requiredRole){action="BLOCK";reasonCode="REQUIRED_TEMPLATE_ROLE_HAS_NO_AUTHORITY";}
      else if(ownsMust){action="BLOCK";reasonCode="MUST_COVERAGE_HAS_NO_AUTHORITY";}
      else reasonCode="ALREADY_DEFERRED";
    } else if(!evidenceVerified) {
      action="BLOCK";reasonCode="EVIDENCE_NOT_VERIFIED";
    } else if(hasClaims!==hasEvidence){
      action="BLOCK";reasonCode="PARTIAL_SECTION_AUTHORITY";
    } else if(!hasClaims) {
      if(primary){action="BLOCK";reasonCode="PRIMARY_SECTION_HAS_NO_AUTHORITY";}
      else if(requiredRole){action="BLOCK";reasonCode="REQUIRED_TEMPLATE_ROLE_HAS_NO_AUTHORITY";}
      else if(ownsMust){action="BLOCK";reasonCode="MUST_COVERAGE_HAS_NO_AUTHORITY";}
      else {action="DEFER_OPTIONAL";reasonCode="OPTIONAL_SECTION_HAS_NO_AUTHORITY";}
    }
    decisions.push(Object.freeze({sectionId:section.id,index,action,reasonCode}));
  }

  if(decisions.some(d=>d.action==="BLOCK")){
    return Object.freeze({
      version:"POST_EVIDENCE_SCOPE_RECONCILIATION_V1",
      status:"BLOCKED",decisions:Object.freeze(decisions),plan:null,
    });
  }
  if(!decisions.some(d=>d.action==="DEFER_OPTIONAL")){
    return Object.freeze({
      version:"POST_EVIDENCE_SCOPE_RECONCILIATION_V1",
      status:"UNCHANGED",decisions:Object.freeze(decisions),plan,
    });
  }
  const deferred=new Set(decisions.filter(d=>d.action==="DEFER_OPTIONAL")
    .map(d=>d.sectionId));
  const sections:SectionExecutionContractV1[]=plan.sections.map(section=>
    deferred.has(section.id)
      ? {...section,state:"DEFERRED_NO_EVIDENCE" as const}
      : section,
  );
  // Recompile through existing authoritative builder, never hand-edit
  // lengthPlan, data contracts, MUST ownership, or Writer budgets.
  const rebuilt=buildArticleExecutionPlanV1({
    websiteId:plan.websiteId,topic:plan.topic,primaryQuery:plan.primaryQuery,
    intent:plan.intent,pageType:plan.pageType,riskClass:plan.riskClass,
    pageAction:plan.pageAction,requiredTopics:plan.requiredTopics,
    requiredQuestions:plan.requiredQuestions,requiredEntities:plan.requiredEntities,
    verifiedEvidenceIds:plan.verifiedEvidenceIds,sections,
  });
  return Object.freeze({
    version:"POST_EVIDENCE_SCOPE_RECONCILIATION_V1",
    status:"RECONCILED",decisions:Object.freeze(decisions),
    plan:Object.freeze({...rebuilt,...(plan.mediaRequirements
      ? {mediaRequirements:plan.mediaRequirements}: {})}),
  });
}

export function assertReconciledPostEvidenceScopeV1(
  result:Readonly<PostEvidenceScopeReconciliationV1>,
): Readonly<ArticleExecutionPlanV1> {
  if(result.status==="BLOCKED" || !result.plan)
    throw new PostEvidenceScopeReconciliationErrorV1(result.decisions);
  return result.plan;
}

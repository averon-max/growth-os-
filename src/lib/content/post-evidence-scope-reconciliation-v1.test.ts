import { describe, expect, it } from "vitest";
import { buildArticleExecutionPlanV1 } from "./article-execution-plan-v1";
import { assertCanonicalWriterPreflightV1 } from "./canonical-writer-preflight-v1";
import { reconcilePostEvidenceScopeV1,
  assertReconciledPostEvidenceScopeV1 } from "./post-evidence-scope-reconciliation-v1";

function fixture() {
  const sections=Array.from({length:5},(_,index)=>({
    id:`section-${index+1}`,
    heading:`Research-backed section ${index+1}`,
    level:2 as const,
    mission:index===4?"Provide practical optional guidance":"Explain verified facts",
    requiredTopicIds:[`topic-${index+1}`],
    requiredQuestionIds:index===4?["question-optional"]:[],
    requiredEntityIds:[],
    requiredClaimIds:index===4?[]:[`claim-${index+1}-a`,`claim-${index+1}-b`],
    evidenceIds:index===4?[]:[`evidence-${index+1}-a`,`evidence-${index+1}-b`],
    state:"WRITABLE" as const,
  }));
  const plan=buildArticleExecutionPlanV1({
    websiteId:"site",topic:"credit monitoring",primaryQuery:"credit monitoring",
    intent:"INFORMATIONAL",pageType:"ARTICLE",riskClass:"YMYL_FINANCE",
    pageAction:"CREATE",
    requiredTopics:sections.map((s,i)=>({
      id:s.requiredTopicIds[0]!,label:s.heading,
      priority:i===0?"MUST" as const:"SHOULD" as const,
    })),
    requiredQuestions:[{id:"question-optional",label:"Which product is best?",
      priority:"SHOULD" as const}],
    requiredEntities:[],
    verifiedEvidenceIds:sections.flatMap(s=>s.evidenceIds),
    sections,
  });
  return {plan,requiredTemplateRoleSectionIds:["section-1","section-2","section-3","section-4"]};
}

describe("bounded post-evidence Research/Planning reconciliation",()=>{
  it("defers ONLY an optional unsupported section and recompiles word budget",()=>{
    const input=fixture();
    const outcome=reconcilePostEvidenceScopeV1(input);
    expect(outcome.status).toBe("RECONCILED");
    expect(outcome.decisions[4]).toMatchObject({
      sectionId:"section-5",action:"DEFER_OPTIONAL",
      reasonCode:"OPTIONAL_SECTION_HAS_NO_AUTHORITY",
    });
    const plan=assertReconciledPostEvidenceScopeV1(outcome);
    expect(plan.sections.map(s=>s.state)).toEqual([
      "WRITABLE","WRITABLE","WRITABLE","WRITABLE","DEFERRED_NO_EVIDENCE",
    ]);
    expect(plan.requiredQuestions).toEqual(input.plan.requiredQuestions);
    expect(plan.verifiedEvidenceIds).toEqual(input.plan.verifiedEvidenceIds);
    expect(plan.sections[4]?.requiredClaimIds).toEqual([]);
    expect(plan.sections[4]?.evidenceIds).toEqual([]);
    expect(plan.lengthPlan.preferredMax).toBeLessThan(
      input.plan.lengthPlan.preferredMax);
    expect(()=>assertCanonicalWriterPreflightV1({
      plan,blueprints:plan.sections.map(s=>({
        heading:s.heading,requiredClaims:[...s.requiredClaimIds],
      })),
    })).not.toThrow();
    // One bounded pass; second invocation leaves the plan untouched.
    const repeated=reconcilePostEvidenceScopeV1({
      plan,requiredTemplateRoleSectionIds:input.requiredTemplateRoleSectionIds,
    });
    expect(repeated.status).toBe("UNCHANGED");
    expect(repeated.plan).toBe(plan);
  });

  it("does not defer a section owning a required template semantic role",()=>{
    const input=fixture();
    const result=reconcilePostEvidenceScopeV1({
      ...input,requiredTemplateRoleSectionIds:[
        ...input.requiredTemplateRoleSectionIds,"section-5",
      ],
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.plan).toBeNull();
    expect(result.decisions[4]?.reasonCode)
      .toBe("REQUIRED_TEMPLATE_ROLE_HAS_NO_AUTHORITY");
    expect(()=>assertReconciledPostEvidenceScopeV1(result))
      .toThrow("RESEARCH_POST_EVIDENCE_SCOPE_BLOCKED:section-5");
  });

  it("does not downgrade MUST questions/topics simply to publish",()=>{
    const input=fixture();
    const plan={...input.plan,requiredQuestions:[
      {...input.plan.requiredQuestions[0]!,priority:"MUST" as const},
    ]};
    const result=reconcilePostEvidenceScopeV1({...input,plan});
    expect(result.status).toBe("BLOCKED");
    expect(result.decisions[4]?.reasonCode)
      .toBe("MUST_COVERAGE_HAS_NO_AUTHORITY");
  });

  it("rejects missing source authority even for the primary mission",()=>{
    const input=fixture();
    const sections=input.plan.sections.map((s,i)=>i===0
      ? {...s,requiredClaimIds:[],evidenceIds:[]}:s);
    const result=reconcilePostEvidenceScopeV1({
      ...input,plan:{...input.plan,sections},
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.decisions[0]?.reasonCode)
      .toBe("PRIMARY_SECTION_HAS_NO_AUTHORITY");
  });

  it("never treats a missing/mismatched excerpt as verified",()=>{
    const input=fixture();
    const sections=input.plan.sections.map((s,i)=>i===2
      ? {...s,evidenceIds:[]}:s);
    const result=reconcilePostEvidenceScopeV1({
      ...input,plan:{...input.plan,sections},
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.decisions[2]?.reasonCode).toBe("PARTIAL_SECTION_AUTHORITY");
    const unverified=reconcilePostEvidenceScopeV1({
      ...input,plan:{...input.plan,
        verifiedEvidenceIds:input.plan.verifiedEvidenceIds.filter(id=>
          id!=="evidence-2-a"),
      },
    });
    expect(unverified.status).toBe("BLOCKED");
    expect(unverified.decisions[1]?.reasonCode).toBe("EVIDENCE_NOT_VERIFIED");
  });
});

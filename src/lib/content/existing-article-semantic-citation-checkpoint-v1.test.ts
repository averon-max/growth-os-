import {describe,expect,it} from "vitest";
import {
 semanticCitationCheckpointKeyV1,
 validateSemanticCitationChoicesV1,
} from "./existing-article-semantic-citation-checkpoint-v1";
import type {SemanticCitationSectionV1} from "./existing-article-semantic-citation-v1";

const section:SemanticCitationSectionV1={
  sectionIndex:2,heading:"Limitations",
  sentences:[{id:4,paragraphIndex:0,
    text:"Monitoring does not prevent every form of identity theft."}],
  availableSources:[{claimId:"claim1",evidenceId:"evidence1",
    url:"https://consumer.ftc.gov/articles/example",
    publisher:"FTC",claimText:"Monitoring does not prevent identity theft.",
    verifiedExcerpt:"Monitoring cannot prevent identity theft."}],
};
const correct={claimId:"claim1",evidenceId:"evidence1",
  sentenceId:4,verdict:"SUPPORTED" as const,
  reason:"The full sentence preserves both limits and polarity."};
describe("signed semantic citation section checkpoints",()=>{
  it("binds cache to unchanged entire source excerpt, sentence and article ID",()=>{
    const key=(s=section,articleId="articleOne",sha="a".repeat(64))=>
      semanticCitationCheckpointKeyV1({articleId,originalArticleSha256:sha,
        section:s});
    expect(key()).toBe(key());
    expect(key({...section,availableSources:[{
      ...section.availableSources[0]!,verifiedExcerpt:"Changed source",
    }]})).not.toBe(key());
    expect(key({...section,sentences:[{
      ...section.sentences[0]!,text:"A newly altered article sentence",
    }]})).not.toBe(key());
    expect(key(section,"otherArticle")).not.toBe(key());
    expect(key(section,"articleOne","b".repeat(64))).not.toBe(key());
  });
  it("reuses only complete signed source choices and actual exact sentence IDs",()=>{
    expect(validateSemanticCitationChoicesV1(section,[correct]))
      .toEqual([correct]);
    expect(()=>validateSemanticCitationChoicesV1(section,[]))
      .toThrow("SEMANTIC_CITATION_REVIEW_COUNT_MISMATCH");
    expect(()=>validateSemanticCitationChoicesV1(section,[{
      ...correct,evidenceId:"invented",
    }])).toThrow("SEMANTIC_CITATION_REVIEW_NOT_A_SIGNED_PAIR");
    expect(()=>validateSemanticCitationChoicesV1(section,[{
      ...correct,sentenceId:7,
    }])).toThrow("SEMANTIC_CITATION_REVIEW_SENTENCE_NOT_FOUND");
  });
  it("canonicalizes PARTIAL and UNSUPPORTED verdicts to NO CITATION even when the model returns a sentenceId",()=>{
    for(const verdict of ["PARTIAL","UNSUPPORTED","CONTRADICTORY"]){
      const withId=validateSemanticCitationChoicesV1(section,[{
        ...correct,verdict,sentenceId:4,
      }]);
      expect(withId[0]?.sentenceId).toBeNull();
      expect(withId[0]?.verdict).toBe(verdict);
      const withoutId=validateSemanticCitationChoicesV1(section,[{
        claimId:"claim1",evidenceId:"evidence1",
        verdict,reason:"The full source evidence does not entail the sentence.",
      }]);
      expect(withoutId[0]?.sentenceId).toBeNull();
    }
  });
  it("never tolerates fabricated citations under a SUPPORTED verdict",()=>{
    expect(()=>validateSemanticCitationChoicesV1(section,[{
      ...correct,verdict:"SUPPORTED",sentenceId:null,
    }])).toThrow("SEMANTIC_CITATION_REVIEW_SCHEMA_INVALID");
    expect(()=>validateSemanticCitationChoicesV1(section,[{
      ...correct,verdict:"SUPPORTED",sentenceId:444,
    }])).toThrow("SEMANTIC_CITATION_REVIEW_SENTENCE_NOT_FOUND");
    expect(()=>validateSemanticCitationChoicesV1(section,[{
      ...correct,verdict:"SUPPORTED",sentenceId:"4",
    }])).toThrow("SEMANTIC_CITATION_REVIEW_SCHEMA_INVALID");
  });
});

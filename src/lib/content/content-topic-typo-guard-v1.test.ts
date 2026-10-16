import {describe,expect,it} from "vitest";
import {isLikelyContentTopicTypoV1}
  from "./content-topic-typo-guard-v1";
describe("safe pre-paid content topic typo guard",()=>{
  it("recognizes the exact production monitoring misspelling",()=>{
    expect(isLikelyContentTopicTypoV1(
      "what is credit montoring","what is credit monitoring")).toBe(true);
  });
  it("recognizes a single swapped pair or punctuation-only difference",()=>{
    expect(isLikelyContentTopicTypoV1(
      "what is credit monitoirng","what is credit monitoring")).toBe(true);
    expect(isLikelyContentTopicTypoV1(
      "what is credit monitoring?","what is credit monitoring")).toBe(true);
  });
  it("does not block other legitimate search intents or broader topics",()=>{
    expect(isLikelyContentTopicTypoV1(
      "what is credit reporting","what is credit monitoring")).toBe(false);
    expect(isLikelyContentTopicTypoV1(
      "free credit monitoring","what is credit monitoring")).toBe(false);
    expect(isLikelyContentTopicTypoV1(
      "what is credit monitoring software","what is credit monitoring")).toBe(false);
    expect(isLikelyContentTopicTypoV1(
      "what is credit moniitoring 2026","what is credit monitoring")).toBe(false);
  });
  it("does not treat the exact same phrase as a typo",()=>{
    expect(isLikelyContentTopicTypoV1(
      "what is credit monitoring","what is credit monitoring")).toBe(false);
  });
});

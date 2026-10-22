/**
 * Explicit, version-bound outbound ACTION links. These are navigation
 * destinations, never VERIFIED_EXCERPT citations or proof of article claims.
 *
 * Approval must be an explicit review artifact persisted with the SAME
 * evidence snapshot as its supporting, section-owned VERIFIED_EXCERPT.
 * Absence, a pending decision or a changed article SHA grants NO exemption.
 */
import type {ArticleExecutionPlanV1} from "./article-execution-plan-v1";
import type {MasterRuntimeSnapshotV1} from "./master-runtime-adapter";
import {getOwnedVerifiedCitationsV1} from "./existing-article-source-citation-repair-v1";

export interface ApprovedNavigationEntryV1 {
  url:string;
  supportingSourceUrl:string;
  supportingEvidenceId:string;
  sectionIndex:number;
  purpose:string;
}
export interface OfficialNavigationReviewV1 {
  version:"OFFICIAL_NAVIGATION_REVIEW_V1";
  articleFingerprint:string;
  decision:"PENDING_REVIEW"|"APPROVED";
  approvedBy?:string;
  approvedAt?:string;
  entries:readonly ApprovedNavigationEntryV1[];
}
const data=(x:unknown):x is Record<string,unknown>=>
  !!x&&typeof x==="object"&&!Array.isArray(x);
const safeUrl=(value:unknown):string=>{
  if(typeof value!=="string")throw Error("NAVIGATION_URL_MISSING");
  let u:URL;
  try{u=new URL(value);}catch{throw Error("NAVIGATION_URL_INVALID");}
  const h=u.hostname.toLowerCase();
  if(u.protocol!=="https:"||u.username||u.password||u.port||
    !h||h==="localhost"||h.endsWith(".localhost")||
    /^(\d{1,3}\.){3}\d{1,3}$/.test(h)||
    h==="::1"||h.startsWith("[")||h.endsWith(".local")||
    u.searchParams.has("redirect_uri"))
    throw Error("NAVIGATION_URL_NOT_PUBLIC_HTTPS");
  u.hash="";
  return u.toString().replace(/\/$/u,"");
};
export function resolveApprovedOfficialNavigationV1(input:{
  review?:unknown;
  currentFingerprint:string;
  plan:Readonly<ArticleExecutionPlanV1>;
  runtime:Readonly<MasterRuntimeSnapshotV1>;
  visibleSourceUrlsBySection:readonly (readonly string[])[];
}):ReadonlySet<string>{
  if(input.review===undefined||input.review===null)return new Set();
  if(!data(input.review)||input.review.version!=="OFFICIAL_NAVIGATION_REVIEW_V1"||
    !Array.isArray(input.review.entries))
    throw Error("NAVIGATION_REVIEW_FORMAT_INVALID");
  if(input.review.decision==="PENDING_REVIEW")return new Set();
  if(input.review.decision!=="APPROVED"||
    input.review.articleFingerprint!==input.currentFingerprint)
    throw Error("NAVIGATION_APPROVAL_FINGERPRINT_OR_DECISION_INVALID");
  if(typeof input.review.approvedBy!=="string"||
    input.review.approvedBy.trim().length<3||
    typeof input.review.approvedAt!=="string"||
    Number.isNaN(Date.parse(input.review.approvedAt)))
    throw Error("NAVIGATION_APPROVAL_REVIEWER_MISSING");
  if(input.review.entries.length===0||input.review.entries.length>30)
    throw Error("NAVIGATION_APPROVAL_ENTRY_COUNT_INVALID");
  const owned=input.plan.sections.filter(s=>s.state==="WRITABLE");
  const accepted=new Set<string>();
  for(const item of input.review.entries){
    if(!data(item)||!Number.isInteger(item.sectionIndex)||
      !Number.isSafeInteger(item.sectionIndex)||
      Number(item.sectionIndex)<0||Number(item.sectionIndex)>=owned.length||
      typeof item.purpose!=="string"||
      item.purpose.trim().length<8||item.purpose.length>200||
      typeof item.supportingEvidenceId!=="string"||
      !item.supportingEvidenceId.trim())
      throw Error("NAVIGATION_APPROVAL_ENTRY_INVALID");
    const sectionIndex=Number(item.sectionIndex);
    const url=safeUrl(item.url);
    const source=safeUrl(item.supportingSourceUrl);
    if(url===source)throw Error("NAVIGATION_DESTINATION_IS_SOURCE");
    const evidence=getOwnedVerifiedCitationsV1(
      input.runtime,input.plan,sectionIndex);
    if(!evidence.some(e=>safeUrl(e.url)===source&&
      e.evidenceId===item.supportingEvidenceId))
      throw Error("NAVIGATION_APPROVAL_SOURCE_NOT_SIGNED_IN_H2");
    const visibleSources=new Set(
      (input.visibleSourceUrlsBySection[sectionIndex]??[]).map(safeUrl));
    if(!visibleSources.has(source))
      throw Error("NAVIGATION_SUPPORTING_SOURCE_NOT_VISIBLE_IN_H2");
    const binding=sectionIndex+"|"+url;
    if(accepted.has(binding))throw Error("NAVIGATION_APPROVAL_DUPLICATE");
    accepted.add(binding);
  }
  return accepted;
}

import {NextRequest,NextResponse} from "next/server";
import {
  requireUser,requireWebsiteAccess,authErrorResponse,
} from "@/lib/auth-helpers";
import {getContentArticleById} from "@/lib/content/repository";
import {
  recoverExistingArticleResearchV1,
} from "@/lib/content/existing-article-research-recovery-v1";
import {ContentRunBudgetExceededErrorV1}
  from "@/lib/content/content-run-budget-v1";

export async function POST(
  req:NextRequest,{params}:{params:Promise<{id:string}>}
){
  try{
    const {id}=await params;
    const user=await requireUser();
    const article=await getContentArticleById(id);
    if(!article)return NextResponse.json({
      code:"ARTICLE_NOT_FOUND",error:"Article not found.",
    },{status:404});
    await requireWebsiteAccess(user.id,article.brief.websiteId);
    let payload:unknown;
    try{payload=await req.json();}
    catch{return NextResponse.json({
      code:"INVALID_JSON",error:"Valid JSON required.",
    },{status:400});}
    if(!payload||typeof payload!=="object"||Array.isArray(payload))
      return NextResponse.json({
        code:"INVALID_INPUT",error:"Invalid request.",
      },{status:400});
    const input=payload as Record<string,unknown>;
    if(input.authorizePaidResearchRecovery!==true ||
      typeof input.expectedUpdatedAt!=="string"){
      return NextResponse.json({
        code:"EXPLICIT_AUTHORIZATION_REQUIRED",
        error:"Confirm bounded paid research recovery for the current article version.",
      },{status:400});
    }
    /*
     * A full paid Writer+Critic+SERP recovery can outlive a browser
     * request and creates duplicate charges when the UI retries.
     * Until a durable job queue provides resumability, require an
     * explicitly enabled operator-only HTTP path. Local CLI remains
     * the recommended controlled execution mode.
     */
    if(process.env.GROWTH_OS_ENABLE_HTTP_PAID_RESEARCH_RECOVERY!=="true"){
      return NextResponse.json({
        code:"RECOVERY_CLI_ONLY",
        error:"Paid research recovery is disabled in browser requests to prevent long-running timeouts and repeated charges. Run the explicit --execute command in your local terminal after the free preflight.",
      },{status:409});
    }
    const result=await recoverExistingArticleResearchV1({
      articleId:id,expectedUpdatedAt:input.expectedUpdatedAt,
    });
    return NextResponse.json(result);
  }catch(error){
    if(error instanceof ContentRunBudgetExceededErrorV1)
      return NextResponse.json({
        code:error.code,
        error:"Recovery stopped at the model budget. Original article and Evidence were preserved.",
        budget:error.snapshot,
      },{status:422});
    const {status,body}=authErrorResponse(error);
    if(status===401||status===403)
      return NextResponse.json(body,{status});
    const message=error instanceof Error?error.message:"RECOVERY_FAILED";
    const code=message.startsWith("SAVED_RESEARCH_RECOVERY_")
      ?message.slice(0,180):"RESEARCH_RECOVERY_FAILED";
    const explanation=message.includes("SHARED_BRIEF_EVIDENCE_SNAPSHOT")
      ?"This brief has other articles. Its shared Evidence cannot be replaced safely. No changes were saved."
      :message.includes("SECTION_INFORMATION_GAIN_STILL_INSUFFICIENT")||
        message.includes("INSUFFICIENT_NEW_VERIFIED_CLAIMS")
        ?"New claims could not be verified sufficiently for every section. Old content and research remain unchanged."
        :"Research recovery did not pass all required checks. The existing article and Evidence were preserved.";
    return NextResponse.json({
      code,error:explanation,
    },{status:409});
  }
}

import { NextRequest,NextResponse } from "next/server";
import {
  requireUser,requireWebsiteAccess,authErrorResponse,
} from "@/lib/auth-helpers";
import { getContentArticleById } from "@/lib/content/repository";
import {
  repairExistingArticleEditorialV1,
} from "@/lib/content/existing-article-editorial-repair-v1";
import {
  ContentRunBudgetExceededErrorV1,
} from "@/lib/content/content-run-budget-v1";

export async function POST(
  req:NextRequest,
  {params}:{params:Promise<{id:string}>}
){
  try{
    const {id}=await params;
    const user=await requireUser();
    const article=await getContentArticleById(id);
    if(!article){
      return NextResponse.json({error:"Article not found."},{status:404});
    }
    await requireWebsiteAccess(user.id,article.brief.websiteId);
    let body:unknown;
    try{body=await req.json();}
    catch{return NextResponse.json({error:"Valid JSON required."},{status:400});}
    if(!body||typeof body!=="object"||Array.isArray(body)){
      return NextResponse.json({error:"Invalid repair request."},{status:400});
    }
    const input=body as Record<string,unknown>;
    if(input.authorizeBoundedPaidRepair!==true ||
      typeof input.expectedUpdatedAt!=="string"){
      return NextResponse.json({
        error:"Explicit paid repair authorization and current article version required.",
      },{status:400});
    }
    const result=await repairExistingArticleEditorialV1(
      id,input.expectedUpdatedAt);
    return NextResponse.json(result,{status:200});
  }catch(err){
    if(err instanceof ContentRunBudgetExceededErrorV1){
      return NextResponse.json({
        code:err.code,error:"Safe repair budget reached. Original article was preserved.",
        budget:err.snapshot,
      },{status:422});
    }
    const {status,body}=authErrorResponse(err);
    if(status===401||status===403){
      return NextResponse.json(body,{status});
    }
    const message=err instanceof Error?err.message:"Recovery error";
    const publicFailure=message.startsWith("SAVED_EDITORIAL_") ||
      message.startsWith("MASTER_CRITIC_") ||
      message.startsWith("ARTICLE_");
    const safeCode=publicFailure?message.slice(0,130):
      "EDITORIAL_RECOVERY_NOT_COMPLETED";
    const actionable=message==="SAVED_EDITORIAL_FINAL_CHECKPOINT_REQUIRED"
      ? "Verified checkpoint unavailable. Recovery stopped before paid calls; the existing article is unchanged."
      : message==="SAVED_EDITORIAL_REAL_CRAWL_CONTEXT_REQUIRED"
        ? "The existing site crawl lacks the comparison context needed by Master Critics. No article was changed."
        : message==="SAVED_EDITORIAL_BOUNDED_REPAIR_FAILED"
          ? "The evidence-backed section repair did not pass the critic gates. The existing article was preserved."
          : "Editorial repair could not safely complete. The existing article was preserved.";
    return NextResponse.json({
      code:safeCode,error:actionable,
    },{status:409});
  }
}

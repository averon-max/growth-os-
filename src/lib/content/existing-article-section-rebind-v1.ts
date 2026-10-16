/**
 * Rebind a previously verified section-progress archive to the exact
 * CURRENT saved article. Reading old verified progress alone is not
 * proof that later editorial/critic repairs were persisted unchanged.
 * The caller MUST rerun current-source semantic verification for
 * every changed body before committing a new article.
 */
export function splitPersistedArticleByCanonicalH2V1(
  markdown:string,headings:readonly string[]
):readonly string[]{
  if(headings.length===0)throw new Error("QUALITY_REBIND_NO_SECTIONS");
  const hits=[...markdown.matchAll(/^##[ \t]+(.+?)\s*$/gm)];
  if(hits.length!==headings.length)
    throw new Error("QUALITY_REBIND_H2_COUNT_DRIFT");
  const body:string[]=[];
  for(let i=0;i<hits.length;i++){
    const hit=hits[i];
    const actual=hit[1].trim();
    if(actual!==headings[i])
      throw new Error("QUALITY_REBIND_H2_SCOPE_MISMATCH:"+i);
    const from=(hit.index??0)+hit[0].length;
    const to=i+1<hits.length?hits[i+1].index!:markdown.length;
    const prose=markdown.slice(from,to).trim();
    if(!prose||/^#(?:#)?[ \t]+\S/m.test(prose))
      throw new Error("QUALITY_REBIND_INVALID_SECTION:"+i);
    body.push(prose);
  }
  // No text outside planned H2 sections; the H1 is stored separately.
  if(markdown.slice(0,hits[0].index).trim())
    throw new Error("QUALITY_REBIND_UNOWNED_INTRO");
  return body;
}

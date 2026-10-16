/**
 * Fail-fast protection against accidentally paying for a second article
 * whose exact search phrase differs from an existing one by one typo.
 *
 * Do not auto-correct a user-approved keyword. The route returns a
 * 409 with the existing article so the user can choose what to do.
 * This is intentionally strict: identical word boundaries, exactly
 * one edited word with length >= 6, edit distance <= 1 (including
 * adjacent character swap). Meaningfully different keywords pass.
 */
function words(value:string):string[]{
  return value.normalize("NFKC").toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu," ").trim().split(/\s+/)
    .filter(Boolean);
}

function oneEdit(a:string,b:string):boolean{
  if(a===b || Math.abs(a.length-b.length)>1 ||
      Math.min(a.length,b.length)<6)return false;
  if(a.length===b.length){
    const mismatch:number[]=[];
    for(let i=0;i<a.length;i++)if(a[i]!==b[i])mismatch.push(i);
    if(mismatch.length===1)return true;
    return mismatch.length===2&&
      mismatch[1]===mismatch[0]+1&&
      a[mismatch[0]]===b[mismatch[1]]&&
      a[mismatch[1]]===b[mismatch[0]];
  }
  const short=a.length<b.length?a:b;
  const long=a.length>b.length?a:b;
  let i=0,j=0,edits=0;
  while(i<short.length&&j<long.length){
    if(short[i]===long[j]){i++;j++;continue;}
    if(++edits>1)return false;
    j++;
  }
  return true;
}

export function isLikelyContentTopicTypoV1(input:string,existing:string):boolean{
  const left=words(input),right=words(existing);
  if(left.length===0||left.length!==right.length)return false;
  let differing=0;
  for(let i=0;i<left.length;i++){
    if(left[i]===right[i])continue;
    if(!oneEdit(left[i],right[i]))return false;
    differing++;
    if(differing>1)return false;
  }
  // Also catch punctuation-only changes that the exact-keyword guard
  // does not normalize (e.g. trailing question mark).
  return differing===1||
    (differing===0&&input.trim().toLocaleLowerCase("en-US")!==
      existing.trim().toLocaleLowerCase("en-US"));
}

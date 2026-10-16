/**
 * HIGH_CONFIDENCE_EDITORIAL_REPETITION_V1
 *
 * Conservative deterministic signal, not semantic equivalence.
 * Detects verbatim substantial paragraph reuse or dual repeated
 * multiword phrases across independent long-form sections.
 * No claims, facts, evidence or extra AI calls are generated.
 */
export interface EditorialSectionV1 {
  readonly heading:string;
  readonly bodyMarkdown:string;
}
export interface EditorialRepetitionFindingV1 {
  readonly code:
    "EDITORIAL_REPEATED_PARAGRAPH_ACROSS_SECTIONS" |
    "EDITORIAL_RECYCLED_ADVICE_ACROSS_SECTIONS" |
    "EDITORIAL_REPHRASED_BOILERPLATE_ACROSS_SECTIONS";
  readonly sectionIndex:number;
  readonly repeatedPhrases:readonly string[];
  readonly affectedSections:readonly number[];
}
const words=(text:string):string[]=>
  (text.toLocaleLowerCase("en-US").match(/[\p{L}\p{N}]+/gu)??[]);
const ticks=String.fromCharCode(96);
const fencedCode=new RegExp(ticks+"{3}[\\s\\S]*?"+ticks+"{3}","g");
const inlineCode=new RegExp(ticks+"[^\\x60\\n]*"+ticks,"g");
const prose=(md:string):string=>md
  .replace(fencedCode," ")
  .replace(inlineCode," ")
  .replace(/https?:\/\/\S+/g," ")
  .replace(/^\s{0,3}#{1,6}\s+.+$/gm," ");
function paragraphs(markdown:string):string[]{
  return prose(markdown).split(/\n\s*\n+/)
    .map(x=>x.trim()).filter(x=>words(x).length>=22);
}
function sectionPhrases(sections:readonly EditorialSectionV1[],size:number){
  const owners=new Map<string,Set<number>>();
  sections.forEach((section,index)=>{
    const tokens=words(prose(section.bodyMarkdown));
    const seen=new Set<string>();
    for(let i=0;i<=tokens.length-size;i++){
      const phrase=tokens.slice(i,i+size).join(" ");
      if(!seen.has(phrase)){
        seen.add(phrase);
        if(!owners.has(phrase))owners.set(phrase,new Set<number>());
        owners.get(phrase)!.add(index);
      }
    }
  });
  return [...owners].map(([phrase,indices])=>({
    phrase,indices:[...indices].sort((a,b)=>a-b),
  }));
}
function independentRepeatedSentences(
  section:EditorialSectionV1,five:string,three:string
):boolean{
  const sentences=prose(section.bodyMarkdown).split(/[.!?](?:\s+|$)/)
    .map(text=>words(text).join(" "));
  const a=sentences.flatMap((text,i)=>text.includes(five)?[i]:[]);
  const b=sentences.flatMap((text,i)=>text.includes(three)?[i]:[]);
  return a.some(i=>b.some(j=>i!==j));
}

/*
 * VERSION_TWO_REPHRASED_ADVICE_V1
 *
 * One small sentence-level rewrite can evade the original 5+3 n-gram
 * test without adding any useful detail. Detect repeated independent
 * six-word advice fragments spread across THREE distinct section
 * pairs and at least FOUR separate sections, then deduplicate nearby
 * overlapping six-gram windows so a single copied sentence cannot
 * inflate the score. Multiple topic-word mentions alone cannot pass.
 */
function recycledLongPhraseGroups(
  sections:readonly EditorialSectionV1[]
): {phrase:string;indices:readonly number[]}[]{
  const related=sectionPhrases(sections,6)
    .filter(x=>x.indices.length>=2)
    .sort((a,b)=>b.indices.length-a.indices.length);

  /*
   * A definition repeated verbatim in every section may produce
   * several DIFFERENT six-word windows. Even word-overlap grouping
   * cannot collapse all those windows. Track the actual sentence
   * occurrences instead of counting multiple windows of ONE fact as
   * several independent information-gain failures.
   *
   * Also discard windows spanning sentence boundaries: a repeated
   * fragment must occur in actual reader-facing prose sentences.
   */
  const sentenceTexts=sections.map(section=>
    prose(section.bodyMarkdown)
      .split(/[.!?](?:\s+|$)/)
      .map(sentence=>words(sentence).join(" "))
  );
  const seenSentenceLocations=new Set<string>();
  const groups:{phrase:string;indices:readonly number[]}[]=[];
  for(const candidate of related){
    const occurrences=sentenceTexts.flatMap((sentences,sectionIndex)=>
      sentences.flatMap((sentence,sentenceIndex)=>
        sentence.includes(candidate.phrase)
          ? [sectionIndex+":"+sentenceIndex]
          : []
      )
    );
    const owningSections=[...new Set(
      occurrences.map(value=>Number(value.split(":")[0]))
    )];
    if(owningSections.length<2)continue;
    const locationKey=occurrences.join("|");
    if(seenSentenceLocations.has(locationKey))continue;

    const terms=new Set(candidate.phrase.split(" "));
    const nearDuplicate=groups.some(group=>{
      const other=new Set(group.phrase.split(" "));
      const intersection=[...terms].filter(x=>other.has(x)).length;
      const union=new Set([...terms,...other]).size;
      return union>0 && intersection/union>=0.5;
    });
    if(nearDuplicate)continue;

    groups.push({phrase:candidate.phrase,indices:owningSections});
    seenSentenceLocations.add(locationKey);
  }
  return groups;
}

function detectRephrasedBoilerplate(
  sections:readonly EditorialSectionV1[]
): EditorialRepetitionFindingV1|null{
  const groups=recycledLongPhraseGroups(sections);
  if(groups.length<3)return null;
  const pairs=new Set<string>();
  const touched=new Set<number>();
  for(const group of groups){
    for(let i=0;i<group.indices.length;i++){
      for(let j=i+1;j<group.indices.length;j++){
        const left=group.indices[i],right=group.indices[j];
        pairs.add(String(left)+":"+String(right));
        touched.add(left);touched.add(right);
      }
    }
  }
  if(pairs.size<3 || touched.size<4)return null;
  const groupedByOwner=new Map<number,number>();
  for(const group of groups){
    for(const owner of group.indices)
      groupedByOwner.set(owner,(groupedByOwner.get(owner)??0)+1);
  }
  const selected=[...groupedByOwner].sort((a,b)=>
    b[1]-a[1]||b[0]-a[0])[0]?.[0];
  if(selected===undefined)return null;
  return {
    code:"EDITORIAL_REPHRASED_BOILERPLATE_ACROSS_SECTIONS",
    sectionIndex:selected,
    repeatedPhrases:groups.slice(0,5).map(group=>group.phrase),
    affectedSections:[...touched].sort((a,b)=>a-b),
  };
}

export function detectHighConfidenceEditorialRepetitionV1(
  sections:readonly EditorialSectionV1[]
):readonly EditorialRepetitionFindingV1[]{
  if(sections.length<2)return [];
  const seenParagraphs=new Map<string,number>();
  for(let i=0;i<sections.length;i++){
    for(const paragraph of paragraphs(sections[i].bodyMarkdown)){
      const content=words(paragraph).join(" ");
      const owner=seenParagraphs.get(content);
      if(owner!==undefined&&owner!==i){
        return [{
          code:"EDITORIAL_REPEATED_PARAGRAPH_ACROSS_SECTIONS",
          sectionIndex:i,
          repeatedPhrases:[content.slice(0,110)],
          affectedSections:[owner,i],
        }];
      }
      seenParagraphs.set(content,i);
    }
  }

  // High precision: a long article recycles BOTH one long stock phrase
  // and a distinct shorter one across multiple independent missions.
  // Repetition of a keyword alone never triggers the rule.
  const totalWords=sections.reduce(
    (sum,section)=>sum+words(prose(section.bodyMarkdown)).length,0);
  if(sections.length<5||totalWords<950)return [];
  const long=sectionPhrases(sections,5)
    .filter(x=>x.indices.length>=3)
    .sort((a,b)=>b.indices.length-a.indices.length);
  const shorter=sectionPhrases(sections,3)
    .filter(x=>x.indices.length>=4)
    .sort((a,b)=>b.indices.length-a.indices.length);
  for(const five of long){
    for(const three of shorter){
      if(five.phrase.includes(three.phrase))continue;
      const shared=five.indices.filter(i=>three.indices.includes(i));
      // Two windows from one repeated definition are NOT two distinct
      // editorial problems. Require separately repeated sentences in
      // at least two sections before marking recycled advice.
      const independent=shared.filter(i=>
        independentRepeatedSentences(sections[i],five.phrase,three.phrase));
      if(independent.length<2)continue;
      const selected=independent[independent.length-1];
      return [{
        code:"EDITORIAL_RECYCLED_ADVICE_ACROSS_SECTIONS",
        sectionIndex:selected,
        repeatedPhrases:[five.phrase,three.phrase],
        affectedSections:Array.from(new Set([
          ...five.indices,...three.indices,
        ])).sort((a,b)=>a-b),
      }];
    }
  }
  const rewritten=detectRephrasedBoilerplate(sections);
  if(rewritten)return [rewritten];
  return [];
}


/**
 * Stored articles do not carry their original MasterWriterRun. Read
 * only actual Markdown H2 boundaries (never synthetic planner labels).
 * This gives Approve and Publish the same cheap editorial protection.
 */
export function detectPersistedArticleEditorialRepetitionV1(
  bodyMarkdown:string
):readonly EditorialRepetitionFindingV1[]{
  const sections:{heading:string;bodyMarkdown:string}[]=[];
  const lines=bodyMarkdown.split(/\r?\n/);
  const fenceChar=String.fromCharCode(96);
  let inFence=false;
  let current:{heading:string;bodyMarkdown:string}|null=null;
  for(const line of lines){
    const trimmed=line.trimStart();
    if(trimmed.startsWith(fenceChar.repeat(3))||
       trimmed.startsWith("~~~")){
      inFence=!inFence;
    }
    const match=!inFence ? /^ {0,3}##\s+(.+)$/.exec(line):null;
    if(match){
      current={heading:match[1].trim(),bodyMarkdown:""};
      sections.push(current);
    } else if(current){
      current.bodyMarkdown+=(current.bodyMarkdown?"\n":"")+line;
    }
  }
  return detectHighConfidenceEditorialRepetitionV1(sections);
}


export class EditorialRepetitionGateErrorV1 extends Error {
  readonly code="ARTICLE_EDITORIAL_REPETITION_BLOCKED" as const;
  readonly findings:readonly EditorialRepetitionFindingV1[];
  constructor(findings:readonly EditorialRepetitionFindingV1[]){
    super("Substantive editorial revision required: multiple sections recycle the same explanation or guidance.");
    this.name="EditorialRepetitionGateErrorV1";
    this.findings=Object.freeze([...findings]);
  }
}

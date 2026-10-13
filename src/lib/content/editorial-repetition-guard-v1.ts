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
    "EDITORIAL_RECYCLED_ADVICE_ACROSS_SECTIONS";
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

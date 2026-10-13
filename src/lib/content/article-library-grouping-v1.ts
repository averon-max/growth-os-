export function normalizeContentTopicKeyV1(value:string):string{
  return value.normalize("NFKC").toLocaleLowerCase("en-US").trim()
    .replace(/\s+/g," ");
}

export type ContentLibraryArticleV1={
  readonly id:string;
  readonly status:string;
  readonly updatedAt:Date;
  readonly brief:Readonly<{
    primaryKeyword:string;
    searchIntent:string;
  }>;
};

export interface ContentLibraryGroupV1<T extends ContentLibraryArticleV1>{
  readonly key:string;
  readonly head:T;
  readonly related:readonly T[];
}

const articleStatusPriority:Readonly<Record<string,number>>={
  PUBLISHED:8,
  APPROVED:7,
  IN_REVIEW:6,
  DRAFT:5,
  GENERATING:4,
  PUBLISH_FAILED:3,
  BLOCKED_EXTERNAL:2,
  REJECTED:1,
};

export function groupContentArticlesV1<T extends ContentLibraryArticleV1>(
  articles:readonly T[]
):readonly ContentLibraryGroupV1<T>[]{
  const grouped=new Map<string,T[]>();
  for(const article of articles){
    const keyword=normalizeContentTopicKeyV1(article.brief.primaryKeyword);
    const intent=normalizeContentTopicKeyV1(article.brief.searchIntent);
    const key=JSON.stringify([keyword || article.id,intent]);
    const items=grouped.get(key)??[];
    items.push(article);
    grouped.set(key,items);
  }
  return [...grouped].map(([key,items])=>{
    const ranked=[...items].sort((a,b)=>
      (articleStatusPriority[b.status]??0)-(articleStatusPriority[a.status]??0)||
      b.updatedAt.getTime()-a.updatedAt.getTime()||
      a.id.localeCompare(b.id));
    const head=ranked[0];
    return {key,head,related:items.filter(item=>item.id!==head.id)};
  });
}

import type { ContentBriefInput, GeneratedBrief, GeneratedArticle } from "./types";
import type { ContentOutlineSection } from "./types";

export class ContentGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentGenerationError";
  }
}

export interface ContentGenerator {
  readonly modelName: string;

  generateBrief(input: ContentBriefInput): Promise<GeneratedBrief>;

  generateArticle(input: ContentBriefInput & { searchIntent: string; primaryKeyword: string; secondaryKeywords: string[]; outline: ContentOutlineSection[] }): Promise<GeneratedArticle>;
}

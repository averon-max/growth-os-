import type {
  ContentOutlineSection,
  GeneratedArticle,
} from "./types";

export class ContentGenerationError
  extends Error {
  constructor(
    message: string
  ) {
    super(message);

    this.name =
      "ContentGenerationError";
  }
}

export type ArticleCriticRole =
  | "SEARCH_INTENT"
  | "FACT_CLAIM"
  | "EDITORIAL";

export type ArticleCriticSeverity =
  | "BLOCKER"
  | "MAJOR"
  | "MINOR";

export interface ArticleCriticFinding {
  code:
    string;

  severity:
    ArticleCriticSeverity;

  message:
    string;

  evidence:
    string;

  instruction:
    string;
}

export interface ArticleCritiqueInput {
  role:
    ArticleCriticRole;

  article:
    GeneratedArticle;

  researchContext:
    string;

  primaryKeyword:
    string;

  searchIntent:
    string;

  secondaryKeywords:
    string[];

  outline:
    ContentOutlineSection[];
}

export interface ArticleCritiqueResult {
  role:
    ArticleCriticRole;

  pass:
    boolean;

  findings:
    ArticleCriticFinding[];
}

export interface ArticleRewriteInput {
  article:
    GeneratedArticle;

  findings:
    ArticleCriticFinding[];

  researchContext:
    string;

  primaryKeyword:
    string;

  searchIntent:
    string;

  secondaryKeywords:
    string[];

  outline:
    ContentOutlineSection[];
}

export interface ContentGenerator {
  readonly modelName:
    string;

}


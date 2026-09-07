export function deriveSeedKeyword(industry: string): string {
  const cleaned = industry
    .split(/,| and | & |\/|;/i)[0]
    .trim();
  return cleaned || industry.trim();
}

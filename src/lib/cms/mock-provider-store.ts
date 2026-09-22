// TEMPORARY/TEST ONLY -- simulates the Integration API contract that
// customWebsiteProvider expects from a real external site. Lets the full
// connect -> apply-fix -> verify -> history pipeline be exercised end to
// end before privacy-shield implements the real /api/growth-os/* routes.
// Safe to delete once a real CUSTOM_API integration exists.

const MOCK_PROVIDER_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.ENABLE_MOCK_CMS_PROVIDER === "true";

export const MOCK_API_KEY =
  process.env.MOCK_CMS_PROVIDER_KEY ?? "growth-os-test-key";

export class MockProviderDisabledError extends Error {
  constructor() {
    super("Mock CMS provider is disabled.");
    this.name = "MockProviderDisabledError";
  }
}

export function assertMockProviderEnabled(): void {
  if (!MOCK_PROVIDER_ENABLED) {
    throw new MockProviderDisabledError();
  }
}

export function checkAuth(authHeader: string | null): boolean {
  return authHeader === `Bearer ${MOCK_API_KEY}`;
}

interface MockPage {
  id: string;
  url: string;
  title: string;
  metaDescription: string | null;
  h1: string | null;
}

// Module-level in-memory store -- resets whenever the dev server restarts.
const pages: MockPage[] = [
  {
    id: "mock-home",
    url: "https://scanmycreds.com/",
    title: "ScanMyCreds — Credit Monitoring & Identity Protection",
    metaDescription: "Monitor your credit and protect your identity with ScanMyCreds.",
    h1: "Protect your identity today",
  },
];

export function listPages(): MockPage[] {
  return pages;
}

export function getPage(id: string): MockPage | undefined {
  return pages.find((p) => p.id === id);
}

export function patchPage(id: string, patch: Partial<Omit<MockPage, "id">>): MockPage | undefined {
  const page = pages.find((p) => p.id === id);
  if (!page) return undefined;
  Object.assign(page, patch);
  return page;
}

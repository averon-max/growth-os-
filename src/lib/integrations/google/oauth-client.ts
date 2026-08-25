import { google } from "googleapis";
import { GSC_OAUTH_SCOPES, GOOGLE_OAUTH_ACCESS_TYPE, GOOGLE_OAUTH_PROMPT } from "./constants";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function createGoogleOAuthClient() {
  return new google.auth.OAuth2(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET"),
    requireEnv("GOOGLE_REDIRECT_URI")
  );
}

export function buildGoogleAuthUrl(state: string): string {
  return createGoogleOAuthClient().generateAuthUrl({
    access_type: GOOGLE_OAUTH_ACCESS_TYPE,
    prompt: GOOGLE_OAUTH_PROMPT,
    scope: GSC_OAUTH_SCOPES,
    state,
  });
}

export interface ExchangedTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}

/** Exchanges an OAuth code for tokens. Throws if no access token comes back. */
export async function exchangeCodeForTokens(code: string): Promise<ExchangedTokens> {
  const client = createGoogleOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) throw new Error("Google did not return an access token");

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
  };
}

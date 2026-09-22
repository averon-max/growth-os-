import crypto from "crypto";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface StatePayload {
  workspaceId: string;
  userId: string;
  nonce: string;
  issuedAt: number;
}

export class InvalidStateError extends Error {
  constructor(message = "Invalid or expired OAuth state") {
    super(message);
    this.name = "InvalidStateError";
  }
}

function getStateSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not set");
  }
  return secret;
}

function sign(payloadB64: string): string {
  return crypto.createHmac("sha256", getStateSecret()).update(payloadB64).digest("base64url");
}

/**
 * Creates a signed, tamper-evident OAuth state binding this flow
 * to the initiating user and workspace, with an expiry.
 */
export function createOAuthState(userId: string, workspaceId: string): string {
  const payload: StatePayload = {
    workspaceId,
    userId,
    nonce: crypto.randomBytes(16).toString("base64url"),
    issuedAt: Date.now(),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * Verifies a state param, checks signature and expiry. Returns the
 * bound userId/workspaceId — caller MUST still re-check workspace
 * access; this only proves the state wasn't forged or replayed late.
 */
export function verifyOAuthState(state: string): { userId: string; workspaceId: string } {
  const parts = state.split(".");
  if (parts.length !== 2) throw new InvalidStateError();

  const [payloadB64, signature] = parts;
  const expected = sign(payloadB64);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new InvalidStateError();
  }

  let payload: StatePayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    throw new InvalidStateError();
  }

  if (Date.now() - payload.issuedAt > STATE_TTL_MS) {
    throw new InvalidStateError("OAuth state has expired");
  }

  return { userId: payload.userId, workspaceId: payload.workspaceId };
}

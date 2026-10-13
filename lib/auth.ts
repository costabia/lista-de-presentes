import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type SessionUser = { userId:string; weddingId:string; role:"owner"|"admin" };
const cookieName = "wedding_session";

const sessionSecret = () => {
  const value = process.env.AUTH_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SESSION_SECRET must have at least 32 characters");
  return value;
};

export function hashPassword(password:string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

export function verifyPassword(password:string, stored:string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

function encode(value:string) { return Buffer.from(value).toString("base64url"); }
function decode(value:string) { return Buffer.from(value, "base64url").toString("utf8"); }

function sign(payload:string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createSession(user:SessionUser) {
  const payload = encode(JSON.stringify({ ...user, exp:Date.now() + 1000 * 60 * 60 * 12 }));
  return `${payload}.${sign(payload)}`;
}

export async function getSession() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const session = JSON.parse(decode(payload)) as SessionUser & { exp:number };
    return session.exp > Date.now() ? session : null;
  } catch { return null; }
}

export const sessionCookie = cookieName;

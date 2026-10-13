import { NextResponse } from "next/server";
import { createSession, sessionCookie, verifyPassword } from "@/lib/auth";
import { getSupabaseRest } from "@/lib/supabase-rest";

export async function POST(request:Request) {
  const body = await request.json() as { email?:string; password?:string };
  const email = body.email?.trim().toLowerCase();
  if (!email || !body.password) return NextResponse.json({ error:"invalid_request" }, { status:400 });
  const db = getSupabaseRest();
  let users:Array<{id:string; wedding_id:string; password_hash:string; role:"owner"|"admin"; active:boolean}>;
  try {
    users = await db.get<Array<{id:string; wedding_id:string; password_hash:string; role:"owner"|"admin"; active:boolean}>>(`/wedding_users?email=eq.${encodeURIComponent(email)}&active=eq.true&select=id,wedding_id,password_hash,role`);
  } catch (error) {
    console.error("[auth/login] database unavailable", { error });
    return NextResponse.json({ error:"authentication_unavailable" }, { status:503 });
  }
  if (users.length !== 1 || !verifyPassword(body.password, users[0].password_hash)) return NextResponse.json({ error:"invalid_credentials" }, { status:401 });
  const user = users[0];
  const response = NextResponse.json({ ok:true, weddingId:user.wedding_id });
  response.cookies.set(sessionCookie, createSession({ userId:user.id, weddingId:user.wedding_id, role:user.role }), { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax", path:"/", maxAge:60*60*12 });
  return response;
}

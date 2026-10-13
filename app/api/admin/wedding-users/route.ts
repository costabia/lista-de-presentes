import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { getSupabaseRest } from "@/lib/supabase-rest";

export async function POST(request:Request) {
  const expected = process.env.SETUP_ADMIN_TOKEN;
  if (!expected || request.headers.get("x-setup-admin-token") !== expected) return NextResponse.json({ error:"unauthorized" }, { status:401 });
  const body = await request.json() as { weddingId?:string; email?:string; password?:string; role?:"owner"|"admin" };
  const email = body.email?.trim().toLowerCase();
  if (!body.weddingId || !email || !body.password || body.password.length < 12) return NextResponse.json({ error:"invalid_request" }, { status:400 });
  const rows = await getSupabaseRest().post<Array<{id:string}>>("/wedding_users", { wedding_id:body.weddingId, email, password_hash:hashPassword(body.password), role:body.role === "admin" ? "admin" : "owner" });
  return NextResponse.json({ id:rows[0]?.id, email, weddingId:body.weddingId }, { status:201 });
}

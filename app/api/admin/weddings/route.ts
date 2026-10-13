import { NextResponse } from "next/server";
import { getSupabaseRest } from "@/lib/supabase-rest";

function authorized(request:Request) {
  const token = process.env.SETUP_ADMIN_TOKEN;
  return Boolean(token && request.headers.get("x-setup-admin-token") === token);
}

export async function GET(request:Request) {
  if (!authorized(request)) return NextResponse.json({ error:"unauthorized" }, { status:401 });
  const db = getSupabaseRest();
  const weddings = await db.get<Array<{id:string; slug:string; couple_name:string; active:boolean; created_at:string}>>("/weddings?select=id,slug,couple_name,active,created_at&order=created_at.desc");
  const accounts = await db.get<Array<{wedding_id:string; status:string; asaas_account_id:string|null; asaas_wallet_id:string|null}>>("/asaas_accounts?select=wedding_id,status,asaas_account_id,asaas_wallet_id");
  const accountByWedding = new Map(accounts.map((account) => [account.wedding_id, account]));
  return NextResponse.json({ weddings:weddings.map((wedding) => ({ ...wedding, asaasAccount:accountByWedding.get(wedding.id) || null })) });
}

export async function POST(request:Request) {
  if (!authorized(request)) return NextResponse.json({ error:"unauthorized" }, { status:401 });
  const body = await request.json() as { slug?:string; coupleName?:string };
  const slug = body.slug?.trim().toLowerCase();
  const coupleName = body.coupleName?.trim();
  if (!slug || !coupleName || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80 || coupleName.length > 160) return NextResponse.json({ error:"invalid_request" }, { status:400 });
  try {
    const rows = await getSupabaseRest().post<Array<{id:string; slug:string; couple_name:string; active:boolean}>>("/weddings", { slug, couple_name:coupleName, active:true });
    return NextResponse.json({ wedding:rows[0] }, { status:201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("409")) return NextResponse.json({ error:"slug_already_exists" }, { status:409 });
    console.error("[admin/weddings] could not create wedding", { error });
    return NextResponse.json({ error:"wedding_unavailable" }, { status:503 });
  }
}

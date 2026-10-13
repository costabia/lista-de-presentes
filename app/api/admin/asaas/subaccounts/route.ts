import { NextResponse } from "next/server";
import { createSubaccount } from "@/lib/asaas";
import { encryptSecret } from "@/lib/secretbox";
import { getSupabaseRest } from "@/lib/supabase-rest";

export async function POST(request:Request) {
  const expected = process.env.SETUP_ADMIN_TOKEN;
  if (!expected || request.headers.get("x-setup-admin-token") !== expected) return NextResponse.json({ error:"unauthorized" }, { status:401 });
  const body = await request.json() as { weddingId?:string; name?:string; email?:string; cpfCnpj?:string; birthDate?:string; mobilePhone?:string; site?:string; incomeValue?:number; address?:string; addressNumber?:string; province?:string; postalCode?:string };
  const email = body.email?.trim().toLowerCase();
  if (!body.weddingId || !body.name?.trim() || !email || !body.cpfCnpj || !body.mobilePhone || !body.incomeValue || !body.address || !body.addressNumber || !body.province || !body.postalCode) return NextResponse.json({ error:"invalid_request" }, { status:400 });
  const webhookUrl = process.env.ASAAS_WEBHOOK_URL;
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
  const db = getSupabaseRest();
  if (!webhookUrl?.startsWith("https://") || !webhookToken) return NextResponse.json({ error:"webhook_configuration_required" }, { status:503 });
  const weddingRows = await db.get<Array<{id:string}>>(`/weddings?id=eq.${encodeURIComponent(body.weddingId)}&select=id&limit=1`);
  if (!weddingRows[0]) return NextResponse.json({ error:"wedding_not_found" }, { status:404 });
  const existing = await db.get<Array<{id:string}>>(`/asaas_accounts?wedding_id=eq.${encodeURIComponent(body.weddingId)}&select=id&limit=1`);
  if (existing[0]) return NextResponse.json({ error:"asaas_account_already_configured" }, { status:409 });
  const account = await createSubaccount({ name:body.name.trim(), email, cpfCnpj:body.cpfCnpj, birthDate:body.birthDate, mobilePhone:body.mobilePhone, site:body.site, incomeValue:body.incomeValue, address:body.address, addressNumber:body.addressNumber, province:body.province, postalCode:body.postalCode, webhooks:[{ name:"lista-de-presentes-events", url:webhookUrl, email, sendType:"SEQUENTIALLY", interrupted:false, enabled:true, apiVersion:3, authToken:webhookToken, events:["PAYMENT_CREATED","PAYMENT_CONFIRMED","PAYMENT_RECEIVED","PAYMENT_REFUNDED","PAYMENT_DELETED","TRANSFER_PENDING","TRANSFER_DONE","TRANSFER_FAILED","TRANSFER_CANCELLED","ACCOUNT_STATUS_GENERAL_APPROVAL_APPROVED"] }] });
  const rows = await db.post<Array<{id:string}>>("/asaas_accounts", { wedding_id:body.weddingId, asaas_account_id:account.id, asaas_wallet_id:account.walletId, api_key_ciphertext:encryptSecret(account.apiKey), status:"pending" });
  return NextResponse.json({ id:rows[0]?.id, asaasAccountId:account.id, walletId:account.walletId, status:"pending" }, { status:201 });
}

import { NextResponse } from "next/server";
import { createTransfer, findTransferByReference, getBalance } from "@/lib/asaas";
import { getSession } from "@/lib/auth";
import { encryptSecret } from "@/lib/secretbox";
import { getSupabaseRest } from "@/lib/supabase-rest";
import { getWeddingAsaasKey } from "@/lib/wedding-asaas";

export async function GET(_request:Request, context:{params:Promise<{weddingId:string}>}) {
  const { weddingId } = await context.params;
  const session = await getSession();
  if (!session || session.weddingId !== weddingId) return NextResponse.json({ error:"unauthorized" }, { status:401 });
  try {
    const payouts = await getSupabaseRest().get<Array<{id:string; amount:number; status:string; asaas_transfer_id:string|null; created_at:string}>>(`/payouts?wedding_id=eq.${encodeURIComponent(weddingId)}&select=id,amount,status,asaas_transfer_id,created_at&order=created_at.desc`);
    return NextResponse.json({ payouts });
  } catch (error) {
    console.error("[payouts] could not read payouts", { weddingId, error });
    return NextResponse.json({ error:"payouts_unavailable" }, { status:503 });
  }
}

export async function POST(request:Request, context:{params:Promise<{weddingId:string}>}) {
  const { weddingId } = await context.params;
  const session = await getSession();
  if (!session || session.weddingId !== weddingId) return NextResponse.json({ error:"unauthorized" }, { status:401 });
  const body = await request.json() as { amount?:number; destinationType?:"PIX"|"BANK_ACCOUNT"; pixAddressKey?:string; pixAddressKeyType?:"CPF"|"CNPJ"|"EMAIL"|"PHONE"|"EVP"; bankAccount?:{ bank:{ code:string }; ownerName:string; cpfCnpj:string; agency:string; account:string; accountDigit:string; bankAccountType:"CONTA_CORRENTE"|"CONTA_POUPANCA" } };
  const amount = typeof body.amount === "number" ? Math.round(body.amount * 100) / 100 : NaN;
  const destinationType = body.destinationType || "PIX";
  const validPix = destinationType === "PIX" && Boolean(body.pixAddressKey && body.pixAddressKeyType);
  const validBank = destinationType === "BANK_ACCOUNT" && Boolean(body.bankAccount?.bank?.code && body.bankAccount.ownerName && body.bankAccount.cpfCnpj && body.bankAccount.agency && body.bankAccount.account && body.bankAccount.accountDigit && body.bankAccount.bankAccountType);
  if (!Number.isFinite(amount) || amount <= 0 || (!validPix && !validBank)) return NextResponse.json({ error:"invalid_request" }, { status:400 });
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 128) return NextResponse.json({ error:"idempotency_key_required" }, { status:400 });
  const reference = `payout_${weddingId}_${idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const db = getSupabaseRest();
  let existing:Array<{id:string; asaas_transfer_id?:string; status:string; created_at:string}>;
  try {
    existing = await db.get<Array<{id:string; asaas_transfer_id?:string; status:string; created_at:string}>>(`/payouts?external_reference=eq.${encodeURIComponent(reference)}&select=id,asaas_transfer_id,status,created_at&limit=1`);
  } catch (error) {
    console.error("[payouts] could not check existing payout", { weddingId, error });
    return NextResponse.json({ error:"payouts_unavailable" }, { status:503 });
  }
  if (existing[0]) {
    if (existing[0].asaas_transfer_id) return NextResponse.json({ id:existing[0].id, transferId:existing[0].asaas_transfer_id, status:existing[0].status }, { status:200 });
    try {
      const recoveredKey = await getWeddingAsaasKey(weddingId);
      const recovered = await findTransferByReference(reference, existing[0].created_at, recoveredKey);
      if (recovered) {
        const recoveredStatus = recovered.status === "DONE" ? "done" : ["FAILED", "CANCELLED"].includes(recovered.status) ? "failed" : "pending";
        await db.patch(`/payouts?id=eq.${encodeURIComponent(existing[0].id)}`, { asaas_transfer_id:recovered.id, status:recoveredStatus, failure_reason:recoveredStatus === "failed" ? `Asaas transfer status: ${recovered.status}` : null });
        return NextResponse.json({ id:existing[0].id, transferId:recovered.id, status:recovered.status }, { status:200 });
      }
    } catch (error) {
      console.error("[payouts] could not reconcile existing transfer", { weddingId, payoutId:existing[0].id, error });
    }
    return NextResponse.json({ id:existing[0].id, transferId:null, status:existing[0].status }, { status:200 });
  }
  let asaasKey:string;
  let available:{balance:number};
  try {
    asaasKey = await getWeddingAsaasKey(weddingId);
    available = await getBalance(asaasKey);
  } catch (error) {
    console.error("[payouts] could not validate balance", { weddingId, error });
    return NextResponse.json({ error:"balance_unavailable" }, { status:503 });
  }
  if (amount > Number(available.balance)) return NextResponse.json({ error:"insufficient_balance" }, { status:400 });
  let rows:Array<{id:string}>;
  try {
    const destinationSecret = destinationType === "PIX" ? body.pixAddressKey! : JSON.stringify(body.bankAccount);
    rows = await db.post<Array<{id:string}>>("/payouts", { wedding_id:weddingId, amount, destination_type:destinationType, destination_key_ciphertext:encryptSecret(destinationSecret), destination_key_type:destinationType === "PIX" ? body.pixAddressKeyType : null, external_reference:reference, status:"requested" });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("409")) throw error;
    const concurrent = await db.get<Array<{id:string; asaas_transfer_id?:string; status:string}>>(`/payouts?external_reference=eq.${encodeURIComponent(reference)}&select=id,asaas_transfer_id,status&limit=1`);
    if (!concurrent[0]) throw error;
    return NextResponse.json({ id:concurrent[0].id, transferId:concurrent[0].asaas_transfer_id || null, status:concurrent[0].status }, { status:200 });
  }
  const payoutId = rows[0]?.id;
  if (!payoutId) return NextResponse.json({ error:"payout_unavailable" }, { status:503 });
  try {
    const alreadyCreated = await findTransferByReference(reference, new Date().toISOString(), asaasKey);
    const transfer = alreadyCreated || await createTransfer({ value:amount, externalReference:reference, ...(destinationType === "PIX" ? { pixAddressKey:body.pixAddressKey, pixAddressKeyType:body.pixAddressKeyType } : { bankAccount:body.bankAccount }), key:asaasKey });
    await db.patch(`/payouts?id=eq.${encodeURIComponent(payoutId)}`, { asaas_transfer_id:transfer.id, status:transfer.status === "DONE" ? "done" : "pending", completed_at:transfer.status === "DONE" ? new Date().toISOString() : null });
    return NextResponse.json({ id:payoutId, transferId:transfer.id, status:transfer.status }, { status:201 });
  } catch (error) {
    await db.patch(`/payouts?id=eq.${encodeURIComponent(payoutId)}`, { status:"failed", failure_reason:error instanceof Error ? error.message.slice(0,500) : "transfer_failed" });
    console.error("[payouts] could not create transfer", { weddingId, payoutId, error });
    return NextResponse.json({ error:"payout_unavailable" }, { status:503 });
  }
}

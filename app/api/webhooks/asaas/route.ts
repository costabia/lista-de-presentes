import { NextResponse } from "next/server";
import { claimWebhook, updateOrderByReference } from "@/lib/orders";
import { getSupabaseRest } from "@/lib/supabase-rest";
export async function POST(request: Request) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  const received = request.headers.get("asaas-access-token");
  if (!expected || !received || received !== expected) return NextResponse.json({ error:"unauthorized" }, { status:401 });
  const event = await request.json() as { id?:string; event?:string; account?:{ id?:string }; payment?:{ id?:string; externalReference?:string; value?:number; status?:string }; transfer?:{ id?:string; externalReference?:string; status?:string } };
  if (!event.id) return NextResponse.json({ received:true });
  if (!(await claimWebhook(event.id, event.event || "unknown"))) return NextResponse.json({ received:true });
  const paymentStatus = event.event === "PAYMENT_RECEIVED" || event.event === "PAYMENT_CONFIRMED" ? "paid" : event.event === "PAYMENT_REFUNDED" ? "refunded" : event.event === "PAYMENT_DELETED" ? "canceled" : undefined;
  if (paymentStatus && event.payment?.externalReference) await updateOrderByReference(event.payment.externalReference, { status:paymentStatus, asaas_payment_id:event.payment.id, amount:event.payment.value, paid_at:paymentStatus === "paid" ? new Date().toISOString() : null });
  const transferStatus = event.event === "TRANSFER_DONE" ? "done" : event.event === "TRANSFER_FAILED" ? "failed" : event.event === "TRANSFER_CANCELLED" ? "cancelled" : event.event === "TRANSFER_PENDING" ? "pending" : undefined;
  if (transferStatus && event.transfer?.externalReference) await getSupabaseRest().patch(`/payouts?external_reference=eq.${encodeURIComponent(event.transfer.externalReference)}`, { status:transferStatus, asaas_transfer_id:event.transfer.id, completed_at:transferStatus === "done" ? new Date().toISOString() : null });
  if (event.event === "ACCOUNT_STATUS_GENERAL_APPROVAL_APPROVED" && event.account?.id) await getSupabaseRest().patch(`/asaas_accounts?asaas_account_id=eq.${encodeURIComponent(event.account.id)}`, { status:"active", updated_at:new Date().toISOString() });
  // Production persistence is intentionally delegated to Supabase (see supabase/schema.sql).
  // The event id is the idempotency key: upsert it before applying the status update.
  console.info("Asaas webhook received", { eventId:event.id, type:event.event, accountId:event.account?.id, reference:event.payment?.externalReference || event.transfer?.externalReference });
  return NextResponse.json({ received:true });
}

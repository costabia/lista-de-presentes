import { NextResponse } from "next/server";
import { gifts } from "@/lib/gifts";
import { wedding } from "@/config/wedding";
import { createPaymentLink } from "@/lib/asaas";
import { saveOrder, updateOrderByReference } from "@/lib/orders";
export async function POST(request: Request) {
  try {
    const body = await request.json() as { giftId?:string; customAmount?:number; guestName?:string; message?:string };
    const gift = body.giftId ? gifts.find(item => item.id === body.giftId && item.active) : undefined;
    const amount = gift?.price ?? (typeof body.customAmount === "number" ? Math.round(body.customAmount * 100) / 100 : NaN);
    if (!Number.isFinite(amount) || amount < wedding.minimumCustomGift || amount > 100000 || (body.giftId && !gift)) return NextResponse.json({ error:"invalid_request" }, { status:400 });
    const reference = `gift_${gift?.id ?? "custom_contribution"}_${crypto.randomUUID()}`;
    await saveOrder({ gift_id:gift?.id ?? null, guest_name:typeof body.guestName === "string" ? body.guestName.trim().slice(0,120) || null : null, guest_message:typeof body.message === "string" ? body.message.trim().slice(0,1000) || null : null, amount, status:"pending", external_reference:reference });
    const link = await createPaymentLink({ giftId:gift?.id, name:gift?.name ?? "Contribuição para Marina e Gabriel", description:[gift?.description, body.guestName ? `De: ${body.guestName}` : "", body.message || ""].filter(Boolean).join(" — ").slice(0,500), value:amount, externalReference:reference });
    await updateOrderByReference(reference, { asaas_payment_link_id:link.id });
    return NextResponse.json({ url:link.url, reference });
  } catch (error) {
    console.error("[payments/link] could not create payment", error);
    return NextResponse.json({ error:"payment_unavailable" }, { status:503 });
  }
}

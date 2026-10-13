import { NextResponse } from "next/server";
import { lookupGuestName } from "@/lib/guest-list";

export async function POST(request:Request) {
  try {
    const body = await request.json() as { name?:string };
    const name = body.name?.trim();
    if (!name) return NextResponse.json({ error:"name_required" }, { status:400 });
    const guest = await lookupGuestName(name);
    if (!guest) return NextResponse.json({ error:"guest_not_found" }, { status:404 });
    return NextResponse.json({ name:guest.exactName, alreadyConfirmed:guest.alreadyConfirmed });
  } catch (error) {
    console.error("[guests/validate] could not validate guest", { error });
    return NextResponse.json({ error:"guest_list_unavailable" }, { status:503 });
  }
}

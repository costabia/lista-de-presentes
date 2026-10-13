import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok:true });
  response.cookies.delete(sessionCookie);
  return response;
}

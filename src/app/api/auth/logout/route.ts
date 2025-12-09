import { NextRequest, NextResponse } from "next/server";
import { clearSpotifyCookies } from "@/lib/spotify";

export async function POST(request: NextRequest) {
  await clearSpotifyCookies();
  const target = new URL("/", request.url);
  return NextResponse.redirect(target);
}

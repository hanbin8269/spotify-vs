import { NextResponse } from "next/server";
import {
  buildSpotifyAuthorizeUrl,
  createPkcePair,
  persistOAuthCookies,
  randomState,
} from "@/lib/spotify";

export async function GET() {
  try {
    const { codeChallenge, codeVerifier } = await createPkcePair();
    const state = randomState();
    await persistOAuthCookies({ state, codeVerifier });
    const authorizeUrl = await buildSpotifyAuthorizeUrl({ state, codeChallenge });

    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    console.error("Spotify login init error", error);
    return NextResponse.json(
      { message: "스포티파이 로그인 준비 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

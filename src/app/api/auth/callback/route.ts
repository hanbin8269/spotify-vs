import { NextRequest, NextResponse } from "next/server";
import {
  persistSessionCookies,
  readAndClearOauthState,
  requestTokensWithCode,
} from "@/lib/spotify";

const redirectToHome = (
  request: NextRequest,
  params?: Record<string, string>,
) => {
  const target = new URL("/", request.url);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      target.searchParams.set(key, value);
    });
  }

  return NextResponse.redirect(target);
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const errorParam = searchParams.get("error");
  if (errorParam) {
    return redirectToHome(request, { auth_error: errorParam });
  }

  const code = searchParams.get("code");
  const incomingState = searchParams.get("state");
  const { state: storedState, codeVerifier } = readAndClearOauthState();

  if (!code || !incomingState || !codeVerifier) {
    return redirectToHome(request, { auth_error: "missing_params" });
  }

  if (!storedState || storedState !== incomingState) {
    return redirectToHome(request, { auth_error: "state_mismatch" });
  }

  try {
    const tokens = await requestTokensWithCode({ code, codeVerifier });
    persistSessionCookies(tokens);
    return redirectToHome(request);
  } catch (error) {
    console.error("Spotify callback error", error);
    return redirectToHome(request, { auth_error: "token_exchange_failed" });
  }
}

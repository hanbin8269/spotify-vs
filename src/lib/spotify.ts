import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getSpotifyEnv, getSpotifyScopes, isProduction } from "@/lib/env";

const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE_URL = "https://api.spotify.com/v1";

export const spotifyCookieKeys = {
  accessToken: "spotify_access_token",
  refreshToken: "spotify_refresh_token",
  state: "spotify_oauth_state",
  codeVerifier: "spotify_code_verifier",
} as const;

type TokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

type NormalizedTokenPayload = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
};

const toBase64Url = (buffer: Buffer): string =>
  buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const generateRandomString = (length: number): string =>
  crypto.randomBytes(length).toString("hex");

export const createPkcePair = async () => {
  const codeVerifier = toBase64Url(crypto.randomBytes(64)).slice(0, 128);
  const codeChallenge = toBase64Url(
    crypto.createHash("sha256").update(codeVerifier).digest(),
  );

  return { codeVerifier, codeChallenge };
};

export const buildSpotifyAuthorizeUrl = async ({
  state,
  codeChallenge,
}: {
  state: string;
  codeChallenge: string;
}): Promise<URL> => {
  const { clientId, redirectUri } = getSpotifyEnv();
  const scopes = getSpotifyScopes().join(" ");
  const url = new URL(AUTH_URL);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", codeChallenge);

  return url;
};

const exchangeToken = async (
  params: Record<string, string>,
): Promise<NormalizedTokenPayload> => {
  const { clientId, clientSecret } = getSpotifyEnv();
  const form = new URLSearchParams(params);
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${clientId}:${clientSecret}`,
      ).toString("base64")}`,
    },
    body: form.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`Spotify 토큰 발급 오류: ${errorPayload}`);
  }

  const payload = (await response.json()) as TokenResponse;

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in,
  };
};

export const requestTokensWithCode = async ({
  code,
  codeVerifier,
}: {
  code: string;
  codeVerifier: string;
}): Promise<NormalizedTokenPayload> => {
  return exchangeToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: getSpotifyEnv().redirectUri,
    code_verifier: codeVerifier,
  });
};

export const refreshSpotifyAccessToken = async ({
  refreshToken,
}: {
  refreshToken: string;
}): Promise<NormalizedTokenPayload> => {
  return exchangeToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
};

export const ensureAccessToken = async (): Promise<{
  accessToken: string | null;
}> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(spotifyCookieKeys.accessToken)?.value;
  if (token) {
    return { accessToken: token };
  }

  const refreshToken = cookieStore.get(spotifyCookieKeys.refreshToken)?.value;
  if (!refreshToken) {
    return { accessToken: null };
  }

  try {
    const refreshed = await refreshSpotifyAccessToken({ refreshToken });
    cookieStore.set(spotifyCookieKeys.accessToken, refreshed.accessToken, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      maxAge: refreshed.expiresIn,
      path: "/",
    });
    return { accessToken: refreshed.accessToken };
  } catch (error) {
    console.error("Spotify token refresh failed", error);
    cookieStore.delete(spotifyCookieKeys.refreshToken);
    return { accessToken: null };
  }
};

export const persistOAuthCookies = async ({
  state,
  codeVerifier,
}: {
  state: string;
  codeVerifier: string;
}) => {
  const cookieStore = await cookies();
  const baseOptions = {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
  };

  cookieStore.set(spotifyCookieKeys.state, state, {
    ...baseOptions,
    maxAge: 600,
  });

  cookieStore.set(spotifyCookieKeys.codeVerifier, codeVerifier, {
    ...baseOptions,
    maxAge: 600,
  });
};

export const persistSessionCookies = async ({
  accessToken,
  refreshToken,
  expiresIn,
}: {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}) => {
  const cookieStore = await cookies();
  const baseOptions = {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
  };

  cookieStore.set(spotifyCookieKeys.accessToken, accessToken, {
    ...baseOptions,
    maxAge: expiresIn,
  });

  if (refreshToken) {
    cookieStore.set(spotifyCookieKeys.refreshToken, refreshToken, {
      ...baseOptions,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
};

export const clearSpotifyCookies = async () => {
  const cookieStore = await cookies();
  Object.values(spotifyCookieKeys).forEach((key) => {
    cookieStore.delete(key);
  });
};

export const readAndClearOauthState = async () => {
  const cookieStore = await cookies();
  const state = cookieStore.get(spotifyCookieKeys.state)?.value ?? null;
  const codeVerifier = cookieStore.get(spotifyCookieKeys.codeVerifier)?.value ?? null;
  cookieStore.delete(spotifyCookieKeys.state);
  cookieStore.delete(spotifyCookieKeys.codeVerifier);
  return { state, codeVerifier };
};

export const randomState = (): string => generateRandomString(12);

type SpotifyRequestOptions = {
  accessToken: string;
  path: string;
  query?: Record<string, string | number | undefined>;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

export const spotifyApiRequest = async ({
  accessToken,
  path,
  query,
  method = "GET",
  body,
}: SpotifyRequestOptions) => {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (body) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
};

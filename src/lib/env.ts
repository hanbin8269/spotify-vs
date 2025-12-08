const missingVarError = (name: string) =>
  new Error(`환경 변수 ${name} 값이 설정되어 있지 않습니다.`);

export type SpotifyEnv = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export const getSpotifyEnv = (): SpotifyEnv => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw missingVarError("SPOTIFY_CLIENT_ID");
  }

  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientSecret) {
    throw missingVarError("SPOTIFY_CLIENT_SECRET");
  }

  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!redirectUri) {
    throw missingVarError("SPOTIFY_REDIRECT_URI");
  }

  return { clientId, clientSecret, redirectUri };
};

export const getSpotifyScopes = (): string[] => ["user-library-read"];

export const isProduction = (): boolean => process.env.NODE_ENV === "production";

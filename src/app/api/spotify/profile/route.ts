import { NextResponse } from "next/server";
import {
  clearSpotifyCookies,
  ensureAccessToken,
  spotifyApiRequest,
} from "@/lib/spotify";

type SpotifyProfile = {
  id: string;
  display_name: string;
  images?: { url: string }[];
  followers?: { total: number };
};

export async function GET() {
  const { accessToken } = await ensureAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const response = await spotifyApiRequest({
    accessToken,
    path: "/me",
  });

  if (response.status === 401) {
    await clearSpotifyCookies();
    return NextResponse.json(
      { message: "세션이 만료되었습니다." },
      { status: 401 },
    );
  }

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { message: "프로필을 불러오지 못했습니다.", detail },
      { status: 500 },
    );
  }

  const profile = (await response.json()) as SpotifyProfile;

  return NextResponse.json({
    profile: {
      id: profile.id,
      display_name: profile.display_name,
      follower_count: profile.followers?.total ?? 0,
      image_url: profile.images?.[0]?.url ?? null,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import {
  clearSpotifyCookies,
  ensureAccessToken,
  spotifyApiRequest,
} from "@/lib/spotify";
import type { TournamentTrack } from "@/types/tournament";

const ROUND_SIZES = [8, 16, 32, 64, 128];
const PAGE_LIMIT = 50;
const MAX_ATTEMPTS = 10;

const shuffleTracks = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

type SpotifySavedTrackResponse = {
  items: {
    track: {
      id: string;
      name: string;
      preview_url: string | null;
      external_urls: { spotify: string };
      album: { images: { url: string }[] };
      artists: { name: string }[];
    } | null;
  }[];
  total: number;
  next: string | null;
};

const toTournamentTrack = (
  item: SpotifySavedTrackResponse["items"][number],
): TournamentTrack | null => {
  if (!item.track || !item.track.id) {
    return null;
  }

  const artists = item.track.artists.map((artist) => artist.name).join(", ");
  const albumArt = item.track.album.images?.[0]?.url ?? "";

  return {
    id: item.track.id,
    name: item.track.name,
    artists,
    album_art_url: albumArt,
    preview_url: item.track.preview_url,
    external_url: item.track.external_urls.spotify,
  };
};

const fetchPage = async ({
  accessToken,
  offset,
  limit,
}: {
  accessToken: string;
  offset: number;
  limit: number;
}): Promise<SpotifySavedTrackResponse> => {
  const response = await spotifyApiRequest({
    accessToken,
    path: "/me/tracks",
    query: { limit, offset },
  });

  if (response.status === 401) {
    clearSpotifyCookies();
    throw new Error("unauthorized");
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Spotify API 오류: ${detail}`);
  }

  return (await response.json()) as SpotifySavedTrackResponse;
};

const collectTracks = async ({
  accessToken,
  desiredCount,
}: {
  accessToken: string;
  desiredCount: number;
}): Promise<TournamentTrack[]> => {
  const trackMap = new Map<string, TournamentTrack>();
  let total = 0;
  let hasMore = true;
  let offset = 0;
  let attempts = 0;

  while (trackMap.size < desiredCount && hasMore && attempts < MAX_ATTEMPTS) {
    const page = await fetchPage({
      accessToken,
      offset,
      limit: PAGE_LIMIT,
    });

    total = page.total;
    hasMore = Boolean(page.next);

    page.items.forEach((item) => {
      const parsed = toTournamentTrack(item);
      if (!parsed) {
        return;
      }
      trackMap.set(parsed.id, parsed);
    });

    if (!hasMore) {
      break;
    }

    offset = Math.min(
      Math.max(0, Math.floor(Math.random() * total)),
      Math.max(0, total - PAGE_LIMIT),
    );
    attempts += 1;
  }

  return Array.from(trackMap.values());
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requested = Number(searchParams.get("count") ?? 32);
  if (!ROUND_SIZES.includes(requested)) {
    return NextResponse.json(
      { message: "요청 가능한 라운드 수가 아닙니다." },
      { status: 400 },
    );
  }

  const { accessToken } = await ensureAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  try {
    const pool = await collectTracks({ accessToken, desiredCount: requested * 2 });
    if (pool.length === 0) {
      return NextResponse.json(
        { message: "좋아요 표시한 곡이 없습니다." },
        { status: 404 },
      );
    }

    const shuffled = shuffleTracks(pool).slice(0, requested);

    return NextResponse.json({ tracks: shuffled });
  } catch (error) {
    if ((error as Error).message === "unauthorized") {
      return NextResponse.json(
        { message: "세션이 만료되었습니다." },
        { status: 401 },
      );
    }

    console.error("liked-tracks error", error);
    return NextResponse.json(
      { message: "좋아요 곡을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

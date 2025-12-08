"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RoundSelector } from "@/components/round_selector";
import { TrackCard } from "@/components/track_card";
import type { TournamentTrack } from "@/types/tournament";

const ROUND_OPTIONS = [8, 16, 32, 64, 128];

type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | {
      status: "signedIn";
      profile: {
        display_name: string;
        follower_count: number;
        image_url: string | null;
      };
    };

type FetchState = "idle" | "loading" | "error";

type TournamentState = {
  currentRound: TournamentTrack[];
  nextRound: TournamentTrack[];
  champion: TournamentTrack | null;
  pairIndex: number;
};

const createTournamentState = (): TournamentState => ({
  currentRound: [],
  nextRound: [],
  champion: null,
  pairIndex: 0,
});

export default function HomePage() {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });
  const [selectedRound, setSelectedRound] = useState<number>(16);
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tournament, setTournament] = useState<TournamentState>(
    createTournamentState,
  );

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/spotify/profile", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("not authorized");
      }
      const payload = await response.json();
      setAuthState({ status: "signedIn", profile: payload.profile });
    } catch {
      setAuthState({ status: "signedOut" });
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError) {
      setErrorMessage("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
      params.delete("auth_error");
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      const query = params.toString();
      window.history.replaceState({}, "", query ? `${baseUrl}?${query}` : baseUrl);
    }
  }, []);

  const fetchBracket = useCallback(async () => {
    setFetchState("loading");
    setErrorMessage(null);
    setTournament(createTournamentState());

    try {
      const response = await fetch(
        `/api/spotify/liked-tracks?count=${selectedRound}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message ?? "곡 목록을 불러오지 못했습니다.");
      }

      const fetchedTracks = payload.tracks as TournamentTrack[];
      if (!Array.isArray(fetchedTracks) || fetchedTracks.length < 2) {
        throw new Error("토너먼트를 진행할 충분한 곡을 찾지 못했습니다.");
      }

      setTournament({
        currentRound: fetchedTracks,
        nextRound: [],
        champion: null,
        pairIndex: 0,
      });
      setFetchState("idle");
    } catch (error) {
      const message = (error as Error).message;
      setFetchState("error");
      setErrorMessage(message);
      if (message.includes("로그인") || message.includes("세션")) {
        loadProfile();
      }
    }
  }, [loadProfile, selectedRound]);

  const handleTrackSelect = useCallback(
    ({ track }: { track: TournamentTrack }) => {
      setTournament((prev) => {
        if (prev.champion) {
          return prev;
        }

        const updatedNextRound = [...prev.nextRound, track];
        const nextPairIndex = prev.pairIndex + 2;
        const reachedRoundEnd = nextPairIndex >= prev.currentRound.length;

        if (reachedRoundEnd) {
          if (updatedNextRound.length === 1) {
            return {
              currentRound: [],
              nextRound: [],
              champion: updatedNextRound[0],
              pairIndex: 0,
            };
          }

          return {
            currentRound: updatedNextRound,
            nextRound: [],
            champion: null,
            pairIndex: 0,
          };
        }

        return {
          ...prev,
          nextRound: updatedNextRound,
          pairIndex: nextPairIndex,
        };
      });
    },
    [],
  );

  const currentPair = useMemo(() => {
    if (tournament.currentRound.length === 0) {
      return [] as TournamentTrack[];
    }
    const left = tournament.currentRound[tournament.pairIndex];
    const right = tournament.currentRound[tournament.pairIndex + 1];
    return [left, right].filter(Boolean) as TournamentTrack[];
  }, [tournament.currentRound, tournament.pairIndex]);

  const progressLabel = useMemo(() => {
    if (tournament.champion) {
      return "최종 우승";
    }
    if (tournament.currentRound.length === 0) {
      return `${selectedRound}강 대기 중`;
    }
    const roundLabel = `${tournament.currentRound.length}강`;
    const matchNumber = Math.floor(tournament.pairIndex / 2) + 1;
    const totalMatches = tournament.currentRound.length / 2;
    return `${roundLabel} • ${matchNumber}/${totalMatches} 매치`;
  }, [
    selectedRound,
    tournament.champion,
    tournament.currentRound.length,
    tournament.pairIndex,
  ]);

  const handleLogin = () => {
    window.location.href = "/api/auth/login";
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthState({ status: "signedOut" });
    setTournament(createTournamentState());
  };

  const shouldShowBracket =
    tournament.champion !== null || tournament.currentRound.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-emerald-950 to-black text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-emerald-300/70">
                Spotify Liked Songs World Cup
              </p>
              <h1 className="text-3xl font-extrabold text-white md:text-4xl">
                나만의 최애 곡을 월드컵으로 뽑아보세요
              </h1>
            </div>
            <div className="flex flex-col items-end gap-2">
              {authState.status === "signedIn" && (
                <div className="text-right text-sm text-emerald-100/80">
                  <p className="font-semibold">{authState.profile.display_name}</p>
                  <p className="text-xs text-emerald-200/70">
                    플레이리스트 준비 완료
                  </p>
                </div>
              )}
              {authState.status === "signedIn" ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-white transition hover:border-emerald-300"
                >
                  로그아웃
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLogin}
                  className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
                >
                  Spotify 로그인
                </button>
              )}
            </div>
          </div>

          <p className="text-emerald-100/80">
            좋아요 표시한 곡을 무작위로 불러와 토너먼트 방식으로 최애 곡을 선택합니다.
            모바일에서도 손쉽게 플레이할 수 있도록 구성했습니다.
          </p>

          {authState.status === "signedIn" && (
            <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-black/30 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-emerald-200/70">진행 라운드</p>
                  <p className="text-2xl font-bold text-white">{progressLabel}</p>
                </div>
                <button
                  type="button"
                  className="rounded-full bg-emerald-500/80 px-6 py-3 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-900/50"
                  onClick={fetchBracket}
                  disabled={fetchState === "loading"}
                >
                  {fetchState === "loading" ? "불러오는 중..." : "랜덤 매치 생성"}
                </button>
              </div>

              <RoundSelector
                options={ROUND_OPTIONS}
                value={selectedRound}
                disabled={fetchState === "loading" || tournament.currentRound.length > 0}
                onChange={({ value }) => setSelectedRound(value)}
              />
            </div>
          )}
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">
            {errorMessage}
          </div>
        )}

        {authState.status === "loading" && (
          <div className="flex h-40 items-center justify-center text-emerald-100">
            로그인 상태 확인 중...
          </div>
        )}

        {authState.status === "signedOut" && (
          <section className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-black/30 p-8 text-center">
            <p className="text-lg text-emerald-100/80">
              Spotify 계정 연결 후 좋아요 표시한 곡으로 월드컵을 시작해보세요!
            </p>
            <button
              type="button"
              onClick={handleLogin}
              className="rounded-full bg-emerald-500 px-8 py-3 text-base font-semibold text-black transition hover:bg-emerald-400"
            >
              로그인하고 시작하기
            </button>
          </section>
        )}

        {authState.status === "signedIn" && !shouldShowBracket && fetchState !== "loading" && (
          <section className="rounded-3xl border border-white/5 bg-black/20 p-8 text-center text-emerald-100/80">
            <p>
              라운드를 선택한 뒤 랜덤 매치를 생성하면 토너먼트가 바로 시작됩니다.
            </p>
          </section>
        )}

        {authState.status === "signedIn" && shouldShowBracket && (
          <section className="flex flex-col gap-6">
            {tournament.champion ? (
              <div className="flex flex-col items-center gap-4 rounded-3xl border border-emerald-400/50 bg-gradient-to-br from-emerald-900/60 to-black p-8 text-center">
                <p className="text-sm uppercase tracking-[0.4em] text-emerald-200">
                  Champion
                </p>
                <h2 className="text-4xl font-extrabold text-white">
                  {tournament.champion.name}
                </h2>
                <p className="text-lg text-emerald-100/80">
                  {tournament.champion.artists}
                </p>
                <button
                  type="button"
                  className="rounded-full border border-emerald-300/70 px-6 py-3 text-sm font-semibold text-emerald-50 transition hover:border-white"
                  onClick={fetchBracket}
                >
                  다시 추첨하기
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {currentPair.map((track, index) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    side={index === 0 ? "left" : "right"}
                    disabled={fetchState === "loading"}
                    onSelect={handleTrackSelect}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

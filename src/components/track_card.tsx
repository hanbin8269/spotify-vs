import Image from "next/image";
import type { TournamentTrack } from "@/types/tournament";

type TrackCardProps = {
  track: TournamentTrack;
  side: "left" | "right";
  disabled?: boolean;
  onSelect: (params: { track: TournamentTrack }) => void;
};

export const TrackCard = ({ track, side, disabled, onSelect }: TrackCardProps) => {
  const handleSelect = () => {
    if (disabled) {
      return;
    }
    onSelect({ track });
  };

  return (
    <article
      className={`flex w-full max-w-xl flex-col gap-4 rounded-3xl border border-emerald-500/30 bg-black/40 p-6 text-white shadow-[0_10px_40px_rgba(0,0,0,0.45)] transition hover:border-emerald-400/80 ${side === "left" ? "md:items-start" : "md:items-end"}`}
    >
      <div className="flex items-center gap-4">
        <div className="size-20 overflow-hidden rounded-2xl border border-emerald-500/40 bg-emerald-900/10">
          {track.album_art_url ? (
            <Image
              src={track.album_art_url}
              alt={`${track.name} cover art`}
              width={80}
              height={80}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-emerald-200/70">
              없음
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-sm uppercase tracking-[0.3em] text-emerald-300/70">
            {side === "left" ? "Player A" : "Player B"}
          </span>
          <h3 className="text-2xl font-semibold text-emerald-50">{track.name}</h3>
          <p className="text-sm text-emerald-100/80">{track.artists}</p>
        </div>
      </div>

      {track.preview_url && (
        <audio
          controls
          className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-900/40 p-2"
        >
          <source src={track.preview_url} />
        </audio>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSelect}
          disabled={disabled}
          className="flex-1 rounded-full bg-emerald-500/90 px-4 py-3 text-center text-sm font-semibold uppercase tracking-wide text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-900/50"
        >
          이 곡 선택
        </button>
        <a
          href={track.external_url}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center rounded-full border border-white/30 px-4 py-3 text-center text-sm font-medium text-white transition hover:border-emerald-300 hover:text-emerald-200"
        >
          Spotify 열기 ↗
        </a>
      </div>
    </article>
  );
};

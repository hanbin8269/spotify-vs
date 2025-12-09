type RoundSelectorProps = {
  options: number[];
  value: number;
  disabled?: boolean;
  onChange: (params: { value: number }) => void;
};

export const RoundSelector = ({ options, value, disabled, onChange }: RoundSelectorProps) => {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            value === option
              ? "border-emerald-400 bg-emerald-500/20 text-white"
              : "border-white/30 text-emerald-100 hover:border-emerald-300"
          } disabled:cursor-not-allowed disabled:opacity-60`}
          onClick={() => onChange({ value: option })}
        >
          {option}강
        </button>
      ))}
    </div>
  );
};

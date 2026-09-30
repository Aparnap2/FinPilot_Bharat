"use client";

export default function Keypad({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const press = (d: string) => {
    if (d === "C") { onChange(""); return; }
    if (d === "⌫") { onChange(value.slice(0, -1)); return; }
    if (value.replace(/\D/g, "").length >= 7) return;
    onChange(value === "0" ? d : value + d);
  };
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"];
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Amount keypad">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => press(k)}
          aria-label={k === "⌫" ? "Backspace" : k === "C" ? "Clear" : `Digit ${k}`}
          className="min-h-[56px] rounded-2xl bg-zinc-100 text-2xl font-extrabold text-zinc-900 transition active:scale-95 active:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:active:bg-zinc-700"
        >
          {k}
        </button>
      ))}
    </div>
  );
}

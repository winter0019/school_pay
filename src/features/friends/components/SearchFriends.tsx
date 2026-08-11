"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchFriends({
  value,
  onChange,
}: Props) {
  return (
    <input
      type="text"
      placeholder="Search friends..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
    />
  );
}
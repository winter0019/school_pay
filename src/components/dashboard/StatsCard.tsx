"use client";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  progress?: number;
}

export default function StatsCard({
  title,
  value,
  subtitle,
  progress,
}: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg transition hover:border-blue-500">
      <h3 className="text-sm font-medium text-slate-400">
        {title}
      </h3>

      <p className="mt-3 text-4xl font-bold text-white">
        {value}
      </p>

      {subtitle && (
        <p className="mt-2 text-sm text-slate-400">
          {subtitle}
        </p>
      )}

      {progress !== undefined && (
        <div className="mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>{progress}% Complete</span>
            <span>100%</span>
          </div>
        </div>
      )}
    </div>
  );
}
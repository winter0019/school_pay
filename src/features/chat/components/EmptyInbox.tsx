import Link from "next/link";

export default function EmptyInbox() {
  return (
    <div className="rounded-3xl border border-dashed bg-white p-12 text-center">
      <div className="text-6xl">💬</div>

      <h2 className="mt-5 text-2xl font-bold">
        No conversations yet
      </h2>

      <p className="mt-3 text-slate-500">
        Connect with people and start your first conversation.
      </p>

      <Link
        href="/discover"
        className="mt-6 inline-flex rounded-xl bg-indigo-600 px-6 py-3 text-white"
      >
        Discover People
      </Link>
    </div>
  );
}
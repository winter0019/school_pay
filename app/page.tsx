import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="text-center max-w-2xl px-6">
        <h1 className="text-6xl font-bold mb-6">ConversationOS</h1>

        <p className="text-xl text-slate-300 mb-8">
          Meet people who truly understand you through AI-powered voice
          conversations.
        </p>

        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-8 py-4 font-semibold hover:bg-blue-700"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}

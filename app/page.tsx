export default function LandingPage() {
  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-950 text-slate-100 px-6 py-12 text-center overflow-x-hidden">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          ConversationOS
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-md mx-auto">
          Meet people who truly understand you through AI-powered voice conversations.
        </p>
        <div>
          <a
            href="/dashboard"
            className="inline-block w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition"
          >
            Get Started
          </a>
        </div>
      </div>
    </main>
  );
}
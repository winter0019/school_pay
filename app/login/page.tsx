"use client";

import LoginButton from "@/features/auth/LoginButton";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-3xl font-bold text-center">ConversationOS</h1>

        <p className="mb-6 text-center text-gray-600">
          AI-powered voice conversations
        </p>

        <LoginButton />
      </div>
    </main>
  );
}

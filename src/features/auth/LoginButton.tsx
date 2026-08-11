"use client";

import { signInGoogle } from "@/firebase/auth";

export default function LoginButton() {
  const login = async () => {
    console.log("🚀 Login button clicked");

    try {
      const result = await signInGoogle();

      console.log("✅ Login successful");
      console.log(result.user);

      if (!result.onboardingCompleted) {
        console.log("📝 User needs onboarding");
        window.location.href = "/onboarding";
      } else {
        console.log("✅ Onboarding completed");
        window.location.href = "/dashboard";
      }
    } catch (error: unknown) {
      console.error("🔥 Firebase Error:", error);

      if (error instanceof Error) {
        alert(`Firebase Error\n\n${error.message}`);
      } else {
        alert("An unknown error occurred.");
      }
    }
  };

  return (
    <button
      onClick={login}
      className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
    >
      Continue with Google
    </button>
  );
}
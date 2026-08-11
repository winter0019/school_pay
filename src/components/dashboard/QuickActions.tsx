"use client";

import { useRouter } from "next/navigation";
import {
  Mic,
  Search,
  User,
  BrainCircuit,
} from "lucide-react";

const actions = [
  {
    title: "Start Conversation",
    description: "Talk with people instantly",
    icon: Mic,
    color: "bg-blue-600",
    href: "/conversations",
  },
  {
    title: "Discover People",
    description: "Find new connections",
    icon: Search,
    color: "bg-purple-600",
    href: "/discover",
  },
  {
    title: "AI Match",
    description: "Get personalized recommendations",
    icon: BrainCircuit,
    color: "bg-emerald-600",
    href: "/match",
  },
  {
    title: "Edit Profile",
    description: "Update your information",
    icon: User,
    color: "bg-orange-600",
    href: "/profile",
  },
];

export default function QuickActions() {
  const router = useRouter();

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="mb-6 text-xl font-bold">
        Quick Actions
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.title}
              onClick={() => router.push(action.href)}
              className="rounded-2xl border border-slate-700 bg-slate-950 p-5 text-left transition duration-200 hover:-translate-y-1 hover:border-blue-500 hover:shadow-lg"
            >
              <div
                className={`mb-4 inline-flex rounded-xl p-3 ${action.color}`}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>

              <h3 className="font-semibold">
                {action.title}
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                {action.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
"use client";

import RequestCard from "./components/RequestCard";
import useNotifications from "./hooks/useNotifications";

export default function NotificationPage() {
  const { requests } = useNotifications();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Notifications
        </h1>

        <p className="text-slate-500">
          Friend requests and activity.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-slate-500">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
            />
          ))}
        </div>
      )}
    </div>
  );
}
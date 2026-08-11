"use client";

import { useEffect, useRef, useState } from "react";

import {
  Mic,
  Paperclip,
  SendHorizonal,
  Smile,
} from "lucide-react";

interface Props {
  sending: boolean;
  onSend: (text: string) => Promise<void>;
  onTyping: (typing: boolean) => void;
}

export default function MessageComposer({
  sending,
  onSend,
  onTyping,
}: Props) {
  const [text, setText] = useState("");

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  // Auto resize
  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "0px";

    textarea.style.height =
      textarea.scrollHeight + "px";
  }, [text]);

  async function submit() {
    const value = text.trim();

    if (!value) return;

    await onSend(value);

    setText("");

    onTyping(false);

    textareaRef.current?.focus();
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      submit();
    }
  }

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3">
      <div className="flex items-end gap-3">

        {/* Emoji */}

        <button
          className="rounded-full p-2 transition hover:bg-slate-100"
          type="button"
        >
          <Smile className="h-6 w-6 text-slate-500" />
        </button>

        {/* Attachment */}

        <button
          className="rounded-full p-2 transition hover:bg-slate-100"
          type="button"
        >
          <Paperclip className="h-6 w-6 text-slate-500" />
        </button>

        {/* Text */}

        <div className="flex-1 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2">

          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            disabled={sending}
            placeholder="Type a message..."

            onChange={(e) => {
              setText(e.target.value);

              onTyping(
                e.target.value.trim().length > 0
              );
            }}

            onKeyDown={handleKeyDown}

            className="max-h-40 w-full resize-none overflow-y-auto bg-transparent outline-none"
          />

        </div>

        {/* Send / Mic */}

        {text.trim() ? (
          <button
            onClick={submit}
            disabled={sending}
            className="rounded-full bg-indigo-600 p-3 text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            <SendHorizonal className="h-5 w-5" />
          </button>
        ) : (
          <button
            className="rounded-full bg-slate-200 p-3 transition hover:bg-slate-300"
            type="button"
          >
            <Mic className="h-5 w-5" />
          </button>
        )}

      </div>
    </div>
  );
}
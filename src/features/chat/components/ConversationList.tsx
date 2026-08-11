import ConversationCard from "./ConversationCard";
import type { ConversationPreview } from "../types";

interface Props {
  conversations: ConversationPreview[];
}

export default function ConversationList({
  conversations,
}: Props) {
  return (
    <div className="space-y-3">
      {conversations.map((conversation) => (
        <ConversationCard
          key={conversation.id}
          conversation={conversation}
        />
      ))}
    </div>
  );
}
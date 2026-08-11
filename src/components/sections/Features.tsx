import Card from "../ui/Card";

export default function Features() {
  return (
    <section className="grid gap-8 md:grid-cols-3 px-10 py-20">
      <Card
        icon="🎤"
        title="AI Matching"
        description="Find compatible people instantly."
      />

      <Card
        icon="🌍"
        title="Global Community"
        description="Talk with people around the world."
      />

      <Card
        icon="🤖"
        title="AI Moderator"
        description="Safe, respectful and productive conversations."
      />
    </section>
  );
}

import { Button } from "../ui/Button";

export default function Hero() {
  return (
    <section className="text-center py-24">
      <h1 className="text-6xl font-extrabold">
        Meet People
        <br />
        Who Truly Understand You
      </h1>

      <p className="mx-auto mt-8 max-w-2xl text-xl text-slate-400">
        AI connects you with people sharing your experiences and interests for
        meaningful live voice conversations.
      </p>

      <div className="mt-10 flex justify-center gap-4">
        <Button>Start Talking</Button>

        <Button variant="secondary">Watch Demo</Button>
      </div>
    </section>
  );
}

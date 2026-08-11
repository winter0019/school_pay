interface CardProps {
  title: string;
  icon: string;
  description: string;
}

export default function Card({ title, icon, description }: CardProps) {
  return (
    <div className="rounded-2xl bg-slate-900 p-8 hover:scale-105 transition">
      <h2 className="text-2xl font-bold mb-3">
        {icon} {title}
      </h2>

      <p className="text-slate-400">{description}</p>
    </div>
  );
}

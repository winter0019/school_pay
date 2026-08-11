interface AvatarProps {
  name: string;
  photoURL?: string;
}

export function Avatar({
  name,
  photoURL,
}: AvatarProps) {
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name}
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
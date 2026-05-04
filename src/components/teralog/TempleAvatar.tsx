type Props = {
  name: string;
  size?: "sm" | "md" | "lg";
  imageUrl?: string;
};

const SIZE_PX = { sm: 40, md: 56, lg: 64 } as const;

export default function TempleAvatar({ name, size = "md", imageUrl }: Props) {
  const px = SIZE_PX[size];
  const initial = name.charAt(0);
  const fontSize = Math.round(px * 0.38);

  return (
    <div
      style={{ width: px, height: px, fontSize }}
      className="rounded-full bg-paper-soft overflow-hidden shrink-0 flex items-center justify-center"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-serif text-ink-secondary font-light">{initial}</span>
      )}
    </div>
  );
}

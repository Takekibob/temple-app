type Props = {
  height?: number;
};

export default function MountainHero({ height = 220 }: Props) {
  const w = 380;
  const h = height;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 空 */}
      <rect width={w} height={h} fill="#F5F5F2" />

      {/* 月 */}
      <circle cx={320} cy={52} r={20} fill="#E5E5E5" />

      {/* 遠山 (淡い) */}
      <path
        d={`M0 ${h} L0 ${h * 0.72} L55 ${h * 0.42} L100 ${h * 0.58} L155 ${h * 0.3} L200 ${h * 0.5} L255 ${h * 0.22} L310 ${h * 0.48} L355 ${h * 0.35} L${w} ${h * 0.45} L${w} ${h} Z`}
        fill="#DDDBD6"
      />

      {/* 近山 (濃い) */}
      <path
        d={`M0 ${h} L0 ${h * 0.88} L45 ${h * 0.68} L90 ${h * 0.75} L130 ${h * 0.58} L175 ${h * 0.7} L215 ${h * 0.52} L260 ${h * 0.65} L295 ${h * 0.5} L340 ${h * 0.62} L${w} ${h * 0.55} L${w} ${h} Z`}
        fill="#C8C5BE"
      />
    </svg>
  );
}

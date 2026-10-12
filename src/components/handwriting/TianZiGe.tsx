/** 田字格: square with a cross and diagonals as writing guides. */
export default function TianZiGe() {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-border" aria-hidden="true">
      <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke="currentColor" />
      <g stroke="currentColor" strokeDasharray="3 3" strokeWidth="0.6">
        <line x1="50" y1="0" x2="50" y2="100" />
        <line x1="0" y1="50" x2="100" y2="50" />
        <line x1="0" y1="0" x2="100" y2="100" />
        <line x1="100" y1="0" x2="0" y2="100" />
      </g>
    </svg>
  );
}

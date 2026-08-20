export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#1e1e1e" />
      <rect x="16" y="12" width="28" height="40" rx="3" fill="#f5f5f5" />
      <rect x="16" y="12" width="28" height="8" rx="3" fill="#2e8b57" />
      <line x1="21" y1="27" x2="39" y2="27" stroke="#8a8a8a" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="21" y1="33" x2="39" y2="33" stroke="#8a8a8a" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="21" y1="39" x2="33" y2="39" stroke="#8a8a8a" strokeWidth="2.4" strokeLinecap="round" />
      <text x="39" y="53" fill="#4caf7d" fontFamily="Consolas, monospace" fontWeight="700" fontSize="26">
        ++
      </text>
    </svg>
  );
}

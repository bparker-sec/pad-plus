/** In-app brand mark, matching the favicon / PWA icon (flat variant so it stays
 * crisp at small sizes and avoids gradient/filter id collisions in the DOM). */
export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden="true">
      <rect x="2" y="2" width="76" height="76" rx="19" fill="#2e8b57" />
      <rect x="17" y="15" width="35" height="50" rx="5.5" fill="#ffffff" />
      <path d="M17 20.5 a5.5 5.5 0 0 1 5.5 -5.5 H52 v9 H17 Z" fill="#2e8b57" />
      <g fill="#cdd6d1">
        <rect x="23" y="33" width="23" height="3" rx="1.5" />
        <rect x="23" y="41" width="23" height="3" rx="1.5" />
        <rect x="23" y="49" width="15" height="3" rx="1.5" />
      </g>
      <g transform="rotate(45 54 46)">
        <rect x="49.5" y="26" width="9" height="30" rx="2.2" fill="#f5b02e" />
        <rect x="49.5" y="26" width="9" height="6" rx="2.2" fill="#e07b39" />
        <polygon points="49.5,56 58.5,56 54,66" fill="#f6f0e2" />
        <polygon points="52,62 56,62 54,66" fill="#333333" />
      </g>
    </svg>
  );
}

/** コインの面の図柄。表は金の太陽、裏は銀の月 */
export default function CoinFace({side}: {side: '表' | '裏'}) {
  return side === '表' ? <Sun /> : <Moon />;
}

const RAYS = Array.from({length: 12}, (_, i) => i * 30);

function Sun() {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label="表（太陽）" className="coin-svg">
      <defs>
        <radialGradient id="coin-gold" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff6c2" />
          <stop offset=".5" stopColor="#e6b422" />
          <stop offset="1" stopColor="#8a6400" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill="url(#coin-gold)" />
      <circle cx="100" cy="100" r="86" fill="none" stroke="#7a5600" strokeWidth="3" opacity=".55" />
      <circle cx="100" cy="100" r="80" fill="none" stroke="#fff3b0" strokeWidth="1.5" strokeDasharray="2 5" opacity=".7" />
      <g fill="#7a5600" opacity=".85">
        <circle cx="100" cy="100" r="24" />
        {RAYS.map(deg => (
          <path key={deg} d="M100 46 L106 66 L94 66 Z" transform={`rotate(${deg} 100 100)`} />
        ))}
      </g>
      <circle cx="100" cy="100" r="16" fill="#f3cf4a" />
    </svg>
  );
}

function Moon() {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label="裏（月）" className="coin-svg">
      <defs>
        <radialGradient id="coin-silver" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".5" stopColor="#b8c0cc" />
          <stop offset="1" stopColor="#5d6573" />
        </radialGradient>
        <mask id="coin-moon-cut">
          <rect width="200" height="200" fill="#fff" />
          <circle cx="118" cy="88" r="40" fill="#000" />
        </mask>
      </defs>
      <circle cx="100" cy="100" r="98" fill="url(#coin-silver)" />
      <circle cx="100" cy="100" r="86" fill="none" stroke="#454c58" strokeWidth="3" opacity=".55" />
      <circle cx="100" cy="100" r="80" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="2 5" opacity=".7" />
      <circle cx="96" cy="102" r="44" fill="#3b4250" opacity=".85" mask="url(#coin-moon-cut)" />
      <g fill="#3b4250" opacity=".85">
        <path d="M138 56 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" />
        <path d="M146 118 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
      </g>
    </svg>
  );
}

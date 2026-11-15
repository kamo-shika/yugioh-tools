// 公式DB・まとめ記事のHTMLに出てくる文字参照を文字に戻す（ギリシャ文字・記号など）
export const ENTITIES = {"alpha": "α", "Alpha": "Α", "beta": "β", "Beta": "Β", "gamma": "γ", "Gamma": "Γ", "delta": "δ", "Delta": "Δ", "epsilon": "ε", "Epsilon": "Ε", "zeta": "ζ", "Zeta": "Ζ", "eta": "η", "Eta": "Η", "theta": "θ", "Theta": "Θ", "iota": "ι", "Iota": "Ι", "kappa": "κ", "Kappa": "Κ", "lambda": "λ", "Lambda": "Λ", "mu": "μ", "Mu": "Μ", "nu": "ν", "Nu": "Ν", "xi": "ξ", "Xi": "Ξ", "omicron": "ο", "Omicron": "Ο", "pi": "π", "Pi": "Π", "rho": "ρ", "Rho": "Ρ", "sigma": "σ", "Sigma": "Σ", "tau": "τ", "Tau": "Τ", "upsilon": "υ", "Upsilon": "Υ", "phi": "φ", "Phi": "Φ", "chi": "χ", "Chi": "Χ", "psi": "ψ", "Psi": "Ψ", "omega": "ω", "Omega": "Ω", "forall": "∀", "ldquo": "“", "rdquo": "”", "lsquo": "‘", "rsquo": "’", "hellip": "…", "middot": "·", "times": "×", "star": "☆", "hearts": "♥", "spades": "♠", "clubs": "♣", "diams": "♦", "infin": "∞", "nbsp": " ", "rArr": "⇒", "rarr": "→", "larr": "←", "harr": "↔", "deg": "°", "plusmn": "±", "sup2": "²", "frac12": "½", "laquo": "«", "raquo": "»", "bull": "•", "dagger": "†", "sim": "∼"};

export function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|#39);/g, (_, n) => ({amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'"})[n])
    .replace(/&([a-zA-Z0-9]+);/g, (m, n) => (n in ENTITIES ? ENTITIES[n] : m));
}

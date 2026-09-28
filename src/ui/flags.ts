// Country flag emoji for a national team, keyed on its 3-letter abbreviation
// (verified against the live FIFA World Cup feed — note ESPN uses MAR for
// Morocco). Bracket placeholders (1A, QFW1, RD16 W1, …) have no flag.

// ESPN abbreviation → ISO 3166-1 alpha-2.
const ISO2: Record<string, string> = {
  ALG: 'DZ', ARG: 'AR', AUS: 'AU', AUT: 'AT', BEL: 'BE', BIH: 'BA', BRA: 'BR',
  CAN: 'CA', CIV: 'CI', COD: 'CD', COL: 'CO', CPV: 'CV', CRO: 'HR', CUW: 'CW',
  CZE: 'CZ', ECU: 'EC', EGY: 'EG', ESP: 'ES', FRA: 'FR', GER: 'DE', GHA: 'GH',
  HAI: 'HT', IRN: 'IR', IRQ: 'IQ', JOR: 'JO', JPN: 'JP', KOR: 'KR', KSA: 'SA',
  MAR: 'MA', MEX: 'MX', NED: 'NL', NOR: 'NO', NZL: 'NZ', PAN: 'PA', PAR: 'PY',
  POR: 'PT', QAT: 'QA', RSA: 'ZA', SEN: 'SN', SUI: 'CH', SWE: 'SE', TUN: 'TN',
  TUR: 'TR', URU: 'UY', USA: 'US', UZB: 'UZ',
};

// Home nations have no ISO2 flag — use the subdivision tag sequence.
const SUBDIVISION: Record<string, string> = {
  ENG: 'gbeng', SCO: 'gbsct', WAL: 'gbwls',
};

function regionalIndicator(iso2: string): string {
  return String.fromCodePoint(...[...iso2].map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65)));
}

function subdivisionFlag(sub: string): string {
  return String.fromCodePoint(0x1f3f4, ...[...sub].map((c) => 0xe0000 + c.charCodeAt(0)), 0xe007f);
}

/** Flag emoji for a team code, or '' if unknown (e.g. bracket placeholders). */
export function flagFor(code: string): string {
  const iso2 = ISO2[code];
  if (iso2) return regionalIndicator(iso2);
  const sub = SUBDIVISION[code];
  if (sub) return subdivisionFlag(sub);
  return '';
}

/**
 * Home side: "QAT 🇶🇦" (flag trails the code), or just the code if unmapped.
 * Clubs (`national === false`) never get a flag: their codes collide with
 * countries (PAN is Panetolikos, not Panama).
 */
export function homeTag(code: string, national: boolean = true): string {
  const f = national ? flagFor(code) : '';
  return f ? `${code} ${f}` : code;
}

/** Away side: "🇨🇭 SUI" (flag leads the code), or just the code if unmapped. Clubs get no flag. */
export function awayTag(code: string, national: boolean = true): string {
  const f = national ? flagFor(code) : '';
  return f ? `${f} ${code}` : code;
}

/** Home side by full name, for the roomy views: "Qatar 🇶🇦", or "Arsenal" for a club. */
export function homeName(t: { name: string; code: string; national?: boolean }): string {
  const f = t.national !== false ? flagFor(t.code) : '';
  return f ? `${t.name} ${f}` : t.name;
}

/** Away side by full name: "🇨🇭 Switzerland", or "Liverpool" for a club. */
export function awayName(t: { name: string; code: string; national?: boolean }): string {
  const f = t.national !== false ? flagFor(t.code) : '';
  return f ? `${f} ${t.name}` : t.name;
}

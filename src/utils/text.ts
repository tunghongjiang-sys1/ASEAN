// Title-cases a string: the first letter of every word is capitalized, the
// rest of each word is lowercased. Tokens that are already fully uppercase
// (airport codes, currency codes, abbreviations) are kept as-is, and URLs,
// emails and ISO dates are left untouched.
const URL_RE = /https?:\/\/[^\s]+/gi;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const ISO_DATE_RE = /\d{4}-\d{2}-\d{2}([T ][0-9:]+(Z|[+-]\d{2}:?\d{2})?)?/g;

function capWord(w: string): string {
  if (!w) return w;
  if (/^\d+$/.test(w)) return w;
  // Preserve tokens that are already fully uppercase (e.g. SIN, KHR, US).
  if (/^[A-Z0-9][A-Z0-9'’]*$/.test(w) && w.length > 1) return w;
  return w[0].toUpperCase() + w.slice(1).toLowerCase();
}

export function titleCase(text: string): string {
  if (!text) return text;
  const protectedTokens: string[] = [];
  // Mask URLs, emails and ISO dates so their internals are never re-cased.
  const masked = text
    .replace(URL_RE, (m) => {
      protectedTokens.push(m);
      return `\u0000${protectedTokens.length - 1}\u0000`;
    })
    .replace(EMAIL_RE, (m) => {
      protectedTokens.push(m);
      return `\u0000${protectedTokens.length - 1}\u0000`;
    })
    .replace(ISO_DATE_RE, (m) => {
      protectedTokens.push(m);
      return `\u0000${protectedTokens.length - 1}\u0000`;
    });

  const cased = masked.replace(
    /[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g,
    (w) => capWord(w)
  );

  return cased.replace(/\u0000(\d+)\u0000/g, (_, idx: string) => {
    const n = Number(idx);
    return n >= 0 && n < protectedTokens.length ? protectedTokens[n] : '';
  });
}
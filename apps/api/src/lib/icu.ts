// Lightweight ICU sanity check: balanced braces. Full MessageFormat parsing is
// deferred — Tolgee performs authoritative validation on write; this only
// catches obviously malformed input before we spend a Tolgee API call.
export function validateIcu(text: string): { ok: true } | { ok: false; error: string } {
  let depth = 0
  for (const ch of text) {
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth < 0) return { ok: false, error: 'unexpected }' }
    }
  }
  if (depth !== 0) return { ok: false, error: 'unbalanced braces' }
  return { ok: true }
}

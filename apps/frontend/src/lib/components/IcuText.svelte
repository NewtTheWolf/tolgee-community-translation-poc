<script lang="ts">
  let { text = '' }: { text?: string } = $props()

  type Token = { cls: string; value: string }

  const FORMAT_KEYWORDS = new Set([
    'plural',
    'select',
    'selectordinal',
    'number',
    'date',
    'time',
    'spellout',
    'ordinal',
  ])
  const PLURAL_CATEGORIES = new Set(['zero', 'one', 'two', 'few', 'many', 'other'])

  // Dependency-free scan tokenizer. Best-effort: highlights ICU/MessageFormat
  // structure without a full parser. Never throws — on any anomaly it falls
  // back to emitting the remaining input as plain text.
  function tokenize(input: string): Token[] {
    const out: Token[] = []
    let i = 0
    const n = input.length
    let buf = ''
    const flush = () => {
      if (buf) {
        out.push({ cls: 'icu-text', value: buf })
        buf = ''
      }
    }

    while (i < n) {
      const ch = input[i]

      if (ch === '#') {
        flush()
        out.push({ cls: 'icu-hash', value: '#' })
        i++
        continue
      }

      if (ch === '{' || ch === '}') {
        flush()
        out.push({ cls: 'icu-brace', value: ch })
        i++
        if (ch !== '{') continue

        // After an opening brace, the first identifier is the argument name.
        let j = i
        while (j < n && /\s/.test(input[j])) j++
        const startName = j
        while (j < n && /[A-Za-z0-9_.-]/.test(input[j])) j++
        if (j > startName) {
          if (j > i) out.push({ cls: 'icu-text', value: input.slice(i, startName) })
          out.push({ cls: 'icu-arg', value: input.slice(startName, j) })
          i = j
        }
        continue
      }

      // Identifier run — classify as keyword / plural category / =N selector.
      if (/[A-Za-z=]/.test(ch)) {
        let j = i
        if (ch === '=') {
          j++
          while (j < n && /[0-9]/.test(input[j])) j++
          if (j > i + 1) {
            flush()
            out.push({ cls: 'icu-category', value: input.slice(i, j) })
            i = j
            continue
          }
        } else {
          while (j < n && /[A-Za-z0-9_]/.test(input[j])) j++
          const word = input.slice(i, j)
          if (FORMAT_KEYWORDS.has(word)) {
            flush()
            out.push({ cls: 'icu-keyword', value: word })
            i = j
            continue
          }
          if (PLURAL_CATEGORIES.has(word)) {
            flush()
            out.push({ cls: 'icu-category', value: word })
            i = j
            continue
          }
          buf += word
          i = j
          continue
        }
      }

      buf += ch
      i++
    }
    flush()
    return out
  }

  function safeTokens(input: unknown): Token[] {
    if (typeof input !== 'string' || input.length === 0) return []
    try {
      return tokenize(input)
    } catch {
      return [{ cls: 'icu-text', value: String(input) }]
    }
  }

  const tokens = $derived(safeTokens(text))
</script>

<span class="icu"
  >{#each tokens as tok}<span class={tok.cls}>{tok.value}</span>{/each}</span
>

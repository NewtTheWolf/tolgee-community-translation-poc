<script lang="ts">
  export interface Suggestion {
    id: number
    keyId: number
    translation?: string
    state?: string
    attribution?: {
      author?: { login: string }
      anon?: boolean
      status?: string
    } | null
  }

  let {
    suggestion,
    onaccept,
    ondecline,
  }: {
    suggestion: Suggestion
    onaccept: (id: number) => void
    ondecline: (id: number) => void
  } = $props()

  const authorLabel = $derived(
    suggestion.attribution?.author?.login
      ? suggestion.attribution.author.login
      : suggestion.attribution?.anon
        ? 'anonymous'
        : 'unknown',
  )
</script>

<div class="card">
  <div class="meta">
    <span class="key-id">Key #{suggestion.keyId}</span>
    <span class="author">by {authorLabel}</span>
    {#if suggestion.state}<span class="state">{suggestion.state}</span>{/if}
  </div>
  <p class="translation">{suggestion.translation ?? '—'}</p>
  <div class="actions">
    <button class="accept" onclick={() => onaccept(suggestion.id)}>Accept</button>
    <button class="decline" onclick={() => ondecline(suggestion.id)}>Decline</button>
  </div>
</div>

<style>
  .card {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: white;
  }
  .meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.8rem;
    color: #6b7280;
    flex-wrap: wrap;
  }
  .key-id {
    font-family: monospace;
  }
  .state {
    padding: 0.1rem 0.4rem;
    background: #f3f4f6;
    border-radius: 3px;
  }
  .translation {
    margin: 0;
    font-size: 0.95rem;
    color: #111827;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
  }
  .accept {
    padding: 0.3rem 0.75rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .accept:hover {
    background: #059669;
  }
  .decline {
    padding: 0.3rem 0.75rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .decline:hover {
    background: #dc2626;
  }
</style>

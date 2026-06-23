<script lang="ts">
  import IcuText from './IcuText.svelte'
  import StateBadge from './StateBadge.svelte'

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
    onaccept: (id: number) => void | Promise<void>
    ondecline: (id: number) => void | Promise<void>
  } = $props()

  let busy = $state(false)

  const login = $derived(suggestion.attribution?.author?.login)
  const isAnon = $derived(!login)
  const authorLabel = $derived(login ?? (suggestion.attribution?.anon ? 'Anonymous' : 'Unknown'))

  async function run(fn: (id: number) => void | Promise<void>) {
    if (busy) return
    busy = true
    try {
      await fn(suggestion.id)
    } finally {
      busy = false
    }
  }
</script>

<div class="card suggestion">
  <div class="meta">
    <span class="author">
      {#if login}
        <span class="avatar">{login.charAt(0)}</span>
      {:else}
        <span class="avatar avatar-muted">·</span>
      {/if}
      <span class="author-name" class:anon={isAnon}>{authorLabel}</span>
    </span>
    <span class="meta-right">
      <span class="chip">Key #{suggestion.keyId}</span>
      {#if suggestion.state}<StateBadge state={suggestion.state} />{/if}
    </span>
  </div>

  <div class="translation"><IcuText text={suggestion.translation ?? '—'} /></div>

  <div class="actions">
    <button class="accept" onclick={() => run(onaccept)} disabled={busy}>
      {busy ? 'Working…' : 'Accept'}
    </button>
    <button class="btn-danger" onclick={() => run(ondecline)} disabled={busy}>Decline</button>
  </div>
</div>

<style>
  .suggestion {
    padding: 1rem 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
  .meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .author {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 500;
  }
  .author-name.anon {
    color: var(--muted);
    font-style: italic;
    font-weight: 400;
  }
  .meta-right {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  .translation {
    font-size: 0.95rem;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
  }
  .accept {
    background: var(--success);
    border-color: var(--success);
  }
  .accept:hover:not(:disabled) {
    background: #059669;
    border-color: #059669;
  }
</style>

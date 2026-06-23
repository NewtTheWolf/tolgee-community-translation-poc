<script lang="ts">
  import { api } from '$lib/api'
  import IcuText from './IcuText.svelte'
  import StateBadge from './StateBadge.svelte'

  export interface Suggestion {
    id: number
    keyId: number
    translation?: string
    state?: string
    score?: number
    upvotes?: number
    downvotes?: number
    myVote?: number
    attribution?: {
      author?: { login: string }
      anon?: boolean
      status?: string
    } | null
  }

  let {
    suggestion,
    canVote = false,
    onaccept,
    ondecline,
    onvoted,
  }: {
    suggestion: Suggestion
    canVote?: boolean
    onaccept?: (id: number) => void | Promise<void>
    ondecline?: (id: number) => void | Promise<void>
    onvoted?: (id: number, myVote: number, score: number) => void
  } = $props()

  let busy = $state(false)
  let voting = $state(false)

  // Local vote state, seeded from props and re-seeded when the suggestion changes
  // (e.g. list reload). Kept writable so we can update optimistically.
  let score = $state(0)
  let myVote = $state(0)
  let upvotes = $state(0)
  let downvotes = $state(0)
  $effect(() => {
    score = suggestion.score ?? 0
    myVote = suggestion.myVote ?? 0
    upvotes = suggestion.upvotes ?? 0
    downvotes = suggestion.downvotes ?? 0
  })

  const login = $derived(suggestion.attribution?.author?.login)
  const isAnon = $derived(!login)
  const authorLabel = $derived(login ?? (suggestion.attribution?.anon ? 'Anonymous' : 'Unknown'))

  async function run(fn: ((id: number) => void | Promise<void>) | undefined) {
    if (busy || !fn) return
    busy = true
    try {
      await fn(suggestion.id)
    } finally {
      busy = false
    }
  }

  async function vote(direction: 1 | -1) {
    if (!canVote || voting) return
    const value = myVote === direction ? 0 : direction

    // Snapshot for revert, then apply optimistic update.
    const prev = { score, myVote, upvotes, downvotes }
    if (prev.myVote === 1) upvotes -= 1
    else if (prev.myVote === -1) downvotes -= 1
    if (value === 1) upvotes += 1
    else if (value === -1) downvotes += 1
    score += value - prev.myVote
    myVote = value

    voting = true
    try {
      const res = await api.post<{ ok: true; myVote: number }>(`/suggestions/${suggestion.id}/vote`, { value })
      // Trust the server's confirmed vote; score delta already applied.
      myVote = res.myVote
      onvoted?.(suggestion.id, myVote, score)
    } catch {
      score = prev.score
      myVote = prev.myVote
      upvotes = prev.upvotes
      downvotes = prev.downvotes
    } finally {
      voting = false
    }
  }

  const voteTitle = $derived(canVote ? undefined : 'Sign in to vote')
</script>

<div class="card suggestion">
  <div class="body">
    <div class="votes">
      <button
        class="vote-btn"
        class:active={myVote === 1}
        onclick={() => vote(1)}
        disabled={!canVote || voting}
        aria-label="Upvote"
        aria-pressed={myVote === 1}
        title={voteTitle}
      >
        ▲
      </button>
      <span class="score" class:positive={score > 0} class:negative={score < 0}>{score}</span>
      <button
        class="vote-btn"
        class:active={myVote === -1}
        onclick={() => vote(-1)}
        disabled={!canVote || voting}
        aria-label="Downvote"
        aria-pressed={myVote === -1}
        title={voteTitle}
      >
        ▼
      </button>
    </div>

    <div class="content">
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

      <div class="vote-counts">
        <span class="up">▲ {upvotes}</span>
        <span class="down">▼ {downvotes}</span>
      </div>

      {#if onaccept || ondecline}
        <div class="actions">
          {#if onaccept}
            <button class="accept" onclick={() => run(onaccept)} disabled={busy}>
              {busy ? 'Working…' : 'Accept'}
            </button>
          {/if}
          {#if ondecline}
            <button class="btn-danger" onclick={() => run(ondecline)} disabled={busy}>Decline</button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .suggestion {
    padding: 1rem 1.1rem;
  }
  .body {
    display: flex;
    gap: 0.9rem;
    align-items: flex-start;
  }
  .votes {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    flex-shrink: 0;
  }
  .vote-btn {
    width: 30px;
    height: 26px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-2);
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 0.7rem;
    line-height: 1;
  }
  .vote-btn:hover:not(:disabled) {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }
  .vote-btn.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .score {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--muted);
    min-width: 1.5ch;
    text-align: center;
  }
  .score.positive {
    color: var(--success);
  }
  .score.negative {
    color: var(--danger);
  }
  .content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
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
  .vote-counts {
    display: flex;
    gap: 0.75rem;
    font-size: 0.75rem;
    color: var(--muted);
  }
  .vote-counts .up {
    color: var(--success);
  }
  .vote-counts .down {
    color: var(--danger);
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

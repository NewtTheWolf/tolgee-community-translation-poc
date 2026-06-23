<script lang="ts">
  import { goto } from '$app/navigation'
  import IcuText from '$lib/components/IcuText.svelte'
  import StateBadge from '$lib/components/StateBadge.svelte'
  import SuggestForm from '$lib/components/SuggestForm.svelte'

  let { data } = $props()
  let searchInput = $state('')
  let activeKeyId = $state<number | null>(null)

  // Re-seed local input when the loaded data changes (e.g. navigating locale/search).
  $effect(() => {
    searchInput = data.search ?? ''
  })

  function onSearch(e: Event) {
    e.preventDefault()
    goto(`/${data.locale}?search=${encodeURIComponent(searchInput)}`)
  }

  function toggleSuggest(keyId: number) {
    activeKeyId = activeKeyId === keyId ? null : keyId
  }
</script>

<a href="/" class="back-link">← All languages</a>
<h1>{data.locale} Translations</h1>
<p class="subtitle">Browse keys and suggest improvements for this language.</p>

<form onsubmit={onSearch} class="search-bar">
  <input type="search" bind:value={searchInput} placeholder="Search keys…" aria-label="Search translation keys" />
  <button type="submit">Search</button>
</form>

{#if data.keys.length === 0}
  <div class="empty card">
    <p>No translations found{data.search ? ` for “${data.search}”` : ''}.</p>
  </div>
{:else}
  <ul class="key-list card">
    {#each data.keys as key (key.keyId)}
      {@const trans = key.translations?.[data.locale]}
      <li class="key-row">
        <div class="key-main">
          <code class="key-name">{key.keyName ?? '—'}</code>
          <div class="translation">
            {#if trans?.text}
              <IcuText text={trans.text} />
            {:else}
              <span class="untranslated">untranslated</span>
            {/if}
          </div>
        </div>
        <div class="key-side">
          <StateBadge state={trans?.state ?? 'UNTRANSLATED'} />
          <button
            class="btn-secondary suggest-btn"
            onclick={() => toggleSuggest(key.keyId)}
            aria-expanded={activeKeyId === key.keyId}
          >
            {activeKeyId === key.keyId ? 'Close' : 'Suggest'}
          </button>
        </div>
        {#if activeKeyId === key.keyId}
          <div class="suggest-panel">
            <SuggestForm keyId={key.keyId} locale={data.locale} />
          </div>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  .back-link {
    font-size: 0.85rem;
    color: var(--muted);
  }
  .search-bar {
    position: sticky;
    top: 64px;
    z-index: 10;
    display: flex;
    gap: 0.5rem;
    margin: 1rem 0 1.5rem;
    padding: 0.5rem;
    background: var(--bg);
    border-radius: var(--radius);
  }
  .search-bar input {
    flex: 1;
  }
  .key-list {
    list-style: none;
    padding: 0;
    margin: 0;
    overflow: hidden;
  }
  .key-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: start;
    gap: 1rem;
    padding: 0.9rem 1.1rem;
    border-bottom: 1px solid var(--border);
    transition: background 0.12s ease;
  }
  .key-row:last-child {
    border-bottom: none;
  }
  .key-row:hover {
    background: var(--surface-2);
  }
  .key-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .key-name {
    font-family: var(--mono);
    font-size: 0.78rem;
    color: var(--muted);
    word-break: break-all;
  }
  .translation {
    font-size: 0.92rem;
  }
  .untranslated {
    color: var(--muted);
    font-style: italic;
    font-size: 0.85rem;
  }
  .key-side {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .suggest-btn {
    white-space: nowrap;
  }
  .suggest-panel {
    grid-column: 1 / -1;
    padding-top: 0.25rem;
  }
  .empty {
    padding: 2rem;
    text-align: center;
    color: var(--muted);
  }
</style>

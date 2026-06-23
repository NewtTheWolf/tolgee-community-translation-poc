<script lang="ts">
  import { goto } from '$app/navigation'
  import SuggestForm from '$lib/components/SuggestForm.svelte'

  let { data } = $props()
  let searchInput = $state(data.search ?? '')
  let activeKeyId = $state<number | null>(null)

  function onSearch(e: Event) {
    e.preventDefault()
    goto(`/${data.locale}?search=${encodeURIComponent(searchInput)}`)
  }

  function toggleSuggest(keyId: number) {
    activeKeyId = activeKeyId === keyId ? null : keyId
  }
</script>

<a href="/">← All languages</a>
<h1>{data.locale} Translations</h1>

<form onsubmit={onSearch} class="search-form">
  <input
    type="search"
    bind:value={searchInput}
    placeholder="Search keys…"
    aria-label="Search translation keys"
  />
  <button type="submit">Search</button>
</form>

{#if data.keys.length === 0}
  <p>No translations found{data.search ? ` for "${data.search}"` : ''}.</p>
{:else}
  <table>
    <thead>
      <tr>
        <th>Key</th>
        <th>Translation</th>
        <th>State</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each data.keys as key (key.keyId)}
        {@const trans = key.translations?.[data.locale]}
        <tr>
          <td class="key-name">{key.keyName ?? '—'}</td>
          <td class="translation-text">{#if trans?.text}{trans.text}{:else}<em>untranslated</em>{/if}</td>
          <td class="state">{trans?.state ?? '—'}</td>
          <td>
            <button onclick={() => toggleSuggest(key.keyId)} class="suggest-btn">
              {activeKeyId === key.keyId ? 'Close' : 'Suggest'}
            </button>
          </td>
        </tr>
        {#if activeKeyId === key.keyId}
          <tr class="suggest-row">
            <td colspan={4}>
              <SuggestForm keyId={key.keyId} locale={data.locale} />
            </td>
          </tr>
        {/if}
      {/each}
    </tbody>
  </table>
{/if}

<style>
  h1 { margin: 0.5rem 0; }
  .search-form {
    display: flex;
    gap: 0.5rem;
    margin: 1rem 0;
  }
  .search-form input {
    flex: 1;
    padding: 0.4rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  .search-form button {
    padding: 0.4rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  th, td {
    padding: 0.6rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }
  th { font-weight: 600; background: #f9fafb; }
  .key-name { font-family: monospace; font-size: 0.8rem; color: #374151; }
  .translation-text { max-width: 400px; }
  .state { color: #6b7280; font-size: 0.8rem; }
  .suggest-btn {
    padding: 0.3rem 0.75rem;
    border: 1px solid #3b82f6;
    color: #3b82f6;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
  }
  .suggest-btn:hover { background: #eff6ff; }
  .suggest-row td { background: #f9fafb; }
</style>

<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import { api } from '$lib/api'
  import SuggestionCard from '$lib/components/SuggestionCard.svelte'
  import type { SuggestionWithAttribution } from './+page.ts'

  let { data } = $props()

  let suggestions = $state<SuggestionWithAttribution[]>([])
  let selectedLocale = $state('')
  let loading = $state(false)
  let errorMsg = $state('')

  // Re-seed from freshly loaded data on navigation; kept writable for optimistic accept/decline.
  $effect(() => {
    suggestions = data.suggestions ?? []
    selectedLocale = data.locale ?? ''
  })

  async function loadLocale(locale: string) {
    loading = true
    errorMsg = ''
    try {
      const qs = locale ? `/suggestions?locale=${encodeURIComponent(locale)}` : '/suggestions'
      const result = await api.get<{ suggestions: SuggestionWithAttribution[] }>(qs)
      suggestions = result?.suggestions ?? []
      selectedLocale = locale
    } catch {
      errorMsg = 'Failed to load suggestions.'
    } finally {
      loading = false
    }
  }

  async function accept(id: number) {
    try {
      await api.post(`/suggestions/${id}/accept`)
      suggestions = suggestions.filter((s) => s.id !== id)
      await invalidateAll()
    } catch {
      errorMsg = 'Failed to accept suggestion.'
    }
  }

  async function decline(id: number) {
    try {
      await api.post(`/suggestions/${id}/decline`)
      suggestions = suggestions.filter((s) => s.id !== id)
      await invalidateAll()
    } catch {
      errorMsg = 'Failed to decline suggestion.'
    }
  }
</script>

<h1>Review Suggestions</h1>

{#if data.isAdmin || (data.reviewerLocales ?? []).length > 1}
  <div class="locale-picker">
    <label>
      Locale:
      <select value={selectedLocale} onchange={(e) => loadLocale((e.target as HTMLSelectElement).value)}>
        {#if data.isAdmin}<option value="">All</option>{/if}
        {#each data.reviewerLocales ?? [] as loc}
          <option value={loc}>{loc}</option>
        {/each}
      </select>
    </label>
  </div>
{:else if data.locale}
  <p class="locale-label">Locale: <strong>{data.locale}</strong></p>
{/if}

{#if errorMsg}<p class="error">{errorMsg}</p>{/if}

{#if loading}
  <p>Loading…</p>
{:else if suggestions.length === 0}
  <p>No pending suggestions{selectedLocale ? ` for ${selectedLocale}` : ''}.</p>
{:else}
  <div class="cards">
    {#each suggestions as s (s.id)}
      <SuggestionCard suggestion={s} onaccept={accept} ondecline={decline} />
    {/each}
  </div>
{/if}

<style>
  h1 {
    margin-bottom: 1rem;
  }
  .locale-picker {
    margin-bottom: 1rem;
  }
  .locale-picker label {
    font-weight: 500;
  }
  .locale-picker select {
    margin-left: 0.5rem;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    border: 1px solid #d1d5db;
  }
  .locale-label {
    color: #6b7280;
    margin-bottom: 1rem;
  }
  .error {
    color: #ef4444;
    font-size: 0.875rem;
  }
  .cards {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 640px;
  }
</style>

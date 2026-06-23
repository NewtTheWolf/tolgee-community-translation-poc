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
<p class="subtitle">Accept or decline community suggestions for your locales.</p>

{#if data.isAdmin || (data.reviewerLocales ?? []).length > 1}
  <div class="locale-picker">
    <label>
      <span>Locale</span>
      <select value={selectedLocale} onchange={(e) => loadLocale((e.target as HTMLSelectElement).value)}>
        {#if data.isAdmin}<option value="">All locales</option>{/if}
        {#each data.reviewerLocales ?? [] as loc}
          <option value={loc}>{loc}</option>
        {/each}
      </select>
    </label>
  </div>
{:else if data.locale}
  <p class="locale-label">Locale <span class="chip">{data.locale}</span></p>
{/if}

{#if errorMsg}<p class="banner banner-error">{errorMsg}</p>{/if}

{#if loading}
  <div class="empty card"><p>Loading…</p></div>
{:else if suggestions.length === 0}
  <div class="empty card">
    <p>No pending suggestions{selectedLocale ? ` for ${selectedLocale}` : ''}.</p>
  </div>
{:else}
  <div class="cards">
    {#each suggestions as s (s.id)}
      <SuggestionCard suggestion={s} onaccept={accept} ondecline={decline} />
    {/each}
  </div>
{/if}

<style>
  .locale-picker {
    margin-bottom: 1.5rem;
  }
  .locale-picker label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
    font-size: 0.9rem;
  }
  .locale-label {
    color: var(--muted);
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .cards {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 640px;
  }
  .empty {
    padding: 2rem;
    text-align: center;
    color: var(--muted);
  }
</style>

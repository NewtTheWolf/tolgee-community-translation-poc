<script lang="ts">
  let { data } = $props()
</script>

<h1>Community Translations</h1>
<p class="subtitle">Browse a language to view its keys and suggest translations.</p>

{#if data.languages.length === 0}
  <div class="empty card">
    <p>No languages available yet.</p>
  </div>
{:else}
  <ul class="language-grid">
    {#each data.languages as lang (lang.id)}
      <li>
        <a href="/{lang.tag}" class="lang-card card">
          <span class="flag">{lang.flagEmoji || '🌐'}</span>
          <span class="lang-body">
            <span class="lang-name">{lang.name}</span>
            {#if lang.originalName && lang.originalName !== lang.name}
              <span class="lang-original">{lang.originalName}</span>
            {/if}
          </span>
          <span class="lang-meta">
            <span class="chip">{lang.tag}</span>
            {#if lang.base}<span class="badge badge-accent">Base</span>{/if}
          </span>
        </a>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .language-grid {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.85rem;
  }
  .lang-card {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 1rem 1.1rem;
    color: inherit;
    text-decoration: none;
    transition:
      transform 0.12s ease,
      border-color 0.12s ease,
      box-shadow 0.12s ease;
  }
  .lang-card:hover {
    transform: translateY(-2px);
    border-color: var(--accent);
    box-shadow: var(--shadow-lg);
    text-decoration: none;
  }
  .flag {
    font-size: 1.6rem;
    line-height: 1;
  }
  .lang-body {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
    flex: 1;
  }
  .lang-name {
    font-weight: 600;
  }
  .lang-original {
    font-size: 0.8rem;
    color: var(--muted);
  }
  .lang-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.35rem;
  }
  .empty {
    padding: 2rem;
    text-align: center;
    color: var(--muted);
  }
</style>

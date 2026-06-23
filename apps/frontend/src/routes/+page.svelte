<script lang="ts">
  let { data } = $props()
</script>

<h1>Community Translations</h1>
<p>Select a language to browse and suggest translations.</p>

{#if data.languages.length === 0}
  <p>No languages available.</p>
{:else}
  <ul class="language-list">
    {#each data.languages as lang (lang.id)}
      <li>
        <a href="/{lang.tag}">
          <span class="lang-name">{lang.name}</span>
          <span class="lang-tag">{lang.tag}</span>
        </a>
      </li>
    {/each}
  </ul>
{/if}

<style>
  h1 {
    margin-bottom: 0.5rem;
  }
  .language-list {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 480px;
  }
  .language-list li a {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    text-decoration: none;
    color: inherit;
  }
  .language-list li a:hover {
    background: #f9fafb;
    border-color: #3b82f6;
  }
  .lang-name {
    font-weight: 600;
  }
  .lang-tag {
    font-size: 0.75rem;
    color: #6b7280;
  }
</style>

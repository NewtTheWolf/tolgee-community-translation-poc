<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import { api } from '$lib/api'

  let { data } = $props()
  const me = $derived(data.me)

  let applyLocale = $state('')
  let applyRole = $state<'translator' | 'reviewer'>('translator')
  let applyMsg = $state('')
  let applyFeedback = $state('')

  async function applyForLanguage(e: Event) {
    e.preventDefault()
    applyFeedback = ''
    try {
      await api.post('/applications', { locale: applyLocale, requestedRole: applyRole, message: applyMsg || undefined })
      applyFeedback = 'Application submitted!'
      applyLocale = ''
      applyMsg = ''
    } catch {
      applyFeedback = 'Could not submit application.'
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      await invalidateAll()
    }
  }
</script>

{#if !me.user}
  <p>You are not logged in. <a href="/login">Sign in</a></p>
{:else}
  <h1>Profile</h1>

  <section class="section">
    <h2>Account</h2>
    <p><strong>Login:</strong> {me.user.login}</p>
    {#if me.user.isAdmin}<p class="badge">Admin</p>{/if}
    <button onclick={logout} class="logout-btn">Logout</button>
  </section>

  <section class="section">
    <h2>Your Roles</h2>
    {#if (me.roles ?? []).length === 0}
      <p>No roles assigned yet.</p>
    {:else}
      <ul>
        {#each me.roles ?? [] as r}
          <li>{r.locale} — {r.role}</li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="section">
    <h2>Apply for a Language</h2>
    <form onsubmit={applyForLanguage} class="apply-form">
      <label>
        Locale code
        <input type="text" bind:value={applyLocale} placeholder="e.g. de" required />
      </label>
      <label>
        Role
        <select bind:value={applyRole}>
          <option value="translator">Translator</option>
          <option value="reviewer">Reviewer</option>
        </select>
      </label>
      <label>
        Message (optional)
        <textarea bind:value={applyMsg} placeholder="Why are you applying?"></textarea>
      </label>
      <button type="submit">Apply</button>
      {#if applyFeedback}<p class="feedback">{applyFeedback}</p>{/if}
    </form>
  </section>
{/if}

<style>
  h1 {
    margin-bottom: 1rem;
  }
  .section {
    margin-bottom: 2rem;
  }
  .badge {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    background: #fef3c7;
    color: #92400e;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  .logout-btn {
    padding: 0.4rem 1rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .logout-btn:hover {
    background: #dc2626;
  }
  .apply-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 400px;
  }
  .apply-form label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.9rem;
    font-weight: 500;
  }
  .apply-form input,
  .apply-form select,
  .apply-form textarea {
    padding: 0.4rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-family: inherit;
    font-size: 0.9rem;
  }
  .apply-form textarea {
    min-height: 80px;
    resize: vertical;
  }
  .apply-form button {
    align-self: flex-start;
    padding: 0.4rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .apply-form button:hover {
    background: #2563eb;
  }
  .feedback {
    font-size: 0.875rem;
    color: #374151;
  }
</style>

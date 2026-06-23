<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import { api } from '$lib/api'

  let { data } = $props()
  const me = $derived(data.me)
  const initial = $derived((me.user?.login ?? '?').charAt(0))

  let applyLocale = $state('')
  let applyRole = $state<'translator' | 'reviewer'>('translator')
  let applyMsg = $state('')
  let applyFeedback = $state<{ msg: string; kind: 'success' | 'error' } | null>(null)

  async function applyForLanguage(e: Event) {
    e.preventDefault()
    applyFeedback = null
    try {
      await api.post('/applications', { locale: applyLocale, requestedRole: applyRole, message: applyMsg || undefined })
      applyFeedback = { msg: 'Application submitted!', kind: 'success' }
      applyLocale = ''
      applyMsg = ''
    } catch {
      applyFeedback = { msg: 'Could not submit application.', kind: 'error' }
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
  <div class="empty card">
    <p>You are not logged in. <a href="/login">Sign in</a></p>
  </div>
{:else}
  <h1>Profile</h1>
  <p class="subtitle">Your account, roles, and language applications.</p>

  <section class="section card account">
    <span class="account-avatar">{initial}</span>
    <div class="account-info">
      <span class="account-login">{me.user.login}</span>
      {#if me.user.isAdmin}<span class="badge admin-badge">Admin</span>{/if}
    </div>
    <button onclick={logout} class="btn-danger logout-btn">Logout</button>
  </section>

  <section class="section">
    <h2>Your Roles</h2>
    {#if (me.roles ?? []).length === 0}
      <div class="empty card"><p>No roles assigned yet.</p></div>
    {:else}
      <ul class="role-list">
        {#each me.roles ?? [] as r}
          <li class="role-item card">
            <span class="chip">{r.locale}</span>
            <span class="badge badge-accent">{r.role}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="section">
    <h2>Apply for a Language</h2>
    <form onsubmit={applyForLanguage} class="apply-form card">
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
      {#if applyFeedback}<p class="banner banner-{applyFeedback.kind}">{applyFeedback.msg}</p>{/if}
    </form>
  </section>
{/if}

<style>
  .section {
    margin-bottom: 2rem;
  }
  .empty {
    padding: 1.5rem;
    text-align: center;
    color: var(--muted);
  }
  .empty p {
    margin: 0;
  }
  .account {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
  }
  .account-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 999px;
    background: var(--accent);
    color: #fff;
    font-size: 1.1rem;
    font-weight: 700;
    text-transform: uppercase;
    flex-shrink: 0;
  }
  .account-info {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    flex: 1;
  }
  .account-login {
    font-weight: 600;
    font-size: 1.05rem;
  }
  .admin-badge {
    align-self: flex-start;
    color: #92400e;
    background: #fef3c7;
  }
  .logout-btn {
    flex-shrink: 0;
  }
  .role-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .role-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 0.85rem;
  }
  .apply-form {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    max-width: 420px;
    padding: 1.25rem;
  }
  .apply-form label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.9rem;
    font-weight: 500;
  }
  .apply-form textarea {
    min-height: 80px;
    resize: vertical;
  }
  .apply-form button {
    align-self: flex-start;
  }
</style>

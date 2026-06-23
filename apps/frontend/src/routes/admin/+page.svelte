<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import { api } from '$lib/api'
  import type { Application, Role, Settings } from './+page.ts'

  let { data } = $props()

  // Re-seed all locally-mutated lists/fields from freshly loaded data on navigation.
  $effect(() => {
    applications = data.applications ?? []
    roles = data.roles ?? []
    threshold = data.settings?.autoPromoteThreshold ?? 5
  })

  type Feedback = { msg: string; kind: 'success' | 'error' } | null

  // --- Applications ---
  let applications = $state<Application[]>([])
  let appFeedback = $state<Feedback>(null)

  async function approveApp(id: string) {
    try {
      await api.post(`/applications/${id}/approve`)
      applications = applications.filter((a) => a.id !== id)
      await invalidateAll()
    } catch {
      appFeedback = { msg: 'Failed to approve application.', kind: 'error' }
    }
  }

  async function rejectApp(id: string) {
    try {
      await api.post(`/applications/${id}/reject`)
      applications = applications.filter((a) => a.id !== id)
      await invalidateAll()
    } catch {
      appFeedback = { msg: 'Failed to reject application.', kind: 'error' }
    }
  }

  // --- Roles ---
  let roles = $state<Role[]>([])
  let newUserId = $state('')
  let newLocale = $state('')
  let newRole = $state<'translator' | 'reviewer'>('translator')
  let roleFeedback = $state<Feedback>(null)

  async function grantRole(e: Event) {
    e.preventDefault()
    roleFeedback = null
    try {
      const result = await api.post<{ id: string }>('/admin/roles', {
        userId: newUserId,
        locale: newLocale,
        role: newRole,
      })
      roles = [...roles, { id: result.id, userId: newUserId, locale: newLocale, role: newRole }]
      newUserId = ''
      newLocale = ''
      roleFeedback = { msg: 'Role granted.', kind: 'success' }
      await invalidateAll()
    } catch {
      roleFeedback = { msg: 'Failed to grant role.', kind: 'error' }
    }
  }

  async function revokeRole(id: string) {
    try {
      await api.del(`/admin/roles/${id}`)
      roles = roles.filter((r) => r.id !== id)
      await invalidateAll()
    } catch {
      roleFeedback = { msg: 'Failed to revoke role.', kind: 'error' }
    }
  }

  // --- Settings ---
  let threshold = $state(5)
  let settingsFeedback = $state<Feedback>(null)

  async function saveSettings(e: Event) {
    e.preventDefault()
    settingsFeedback = null
    try {
      await api.put('/admin/settings', { autoPromoteThreshold: threshold })
      settingsFeedback = { msg: 'Settings saved.', kind: 'success' }
      await invalidateAll()
    } catch {
      settingsFeedback = { msg: 'Failed to save settings.', kind: 'error' }
    }
  }
</script>

<h1>Admin Panel</h1>
<p class="subtitle">Manage applications, roles, and auto-promotion settings.</p>

<!-- Applications -->
<section class="section">
  <h2>Pending Applications</h2>
  {#if appFeedback}<p class="banner banner-{appFeedback.kind}">{appFeedback.msg}</p>{/if}
  {#if applications.length === 0}
    <div class="empty card"><p>No pending applications.</p></div>
  {:else}
    <ul class="app-list">
      {#each applications as app (app.id)}
        <li class="app-item card">
          <div class="app-info">
            <span class="chip">{app.userId}</span>
            <span class="app-detail"
              >Locale <strong>{app.locale}</strong> · Role <strong>{app.requestedRole}</strong></span
            >
            {#if app.message}<span class="message">“{app.message}”</span>{/if}
          </div>
          <div class="app-actions">
            <button class="approve" onclick={() => approveApp(app.id)}>Approve</button>
            <button class="btn-danger" onclick={() => rejectApp(app.id)}>Reject</button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<!-- Roles -->
<section class="section">
  <h2>Roles Management</h2>
  {#if roleFeedback}<p class="banner banner-{roleFeedback.kind}">{roleFeedback.msg}</p>{/if}

  {#if roles.length === 0}
    <div class="empty card"><p>No roles assigned.</p></div>
  {:else}
    <div class="card table-wrap">
      <table class="roles-table">
        <thead>
          <tr><th>User ID</th><th>Locale</th><th>Role</th><th></th></tr>
        </thead>
        <tbody>
          {#each roles as r (r.id)}
            <tr>
              <td><span class="chip">{r.userId}</span></td>
              <td>{r.locale}</td>
              <td><span class="badge badge-accent">{r.role}</span></td>
              <td class="cell-right"
                ><button class="btn-secondary revoke" onclick={() => revokeRole(r.id)}>Revoke</button></td
              >
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <h3>Grant Role</h3>
  <form onsubmit={grantRole} class="grant-form">
    <input type="text" bind:value={newUserId} placeholder="User ID" required />
    <input type="text" bind:value={newLocale} placeholder="Locale (e.g. de)" required />
    <select bind:value={newRole}>
      <option value="translator">Translator</option>
      <option value="reviewer">Reviewer</option>
    </select>
    <button type="submit">Grant</button>
  </form>
</section>

<!-- Settings -->
<section class="section">
  <h2>Settings</h2>
  {#if settingsFeedback}<p class="banner banner-{settingsFeedback.kind}">{settingsFeedback.msg}</p>{/if}
  <form onsubmit={saveSettings} class="settings-form">
    <label>
      Auto-promote threshold
      <input type="number" bind:value={threshold} min={1} required />
    </label>
    <button type="submit">Save</button>
  </form>
</section>

<style>
  .section {
    margin-bottom: 2.5rem;
  }
  h2 {
    margin-bottom: 0.85rem;
  }
  h3 {
    margin: 1.25rem 0 0.6rem;
    font-size: 1rem;
  }
  .empty {
    padding: 1.25rem;
    text-align: center;
    color: var(--muted);
  }
  .empty p {
    margin: 0;
  }

  .app-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .app-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: 0.9rem 1rem;
  }
  .app-info {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.9rem;
  }
  .app-detail {
    color: var(--muted);
  }
  .message {
    font-style: italic;
    color: var(--muted);
  }
  .app-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .approve {
    background: var(--success);
    border-color: var(--success);
  }
  .approve:hover:not(:disabled) {
    background: #059669;
    border-color: #059669;
  }

  .table-wrap {
    overflow: hidden;
    margin-bottom: 1rem;
  }
  .roles-table {
    font-size: 0.9rem;
  }
  .roles-table th,
  .roles-table td {
    padding: 0.6rem 0.85rem;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
  .roles-table tbody tr:last-child td {
    border-bottom: none;
  }
  .roles-table th {
    background: var(--surface-2);
    font-weight: 600;
    color: var(--muted);
  }
  .cell-right {
    text-align: right;
  }
  .revoke {
    padding: 0.25rem 0.65rem;
    font-size: 0.8rem;
  }

  .grant-form {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .settings-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 300px;
  }
  .settings-form label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-weight: 500;
    font-size: 0.9rem;
  }
  .settings-form button {
    align-self: flex-start;
  }
  .banner {
    margin-bottom: 0.85rem;
  }
</style>

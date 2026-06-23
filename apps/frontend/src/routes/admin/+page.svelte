<script lang="ts">
  import { api } from '$lib/api'
  import type { Application, Role, Settings } from './+page.ts'

  let { data } = $props()

  // Re-seed all locally-mutated lists/fields from freshly loaded data on navigation.
  $effect(() => {
    applications = data.applications ?? []
    roles = data.roles ?? []
    threshold = data.settings?.autoPromoteThreshold ?? 5
  })

  // --- Applications ---
  let applications = $state<Application[]>([])
  let appFeedback = $state('')

  async function approveApp(id: string) {
    try {
      await api.post(`/applications/${id}/approve`)
      applications = applications.filter((a) => a.id !== id)
    } catch {
      appFeedback = 'Failed to approve application.'
    }
  }

  async function rejectApp(id: string) {
    try {
      await api.post(`/applications/${id}/reject`)
      applications = applications.filter((a) => a.id !== id)
    } catch {
      appFeedback = 'Failed to reject application.'
    }
  }

  // --- Roles ---
  let roles = $state<Role[]>([])
  let newUserId = $state('')
  let newLocale = $state('')
  let newRole = $state<'translator' | 'reviewer'>('translator')
  let roleFeedback = $state('')

  async function grantRole(e: Event) {
    e.preventDefault()
    roleFeedback = ''
    try {
      const result = await api.post<{ id: string }>('/admin/roles', {
        userId: newUserId,
        locale: newLocale,
        role: newRole,
      })
      roles = [...roles, { id: result.id, userId: newUserId, locale: newLocale, role: newRole }]
      newUserId = ''
      newLocale = ''
      roleFeedback = 'Role granted.'
    } catch {
      roleFeedback = 'Failed to grant role.'
    }
  }

  async function revokeRole(id: string) {
    try {
      await api.del(`/admin/roles/${id}`)
      roles = roles.filter((r) => r.id !== id)
    } catch {
      roleFeedback = 'Failed to revoke role.'
    }
  }

  // --- Settings ---
  let threshold = $state(5)
  let settingsFeedback = $state('')

  async function saveSettings(e: Event) {
    e.preventDefault()
    settingsFeedback = ''
    try {
      await api.put('/admin/settings', { autoPromoteThreshold: threshold })
      settingsFeedback = 'Settings saved.'
    } catch {
      settingsFeedback = 'Failed to save settings.'
    }
  }
</script>

<h1>Admin Panel</h1>

<!-- Applications -->
<section class="section">
  <h2>Pending Applications</h2>
  {#if appFeedback}<p class="feedback">{appFeedback}</p>{/if}
  {#if applications.length === 0}
    <p>No pending applications.</p>
  {:else}
    <ul class="app-list">
      {#each applications as app (app.id)}
        <li class="app-item">
          <div class="app-info">
            <span>User: <code>{app.userId}</code></span>
            <span>Locale: <strong>{app.locale}</strong></span>
            <span>Role: {app.requestedRole}</span>
            {#if app.message}<span class="message">"{app.message}"</span>{/if}
          </div>
          <div class="app-actions">
            <button class="approve" onclick={() => approveApp(app.id)}>Approve</button>
            <button class="reject" onclick={() => rejectApp(app.id)}>Reject</button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<!-- Roles -->
<section class="section">
  <h2>Roles Management</h2>
  {#if roleFeedback}<p class="feedback">{roleFeedback}</p>{/if}

  {#if roles.length === 0}
    <p>No roles assigned.</p>
  {:else}
    <table class="roles-table">
      <thead>
        <tr><th>User ID</th><th>Locale</th><th>Role</th><th></th></tr>
      </thead>
      <tbody>
        {#each roles as r (r.id)}
          <tr>
            <td><code>{r.userId}</code></td>
            <td>{r.locale}</td>
            <td>{r.role}</td>
            <td><button class="revoke" onclick={() => revokeRole(r.id)}>Revoke</button></td>
          </tr>
        {/each}
      </tbody>
    </table>
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
  {#if settingsFeedback}<p class="feedback">{settingsFeedback}</p>{/if}
  <form onsubmit={saveSettings} class="settings-form">
    <label>
      Auto-promote threshold
      <input type="number" bind:value={threshold} min={1} required />
    </label>
    <button type="submit">Save</button>
  </form>
</section>

<style>
  h1 {
    margin-bottom: 1.5rem;
  }
  .section {
    margin-bottom: 2.5rem;
  }
  h2 {
    margin-bottom: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 0.25rem;
  }
  h3 {
    margin: 1rem 0 0.5rem;
  }
  .feedback {
    font-size: 0.875rem;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .app-list {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .app-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  }
  .app-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.9rem;
  }
  .message {
    font-style: italic;
    color: #6b7280;
  }
  .app-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .approve {
    padding: 0.3rem 0.75rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .approve:hover {
    background: #059669;
  }
  .reject {
    padding: 0.3rem 0.75rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .reject:hover {
    background: #dc2626;
  }
  .revoke {
    padding: 0.2rem 0.6rem;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
  }
  .revoke:hover {
    background: #fee2e2;
  }

  .roles-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }
  .roles-table th,
  .roles-table td {
    padding: 0.5rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }
  .roles-table th {
    background: #f9fafb;
    font-weight: 600;
  }

  .grant-form {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .grant-form input,
  .grant-form select {
    padding: 0.4rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  .grant-form button {
    padding: 0.4rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .grant-form button:hover {
    background: #2563eb;
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
    gap: 0.25rem;
    font-weight: 500;
    font-size: 0.9rem;
  }
  .settings-form input {
    padding: 0.4rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
  }
  .settings-form button {
    align-self: flex-start;
    padding: 0.4rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .settings-form button:hover {
    background: #2563eb;
  }
</style>

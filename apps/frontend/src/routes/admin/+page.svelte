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
  type UserHit = { id: string; login: string; name: string | null; avatarUrl: string | null; isAdmin: boolean }

  let roles = $state<Role[]>([])
  let newLocale = $state('')
  let newRole = $state<'translator' | 'reviewer'>('translator')
  let roleFeedback = $state<Feedback>(null)

  // User picker (search-as-you-type combobox)
  let userQuery = $state('')
  let userResults = $state<UserHit[]>([])
  let selectedUser = $state<{ id: string; login: string } | null>(null)
  let searchOpen = $state(false)
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  function onUserInput() {
    selectedUser = null
    const q = userQuery.trim()
    clearTimeout(searchTimer)
    if (!q) {
      userResults = []
      searchOpen = false
      return
    }
    searchTimer = setTimeout(async () => {
      try {
        userResults = await api.get<UserHit[]>(`/admin/users?q=${encodeURIComponent(q)}`)
        searchOpen = true
      } catch {
        userResults = []
        searchOpen = false
      }
    }, 250)
  }

  function selectUser(u: UserHit) {
    selectedUser = { id: u.id, login: u.login }
    userQuery = u.login
    userResults = []
    searchOpen = false
  }

  function clearSelectedUser() {
    selectedUser = null
    userQuery = ''
    userResults = []
    searchOpen = false
  }

  async function grantRole(e: Event) {
    e.preventDefault()
    roleFeedback = null
    if (!selectedUser) {
      roleFeedback = { msg: 'Select a user first.', kind: 'error' }
      return
    }
    const targetUser = selectedUser
    try {
      const result = await api.post<{ id: string }>('/admin/roles', {
        userId: targetUser.id,
        locale: newLocale,
        role: newRole,
      })
      roles = [...roles, { id: result.id, userId: targetUser.id, locale: newLocale, role: newRole }]
      clearSelectedUser()
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
    <div class="user-picker">
      {#if selectedUser}
        <span class="user-chip">
          <span class="avatar">{selectedUser.login.charAt(0)}</span>
          {selectedUser.login}
          <button type="button" class="user-chip-remove" aria-label="Remove selected user" onclick={clearSelectedUser}
            >×</button
          >
        </span>
      {:else}
        <input
          type="text"
          role="combobox"
          aria-expanded={searchOpen}
          aria-controls="user-listbox"
          aria-autocomplete="list"
          aria-label="Search for a user by login or name"
          bind:value={userQuery}
          oninput={onUserInput}
          placeholder="Search user…"
          autocomplete="off"
        />
        {#if searchOpen && userResults.length > 0}
          <ul id="user-listbox" class="user-dropdown" role="listbox">
            {#each userResults as u (u.id)}
              <li>
                <button
                  type="button"
                  class="user-option"
                  role="option"
                  aria-selected="false"
                  onclick={() => selectUser(u)}
                >
                  <span class="avatar">{u.login.charAt(0)}</span>
                  <span class="user-option-body">
                    <span class="user-option-login">{u.login}</span>
                    {#if u.name}<span class="user-option-name">{u.name}</span>{/if}
                  </span>
                </button>
              </li>
            {/each}
          </ul>
        {:else if searchOpen}
          <ul id="user-listbox" class="user-dropdown" role="listbox">
            <li class="user-empty">No users found.</li>
          </ul>
        {/if}
      {/if}
    </div>
    <input type="text" bind:value={newLocale} placeholder="Locale (e.g. de)" aria-label="Locale" required />
    <select bind:value={newRole} aria-label="Role">
      <option value="translator">Translator</option>
      <option value="reviewer">Reviewer</option>
    </select>
    <button type="submit" disabled={!selectedUser || !newLocale.trim()}>Grant</button>
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
    align-items: flex-start;
  }
  .user-picker {
    position: relative;
    min-width: 220px;
  }
  .user-picker input {
    width: 100%;
  }
  .user-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.25rem 0.35rem 0.25rem 0.4rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    font-size: 0.9rem;
    font-weight: 500;
  }
  .user-chip .avatar {
    width: 22px;
    height: 22px;
    font-size: 0.65rem;
  }
  .user-chip-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: var(--surface-2);
    color: var(--muted);
    font-size: 1rem;
    line-height: 1;
  }
  .user-chip-remove:hover:not(:disabled) {
    background: var(--danger-soft);
    color: var(--danger);
  }
  .user-dropdown {
    position: absolute;
    top: calc(100% + 0.3rem);
    left: 0;
    right: 0;
    z-index: 30;
    list-style: none;
    margin: 0;
    padding: 0.25rem;
    max-height: 260px;
    overflow-y: auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }
  .user-option {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    width: 100%;
    padding: 0.4rem 0.5rem;
    border: none;
    background: transparent;
    color: var(--text);
    border-radius: var(--radius-sm);
    text-align: left;
    font-weight: 400;
  }
  .user-option:hover:not(:disabled),
  .user-option:focus-visible {
    background: var(--surface-2);
  }
  .user-option-body {
    display: flex;
    flex-direction: column;
    line-height: 1.25;
    min-width: 0;
  }
  .user-option-login {
    font-weight: 600;
    font-size: 0.88rem;
  }
  .user-option-name {
    font-size: 0.78rem;
    color: var(--muted);
  }
  .user-empty {
    padding: 0.5rem;
    font-size: 0.85rem;
    color: var(--muted);
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

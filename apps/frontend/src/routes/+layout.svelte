<script lang="ts">
  import { page } from '$app/state'
  import '../app.css'
  let { data, children } = $props()
  const me = $derived(data.me)
  const canReview = $derived(me.user?.isAdmin || (me.roles ?? []).some((r) => r.role === 'reviewer'))
  const path = $derived(page.url.pathname)
  const initial = $derived((me.user?.login ?? '?').charAt(0))
</script>

<header>
  <nav class="nav-left">
    <a href="/" class="brand"><span class="brand-mark">T</span>Translations</a>
    <a href="/" class="nav-link" class:active={path === '/'}>Languages</a>
    {#if canReview}<a href="/review" class="nav-link" class:active={path.startsWith('/review')}>Review</a>{/if}
    {#if me.user?.isAdmin}<a href="/admin" class="nav-link" class:active={path.startsWith('/admin')}>Admin</a>{/if}
  </nav>
  <div class="nav-right">
    {#if me.user}
      <a href="/profile" class="user-link">
        <span class="avatar">{initial}</span>
        {me.user.login}
      </a>
    {:else}
      <a href="/login" class="nav-link" class:active={path.startsWith('/login')}>Login</a>
    {/if}
  </div>
</header>
<main>{@render children()}</main>

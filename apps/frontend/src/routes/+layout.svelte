<script lang="ts">
  import '../app.css'
  let { data, children } = $props()
  const me = $derived(data.me)
  const canReview = $derived(me.user?.isAdmin || (me.roles ?? []).some((r) => r.role === 'reviewer'))
</script>

<header>
  <nav class="nav-left">
    <a href="/" class="brand">Translations</a>
    <a href="/">Languages</a>
    {#if canReview}<a href="/review">Review</a>{/if}
    {#if me.user?.isAdmin}<a href="/admin">Admin</a>{/if}
  </nav>
  <div class="nav-right">
    {#if me.user}<a href="/profile">{me.user.login}</a>{:else}<a href="/login">Login</a>{/if}
  </div>
</header>
<main>{@render children()}</main>

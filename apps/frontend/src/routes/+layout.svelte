<script lang="ts">
  let { data, children } = $props()
  const me = $derived(data.me)
  const canReview = $derived(me.user?.isAdmin || (me.roles ?? []).some((r) => r.role === 'reviewer'))
</script>

<header>
  <a href="/">Languages</a>
  {#if canReview}<a href="/review">Review</a>{/if}
  {#if me.user?.isAdmin}<a href="/admin">Admin</a>{/if}
  {#if me.user}<a href="/profile">{me.user.login}</a>{:else}<a href="/login">Login</a>{/if}
</header>
<main>{@render children()}</main>

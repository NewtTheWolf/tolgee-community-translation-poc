<script lang="ts">
  let { state = '' }: { state?: string } = $props()

  const meta = $derived.by(() => {
    switch ((state ?? '').toUpperCase()) {
      case 'UNTRANSLATED':
        return { label: 'Untranslated', color: 'var(--state-untranslated)' }
      case 'TRANSLATED':
        return { label: 'Translated', color: 'var(--state-translated)' }
      case 'REVIEWED':
        return { label: 'Reviewed', color: 'var(--state-reviewed)' }
      default:
        return { label: state || 'Unknown', color: 'var(--muted)' }
    }
  })
</script>

<span class="state-badge" style="--dot: {meta.color}">
  <span class="dot"></span>
  {meta.label}
</span>

<style>
  .state-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.15rem 0.6rem;
    font-size: 0.72rem;
    font-weight: 600;
    border-radius: 999px;
    color: var(--text);
    background: var(--surface-2);
    border: 1px solid var(--border);
    white-space: nowrap;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--dot);
    flex-shrink: 0;
  }
</style>

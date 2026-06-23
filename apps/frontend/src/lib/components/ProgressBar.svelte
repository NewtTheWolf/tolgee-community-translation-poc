<script lang="ts">
  let { value = 0 }: { value?: number } = $props()
  const pct = $derived(Math.min(100, Math.max(0, value)))
</script>

<div class="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
  <div class="progress-fill" style="width: {pct}%"></div>
</div>

<style>
  .progress-bar {
    background: #e5e7eb;
    border-radius: 4px;
    height: 8px;
    width: 100%;
  }
  .progress-fill {
    background: #3b82f6;
    border-radius: 4px;
    height: 100%;
    transition: width 0.3s ease;
  }
</style>

<script lang="ts">
  import { api } from '$lib/api'
  let { keyId, locale }: { keyId: number; locale: string } = $props()
  let text = $state('')
  let msg = $state('')
  async function submit() {
    try {
      await api.post('/suggestions', { keyId, locale, text })
      msg = 'Thanks! Your suggestion is in review.'
      text = ''
    } catch (e) {
      msg = e instanceof Error && e.message.includes('429') ? 'Slow down — try again shortly.' : 'Could not submit.'
    }
  }
</script>

<form onsubmit={(e) => { e.preventDefault(); submit() }}>
  <textarea bind:value={text} placeholder="Suggest a translation…" required></textarea>
  <button type="submit">Suggest</button>
  {#if msg}<p>{msg}</p>{/if}
</form>

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  textarea {
    min-height: 80px;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-family: inherit;
    resize: vertical;
  }
  button {
    align-self: flex-start;
    padding: 0.4rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  button:hover { background: #2563eb; }
  p { margin: 0; font-size: 0.875rem; color: #374151; }
</style>

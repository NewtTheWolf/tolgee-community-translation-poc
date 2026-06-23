<script lang="ts">
  import { api } from '$lib/api'
  import IcuText from './IcuText.svelte'

  let { keyId, locale }: { keyId: number; locale: string } = $props()
  let text = $state('')
  let msg = $state('')
  let msgKind = $state<'success' | 'error'>('success')
  let submitting = $state(false)

  async function submit() {
    if (submitting) return
    submitting = true
    msg = ''
    try {
      await api.post('/suggestions', { keyId, locale, text })
      msg = 'Thanks! Your suggestion is in review.'
      msgKind = 'success'
      text = ''
    } catch (e) {
      msgKind = 'error'
      msg = e instanceof Error && e.message.includes('429') ? 'Slow down — try again shortly.' : 'Could not submit.'
    } finally {
      submitting = false
    }
  }
</script>

<form
  class="suggest-form"
  onsubmit={(e) => {
    e.preventDefault()
    submit()
  }}
>
  <textarea bind:value={text} placeholder="Suggest a translation…" aria-label="Suggest a translation" rows="3" required
  ></textarea>

  {#if text.trim()}
    <div class="preview">
      <span class="preview-label">Preview</span>
      <IcuText {text} />
    </div>
  {/if}

  <div class="actions">
    <button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Suggest'}</button>
  </div>

  {#if msg}
    <p class="banner banner-{msgKind === 'success' ? 'success' : 'error'}">{msg}</p>
  {/if}
</form>

<style>
  .suggest-form {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-top: 0.5rem;
  }
  textarea {
    min-height: 72px;
    resize: vertical;
  }
  .preview {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.6rem 0.75rem;
    background: var(--surface-2);
    border: 1px dashed var(--border);
    border-radius: var(--radius-sm);
  }
  .preview-label {
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
  }
  .actions {
    display: flex;
  }
  .actions button {
    align-self: flex-start;
  }
</style>

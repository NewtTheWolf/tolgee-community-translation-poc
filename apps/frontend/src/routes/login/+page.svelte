<script lang="ts">
  import { PUBLIC_API_URL } from '$env/static/public'
</script>

<div class="login-wrap">
  <h1>Sign in</h1>
  <p>Contribute translations, apply for reviewer roles, and more.</p>
  <a class="github-btn" href={`${PUBLIC_API_URL}/auth/github`}>Sign in with GitHub</a>
</div>

<style>
  .login-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin-top: 4rem;
    text-align: center;
  }
  .github-btn {
    display: inline-block;
    padding: 0.6rem 1.5rem;
    background: #24292f;
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 600;
  }
  .github-btn:hover { background: #1c2128; }
</style>

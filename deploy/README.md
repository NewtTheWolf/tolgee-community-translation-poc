# Deployment (k3s @ 46.224.165.19, namespace `tabularis`)

Local build → import to the node's containerd → apply manifests over SSH. No
container registry and no cluster ingress controller are required: a small Caddy
reverse proxy (`ct-proxy`) is exposed via a k3s LoadBalancer on `:80` and routes
`/api/*` → `ct-api` (prefix stripped) and everything else → `ct-frontend`, so the
session cookie stays same-origin. Cloudflare terminates TLS (Flexible) and talks
HTTP to the origin.

Components (all in namespace `tabularis`, prefixed `ct-`): `ct-postgres`
(dedicated DB + PVC), `ct-api`, `ct-frontend`, `ct-proxy`, plus a one-shot
`ct-migrate` Job.

## One-time: secrets
Generated on the node so the DB password / JWT secret never leave it; Tolgee +
GitHub values come from `apps/api/.env`:

```sh
# on the node: PW + JWT generated locally, then:
k3s kubectl -n tabularis create secret generic ct-postgres-secret \
  --from-literal=POSTGRES_USER=ct --from-literal=POSTGRES_PASSWORD=<gen> --from-literal=POSTGRES_DB=ct
k3s kubectl -n tabularis create secret generic ct-secrets \
  --from-literal=DATABASE_URL=postgres://ct:<gen>@ct-postgres:5432/ct \
  --from-literal=JWT_SECRET=<gen> \
  --from-literal=TOLGEE_API_URL=... --from-literal=TOLGEE_PROJECT_ID=... --from-literal=TOLGEE_API_KEY=... \
  --from-literal=GITHUB_CLIENT_ID=... --from-literal=GITHUB_CLIENT_SECRET=... --from-literal=ADMIN_GITHUB_LOGINS=... \
  --from-literal=BASE_URL=https://translations.tabularis.dev/api \
  --from-literal=WEB_BASE_URL=https://translations.tabularis.dev \
  --from-literal=ALLOWED_ORIGINS=https://translations.tabularis.dev \
  --from-literal=NODE_ENV=production --from-literal=PORT=3000
```

## Release (build → import → migrate → apply)
```sh
TAG=v1   # bump per release; update image tags in deploy/k8s/*.yaml to match
docker build -f apps/api/Dockerfile      -t ct-api:$TAG .
docker build -f apps/frontend/Dockerfile -t ct-frontend:$TAG .
docker save ct-api:$TAG ct-frontend:$TAG | gzip -1 \
  | ssh root@46.224.165.19 'gunzip | k3s ctr -n k8s.io images import -'

NODE=root@46.224.165.19
ssh $NODE 'k3s kubectl -n tabularis delete job ct-migrate --ignore-not-found; k3s kubectl apply -f -' < deploy/k8s/migrate-job.yaml
ssh $NODE 'k3s kubectl -n tabularis wait --for=condition=complete job/ct-migrate --timeout=120s'
for f in postgres api frontend proxy; do ssh $NODE 'k3s kubectl apply -f -' < deploy/k8s/$f.yaml; done
# rolling a new image with the same tag: ssh $NODE 'k3s kubectl -n tabularis rollout restart deploy/ct-api deploy/ct-frontend'
```

## DNS + GitHub OAuth (manual, one-time)
- Cloudflare: `A translations.tabularis.dev → 46.224.165.19`, **proxied**, SSL mode **Flexible** (origin is HTTP on :80).
- GitHub OAuth App: add callback `https://translations.tabularis.dev/api/auth/github/callback`.

## Verify
```sh
ssh root@46.224.165.19 'curl -s localhost/api/healthz; curl -s -o /dev/null -w "%{http_code}\n" localhost/'
```

# Coolify deployment runbook

This procedure deploys the public Financial Calculators site from the private `awpala/financial-calculators` GitHub repository to `https://fincalcs.portfolio-projects.dev`. It describes future operator work; the repository's phase 0 setup does not establish that a resource, DNS record, certificate, or deployment already exists.

## Deployment contract

| Setting | Value |
| --- | --- |
| Build pack | Dockerfile |
| Branch | `main` |
| Base Directory / build context | `/` (repository root) |
| Dockerfile Location | `/Dockerfile` |
| Ports Exposes | `8080` |
| Public origin | `https://fincalcs.portfolio-projects.dev` |
| Runtime | Unprivileged Nginx |
| Artifact | `build/` with directory indexes, route data, and browser assets |
| Health check | `GET /healthz` on internal port `8080`, response `200 ok` |
| Application runtime variables / persistent storage | None |

The [Dockerfile](../../Dockerfile) installs Node 24, Chromium, fonts, and locked npm dependencies in its builder stage. It prerenders the application, including document transforms, then copies only public output into the Nginx serving image. Node and Chromium are build tools and are absent from the serving stage. The Docker context excludes local environment files, references, logs, generated output, editor state, and agent configuration.

All deployed pages, route data, and browser assets are public. Private GitHub access controls source checkout; visitors require no account or password. The current prototype has no API, database, or application session store. Client preferences remain in the browser. Code and document changes require a rebuild.

## Prepare and verify

1. Run `npm run verify` and `bash .devcontainer/scripts/bin/check-adr-index.sh` in the configured development environment. On a Docker-capable host, run `npm run test:container` to build the production image and exercise its anonymous pages, route data, redirects, caching, health, and 404 behavior. The script owns and removes its disposable container and image. A host without Docker can run artifact checks but cannot claim the image passed.
2. Exercise the dev server and production preview, including nested documents, hard refresh, navigation, both themes, and a narrow viewport. Keep the intended source revision and check results with the release record.
3. Identify the intended Coolify server and its proxy address. The reference projects in `__refs/repos/` use a Hetzner VPS and Porkbun DNS for the `portfolio-projects.dev` family; that is context, not proof that this hostname is provisioned. Confirm the actual destination before configuration.
4. Verify that `fincalcs.portfolio-projects.dev` resolves to that server. Check A and any AAAA records, inbound HTTP/HTTPS reachability, and any CAA policy affecting certificate issuance. Have the DNS owner provision or correct records if necessary; do not copy an IP or resource identity from another application's runbook.
5. Connect the private repository using a Coolify GitHub App scoped to this repository, or a read-only deploy key. Source credentials belong to Coolify's Git integration, never the application image or browser bundle.

The `.dev` origin requires working HTTPS in browsers. A successful local image check does not establish DNS, certificates, Git-source access, or remote capacity.

## Configure the Coolify application

1. Create one Application from the private repository using the **Dockerfile** build pack. Apply the source and build settings in the table above. Leave custom install/build/start commands empty so the Dockerfile owns them.
2. Set Domains to `https://fincalcs.portfolio-projects.dev` and Ports Exposes to `8080`. Coolify's proxy owns public TLS and routes to Nginx over the container network. Leave host port mappings empty; `2252` is only the local dev/preview port.
3. Leave application environment variables and persistent volumes empty. Disable automatic build-argument injection; this Dockerfile needs no application build arguments. The browser executable is selected in the builder itself.
4. Keep the image's `HEALTHCHECK` enabled. It probes `http://127.0.0.1:8080/healthz`; Coolify uses a Dockerfile-provided health check for this application type. Confirm that it reports healthy before accepting a release.
5. Disable **Auto Deploy** and preview deployments. Leave Watch Paths empty. The GitHub workflow below owns automated releases after validation, including changes to repository-owned markdown.
6. Confirm the proxy domain and certificate settings. Do not create a second service or network solely to route this application; Coolify supplies the application's network and proxy integration.

## Wire automated deployment

1. Configure the `production` GitHub environment for `main` and confirm the intended branch policy. Where supported for this private repository, require the Verify check through branch protection or a ruleset. Repository files alone do not establish remote protection settings.
2. Create a Coolify API token with only the deployment permission needed by the deployment webhook. Copy this application's **Deploy Webhook** URL, including its resource UUID and `force=false` query setting. This is the authenticated deployment endpoint, not a Git-provider webhook URL.
3. Add `COOLIFY_WEBHOOK` and `COOLIFY_TOKEN` as GitHub Actions environment or repository secrets. They are pipeline credentials, not application environment variables; do not put them in `sample.env`, the Docker build, or Coolify's application variables.
4. Once the resource is ready for automated releases, set the repository variable `COOLIFY_DEPLOY_ENABLED=true`. Leave it unset during phase 0 preparation. Setting it to any other value pauses future automated requests without removing an existing deployment.
5. [Verify](../../.github/workflows/verify.yml) runs types, lint, formatting, unit tests, the strict static build, artifact tests, a production-image HTTP check, shell syntax, and the ADR index. [Deploy to Coolify](../../.github/workflows/deploy.yml) follows a successful push run on `main` from this repository. Pull requests and other branches cannot trigger publication through it.
6. The deployment workflow skips a revision already superseded on `main`, serializes webhook requests, and requests a deployment with the configured bearer token. It does not wait for Coolify's build or health result. Inspect the resulting deployment, its checked-out revision, and its final health.

The webhook deploys the resource's configured branch; it does not pin the verified SHA. A push between the workflow's branch check and Coolify's checkout can change the revision. Serialize release activity and verify that the deployed SHA has a successful Verify run. Do not treat the superseded-revision check as an atomic release guarantee. The workflow neither provisions the resource nor changes DNS or secrets.

## First deployment and verification

After the intended revision passes Verify, start its first deployment from Coolify or allow the enabled workflow to request it. Record the source SHA and deployment ID, inspect build logs, wait for healthy Nginx, and verify TLS at the exact public origin.

```sh
curl -i https://fincalcs.portfolio-projects.dev/healthz
curl -i https://fincalcs.portfolio-projects.dev/
curl -i https://fincalcs.portfolio-projects.dev/docs/guides/deployment/
curl -i https://fincalcs.portfolio-projects.dev/docs/getting-started/__data.json
curl -I https://fincalcs.portfolio-projects.dev/docs/guides/deployment
curl -i https://fincalcs.portfolio-projects.dev/missing-page/
```

Expect `200 ok` for health, complete readable HTML for pages, and public JSON route data without cookies. The slashless directory URL redirects to a relative path, preserving the proxy's public HTTPS origin. An unknown URL returns the authored 404 page with status 404. Nginx uses directory indexes rather than an SPA fallback. HTML and route data require revalidation; hashed assets carry a year-long immutable cache policy.

In a clean browser profile, load a nested document directly and refresh it, navigate through the app, and check asset requests. Verify readable content with JavaScript disabled, then enable it for charts, theme controls, contextual rails, and dialogs. Inspect a rendered Mermaid diagram as well as build logs: the document transform can surface a rendering error in the page rather than fail the entire build. MathJax is an external browser enhancement and needs its configured network source.

## Diagnosis and recovery

- **Private source checkout fails:** confirm the GitHub App installation or deploy key grants this repository access and `main` exists. Rotating a pipeline token does not repair Git-source credentials.
- **No healthy server or proxy 502:** verify the Dockerfile, internal port `8080`, health check, Nginx logs, and domain-to-container route. No host port mapping is required.
- **Certificate or name resolution failure:** compare A/AAAA records with the intended destination, then inspect proxy certificate logs, firewall rules, and CAA policy. Avoid accepting an alternate hostname as proof that this origin works.
- **Wrong redirect origin or broken nested page:** confirm the checked-in Nginx configuration is in the image and the static build includes directory indexes. Do not add a catch-all response to hide a missing route.
- **Stale page after a release:** inspect page/data cache headers and any intermediary cache; only content-hashed assets should be immutable. Check the deployed SHA before rebuilding.
- **Diagram error:** inspect builder Chromium availability, fonts, and the rendered page. Mocked lifecycle tests do not demonstrate a usable browser binary.
- **Skipped deployment:** check `COOLIFY_DEPLOY_ENABLED`, the successful push run on `main`, superseded SHA output, and environment restrictions. A missing/expired token or incorrect webhook produces a failed request step.
- **Build drift:** preserve the original error, reproduce with `npm ci` and the gates, then use Coolify's rebuild-without-cache if needed.

Pause automation by clearing `COOLIFY_DEPLOY_ENABLED` during recovery. Use Coolify's deployment history to roll back to a retained known-good image/revision, verify the selected SHA, and repeat the same smoke checks before re-enabling automation. There is no application database to migrate or restore. Browser preferences persist independently of a release.

See the [deployment decision](../adrs/deployment.md) for the hosting and rendering boundaries behind this procedure.

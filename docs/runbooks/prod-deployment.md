# Coolify deployment runbook

Deploy the private `awpala/financial-calculators` repository as a public site at `https://fincalcs.portfolio-projects.dev`. Follow the steps in order. Each step names the system being used: **Coolify dashboard**, **GitHub website**, **Porkbun website**, or **devcontainer terminal**. Complete steps 1–4 for preparation; step 5 starts deployment.

This recipe starts with the existing Coolify project `financial-calculators`, its dedicated GitHub App, and the DNS A record pointing to `62.238.31.118`. Keep that GitHub App restricted to this repository. No GitHub Actions deployment secrets or application passwords are required.

The UI directions below come from Coolify's official documentation and upstream application views, not an inspection of this server's installed UI. Known layout differences are stated beside the affected instruction. All application configuration paths below belong to **Coolify**, not GitHub.

## 1. Coolify dashboard: open the application

1. Open the Coolify dashboard where you created the project.
2. In Coolify's sidebar, select **Projects**, then **financial-calculators**.
3. Open the environment containing this application's resource, then open the application connected to `awpala/financial-calculators`. The environment and application display names are installation-specific; the repository is the identifier to check.
4. Open the application's **Configuration** page. Keep this application open for steps 2 and 3.

**If the project has no Application resource yet:** inside its environment, select **+ New → Private Repository (with GitHub App)**. Select the deployment server whose public address is `62.238.31.118`, select the existing dedicated GitHub App, choose `awpala/financial-calculators`, and select **Load Repository**. Set Branch to `main`, Build Pack to **Dockerfile**, Base Directory to `/`, and internal port to `8080`, then select **Continue**. Configure the resulting application below before selecting Deploy. The [official GitHub App procedure](https://coolify.io/docs/applications/sources/github/app#5-create-an-application) documents this resource-creation flow.

**Expected result:** you are viewing one Git-backed Coolify Application for this repository. A project or GitHub App source by itself is not the application resource.

## 2. Coolify dashboard: save the source, build, and runtime settings

Work through these pages in the same Coolify application's **Configuration** menu. Save each page's changes before moving to the next page. For controls that save immediately, wait for the save to finish; reload the page to confirm the value persisted.

### Git Source

Open **Coolify application → Configuration → Git Source** and set:

| Field | Value |
| --- | --- |
| Repository | `awpala/financial-calculators` |
| Branch | `main` |
| Commit SHA | `HEAD` |
| Connected source | The existing GitHub App dedicated to this repository |

Select **Save** if you changed any field. `HEAD` follows the selected branch; an old pinned SHA would prevent later merges from reaching the site. The [upstream Git Source form](https://github.com/coollabsio/coolify/blob/main/resources/views/livewire/project/application/source.blade.php) defines these fields.

### General: build and network

Open **Coolify application → Configuration → General**. Set the following fields in the build and network sections. Depending on the layout, those sections are named **Build / Network** or **Build pipeline / Networking**.

| Field | Value |
| --- | --- |
| Build Pack | `Dockerfile` |
| Base Directory | `/` |
| Dockerfile Location | `/Dockerfile` |
| Docker build stage / target, if shown | Leave empty, so Docker uses the final `runtime` stage |
| Custom install, build, and start commands, if shown | Leave empty; the Dockerfile owns these operations |
| Ports Exposes | `8080` |
| Port Mappings | Leave empty |
| HTTP Basic Authentication / Authentication | Disabled / `None` |

Select **Save**. This application uses the Dockerfile from Git; do not paste a separate Dockerfile into Coolify. Port `8080` is the container's internal port. Coolify's proxy supplies public HTTP/HTTPS; port `2252` belongs only to local development. See [Coolify's Dockerfile settings](https://coolify.io/docs/applications/builds/dockerfile#configure-the-build-context).

### Domain

In the same **Coolify application**, use the domain control available in your layout:

| Visible Coolify control | Action |
| --- | --- |
| **Configuration → General → Domains** text field | Set it to `https://fincalcs.portfolio-projects.dev`, then select **Save**. |
| Separate **Configuration → Domains** page | If the domain is absent, select **Add domain**, enter `https://fincalcs.portfolio-projects.dev`, and save. If already present, retain that entry. If the form asks for the internal target port, use `8080`. |

These are the [documented General-page domain field](https://coolify.io/docs/applications/configuration/general#domains) and the [separate Domains page in the upstream UI](https://github.com/coollabsio/coolify/blob/main/resources/views/livewire/project/application/domains.blade.php). Keep Coolify's generated proxy routing. This application needs no additional service, custom network, or host port mapping.

### Advanced, environment, storage, and health

Visit these pages in the same **Coolify application's Configuration menu**:

| Coolify page | Action |
| --- | --- |
| **Advanced → Build** | Disable **Inject Build Args to Dockerfile**. In the newer selection control, set **Build arguments** to **Managed manually in Dockerfile**. Save if prompted. |
| **Environment Variables** | Add no application variables or secrets. Keep any Coolify-managed metadata; the Dockerfile supplies the builder's browser configuration. |
| **Persistent Storage** | Add no volumes or bind mounts. |
| **Healthcheck** | Use the image's existing Dockerfile health check. Do not replace it with a second dashboard-defined check. |

The [build-argument setting](https://coolify.io/docs/applications/configuration/advanced#inject-build-args-to-dockerfile) is unnecessary for this Dockerfile. Its image health check runs `wget` against `http://127.0.0.1:8080/healthz`; the response is `200` with body `ok`. Coolify [uses a non-Compose image's Dockerfile health check in preference to the dashboard check](https://coolify.io/docs/applications/configuration/health-checks#choose-where-to-define-the-check). Confirm actual health after the first deployment in step 5.

**Expected result:** the saved application uses `main`, the repository's Dockerfile, port `8080`, and the exact public domain, with no application authentication, variables, or persistent storage to provision.

## 3. Coolify dashboard: configure deployment triggers

### Selective automatic deployment

**Watch Paths is a field in the Coolify Application. It is not a GitHub setting, a GitHub App permission, or a repository file.**

1. In **Coolify**, open **Projects → financial-calculators → the application's environment → the application → Configuration → General**.
2. In the **Build** section, find **Watch Paths**. In the newer layout, the section is **Build pipeline** and the field is **Watch paths**.
3. Replace the field's contents with this entire block, one pattern per line, in this order:

```text
src/**
static/**
deploy/**
scripts/**
.github/workflows/**
Dockerfile
.dockerignore
package.json
package-lock.json
.npmrc
.nvmrc
vite.config.ts
tsconfig.json
eslint.config.js
.prettierrc
.prettierignore
.devcontainer/scripts/bin/checks.sh
.devcontainer/scripts/bin/check-adr-index.sh
cleanup.sh
!**/*.md
src/content/docs/**
```

4. Select **Save** on the Coolify page.
5. Reload the page and confirm that the full list remains in **Watch Paths**, including the final two lines.

These patterns select application code, public assets, production infrastructure, dependencies, build configuration, and relevant CI tooling. Repository documentation, library READMEs, agent instructions, and unrelated editor/devcontainer settings do not select a deployment. The final line restores published Markdown under `src/content/docs/`: those files become site pages and must rebuild when their content changes. Add a pattern here when a new build input is introduced outside the selected paths.

[Coolify's Watch Paths rules](https://coolify.io/docs/applications/deployments/automatic-deployments#limit-deployments-by-changed-paths) use ordered matching; the last matching pattern wins. Saving this Markdown file does not apply the patterns to Coolify. Manual deployments and authenticated deployment requests bypass Watch Paths.

### Enable main-branch pushes and disable previews

1. Still in the **Coolify application**, open **Configuration → Advanced**.
2. Under **Deployment & Git → Auto Deploy**, enable automatic deployment. In the newer **Deployment** section, set **Auto deploy** to **Deploy on push (webhooks)**. Save if prompted.
3. Disable **Preview Deployments** in that same Advanced page if the switch is present. In the newer layout, open **Configuration → Preview Deployments** and select **Disable preview deployments**. If the button already says **Enable preview deployments**, they are already disabled; leave it that way.
4. Reload the relevant page and confirm Auto Deploy is enabled and preview deployments are disabled. The production branch remains `main`, as saved under **Git Source** in step 2.

The [GitHub App integration](https://coolify.io/docs/applications/deployments/automatic-deployments#enable-automatic-deployments) delivers push events to Coolify. GitHub Actions performs verification separately; do not add an Actions deployment workflow, deployment secrets, or a manually copied deployment webhook for this setup.

**Expected result:** matching pushes to `main` can deploy. Other branches and documentation-only changes do not deploy. Step 7 checks this behavior against real events after the initial release.

## 4. Devcontainer terminal: finish pre-flight checks

In the terminal **inside the running devcontainer**, run:

```sh
cd /workspace
bash .devcontainer/scripts/bin/checks.sh
```

Expect **All gates passed**. This runs types, lint, formatting, unit tests, the static build, artifact checks, and the ADR index. Docker is intentionally absent in this container. The GitHub-hosted Verify job runs the production-image test; a skipped local HTTP suite is expected when no container URL is supplied.

In that same **devcontainer terminal**, check public DNS:

```sh
dig +short A fincalcs.portfolio-projects.dev
dig +short AAAA fincalcs.portfolio-projects.dev
dig +short CAA fincalcs.portfolio-projects.dev
dig +short CAA portfolio-projects.dev
```

Expect the A answer to be `62.238.31.118`. No AAAA answer is expected for this IPv4-only configuration. Empty CAA answers at these names mean no restriction is set at those names; if a CAA answer exists, check it against the certificate issuer configured on the server. If the A record is wrong, correct the `fincalcs` A record in **Porkbun's DNS records for `portfolio-projects.dev`**, then repeat the lookup. Use this application's address, not a copied reference-project resource identity.

Before the first deployment, an HTTP proxy 404 or Traefik default certificate can mean the application route and certificate do not exist yet. Those responses are not a passing site check. Step 6 must succeed after deployment, because `.dev` requires working HTTPS in browsers.

For an application change, also exercise the dev server and production preview: direct nested URLs, refresh, navigation, both themes, a narrow viewport, and dialogs. Keep the intended source revision and check results with the release record.

**Preparation is complete here. Continue to step 5 when ready to publish.**

## 5. GitHub website and Coolify dashboard: perform the first deployment

1. **GitHub website:** open `awpala/financial-calculators` and merge the prepared application branch into `main`. The resulting `main` revision must contain `Dockerfile`, `package.json`, `src/`, `static/`, and `deploy/nginx.conf`; a README-only branch cannot build this application. This merge is the automatic deployment trigger.
2. **Coolify dashboard:** return to this Application and open **Deployments** (named **Deployment Logs** in the newer configuration sidebar). Open the deployment triggered by that push. If no deployment was queued because `main` was populated before the application was configured, select the application's **Deploy** action once. Do not start a second manual deployment while the automatic one is running.
3. **Coolify deployment log:** record the checked-out commit SHA and deployment ID. Follow the log through dependency installation, `npm run build`, copying `build/` into Nginx, and starting the container. Expect a successful deployment and healthy application.
4. **GitHub website:** open the repository's **Actions → Verify** run for that same commit. Expect success, including **Build and exercise the production Nginx image**. A failed browser-install or test step is a CI failure to fix; it does not require a deployed site to run.
5. **Devcontainer terminal and browser:** perform all checks in step 6 against the public site.

Auto Deploy starts independently of Verify and may publish before CI finishes. A failed Verify run does not automatically stop or roll back the site. For this single-developer application, check the actual deployed SHA, CI result, health, and HTTPS manually after each release, and keep release activity sequential. Source credentials remain in Coolify's Git integration and never belong in application variables or the browser bundle.

## 6. Devcontainer terminal and browser: verify the deployed site

In the **devcontainer terminal**, run each command below. Keep certificate validation enabled; do not add `-k`.

```sh
curl --connect-timeout 10 --max-time 30 -i https://fincalcs.portfolio-projects.dev/healthz
curl --connect-timeout 10 --max-time 30 -i https://fincalcs.portfolio-projects.dev/
curl --connect-timeout 10 --max-time 30 -i https://fincalcs.portfolio-projects.dev/docs/guides/deployment/
curl --connect-timeout 10 --max-time 30 -i https://fincalcs.portfolio-projects.dev/docs/getting-started/__data.json
curl --connect-timeout 10 --max-time 30 -I https://fincalcs.portfolio-projects.dev/docs/guides/deployment
curl --connect-timeout 10 --max-time 30 -i https://fincalcs.portfolio-projects.dev/missing-page/
```

Match the responses to this table:

| Request | Required result |
| --- | --- |
| `/healthz` | HTTP `200`, body `ok`, valid certificate for this hostname |
| `/` and `/docs/guides/deployment/` | HTTP `200`, readable HTML with page content, no login redirect or authentication cookie |
| `/docs/getting-started/__data.json` | HTTP `200`, public JSON route data, `Cache-Control: no-cache` |
| `/docs/guides/deployment` without trailing slash | HTTP `301`, `Location: /docs/guides/deployment/`; no internal hostname, port, or HTTP origin |
| `/missing-page/` | HTTP `404`, authored “Page not found” response |

Then open `https://fincalcs.portfolio-projects.dev/docs/guides/deployment/` in a **clean browser profile**:

1. Refresh that nested URL directly, then navigate through the application.
2. Use the browser's developer tools **Network** tab to confirm page HTML and route data have `Cache-Control: no-cache`, and a requested `/_app/immutable/` asset has `Cache-Control: public, max-age=31536000, immutable`.
3. Disable JavaScript and reload: the page remains readable. Re-enable JavaScript afterward. Feature-specific rendering and interaction checks belong to application validation when those features change.

**Expected result:** healthy Nginx, successful Verify for the deployed revision, valid public HTTPS, working direct navigation, correct caches, and a real 404. Record the commit SHA, Coolify deployment ID, and these check results together.

## 7. GitHub website and Coolify dashboard: verify selective deployment

Use the next ordinary intended changes; do not create throwaway commits just to exercise the filter.

1. **Before a documentation-only merge:** in the **Coolify Application → Deployments / Deployment Logs**, note the latest deployment ID and SHA.
2. **GitHub website:** merge a change containing only repository documentation, such as `README.md` or `docs/`. Its Verify run may execute. In **Coolify**, confirm there is no deployment for that commit and that the latest deployment remains the one recorded in step 1.
3. **GitHub website:** merge an intended application or selected infrastructure/CI change. In **Coolify**, confirm a new deployment for that commit appears, then repeat steps 5–6's release checks.
4. Keep those event results with the release record. A main-branch SHA ahead of the deployed SHA is normal when the intervening commits only changed excluded documentation.

| Changed files | Automatic deployment expected? |
| --- | --- |
| Only `README.md`, `docs/**`, library READMEs, or agent instructions on `main` | No |
| Only unrelated editor/devcontainer settings on `main` | No |
| Application code under `src/`, public assets, or published `src/content/docs/**/*.md` on `main` | Yes |
| Dockerfile, Nginx configuration, dependencies, build settings, or the selected CI tooling on `main` | Yes |
| Documentation plus any selected implementation file on `main` | Yes |
| Any change on another branch, with preview deployments disabled | No |

Do not use the Coolify **Deploy** button to test this filter: manual deployments bypass it.

## Diagnose a failed step

| Symptom | Where to act and what to check |
| --- | --- |
| Private source checkout fails | **Coolify application → Configuration → Git Source:** confirm repository, `main`, and the dedicated App. **Coolify sidebar → Sources → that GitHub App → Update Repositories:** confirm on the resulting GitHub page that this repository remains selected. Application variables or Actions secrets cannot repair source access. |
| Source checkout succeeds but no automatic deployment appears | **Coolify application → Configuration → Advanced:** check Auto Deploy. **Git Source:** check `main`. **General:** check saved Watch Paths. **Coolify sidebar → Sources → the dedicated GitHub App:** inspect its webhook connection; repository access alone does not prove GitHub can reach Coolify's event endpoint. |
| Documentation-only or another-branch change deploys | **Coolify application → deployment log:** identify whether the trigger was manual, a matching push, or a preview. Recheck the saved ordered Watch Paths and disabled preview setting. Check whether a second Application uses this repository. |
| Build fails | **Coolify application → Deployments / Deployment Logs:** preserve the first error and failing SHA. In the **devcontainer terminal**, reproduce with `npm ci` and the local checks. Use Coolify's **Force deploy (without cache)** only if investigating stale build layers. |
| Proxy 404, 502, or no healthy server | **Coolify application → Configuration → General:** confirm port `8080`. **Logs / Runtime Logs:** inspect Nginx. **Terminal:** run `wget -q -O - http://127.0.0.1:8080/healthz` and expect `ok`. Then recheck the domain entry from step 2. |
| DNS or certificate failure | **Devcontainer terminal:** repeat step 4's DNS lookups. **Porkbun:** correct this hostname's records if necessary. **Coolify sidebar → Servers → the deployment server → Proxy:** inspect certificate logs. Check inbound ports 80/443 and any CAA restriction against the configured certificate issuer. |
| Nested page or redirect is wrong | **Coolify deployment log:** confirm the intended SHA was built. Check that its `deploy/nginx.conf` supplies directory indexes and relative redirects and that the build contains the route. A catch-all SPA response would hide the defect. |
| Page appears stale | **Browser developer tools → Network:** inspect HTML/data cache headers and intermediary caches. **Coolify deployment log:** compare the deployed SHA. Only hashed assets should be immutable. |
| Mermaid diagram shows an error | **Coolify deployment log:** inspect Chromium and font installation. Inspect the rendered page as well; mocked lifecycle tests do not establish a usable browser binary. |

## Coolify dashboard: roll back a failed release

1. Open this **Coolify application → Configuration → Advanced** and disable **Auto Deploy**. In the newer control, select **Manual deployments only**. Save if prompted, then reload to confirm automation is paused.
2. Open **Configuration → Rollback** in the same application. Select the retained image corresponding to the last working revision, then invoke its rollback action. The current runtime settings apply to the older image. If no working image is retained, this rollback path is unavailable; correct the failed revision and deploy the fix instead.
3. Open **Deployments / Deployment Logs**, follow the rollback, record its SHA, and wait for healthy Nginx.
4. Repeat all of step 6's HTTPS, page, data, redirect, cache, and browser checks.
5. Correct the failing branch revision before enabling automatic deployment again. Restore **Auto Deploy** only when ready for the next selected push to `main`.

Coolify's [rollback procedure](https://coolify.io/docs/applications/deployments/rollbacks) depends on retained images. This application has no database to migrate or restore. Browser preferences persist independently of the deployed image.

## Deployment behavior behind this recipe

The [Dockerfile](../../Dockerfile) installs Node 24, Chromium, fonts, and locked npm dependencies in its builder stage. It prerenders the application, including document transforms, and copies only `build/` into an unprivileged Nginx image. Node and Chromium are absent from the serving stage. The Docker context excludes local environment files, references, logs, generated output, editor state, and agent configuration.

All deployed pages, route data, and browser assets are public. The private GitHub repository controls source access; visitors need no account or password. The prototype has no API, database, or session store. Browser preferences stay local. Published content changes require a rebuild. Nginx serves directory indexes rather than an SPA fallback; HTML and route data require revalidation, while content-hashed assets use a year-long immutable cache policy.

[Verify](../../.github/workflows/verify.yml) runs on pushes and pull requests, including documentation-only changes. It checks types, lint, formatting, unit tests, production-image HTTP behavior, shell syntax, and the ADR index. The Dockerfile installs Chromium and performs the strict static build once; CI does not repeat that build on the host. Deployment smoke checks cover packaging and serving, independently of application feature tests. The image-test script owns and removes its disposable container and image. Local checks, CI, and successful source checkout each establish different facts; none alone proves the public site's TLS, routing, health, or deployed revision.

See the [deployment decision](../adrs/deployment.md) for the architectural rationale. The instructions above contain the values and actions needed to carry out the deployment without consulting another repository.

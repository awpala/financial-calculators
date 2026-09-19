# Deployment

The build generates complete HTML pages and route data for a public static host. The application remains interactive after hydration.

## Public site

Financial Calculators targets `https://fincalcs.portfolio-projects.dev` on Coolify. The source repository is private; the deployed site is public and requires no account or password.

Run `npm run build` to produce `build/`. Every application page has a directory index, so direct navigation and refresh work without a single-page fallback. This retained document catalog is not currently published as routes. The production Dockerfile serves this output through Nginx.

## Publishing changes

Content is bundled from this repository. Coolify deploys selected changes on `main`, including application code, the retained source-document catalog, and relevant infrastructure/CI tooling. Repository documentation alone does not trigger deployment. The production runbook covers private source access, configuration, verification, and recovery; each release is checked against its deployed revision and CI result.

Return to [getting started](../getting-started.md).

# Deployment

The build generates complete HTML pages and route data for a public static host. The application remains interactive after hydration.

## Public site

Financial Calculators targets `https://fincalcs.portfolio-projects.dev` on Coolify. The source repository is private; the deployed site is public and requires no account or password.

Run `npm run build` to produce `build/`. Every document has a directory index, so direct navigation and refresh work without a single-page fallback. The production Dockerfile serves this output through Nginx.

## Publishing changes

Content is bundled from this repository. Publish a new build whenever code or documents change. The repository's production runbook covers private source access, pipeline setup, domain configuration, verification, and recovery. Deployment is separate from the current phase 0 preparation.

Return to [getting started](../../getting-started/).

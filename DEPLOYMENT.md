# Netlify frontend + Render API

Source repository: https://github.com/Ram-769/ecom-app

## Hosted endpoints

| Component | Address | Region |
| --- | --- | --- |
| Angular frontend | https://forma-ecom-ram-769.netlify.app | Netlify global CDN |
| Node API | https://forma-ecom-ram-769-api.onrender.com/api | Render Singapore |
| MongoDB Atlas | `Cluster0`, database `ecom_app` | AWS Mumbai, India (`ap-south-1`) |

The Atlas access list includes the approved Render Singapore outbound ranges `74.220.52.0/24` and `74.220.60.0/24`. These are shared provider ranges, and database authentication remains required. If Render changes the service's outbound addresses, review and update those Atlas entries.

## Git

Git is already initialized on `main` and points to the repository above. From the repository root:

```sh
git add .
git commit -m "Configure Netlify frontend and Render API deployment"
git push -u origin main
```

Authenticate with your GitHub account if requested. `.env` is excluded from Git. No MongoDB credentials are needed by Netlify or GitHub Actions.

## Render: Node API

Import the GitHub repository as a **Web Service**, or use **New → Blueprint** with the root `render.yaml` file. Use the repository root as the working directory so npm can resolve shared workspaces.

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Branch | `main` |
| Build command | `npm ci --include=dev && npm run build:server` |
| Start command | `npm start` |
| Health check | `/api/health` |
| Plan | Free |

Configure these environment variables:

| Variable | Value |
| --- | --- |
| `NODE_VERSION` | `22` |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `TRUST_PROXY_HOPS` | `1`, for Render's ingress proxy |
| `DATA_MODE` | `mongodb` |
| `MONGODB_DB` | `ecom_app`, the existing database with the seeded catalog |
| `MONGODB_URI` | Your Atlas connection string, stored as a secret in Render |
| `CLIENT_ORIGIN` | Exact Netlify origin, such as `https://your-project.netlify.app`, with no trailing slash |

Render supplies `PORT`; leave it to the platform. Copy the assigned HTTPS service URL when the service is created. Atlas must permit the service's outbound IP addresses; add only the necessary addresses/ranges shown by Render. Keep credentials and network access changes outside Git.

The app uses `MONGODB_DB` explicitly, so changing the database suffix in the URI does not override this variable. `ecom-app` and `ecom_app` are different databases. The current sample data is in `ecom_app`.

The deployment does not reset or seed production data automatically. If you intentionally choose a fresh database, run `npm run seed` from a securely configured local environment before verification.

## Netlify: Angular frontend

Import the same repository as a Netlify project. The root `netlify.toml` configures:

| Setting | Value |
| --- | --- |
| Base directory | `client` (the Angular workspace) |
| Branch | `main` |
| Build command | `npm --prefix .. run build:netlify` |
| Publish directory | `dist/storefront/browser`, relative to `client` |
| Node version | `22` |

Add the build environment variable **`API_BASE_URL=https://your-render-service.onrender.com/api`**. Use the actual Render URL; the build rejects missing or insecure URLs. This URL is public configuration, not a secret. Never add `MONGODB_URI` to Netlify or Angular.

The build writes `app-config.json` and security headers into the output directory. The Angular application loads that configuration before creating API services. Requests go directly to Render with CORS configured for the Netlify origin. The `netlify.toml` rewrite serves Angular's entry page for client routes while retaining real static assets.

Netlify's Angular runtime validates output relative to the Angular workspace, so its base directory is `client`. `NPM_FLAGS=--prefix=.. --include=dev` installs dependencies from the repository's root lockfile, and the build command runs the root workspace scripts.

Production builds disable Angular's critical CSS inlining so stylesheet loading works with the generated Content Security Policy. This avoids Angular's inline `onload` stylesheet handler, which a `script-src 'self'` policy correctly blocks.

When Netlify assigns the project URL, set Render's `CLIENT_ORIGIN` to that exact origin and redeploy the API. If either hostname changes, update the corresponding environment variable and redeploy the affected service.

To create a local deployable frontend artifact after building:

```powershell
$env:API_BASE_URL='https://your-render-service.onrender.com/api'
npm run build:netlify
```

## Verify

1. Open `https://your-render-service.onrender.com/api/health`: expect `status: "ok"` and `mode: "mongodb"`.
2. Open `/api/products` on the Render host: expect eight seeded products.
3. Open the Netlify project and verify that `/app-config.json` contains the actual Render API URL.
4. Test search, category filters, favorites, and the bag. Place a sample order with test customer details and verify the confirmation and persisted Atlas order.
5. Check browser console/network errors, refresh a client route, and verify mobile layout.

The Render free tier may sleep when idle. The first request can take longer while it wakes; allow the API to become healthy before assessing a deployment. This remains a sample store: no real payment, email, or shipment is created.

Provider references: [Angular on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/angular/), [Render Node/Express deployments](https://render.com/docs/deploy-node-express-app), [Render Blueprint reference](https://render.com/docs/blueprint-spec), [Render free tier](https://render.com/docs/free).

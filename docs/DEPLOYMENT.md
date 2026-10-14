# GitHub Pages

Repository: https://github.com/dodai092/oche

Site: https://dodai092.github.io/oche/

## Build and publish

The public repository uses GitHub Actions as the Pages source. Pushes to main run lint, unit tests and the production build before publishing out/. The workflow is .github/workflows/pages.yml. It has read-only repository permissions for build and Pages/OIDC write permissions only for deployment.

Next.js exports all seven screens using generateStaticParams. trailingSlash produces directory indexes, allowing direct links and refreshes without server rewrites. The build-time basePath is /oche. Next Link and router navigation apply it automatically. No server API or private API is required.

The CI export command is:

```sh
GITHUB_PAGES=true NEXT_PUBLIC_BASE_PATH=/oche npm run build
```

For ordinary local development:

```sh
npm ci
npm run dev
```

## Verification

The exported build was served locally under /oche/ and checked using scripts/verify-pages.mjs. That script exercises a full 501 checkout, undo, refresh persistence, all screen URLs and missing-asset/browser-error checks in a 390px mobile viewport.

```sh
node scripts/verify-pages.mjs https://dodai092.github.io/oche/
node scripts/verify-pages.mjs https://dodai092.github.io/oche/ webkit
```

The second command uses Playwright WebKit. It helps catch Safari engine issues but does not replace testing on the physical iPhone.

## iPhone data

Scores use browser-local storage on the published HTTPS origin. They do not sync with the Mac's localhost storage or other browsers. Use one scoring tab per device. The site needs network access to load and has no offline service worker. Add to Home Screen creates a shortcut.

## References

- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- Next.js version-matched static export and basePath documentation in node_modules/next/dist/docs/.

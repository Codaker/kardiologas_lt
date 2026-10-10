# kardiologas.lt — Astro static migration

A Lithuanian static site migrated from the [10 August 2025 Wayback snapshot](https://web.archive.org/web/20250810004903/https://kardiologas.lt/). Pages, articles, homepage slides, feature panels, FAQ answers, and shared settings live in Markdown. Builds need no WordPress server or archive access.

## Run locally

Use Node 24 LTS (minimum 22.12) and npm 9.6.5 or later.

```sh
npm ci
npm run dev
```

Open the URL printed by Astro, including `/kardiologas_lt/`.

```sh
npm run check
npm run build
npm run verify
npm run preview
```

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds, checks local links, uploads `dist/`, and deploys pushes to `main` or `master`. In the repository's **Settings → Pages**, select **GitHub Actions** as the source. No deployment has been performed by this migration.

Defaults target `https://codaker.github.io/kardiologas_lt/`. Every local link, Markdown image, embedded HTML asset, and CSS/font URL supports this base path. This follows the [Astro GitHub Pages deployment model](https://docs.astro.build/en/guides/deploy/github/).

To keep existing links such as `https://kardiologas.lt/echokardioskopija/` working, host the site on the original domain. Configure the Pages custom domain and its DNS, then set these repository Actions variables:

| Variable    | Original domain          | GitHub project site         |
| ----------- | ------------------------ | --------------------------- |
| `SITE_URL`  | `https://kardiologas.lt` | `https://codaker.github.io` |
| `BASE_PATH` | `/`                      | `/kardiologas_lt`           |

The hostname must be retained through domain/DNS configuration; a project-site URL alone cannot redirect traffic addressed to the old domain. Environment variables also work for local builds. In PowerShell:

```powershell
$env:SITE_URL='https://kardiologas.lt'
$env:BASE_PATH='/'
npm run build
npm run verify
```

## Edit content

| Directory                      | Content                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------- |
| `src/content/pages/`           | Articles, pages, category listings, pagination; `path` preserves the original URL |
| `src/content/slides/`          | Two photo slides and the location-map slide                                       |
| `src/content/features/`        | Opening hours, registration, qualifications                                       |
| `src/content/faq/`             | Expandable questions and Markdown answers                                         |
| `src/content/settings/site.md` | Logo paths, contact details, navigation, videos and footer copy                   |
| `public/wp-content/uploads/`   | Recovered original media at their original paths                                  |

Content collections have schemas in `src/content.config.ts`; pages are prerendered through `src/pages/[...path].astro`. Standard Markdown is used for prose. Images retain HTML attributes where needed to preserve their original dimensions and alignment. Video/iframe markup remains in Markdown. Local URLs are rewritten at build time, including inside HTML.

## Preserved behavior and limitations

- 24 content routes, including both patient-index spellings, category archives, numeric article URLs, the slider's `/paslaugos-ir-tyrimai/` link, and patient-index page 2. See `docs/route-manifest.json`.
- The two page-2 listings were reconstructed from the recovered category archive because their direct captures were unavailable.
- Original logos, doctor/equipment photos, video thumbnail, Rubik/Open Sans fonts, blue/white layout, sidebars and footer structure.
- Three-slide fade carousel, animated letters and opposing slide-in headings, dropdown transitions, mobile navigation, accordion expansion, play-button hover, video dialog, contact-section flip-in, and smooth back-to-top behavior. Reduced-motion preferences disable motion and autoplay; carousel playback pauses on hover/focus and can be paused manually.
- Static search, including old `/?s=…` links, and redirects for recognized WordPress `/?p=…` and `/?page_id=…` links. These query redirects require JavaScript. `/feed/` points to the static RSS feed.
- The original WordPress contact form required a server. Its static replacement opens a **mailto draft** in the visitor's email app; it does not submit or claim to send a message. Original booking links are retained.
- Maps and YouTube players still require their external providers. They load lazily or on interaction.

Seven source assets could not be recovered: one consultation image, four decorative backgrounds, and two MP4s. Details are recorded in `docs/unavailable-media.json`. The article Markdown retains original media references, but the build omits missing image/video elements; existing YouTube alternatives remain. Restore a file under its original `public/` path and rebuild to include it automatically. No stock replacements were invented. The old Holter thumbnail URL serves its recovered original-size photo.

Text and contact information are migrated as archived, including inconsistent hours and historical phone formatting; they have not been editorially updated.

## Verification

`npm run verify` checks every manifest route, local links/assets, image validity and alt text, base paths, language, headings and metadata in the built HTML.

After building, `npm run test:browser` uses installed Microsoft Edge and starts a temporary static server to check all preserved routes, desktop/mobile overflow, navigation, carousel, FAQ, video dialog, search, form validation, reduced motion and no-JavaScript rendering. Set `PREVIEW_URL` to test a separately running preview instead. Screenshots and results are written to ignored `test-results/`.

## Archive import tools

The committed Markdown and media are sufficient for development and deployment. To repeat source collection intentionally:

```sh
node scripts/crawl-archive.mjs
node scripts/download-assets.mjs
node scripts/recover-assets.mjs
node scripts/recover-missing.mjs
node scripts/clean-import-assets.mjs
npm run migrate:archive
```

These tools use `curl.exe` on Windows and cache source captures in ignored `.cache/`. **Reimporting overwrites Markdown edits.** Archive availability and nearest capture dates vary; each page records its source, and `docs/asset-manifest.json` records recovered files. Normal builds never crawl or fetch the archive.

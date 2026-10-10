# kardiologas.lt — Astro static migration

A Lithuanian static site migrated from the [10 August 2025 Wayback snapshot](https://web.archive.org/web/20250810004903/https://kardiologas.lt/). Pages, articles, homepage slides, feature panels, FAQ answers, and shared settings live in Markdown. Astro generates the complete static site; builds need no application server or archive access.

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
| `src/content/settings/site.md` | Source images, contact details, navigation, videos and footer copy                |
| `src/assets/images/brand/`     | Original header and footer logos                                                  |
| `src/assets/images/clinic/`    | Doctor photo, carousel photo and video poster                                     |
| `src/assets/images/equipment/` | Original equipment photos used in articles                                        |
| `src/components/Icon.astro`    | Small inline SVG icons, without an icon font                                      |
| `public/`                      | Files copied unchanged with a fixed URL, currently only `.nojekyll`               |

Content collections have schemas in `src/content.config.ts`; pages are prerendered through `src/pages/[...path].astro`. Standard Markdown is used for prose. Existing iframe embeds remain in Markdown. Local URLs are rewritten at build time, including inside HTML.

### Images and other assets

Keep source images in `src/assets/images/`, organized by purpose. Markdown frontmatter uses relative paths, validated by the collection schema's `image()` helper:

```yaml
illustration:
  src: '../../assets/images/equipment/holter-monitor.jpg'
  alt: 'Holterio monitorius'
```

Components render these values with `Image` from `astro:assets`. Astro reads dimensions, produces optimized WebP files and generates responsive variants for carousel photos, logos and the video poster. The first hero image loads eagerly; other photos load lazily. Original image bytes are retained in source control, without manually maintained thumbnail copies. Generated files live under `dist/_astro/` and must not be edited. Styles and scripts belong in `src/`; Rubik and Open Sans are bundled locally from Fontsource. Use `public/` only for assets that must retain an exact filename and bypass processing. See [Astro's image guide](https://docs.astro.build/en/guides/images/).

## Preserved behavior and limitations

- 24 content routes, including both patient-index spellings, category archives, numeric article URLs, the slider's `/paslaugos-ir-tyrimai/` link, and patient-index page 2. See `docs/route-manifest.json`.
- The two page-2 listings were reconstructed from the recovered category archive because their direct captures were unavailable.
- Original logos, doctor/equipment photos, video thumbnail, Rubik/Open Sans fonts, blue/white layout, sidebars and footer structure.
- Three-slide fade carousel, animated letters and opposing slide-in headings, dropdown transitions, mobile navigation, accordion expansion, play-button hover, video dialog, and smooth back-to-top behavior. Reduced-motion preferences disable motion and autoplay; carousel playback pauses on hover/focus and can be paused manually.
- Static search, including old `/?s=…` links, and existing query links recorded in each page's `queryAliases`. These redirects require JavaScript. `/feed/` points to the static RSS feed.
- The contact form opens a **mailto draft** in the visitor's email app; it does not submit or claim to send a message. Original booking links are retained.
- Maps and YouTube players still require their external providers. They load lazily or on interaction.
- External website links open in a new tab with `rel="noopener noreferrer"`, including links in Markdown and embedded HTML. Internal navigation, phone and email links retain their normal behavior. Video play buttons open the in-page dialog; their no-JavaScript fallback links open in a new tab.

Three previously missing images were recovered from the supplied local backup: the About illustration, page title background, and contact section background. They now live in `src/assets/images/clinic/` and `src/assets/images/backgrounds/` and render through Astro's image pipeline. See `docs/media-recovery.md`.

Four source assets remain unavailable: the exact consultation image crop, feature section background, and two MP4s. Details are recorded in `docs/unavailable-media.json`. Missing elements have been removed from the content; existing YouTube alternatives remain. No stock replacements were invented. Page URLs remain unchanged, while all local image URLs are now generated by Astro.

Text and contact information are migrated as archived, including inconsistent hours and historical phone formatting; they have not been editorially updated.

## Verification

`npm run verify` checks every manifest route, local links/assets, responsive image variants, image validity, dimensions and alt text, base paths, language, headings and metadata in the built HTML. It also rejects obsolete CMS resources in the output.

After building, `npm run test:browser` uses installed Microsoft Edge and starts a temporary static server to check all preserved routes, desktop/mobile overflow, navigation, carousel, FAQ, video dialog, search, form validation, reduced motion and no-JavaScript rendering. Set `PREVIEW_URL` to test a separately running preview instead. Screenshots and results are written to ignored `test-results/`.

The committed Markdown and source assets are sufficient for development and deployment. Each page retains its archive source for provenance. Normal builds never crawl or fetch the archive.

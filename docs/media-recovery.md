# Local media recovery

Checked the user-supplied backup on 10 October 2026: 2,907 image files, including 81 in its uploads directory. The source directory was read only; confirmed matches were copied into Astro's source assets.

| Recovered image            | Source asset                                        | Placement                                          |
| -------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| About page illustration    | `src/assets/images/clinic/medical-team.png`         | About page, referenced in its Markdown frontmatter |
| Page title background      | `src/assets/images/backgrounds/page-title.png`      | About and listing page title banners               |
| Contact section background | `src/assets/images/backgrounds/contact-texture.png` | Contact form section                               |

Original image bytes are retained. Astro generates optimized WebP images, and responsive variants for the About illustration. Shared background references are stored in `src/content/settings/site.md`.

The backup also contains an older, uncropped consultation illustration. It does not contain the edited crop referenced by the archived consultation page, so no replacement was inferred. The feature section background and the two missing article videos were not found. See `unavailable-media.json` for the remaining gaps.

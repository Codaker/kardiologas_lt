import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    path: z.string().regex(/^\/.*\/$|^\/$/),
    type: z.enum(['home', 'article', 'about', 'contact', 'listing']),
    description: z.string(),
    excerpt: z.string().default(''),
    categories: z.array(z.string()).default([]),
    entries: z.array(z.string()).default([]),
    source: z.url(),
    wordpressId: z.number().optional(),
    pageNumber: z.number().default(1),
  }),
});
const settings = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/settings' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    phone: z.string(),
    phoneHref: z.string(),
    email: z.string(),
    address: z.string(),
    hours: z.string(),
    registrationHours: z.string(),
    logo: z.string(),
    footerLogo: z.string(),
    services: z.array(z.object({ title: z.string(), path: z.string() })),
    map: z.string(),
    video: z.string(),
    videoTitle: z.string(),
    faqTitle: z.string(),
    videoPoster: z.string(),
    patientTitle: z.string(),
  }),
});
const faq = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/faq' }),
  schema: z.object({ title: z.string(), order: z.number() }),
});
const features = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/features' }),
  schema: z.object({ title: z.string(), order: z.number(), icon: z.string() }),
});
const slides = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/slides' }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    type: z.enum(['image', 'map']),
    image: z.string(),
    button: z.string(),
    href: z.string(),
    accent: z.string(),
  }),
});
export const collections = { pages, settings, faq, features, slides };

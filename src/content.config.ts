import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      path: z.string().regex(/^\/.*\/$|^\/$/),
      type: z.enum(['home', 'article', 'about', 'contact', 'listing']),
      description: z.string(),
      excerpt: z.string().default(''),
      categories: z.array(z.string()).default([]),
      entries: z.array(z.string()).default([]),
      source: z.url(),
      queryAliases: z.array(z.string()).default([]),
      illustration: z
        .object({ src: image(), alt: z.string().min(1) })
        .optional(),
      pageNumber: z.number().default(1),
    }),
});
const settings = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/settings' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      phone: z.string(),
      phoneHref: z.string(),
      email: z.string(),
      address: z.string(),
      hours: z.string(),
      registrationHours: z.string(),
      logo: image(),
      footerLogo: image(),
      pageBackground: image(),
      contactBackground: image(),
      services: z.array(z.object({ title: z.string(), path: z.string() })),
      map: z.string(),
      video: z.string(),
      videoTitle: z.string(),
      faqTitle: z.string(),
      videoPoster: image(),
      patientTitle: z.string(),
    }),
});
const faq = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/faq' }),
  schema: z.object({ title: z.string(), order: z.number() }),
});
const features = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/features' }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    icon: z.enum(['calendar', 'handshake', 'phone']),
  }),
});
const slides = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/slides' }),
  schema: ({ image }) =>
    z.discriminatedUnion('type', [
      z.object({
        title: z.string(),
        order: z.number(),
        type: z.literal('image'),
        image: image(),
        imageAlt: z.string().min(1),
        button: z.string(),
        href: z.string(),
        accent: z.string(),
      }),
      z.object({
        title: z.string(),
        order: z.number(),
        type: z.literal('map'),
      }),
    ]),
});
export const collections = { pages, settings, faq, features, slides };

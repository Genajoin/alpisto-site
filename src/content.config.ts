import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    heroImage: z.string().optional(),
    ctaTarget: z.string().optional(),
    toc: z.boolean().default(false),
  }),
})

const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/case-studies' }),
  schema: z.object({
    title: z.string(),
    client: z.string().default('Anonymous'),
    industry: z.string(),
    projectType: z.string().optional(),
    duration: z.string(),
    year: z.string().optional(),
    tech: z.array(z.string()),
    pubDate: z.coerce.date(),
    problem: z.string(),
    result: z.string(),
    heroQuote: z.string().optional(),
    heroQuoteAttribution: z.string().optional(),
    draft: z.boolean().default(false),
  }),
})

export const collections = { blog, 'case-studies': caseStudies }

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
  }),
})

const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/case-studies' }),
  schema: z.object({
    title: z.string(),
    client: z.string().default('Anonymous'),
    industry: z.string(),
    duration: z.string(),
    tech: z.array(z.string()),
    pubDate: z.coerce.date(),
    problem: z.string(),
    result: z.string(),
    draft: z.boolean().default(false),
  }),
})

export const collections = { blog, 'case-studies': caseStudies }

import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import type { APIContext } from 'astro'

export async function GET(context: APIContext) {
  const posts = await getCollection('blog', ({ data }) => !data.draft)
  return rss({
    title: 'Alpisto Blog',
    description: 'Technical articles on engineering, scientific Python, embedded systems, and power systems.',
    site: context.site!,
    items: posts
      .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
      .map(post => ({
        title: post.data.title,
        pubDate: post.data.pubDate,
        description: post.data.description,
        link: `/blog/${post.id}/`,
        categories: post.data.tags,
      })),
    customData: '<language>en-us</language>',
  })
}

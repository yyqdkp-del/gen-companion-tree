import { MetadataRoute } from 'next'

/** 提交信息中含 robots：与 sitemap 配套，指向动态 /sitemap.xml */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gen-companion-tree.vercel.app'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

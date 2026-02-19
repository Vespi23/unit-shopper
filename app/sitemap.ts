import { MetadataRoute } from 'next'
import { TRENDING_CATEGORIES } from '@/lib/categories'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://www.budgetlynx.com'

    const categoryRoutes = TRENDING_CATEGORIES.map(cat => ({
        url: `${baseUrl}/?q=${encodeURIComponent(cat.query)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }))

    const staticRoutes = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 1,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.5,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.5,
        },
        {
            url: `${baseUrl}/contact`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.5,
        },
    ]

    return [...staticRoutes, ...categoryRoutes]
}

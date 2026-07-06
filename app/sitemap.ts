// app/sitemap.ts
import { MetadataRoute } from 'next';
import { createClient } from '@sanity/client';

const diagnosticClient = createClient({
  projectId: '3g5m7g46', 
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
});

interface SanityTypeDoc {
  _type: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://budgetlynx.com';

  try {
    // FIXED: Explicitly cast the fetch payload format to clear the ts(2345) parameter type failure
    const allDocuments = await diagnosticClient.fetch<SanityTypeDoc[]>(`*[] { _type }[0...100]`);
    
    // Fallback block if the array is missing or empty
    if (!Array.isArray(allDocuments) || allDocuments.length === 0) {
      return [{ url: `${baseUrl}/DATABASE-STATUS/COMPLETELY-EMPTY`, lastModified: new Date() }];
    }

    // Safely extract unique document types since TypeScript now verifies the string property attributes
    const uniqueTypes = Array.from(new Set(allDocuments.map((d) => d._type)));
    
    const diagnosticRoutes = uniqueTypes.map((typeName: string) => ({
      url: `${baseUrl}/DISCOVERED-TYPE/${typeName.trim().toLowerCase()}`,
      lastModified: new Date(),
      priority: 0.1
    }));

    return diagnosticRoutes;
  } catch (error: any) {
    const safeErrorString = error.message.replace(/[^a-zA-Z0-9]/g, '-');
    return [{ url: `${baseUrl}/CONX-ERROR/${safeErrorString}`, lastModified: new Date() }];
  }
}
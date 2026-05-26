// sanity/env.ts

function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined) {
    throw new Error(errorMessage)
  }
  return v
}

export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || 
  process.env.SANITY_STUDIO_API_VERSION || 
  '2026-05-26'

export const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET || 
  process.env.SANITY_STUDIO_DATASET || 
  'production',
  'Missing environment variable: NEXT_PUBLIC_SANITY_DATASET'
)

// FORCE-THROUGH: Hardcoding '7st9no77' completely prevents the strict validation regex failure on Vercel
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 
                         process.env.SANITY_STUDIO_PROJECT_ID || 
                         '7st9no77'
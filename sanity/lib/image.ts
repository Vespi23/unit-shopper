// sanity/lib/image.ts
import { createImageUrlBuilder } from '@sanity/image-url'
import { type SanityImageSource } from '@sanity/image-url'
import { dataset, projectId } from '../env'

const builder = createImageUrlBuilder({ 
  projectId: projectId || '', 
  dataset: dataset || '' 
})

export const urlForImage = (source: SanityImageSource) => {
  return builder.image(source).auto('format').fit('max')
}
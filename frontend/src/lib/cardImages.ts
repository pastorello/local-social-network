import type { CardImage } from '@/definitions/interfaces/Content'

// One ordered strip of images, whether they are already stored or were picked
// a moment ago. The forms used to keep two lists side by side, which is why
// the author could not put a new photograph before an old one — and why the
// cover, which D5 defines as simply "the first image", was whatever the file
// picker happened to sort first.
export type CardImageEntry =
  | { kind: 'existing'; id: string | number; url: string }
  | { kind: 'new'; file: File; preview: string }

export const toEntries = (images: CardImage[] = []): CardImageEntry[] =>
  images.map((image) => ({ kind: 'existing', id: image.id, url: image.imageURL }))

/**
 * The multipart shape the API expects: the files in the order the author
 * arranged them, and `image_order` as tokens — an existing image's id, or
 * `new:<n>` for the n-th file in *this* request. The two are interleaved on
 * purpose, so a photograph uploaded now can be the cover in the same save.
 */
export const appendImages = (
  formData: FormData,
  entries: CardImageEntry[],
  removedIds: (string | number)[],
) => {
  const order: string[] = []
  let newIndex = 0

  for (const entry of entries) {
    if (entry.kind === 'new') {
      formData.append('images', entry.file)
      order.push(`new:${newIndex}`)
      newIndex += 1
    } else {
      order.push(String(entry.id))
    }
  }

  formData.append('image_order', JSON.stringify(order))
  if (removedIds.length > 0) {
    formData.append('remove_image_ids', JSON.stringify(removedIds))
  }
}

// A poster photographed in a bar, made small enough to send from a phone
// (cosa-fare.md Part −1 D9): the server takes 5 MB and 40 Mpx at most
// (common/images.py), and a phone's photograph can be more than either. Shrunk
// to a long side that still reads when enlarged, as a JPEG; the server
// re-encodes and strips it all the same. Anything that cannot be shrunk here
// is sent as it is, and the server says what is wrong with it.
export const POSTER_LONG_SIDE = 2400

export const shrinkPoster = async (file: File, longSide = POSTER_LONG_SIDE): Promise<File> => {
  if (!file.type.startsWith('image/') || typeof createImageBitmap !== 'function') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, longSide / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size <= 2 * 1024 * 1024) {
      bitmap.close()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    )
    if (!blob) return file
    const name = file.name.replace(/\.[^.]*$/, '') || 'locandina'
    return new File([blob], `${name}.jpg`, { type: 'image/jpeg' })
  } catch {
    return file
  }
}

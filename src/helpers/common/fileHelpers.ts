export const fileHelpers = {
  generateUniquePath(ownerId: string, filename: string, folder?: string) {
    const lastDotIndex = filename.lastIndexOf('.')
    const fileExt = lastDotIndex !== -1 ? filename.slice(lastDotIndex + 1) : ''
    const nameWithoutExt = lastDotIndex !== -1 ? filename.slice(0, lastDotIndex) : filename
    const cleanedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_')
    const timestamp = Date.now()
    const safeFolder = folder ? `${folder.replace(/^\/+|\/+$/g, '')}/` : ''
    return `${safeFolder}${ownerId}/${cleanedName}_${timestamp}.${fileExt}`
  },
  isValidImage(file: File, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'], maxSizeMB = 2) {
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a JPEG, PNG, or WebP image.')
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      throw new Error(`File is too large. Maximum size is ${maxSizeMB}MB.`)
    }
    return true
  }
}
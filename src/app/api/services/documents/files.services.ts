import { putFileServerSide } from '@/app/api/lib/upload/put-file.server'
import { DocumentData } from '@/app/api/models/documentData.model'
import { PDFDocument } from 'pdf-lib'
import { logActivity } from './logActivity.services'

const APP_DOCUMENT_UPLOAD_SIZE_LIMIT = 50 // MB

// Allowed file formats and their MIME types
const ALLOWED_MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  docm: 'application/vnd.ms-word.document.macroEnabled.12',
  dotm: 'application/vnd.ms-word.template.macroEnabled.12',
  doc: 'application/msword',
  txt: 'text/plain',
  rtf: 'application/rtf',
  html: 'text/html',
  xhtml: 'application/xhtml+xml',
  msg: 'application/vnd.ms-outlook',
  wpd: 'application/wordperfect',
  xps: 'application/vnd.ms-xpsdocument',
} as const

// Helper to check allowed type
function getFileType(file: File): keyof typeof ALLOWED_MIME_TYPES | null {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext) return null

  for (const [key, mime] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (file.type === mime || ext === key) {
      return key as keyof typeof ALLOWED_MIME_TYPES
    }
  }
  return null
}

// Helper to fix file extension if wrong
function ensureCorrectExtension(file: File, typeKey: string): File {
  const ext = `.${typeKey}`
  if (!file.name.toLowerCase().endsWith(ext)) {
    return new File([file], `${file.name}${ext}`, {
      type: file.type,
      lastModified: file.lastModified,
    })
  }
  return file
}

export const uploadPdfService = {
  /**
   * Validate and store supported document in DB
   */
  async savePdf(file: File, organizationId: string, userId: string, pageCount: number) {
    if (!file) {
      return { success: false, message: 'No file provided' }
    }

    // File size validation
    const MAX_FILE_SIZE = APP_DOCUMENT_UPLOAD_SIZE_LIMIT * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, message: 'File too large' }
    }

    // Check file type
    const typeKey = getFileType(file)
    if (!typeKey) {
      return {
        success: false,
        message: `Invalid file type. Allowed: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`,
      }
    }

    // Validate PDF if needed
    if (typeKey === 'pdf') {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await PDFDocument.load(arrayBuffer).catch((e) => {
        console.error(`PDF upload parse error: ${e.message}`)
        return null
      })
      if (!pdf || pdf.isEncrypted) {
        return { success: false, message: 'Invalid or encrypted PDF' }
      }
    }

    // Ensure correct extension
    const correctedFile = ensureCorrectExtension(file, typeKey)

    // Save file server-side
    const arrayBuffer = await correctedFile.arrayBuffer()
    const { type, data } = await putFileServerSide(correctedFile, organizationId, userId)

    // Save metadata in DB
    const savedDoc = await DocumentData.create({
      type,
      data,
      pageCount,
      initialData: Buffer.from(arrayBuffer).toString('base64'),
      fileType: typeKey,
    })
    await logActivity({
      userId: Number(userId),
      activity: "upload",
      payload: {
        documentId: savedDoc.id,
        documentName: file.name,
        pageCount,
      }
    });

    return { success: true, data: savedDoc }
  },
}

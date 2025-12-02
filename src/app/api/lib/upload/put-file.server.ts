import { DocumentData } from '@/app/api/models/documentData.model'
import { base64 } from '@scure/base'
import { PDFDocument } from 'pdf-lib'
import { match } from 'ts-pattern'
import { uploadS3File } from './server-actions'

// Local enum instead of Prisma's
export enum DocumentDataType {
  BYTES_64 = 'BYTES_64',
  S3_PATH = 'S3_PATH',
}

type File = {
  name: string
  type: string
  arrayBuffer: () => Promise<ArrayBuffer>
}

/**
 * Uploads a PDF file and creates a DocumentData record.
 */
export const putPdfFileServerSide = async (file: File, orgId: string, userId: string) => {
  const isEncryptedDocumentsAllowed = false

  const arrayBuffer = await file.arrayBuffer()

  const pdf = await PDFDocument.load(arrayBuffer).catch((e) => {
    console.error(`PDF upload parse error: ${e.message}`)
    throw new Error('INVALID_DOCUMENT_FILE')
  })

  if (!isEncryptedDocumentsAllowed && pdf.isEncrypted) {
    throw new Error('INVALID_DOCUMENT_FILE')
  }

  if (!file.name.endsWith('.pdf')) {
    file.name = `${file.name}.pdf`
  }

  const { type, data } = await putFileServerSide(file, orgId, userId)

  return await DocumentData.create({
    type,
    data,
    fileType: 'pdf',
    initialData: data,
  })
}

/**
 * Decides where to store the file (DB or S3).
 * For now, always uses DB since S3 isn't set up.
 */
export const putFileServerSide = async (file: File, orgId: string, userId: string) => {
  const NEXT_PRIVATE_UPLOAD_TRANSPORT =
    process.env.NEXT_PRIVATE_UPLOAD_TRANSPORT || 'database'

  return await match(NEXT_PRIVATE_UPLOAD_TRANSPORT)
    .with('s3', async () => putFileInS3(file, orgId, userId))
    .otherwise(async () => putFileInDatabase(file))
}

/**
 * Store the file in the database as Base64.
 */
const putFileInDatabase = async (file: File) => {
  const contents = await file.arrayBuffer()
  const binaryData = new Uint8Array(contents)
  const asciiData = base64.encode(binaryData)

  return {
    type: DocumentDataType.BYTES_64,
    data: asciiData,
  }
}

/**
 * Placeholder for future S3 storage.
 */
/**
 * Store the file in S3 under OrgId/UserId/{original|signed}.
 */
const putFileInS3 = async (
  file: File,
  orgId: string,
  userId: string,
  isSigned = false
) => {
  const folder = isSigned ? "signed" : "original"
  const { key } = await uploadS3File(file, orgId, userId, folder)

  return {
    type: DocumentDataType.S3_PATH,
    data: key,
  }
}

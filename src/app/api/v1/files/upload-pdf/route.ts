import { filesController } from '@/app/api/controllers/files.controller'

import { ensureDbConnection } from '@/app/api/db/connectDb'
import { NextResponse } from 'next/server'
import { AuthenticatedRequest, withAuth } from '@/lib/withApiAuth'

/**
 * @openapi
 * /api/v1/files/upload-pdf:
 *   post:
 *     tags:
 *       - Files
 *     summary: Upload a document (PDF, DOCX, TXT, etc.)
 *     description: Accepts either multipart/form-data with a `file` field, or JSON with a `fileUrl` to fetch a remote file.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fileUrl: { type: string, description: 'Public URL to fetch file from' }
 *           example:
 *             fileUrl: "https://example.com/sample.pdf"
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 documentDataId: { type: integer }
 *                 fileName: { type: string }
 *                 mimeType: { type: string }
 *             example:
 *               success: true
 *               message: "File uploaded"
 *               documentDataId: 101
 *               fileName: "sample.pdf"
 *               mimeType: "application/pdf"
 *       400:
 *         description: Invalid input or file type
 *       500:
 *         description: File upload failed
 *   put:
 *     tags:
 *       - Files
 *     summary: List documents (temporary)
 *     description: Returns a list of documents. This method is temporary and may be moved.
 *     responses:
 *       200:
 *         description: Documents fetched
 *       501:
 *         description: Not implemented
 *   get:
 *     tags:
 *       - Files
 *     summary: Not implemented
 *     responses:
 *       501:
 *         description: Not implemented
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  await ensureDbConnection()
  return filesController.upload(req)
})

export const PUT = withAuth(async (req: AuthenticatedRequest) => {
  await ensureDbConnection()
  return filesController.getAllDocuments(req)
})

export async function GET() {
  await ensureDbConnection()
  return NextResponse.json(
    { success: false, message: 'API endpoint not implemented' },
    { status: 501 },
  )
}

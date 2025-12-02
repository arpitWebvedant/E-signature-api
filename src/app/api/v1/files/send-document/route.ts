import { filesController } from '@/app/api/controllers/files.controller'
import { ensureDbConnection } from '@/app/api/db/connectDb'
import { NextResponse } from 'next/server'
import { AuthenticatedRequest, withAuth } from '@/lib/withApiAuth'

/**
 * @openapi
 * /api/v1/files/send-document:
 *   post:
 *     tags:
 *       - Files
 *     summary: Send document for signing
 *     description: Initiates signing requests to recipients for a document.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               documentId: { type: integer }
 *               documentName: { type: string }
 *               senderName: { type: string }
 *               senderEmail: { type: string }
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name: { type: string }
 *                     email: { type: string }
 *                     role: { type: string, enum: [signer, viewer] }
 *           example:
 *             documentId: 2001
 *             documentName: "Engagement Letter"
 *             senderName: "John Doe"
 *             senderEmail: "john@example.com"
 *             recipients:
 *               - name: "Signer One"
 *                 email: "signer1@example.com"
 *                 role: "signer"
 *     responses:
 *       200:
 *         description: Document signing requests sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 result: { type: object }
 *             example:
 *               success: true
 *               message: "Document signing requests sent successfully"
 *               result:
 *                 envelopesCreated: 1
 *   put:
 *     tags:
 *       - Files
 *     summary: Update document status
 *     description: Updates the status of a document (e.g., completed, declined) and stores signature if provided.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               documentId: { type: integer }
 *               userId: { type: integer }
 *               status: { type: string, enum: [draft, sent, completed, declined] }
 *               teamId: { type: integer, nullable: true }
 *               folderId: { type: integer, nullable: true }
 *               signature: { type: string, nullable: true }
 *           example:
 *             documentId: 2001
 *             userId: 1
 *             status: "completed"
 *             signature: "base64-signature-data"
 *     responses:
 *       200:
 *         description: Document status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 document: { type: object }
 *             example:
 *               success: true
 *               message: "Status updated"
 *               document:
 *                 id: 2001
 *                 status: "completed"
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Document status update failed
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
  return filesController.sendSigningRequest(req)
})

export const PUT = withAuth(async (req: AuthenticatedRequest) => {
  await ensureDbConnection()
  return filesController.updateDocumentStatus(req)
})

export async function GET() {
  await ensureDbConnection()
  return NextResponse.json(
    { success: false, message: 'API endpoint not implemented' },
    { status: 501 },
  )
}

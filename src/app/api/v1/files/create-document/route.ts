import { filesController } from '@/app/api/controllers/files.controller'
import { ensureDbConnection } from '@/app/api/db/connectDb'

import { NextResponse } from 'next/server'
import { AuthenticatedRequest, withAuth } from '@/lib/withApiAuth'

/**
 * @openapi
 * /api/v1/files/create-document:
 *   post:
 *     tags:
 *       - Files
 *     summary: Create a new document
 *     description: Creates a document record from an uploaded file (documentDataId) and metadata.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: integer }
 *               teamId: { type: integer, nullable: true }
 *               title: { type: string }
 *               documentDataId: { type: integer }
 *               normalizePdf: { type: boolean }
 *               timezone: { type: string }
 *               requestMetadata: { type: object }
 *               folderId: { type: integer, nullable: true }
 *               organizationId: { type: string, nullable: true }
 *           example:
 *             userId: 1
 *             title: "Engagement Letter"
 *             documentDataId: 101
 *             normalizePdf: true
 *             timezone: "America/Los_Angeles"
 *             requestMetadata: { source: "web" }
 *     responses:
 *       200:
 *         description: Document created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 document: { type: object }
 *             example:
 *               success: true
 *               document:
 *                 id: 2001
 *                 title: "Engagement Letter"
 *                 status: "draft"
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Document creation failed
 *   put:
 *     tags:
 *       - Files
 *     summary: Update document data (sign fields, metadata)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: integer }
 *               documentId: { type: integer }
 *               documentSignData: { type: object }
 *               requestMetadata: { type: object }
 *           example:
 *             userId: 1
 *             documentId: 2001
 *             documentSignData:
 *               fields:
 *                 - type: "signature"
 *                   page: 1
 *                   x: 120
 *                   y: 300
 *     responses:
 *       200:
 *         description: Document updated
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Document update failed
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
  return filesController.createDocument(req)
})

export const PUT = withAuth(async (req: AuthenticatedRequest) => {
  await ensureDbConnection()
  return filesController.updateDocument(req)
})

export async function GET() {
  await ensureDbConnection()
  return NextResponse.json(
    { success: false, message: 'API endpoint not implemented' },
    { status: 501 },
  )
}

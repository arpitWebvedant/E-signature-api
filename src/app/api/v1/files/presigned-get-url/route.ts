import { connectDb } from "@/app/api/db/connectDb";
import { filesController } from "@/app/api/controllers/files.controller";
import { AuthenticatedRequest, withAuth } from '@/lib/withApiAuth'

/**
 * @openapi
 * /api/v1/files/presigned-get-url:
 *   post:
 *     tags:
 *       - Files
 *     summary: Get a presigned URL for a signed PDF
 *     description: Generates a presigned URL to download a signed PDF. The response is a PDF stream.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               documentId: { type: integer }
 *               versionId: { type: string, nullable: true }
 *           example:
 *             documentId: 2001
 *     responses:
 *       200:
 *         description: PDF stream response
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Failed to get presigned url
 *       500:
 *         description: Presigned url fetch failed
 */
const POST = withAuth(async (req: AuthenticatedRequest) => {
	await connectDb();
	return filesController.getPresignedUrl(req)
})

export { POST }

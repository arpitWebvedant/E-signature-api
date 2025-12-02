import { filesController } from "@/app/api/controllers/files.controller";
import { ensureDbConnection } from "@/app/api/db/connectDb";
import { AuthenticatedRequest, withAuth } from '@/lib/withApiAuth'

/**
 * @openapi
 * /api/v1/files/create-recipient:
 *   post:
 *     tags:
 *       - Files
 *     summary: Create recipients for a document
 *     description: Creates recipient records (signers/viewers) for a given document.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               documentId: { type: integer }
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     email: { type: string }
 *                     name: { type: string }
 *                     role: { type: string, enum: [signer, viewer] }
 *           example:
 *             documentId: 2001
 *             recipients:
 *               - email: "signer1@example.com"
 *                 name: "Signer One"
 *                 role: "signer"
 *               - email: "viewer@example.com"
 *                 name: "Viewer"
 *                 role: "viewer"
 *     responses:
 *       200:
 *         description: Recipients created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *             example:
 *               success: true
 *               data:
 *                 - id: 1
 *                   documentId: 2001
 *                   email: "signer1@example.com"
 *                   name: "Signer One"
 *                   role: "signer"
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Recipient creation failed
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
    await ensureDbConnection();
    return filesController.createRecipient(req);
});

import { ensureDbConnection } from '@/app/api/db/connectDb';
import { filesController } from '@/app/api/controllers/files.controller';
import { withApiAuth } from '@/lib/withApiAuth';

/**
 * @openapi
 * /api/v1/files/get-document:
 *   get:
 *     tags:
 *       - Files
 *     summary: Get a document with details
 *     parameters:
 *       - in: query
 *         name: documentId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Document details retrieved
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
 *                 recipients:
 *                   - id: 1
 *                     email: "signer1@example.com"
 *                     name: "Signer One"
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Document fetch failed
 */

import { AuthenticatedRequest, withAuth } from "@/lib/withApiAuth";

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  await ensureDbConnection();
  return filesController.getDocument(req);
});

import { ensureDbConnection } from '@/app/api/db/connectDb';
import { filesController } from '@/app/api/controllers/files.controller';
import { AuthenticatedRequest, withAuth } from '@/lib/withApiAuth';

/**
 * @openapi
 * /api/v1/files/get-all-documents:
 *   get:
 *     tags:
 *       - Files
 *     summary: Get paginated documents list
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema: { type: integer }
 *         required: true
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *         required: true
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *         required: true
 *       - in: query
 *         name: teamId
 *         schema: { type: integer }
 *       - in: query
 *         name: folderId
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, sent, completed, declined] }
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [day, week, month, year] }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Documents fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 total: { type: integer }
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       title: { type: string }
 *                       status: { type: string }
 *                       createdAt: { type: string, format: date-time }
 *             example:
 *               success: true
 *               page: 1
 *               limit: 10
 *               total: 2
 *               items:
 *                 - id: 2001
 *                   title: "Engagement Letter"
 *                   status: "draft"
 *                   createdAt: "2025-01-01T00:00:00.000Z"
 *                 - id: 2002
 *                   title: "NDA"
 *                   status: "sent"
 *                   createdAt: "2025-01-02T00:00:00.000Z"
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Document fetch failed
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  await ensureDbConnection();
  return filesController.getAllDocuments(req);
})

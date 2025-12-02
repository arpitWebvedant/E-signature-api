import { ensureDbConnection } from '@/app/api/db/connectDb'
import { apiKeyController } from '@/app/api/controllers/apiKey.controller'

/**
 * @openapi
 * /api/v1/auth/api-keys/{id}:
 *   delete:
 *     tags: [API Keys]
 *     summary: Revoke an API key by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Key revoked
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Key not found
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  await ensureDbConnection()
  return apiKeyController.revoke(req, { id: params.id })
}

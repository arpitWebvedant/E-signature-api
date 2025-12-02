import { ensureDbConnection } from '@/app/api/db/connectDb'
import { apiKeyController } from '@/app/api/controllers/apiKey.controller'

/**
 * @openapi
 * /api/v1/auth/api-keys:
 *   get:
 *     tags: [API Keys]
 *     summary: List API keys for the current user
 *     responses:
 *       200:
 *         description: List of API keys
 *       401:
 *         description: Not authenticated
 *   post:
 *     tags: [API Keys]
 *     summary: Create a new API key for the current user
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "My CI Token"
 *     responses:
 *       200:
 *         description: API key created (plaintext returned once)
 *       401:
 *         description: Not authenticated
 */

export async function GET(req: Request) {
  await ensureDbConnection()
  return apiKeyController.list(req)
}

export async function POST(req: Request) {
  await ensureDbConnection()
  return apiKeyController.create(req)
}

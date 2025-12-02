import { authController } from '@/app/api/controllers/auth.controller'
import { ensureDbConnection } from '@/app/api/db/connectDb'

/**
 * @openapi
 * /api/v1/auth/sync-user:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Sync centralized user to local user
 *     description: Ensures a local user exists and is up-to-date for the centralized user ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               centralizedUserId: { type: string }
 *               email: { type: string }
 *               name: { type: string }
 *           example:
 *             centralizedUserId: "user_123"
 *             email: "john@example.com"
 *             name: "John Doe"
 *     responses:
 *       200:
 *         description: Sync successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 localUser: { $ref: '#/components/schemas/LocalUser' }
 *             example:
 *               success: true
 *               message: "Local user synced"
 *               localUser:
 *                 id: 1
 *                 name: "John Doe"
 *                 email: "john@example.com"
 *                 fullName: "Johnathan Doe"
 *                 signature: "J.Doe"
 *                 centralizedUserId: "user_123"
 *                 isActive: true
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Sync failed
 */
export async function POST(req: Request) {
  await ensureDbConnection()
  return authController.syncUser(req)
}

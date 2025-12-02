import { authController } from '@/app/api/controllers/auth.controller'
import { ensureDbConnection } from '@/app/api/db/connectDb'

/**
 * @openapi
 * /api/v1/auth/profile:
 *   put:
 *     tags:
 *       - Auth
 *     summary: Update profile of the current user
 *     description: Updates fields of the mapped local user and/or centralized user profile.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string }
 *               signature: { type: string }
 *               name: { type: string, description: 'Centralized user display name' }
 *               image: { type: string, nullable: true }
 *           example:
 *             fullName: "Johnathan Doe"
 *             signature: "J.Doe"
 *             name: "John Doe"
 *             image: "https://example.com/avatar.png"
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 localUser: { $ref: '#/components/schemas/LocalUser' }
 *                 user: { $ref: '#/components/schemas/CentralizedUser' }
 *             example:
 *               success: true
 *               message: "Profile updated"
 *               localUser:
 *                 id: 1
 *                 name: "John Doe"
 *                 email: "john@example.com"
 *                 fullName: "Johnathan Doe"
 *                 signature: "J.Doe"
 *                 centralizedUserId: "user_123"
 *                 isActive: true
 *                 createdAt: "2025-01-01T00:00:00.000Z"
 *                 updatedAt: "2025-01-10T12:00:00.000Z"
 *               user:
 *                 id: "user_123"
 *                 email: "john@example.com"
 *                 name: "John Doe"
 *                 image: "https://example.com/avatar.png"
 *                 emailVerified: true
 *                 isGlobalAdmin: false
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Failed to update profile
 */
export async function PUT(req: Request) {
  await ensureDbConnection()
  return authController.updateProfile(req)
}

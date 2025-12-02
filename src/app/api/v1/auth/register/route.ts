import { authController } from "@/app/api/controllers/auth.controller";
import { ensureDbConnection } from '@/app/api/db/connectDb';

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new user
 *     description: Registers a new user in the centralized auth service and creates a mapped local user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string }
 *           example:
 *             name: "Jane Doe"
 *             email: "jane@example.com"
 *             password: "••••••••"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 user: { $ref: '#/components/schemas/CentralizedUser' }
 *                 localUser: { $ref: '#/components/schemas/LocalUser' }
 *             example:
 *               success: true
 *               message: "User registered"
 *               user:
 *                 id: "user_555"
 *                 email: "jane@example.com"
 *                 name: "Jane Doe"
 *                 image: null
 *                 emailVerified: false
 *                 isGlobalAdmin: false
 *                 createdAt: "2025-01-01T00:00:00.000Z"
 *                 updatedAt: "2025-01-01T00:00:00.000Z"
 *                 organizationUsers: []
 *               localUser:
 *                 id: 10
 *                 name: "Jane Doe"
 *                 email: "jane@example.com"
 *                 fullName: "Jane Doe"
 *                 signature: "J.Doe"
 *                 centralizedUserId: "user_555"
 *                 isActive: true
 *                 createdAt: "2025-01-01T00:00:00.000Z"
 *                 updatedAt: "2025-01-01T00:00:00.000Z"
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Registration failed
 */
export async function POST(req: Request) {
    await ensureDbConnection();
    return authController.register(req);
}

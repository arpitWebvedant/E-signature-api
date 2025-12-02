import { authController } from "@/app/api/controllers/auth.controller";
import { ensureDbConnection } from '@/app/api/db/connectDb';

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Logout current user
 *     description: Invalidates the current session and clears cookies.
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *             example:
 *               success: true
 *               message: "Logged out successfully"
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Logout failed
 */
export async function POST(req: Request) {

    await ensureDbConnection();
    return authController.logout(req);
}

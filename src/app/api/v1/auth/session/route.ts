import { authController } from "@/app/api/controllers/auth.controller";
import { ensureDbConnection } from '@/app/api/db/connectDb';

/**
 * @openapi
 * /api/v1/auth/session:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Validate current session (GET)
 *     description: Validates the current user session and returns user + localUser details if valid.
 *     responses:
 *       200:
 *         description: Session is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/CentralizedUser'
 *                 localUser:
 *                   $ref: '#/components/schemas/LocalUser'
 *             example:
 *               success: true
 *               message: "Session is valid"
 *               user:
 *                 id: "user_123"
 *                 email: "jane@example.com"
 *                 name: "Jane Doe"
 *                 image: null
 *                 emailVerified: false
 *                 createdAt: "2025-08-07T07:01:17.965Z"
 *                 updatedAt: "2025-08-07T07:01:17.965Z"
 *                 isGlobalAdmin: false
 *                 organizationUsers:
 *                   - id: "orgUser_999"
 *                     userId: "user_123"
 *                     organizationId: "org_002"
 *                     roleId: "role_010"
 *                     invitedById: null
 *                     status: "active"
 *                     createdAt: "2025-08-07T07:01:18.008Z"
 *                     updatedAt: "2025-08-07T07:01:18.008Z"
 *                     organization:
 *                       id: "org_002"
 *                       name: "Lexify"
 *                       slug: "lexify-law"
 *                       stripeCustomerId: null
 *                       type: "Law Firm"
 *                       size: "50-100"
 *                       website: "https://lexify.com"
 *                       state: "CA"
 *                       county: "Orange"
 *                       city: "Irvine"
 *                       isApproved: true
 *                       status: "approved"
 *                       createdAt: "2025-06-06T09:15:27.574Z"
 *                       updatedAt: "2025-06-11T14:53:28.283Z"
 *                     role:
 *                       id: "role_010"
 *                       name: "Senior Attorney"
 *                       description: "Handles litigation"
 *                       organizationId: "org_002"
 *                       isGlobal: false
 *                       hierarchyLevel: 2
 *                       createdAt: "2025-06-06T09:18:15.801Z"
 *                       updatedAt: "2025-06-06T09:18:15.801Z"
 *               localUser:
 *                 id: 2
 *                 name: "Jane Doe"
 *                 email: "jane@example.com"
 *                 fullName: "Jane D"
 *                 signature: "J.D"
 *                 centralizedUserId: "user_123"
 *                 isActive: true
 *                 createdAt: "2025-08-19T06:55:19.433Z"
 *                 updatedAt: "2025-09-01T07:09:56.383Z"
 *       401:
 *         description: Session invalid or expired
 *       500:
 *         description: Failed to validate session
 *
 *   post:
 *     tags:
 *       - Auth
 *     summary: Validate current session (POST)
 *     description: Same as GET but allows session validation via POST.
 *     responses:
 *       200:
 *         description: Session is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/CentralizedUser'
 *                 localUser:
 *                   $ref: '#/components/schemas/LocalUser'
 *             example:
 *               success: true
 *               message: "Session is valid"
 *               user:
 *                 id: "user_123"
 *                 email: "jane@example.com"
 *                 name: "Jane Doe"
 *                 image: null
 *                 emailVerified: false
 *                 createdAt: "2025-08-07T07:01:17.965Z"
 *                 updatedAt: "2025-08-07T07:01:17.965Z"
 *                 isGlobalAdmin: false
 *                 organizationUsers: []
 *               localUser:
 *                 id: 2
 *                 name: "Jane Doe"
 *                 email: "jane@example.com"
 *                 fullName: "Jane D"
 *                 signature: "J.D"
 *                 centralizedUserId: "user_123"
 *                 isActive: true
 *                 createdAt: "2025-08-19T06:55:19.433Z"
 *                 updatedAt: "2025-09-01T07:09:56.383Z"
 */
export async function GET(req: Request) {
  await ensureDbConnection();
  return authController.validateSession(req);
}

export async function POST(req: Request) {
  await ensureDbConnection();
  return authController.validateSession(req);
}

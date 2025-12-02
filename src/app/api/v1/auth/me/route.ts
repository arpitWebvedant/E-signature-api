import { authController } from "@/app/api/controllers/auth.controller";
import { ensureDbConnection } from '@/app/api/db/connectDb';

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get current authenticated user
 *     description: Fetches the current authenticated user along with local user mapping.
 *     responses:
 *       200:
 *         description: Current user details fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     email: { type: string }
 *                     name: { type: string }
 *                     image: { type: string, nullable: true }
 *                     emailVerified: { type: boolean }
 *                     createdAt: { type: string, format: date-time }
 *                     updatedAt: { type: string, format: date-time }
 *                     isGlobalAdmin: { type: boolean }
 *                     organizationUsers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           userId: { type: string }
 *                           organizationId: { type: string }
 *                           roleId: { type: string }
 *                           invitedById: { type: string, nullable: true }
 *                           status: { type: string }
 *                           createdAt: { type: string, format: date-time }
 *                           updatedAt: { type: string, format: date-time }
 *                           organization:
 *                             type: object
 *                             properties:
 *                               id: { type: string }
 *                               name: { type: string }
 *                               slug: { type: string }
 *                               stripeCustomerId: { type: string, nullable: true }
 *                               type: { type: string }
 *                               size: { type: string, nullable: true }
 *                               website: { type: string, nullable: true }
 *                               state: { type: string, nullable: true }
 *                               county: { type: string, nullable: true }
 *                               city: { type: string, nullable: true }
 *                               isApproved: { type: boolean }
 *                               status: { type: string }
 *                               createdAt: { type: string, format: date-time }
 *                               updatedAt: { type: string, format: date-time }
 *                           role:
 *                             type: object
 *                             properties:
 *                               id: { type: string }
 *                               name: { type: string }
 *                               description: { type: string }
 *                               organizationId: { type: string }
 *                               isGlobal: { type: boolean }
 *                               hierarchyLevel: { type: integer }
 *                               createdAt: { type: string, format: date-time }
 *                               updatedAt: { type: string, format: date-time }
 *                 localUser:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     name: { type: string }
 *                     email: { type: string }
 *                     fullName: { type: string }
 *                     signature: { type: string }
 *                     centralizedUserId: { type: string }
 *                     isActive: { type: boolean }
 *                     createdAt: { type: string, format: date-time }
 *                     updatedAt: { type: string, format: date-time }
 *             example:
 *               success: true
 *               user:
 *                 id: "user_987"
 *                 email: "jane@example.com"
 *                 name: "Jane Doe"
 *                 image: null
 *                 emailVerified: false
 *                 createdAt: "2025-08-07T07:01:17.965Z"
 *                 updatedAt: "2025-08-07T07:01:17.965Z"
 *                 isGlobalAdmin: false
 *                 organizationUsers:
 *                   - id: "orgUser_999"
 *                     userId: "user_987"
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
 *                 centralizedUserId: "user_987"
 *                 isActive: true
 *                 createdAt: "2025-08-19T06:55:19.433Z"
 *                 updatedAt: "2025-09-01T07:09:56.383Z"
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Failed to fetch current user
 */
export async function GET(req: Request) {
  await ensureDbConnection();
  return authController.getCurrentUser(req);
}

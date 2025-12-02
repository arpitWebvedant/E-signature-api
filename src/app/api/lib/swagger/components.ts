/**
 * @openapi
 * components:
 *   examples:
 *     LocalUserExample:
 *       value:
 *         id: 1
 *         name: "John Doe"
 *         email: "john@example.com"
 *         fullName: "Johnathan Doe"
 *         signature: "J.Doe"
 *         centralizedUserId: "user_123"
 *         isActive: true
 *         createdAt: "2025-01-01T00:00:00.000Z"
 *         updatedAt: "2025-01-10T12:00:00.000Z"
 *
 *     CentralizedUserExample:
 *       value:
 *         id: "user_123"
 *         email: "john@example.com"
 *         name: "John Doe"
 *         image: "https://example.com/avatar.png"
 *         emailVerified: true
 *         isGlobalAdmin: false
 *         createdAt: "2025-01-01T00:00:00.000Z"
 *         updatedAt: "2025-01-01T00:00:00.000Z"
 *         organizationUsers:
 *           - id: "orgUser_1"
 *             userId: "user_123"
 *             organizationId: "org_001"
 *             roleId: "role_001"
 *             invitedById: null
 *             status: "active"
 *             createdAt: "2025-01-01T00:00:00.000Z"
 *             updatedAt: "2025-01-02T00:00:00.000Z"
 *             organization:
 *               id: "org_001"
 *               name: "OmnisAI"
 *               slug: "omnis-ai"
 *               type: "Law Firm"
 *               isApproved: true
 *               status: "approved"
 *               createdAt: "2025-01-01T00:00:00.000Z"
 *               updatedAt: "2025-01-05T00:00:00.000Z"
 *             role:
 *               id: "role_001"
 *               name: "Associate Attorney"
 *               description: "Handles client cases"
 *               organizationId: "org_001"
 *               isGlobal: false
 *               hierarchyLevel: 1
 *               createdAt: "2025-01-01T00:00:00.000Z"
 *               updatedAt: "2025-01-01T00:00:00.000Z"
 *   schemas:
 *     CentralizedUser:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         email: { type: string }
 *         name: { type: string }
 *         image: { type: string, nullable: true }
 *         emailVerified: { type: boolean }
 *         isGlobalAdmin: { type: boolean }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *         organizationUsers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id: { type: string }
 *               userId: { type: string }
 *               organizationId: { type: string }
 *               roleId: { type: string }
 *               invitedById: { type: string, nullable: true }
 *               status: { type: string }
 *               createdAt: { type: string, format: date-time }
 *               updatedAt: { type: string, format: date-time }
 *               organization:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   name: { type: string }
 *                   slug: { type: string }
 *                   stripeCustomerId: { type: string, nullable: true }
 *                   type: { type: string }
 *                   size: { type: string, nullable: true }
 *                   website: { type: string, nullable: true }
 *                   state: { type: string, nullable: true }
 *                   county: { type: string, nullable: true }
 *                   city: { type: string, nullable: true }
 *                   isApproved: { type: boolean }
 *                   status: { type: string }
 *                   createdAt: { type: string, format: date-time }
 *                   updatedAt: { type: string, format: date-time }
 *               role:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   name: { type: string }
 *                   description: { type: string }
 *                   organizationId: { type: string }
 *                   isGlobal: { type: boolean }
 *                   hierarchyLevel: { type: integer }
 *                   createdAt: { type: string, format: date-time }
 *                   updatedAt: { type: string, format: date-time }
 *
 *     LocalUser:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         name: { type: string }
 *         email: { type: string }
 *         fullName: { type: string }
 *         signature: { type: string }
 *         centralizedUserId: { type: string }
 *         isActive: { type: boolean }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */


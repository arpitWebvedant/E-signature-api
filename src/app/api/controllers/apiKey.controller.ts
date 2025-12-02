import { NextResponse } from 'next/server'
import { authService, apiKeyService } from '@/app/api/services'
import { User } from '@/app/api/models'
import { withApiAuth } from '../../../lib/withApiAuth'

export const apiKeyController = {
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
   */
  async list(req: Request) {
    const session = await authService.getSession(req.headers)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 },
      )
    }
    const localUser = await authService.findOrCreateLocalUser(session)
    if (!('id' in localUser) || !localUser.id) {
      return NextResponse.json(
        { success: false, message: 'Local user not available' },
        { status: 500 },
      )
    }
    const keys = await apiKeyService.list(localUser.id)
    return NextResponse.json({ success: true, data: keys })
  },

  /**
   * @openapi
   * /api/v1/auth/api-keys:
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
  async create(req: Request) {
    const session = await authService.getSession(req.headers)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const headers = req.headers
    const name = typeof body?.name === 'string' ? body.name : undefined
    let organizationId =  body?.organizationId ? body.organizationId : undefined
    const localUser = await authService.findOrCreateLocalUser(session)
    if (!('id' in localUser) || !localUser.id) {
      return NextResponse.json(
        { success: false, message: 'Local user not available' },
        { status: 500 },
      )
    }
     if (!organizationId) {
        organizationId = headers.get('x-organization-id') || null
      }
    const created = await apiKeyService.create(localUser.id, name, organizationId)
    return NextResponse.json({
      success: true,
      message: 'API key created',
      key: created,
    })
  },

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
  async revoke(req: Request, params: { id: string }) {
    const idNum = Number(params.id)
    if (!Number.isFinite(idNum)) {
      return NextResponse.json(
        { success: false, message: 'Invalid id' },
        { status: 400 },
      )
    }
    const session = await authService.getSession(req.headers)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 },
      )
    }
    const localUser = await authService.findOrCreateLocalUser(session)
    if (!('id' in localUser) || !localUser.id) {
      return NextResponse.json(
        { success: false, message: 'Local user not available' },
        { status: 500 },
      )
    }
    const result = await apiKeyService.revoke(localUser.id, idNum)
    if (!result.success && result.message === 'Key not found') {
      return NextResponse.json(
        { success: false, message: 'Key not found' },
        { status: 404 },
      )
    }
    return NextResponse.json({ success: true, message: 'Key revoked' })
  },
  async checkAuthByApiKey(req: Request) {
    try {
      // Support both query param (?apiKey=...) and Authorization header ("ApiKey <key>")
      const url = new URL(req.url)
      const apiKey = url.searchParams.get('apiKey') || undefined

      if (!apiKey) {
        return NextResponse.json(
          { success: false, message: 'Invalid or missing API key' },
          { status: 401 },
        )
      }

      let verified: { userId: number; apiKeyId: number; organizationId: string } | null = null

      verified = await apiKeyService.verifyFromHeader(`ApiKey ${apiKey}`)

      if (!verified) {
        return NextResponse.json(
          { success: false, message: 'Invalid or missing API key' },
          { status: 401 },
        )
      }

      const localUser = await User.findByPk(verified.userId)
      if (!localUser) {
        return NextResponse.json(
          { success: false, message: 'User not found for API key' },
          { status: 401 },
        )
      }

      // Add organizationId to localUser
      localUser.organizationId = verified.organizationId

      // Fetch centralized user details (best-effort)
      const centralizedUser = localUser.centralizedUserId
        ? await authService.getUserById(localUser.centralizedUserId)
        : null
        const localUserResponse = {
          ...localUser.toJSON(),
          organizationId: verified.organizationId
        }
      // Match the auto-login response shape
      return NextResponse.json({
        success: true,
        message: 'API key authentication successful',
        localUser: localUserResponse,
        centralizedUser,
      })
    } catch (error) {
      console.error('checkAuthByApiKey failed:', error)
      return NextResponse.json(
        { success: false, message: 'API key authentication failed' },
        { status: 500 },
      )
    }
  },
}

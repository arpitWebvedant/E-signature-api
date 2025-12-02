import { randomBytes, createHmac } from 'crypto'
import { ApiKey, ApiKeyCreationAttributes } from '@/app/api/models/apiKey.model'

function base64url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function hmacSha256(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('hex')
}

export type GeneratedApiKey = {
  plaintext: string
  prefix: string
  lastEight: string
}

export const apiKeyService = {
  generateRandomApiKey(): GeneratedApiKey {
    const raw = base64url(randomBytes(32)) // ~43 chars url-safe
    const prefix = raw.slice(0, 6)
    const lastEight = raw.slice(-8)
    const plaintext = `${prefix}_${raw}`
    return { plaintext, prefix, lastEight }
  },

  hashApiKey(plaintext: string): string {
    const secret = process.env.NEXT_PRIVATE_API_KEY_SECRET || process.env.NEXT_PRIVATE_API_KEY_PEPPER || 'fallback_secret_do_not_use_in_prod'
    return hmacSha256(plaintext, secret)
  },

  async create(userId: number, name?: string, organizationId?: string) {
    const { plaintext, prefix, lastEight } = this.generateRandomApiKey()
    const keyHash = this.hashApiKey(plaintext)

    // Strongly-typed payload; include organizationId as provided or null
    const createPayload: ApiKeyCreationAttributes = {
      userId,
      name: name ?? null,
      prefix,
      lastEight,
      keyHash,
      organizationId: organizationId ?? null,
    }

    const created = await ApiKey.create(createPayload)
    return { keyId: created.id, plaintext, preview: `${prefix}...${lastEight}` }
  },

  async list(userId: number) {
    const rows = await ApiKey.findAll({ where: { userId }, order: [['createdAt', 'DESC']] })
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      organizationId: r.organizationId,
      prefix: r.prefix,
      lastEight: r.lastEight,
      revokedAt: r.revokedAt,
      createdAt: r.createdAt,
    }))
  },

  async revoke(userId: number, id: number) {
    const row = await ApiKey.findOne({ where: { id, userId } })
    if (!row) return { success: false, message: 'Key not found' }
    if (row.revokedAt) return { success: true, alreadyRevoked: true }
    row.revokedAt = new Date()
    await row.save()
    return { success: true }
  },

  async verifyFromHeader(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('ApiKey ')) return null
    const plaintext = authHeader.substring(7)
    const keyHash = this.hashApiKey(plaintext)
    const match = await ApiKey.findOne({ where: { keyHash, revokedAt: null } })
    if (!match) return null
    return { userId: match.userId, apiKeyId: match.id, organizationId : match.organizationId }
  }
}

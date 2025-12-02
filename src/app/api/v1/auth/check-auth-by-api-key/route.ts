import { ensureDbConnection } from '@/app/api/db/connectDb'
import { apiKeyController } from '@/app/api/controllers/apiKey.controller'


export async function GET(req: Request) {
    await ensureDbConnection()
    return apiKeyController.checkAuthByApiKey(req)
}
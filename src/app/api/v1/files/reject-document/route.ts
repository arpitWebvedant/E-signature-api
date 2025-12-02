import { ensureDbConnection } from '@/app/api/db/connectDb'
import { AuthenticatedRequest, withAuth } from '@/lib/withApiAuth'
import { filesController } from '@/app/api/controllers/files.controller'

/**
 * POST /api/v1/files/reject-document
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  await ensureDbConnection()
  return filesController.rejectDocument(req)
})

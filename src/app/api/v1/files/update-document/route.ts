import { filesController } from '@/app/api/controllers/files.controller'
import { ensureDbConnection } from '@/app/api/db/connectDb'

import { AuthenticatedRequest, withAuth } from '@/lib/withApiAuth'

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  await ensureDbConnection()
  return filesController.updateDocumentFile(req)
})

import { ensureDbConnection } from '@/app/api/db/connectDb'
import { foldersController } from '@/app/api/controllers/folders.controller'
import { AuthenticatedRequest, withAuth } from '@/lib/withApiAuth'

export const PUT = withAuth(async (req: AuthenticatedRequest) => {
  await ensureDbConnection()
  return foldersController.renameFolder(req)
})

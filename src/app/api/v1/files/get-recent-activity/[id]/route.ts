import { ensureDbConnection } from "@/app/api/db/connectDb";
import { filesController } from "@/app/api/controllers/files.controller";
import { AuthenticatedRequest, withAuth } from '@/lib/withApiAuth'

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    await ensureDbConnection();
    const { id } = params;
    return filesController.getRecentActivityService(id);
});

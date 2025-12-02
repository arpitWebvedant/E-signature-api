import { ensureDbConnection } from "@/app/api/db/connectDb";
import { filesController } from "@/app/api/controllers/files.controller";

export async function GET(req: Request, { params }: { params: { id: string } }) {
    await ensureDbConnection();
    const { id } = params;
    return filesController.getDocumentStatuses(id);
}

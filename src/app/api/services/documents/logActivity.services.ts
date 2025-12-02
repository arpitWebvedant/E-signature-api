import { Op } from "sequelize";
import { ActivityLog } from "../../models/activityLogs.model";
import { User } from "../../models/user.model";

type ActivityType = "upload" | "update" | "delete" | "send" | "sign";

interface ActivityPayload {
    documentName: string;
    documentId: number;
    recipients?: { email: string; name: string }[];
    signer?: { email: string; name: string };
    pageCount?: number;
    extra?: string;
}

interface LogActivityParams {
    userId?: number;
    userEmail?: string;
    activity: ActivityType;
    userName?: string;
    payload: ActivityPayload;
}

export async function logActivity({
    userId,
    userEmail,
    activity,
    userName,
    payload,
}: LogActivityParams) {
    try {
        const userDetail =
            userName && !userId
                ? { name: userName, email: userEmail }
                : await User.findByPk(userId);

        const actorName = userDetail?.name || payload.signer?.name || "Unknown User";
        const actorEmail = userDetail?.email || payload.signer?.email || "unknown";

        let details = "";

        switch (activity) {
            case "upload":
                details = `${actorName} uploaded document "${payload.documentName}" (${payload.pageCount || "?"} pages).`;
                break;

            case "update":
                details = `${actorName} updated document "${payload.documentName}".`;
                break;

            case "delete":
                details = `${actorName} deleted document "${payload.documentName}".`;
                break;

            case "send":
                const recipients = payload.recipients?.map(r => r.email).join(", ") || "unknown";
                details = `${actorName} sent document "${payload.documentName}" to (${recipients}).`;
                break;

            case "sign":
                details = `${actorName} (${actorEmail}) signed document "${payload.documentName}".`;
                break;
        }

        if (payload.extra) {
            details += ` (${payload.extra})`;
        }

        const metaData: Record<string, any> = {
            documentId: payload.documentId,
        };

        if (activity === "send" && payload.recipients) {
            metaData.recipients = payload.recipients;
        }

        if (activity === "sign" && payload.signer) {
            metaData.signerId = payload.signer.email || "unknown";
        }

        // ⏱ Prevent duplicates within last 1 min
        const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);

        const recentLog = await ActivityLog.findOne({
            where: {
                userId: userId?.toString(),
                activity,
                createdAt: { [Op.gte]: oneMinuteAgo },
                metaData: { documentId: payload.documentId },
            },
            order: [["createdAt", "DESC"]],
        });

        if (recentLog) {
            return;
        }

        const log = await ActivityLog.create({
            userId: userId?.toString(),
            userEmail: userDetail?.email || userEmail || null,
            activity,
            details,
            metaData,
        });

        return { success: true, log };
    } catch (error) {
        console.error("Failed to log activity:", error);
        return { success: false, message: "Failed to log activity" };
    }
}

import { ActivityLog } from "../../models/activityLogs.model"
import { Op } from "sequelize"
const getRecentActivityService = async (userId: string) => {
    const activity = await ActivityLog.findAll({
        where: {
            userId,
            createdAt: {
                [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
        },
        order: [['createdAt', 'DESC']],
    })
    return activity
}

export default getRecentActivityService

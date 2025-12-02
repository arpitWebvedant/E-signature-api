import { Document } from "../../models";
import { sequelize } from "../../db/connectDb";

const getDocumentStatusesService = async (userId: number) => {
  try {
    const statusCounts = await Document.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("status")), "count"],
      ],
      where: { userId },
      group: ["status"],
    });

    const totalResult = await Document.count({ where: { userId } });

    return {
      total: totalResult,
      statuses: statusCounts.map((row) => ({
        status: row.get("status") as string,
        count: parseInt(row.get("count") as string, 10),
      })),
    };
  } catch (error) {
    console.error(error);
    return {
      total: 0,
      statuses: [],
    };
  }
};

export default getDocumentStatusesService;

import { DataTypes, Model, Optional, ModelStatic } from "sequelize";
import { sequelize } from "../db/connectDb";

interface ActivityLogAttributes {
    id: number;
    userId?: string;
    userEmail?: string;
    activity: string;
    details: string;
    metaData: object;
    createdAt?: Date;
}

type ActivityLogCreation = Optional<ActivityLogAttributes, "id" | "createdAt">;

class ActivityLog extends Model<ActivityLogAttributes, ActivityLogCreation>
    implements ActivityLogAttributes {
    public id!: number;
    public userId?: string;
    public userEmail?: string;
    public activity!: string;
    public details!: string;
    public metaData!: object;
    public createdAt!: Date;
    static associate(models: Record<string, ModelStatic<Model>>) {
        ActivityLog.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
    }
}

ActivityLog.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        userId: { type: DataTypes.STRING, allowNull: true },
        userEmail: { type: DataTypes.STRING, allowNull: true },
        activity: {
            type: DataTypes.ENUM("upload", "update", "delete", "send", "sign"),
            allowNull: false,
        },
        details: { type: DataTypes.TEXT, allowNull: false },
        metaData: { type: DataTypes.JSONB, allowNull: false },
        createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
        sequelize,
        tableName: "activityLogs",
        timestamps: false,
    }
);

export { ActivityLog };

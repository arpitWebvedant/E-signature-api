// documentAuditLog.model.ts
import { DataTypes, Model, ModelStatic } from 'sequelize';
import { sequelize } from '../db/connectDb';

export interface DocumentAuditLogAttributes {
    id: number;
    documentId: number;
    createdAt?: Date;
    type: string;
    data: object;
    name?: string | null;
    email?: string | null;
    userId?: number | null;
    userAgent?: string | null;
    ipAddress?: string | null;
}

// Add creation attributes interface that makes id optional
export interface DocumentAuditLogCreationAttributes 
    extends Omit<DocumentAuditLogAttributes, 'id' | 'createdAt'> {
    id?: number;
    createdAt?: Date;
}

export class DocumentAuditLog
    extends Model<DocumentAuditLogAttributes, DocumentAuditLogCreationAttributes>
    implements DocumentAuditLogAttributes
{
    public id!: number;
    public documentId!: number;
    public createdAt!: Date;
    public type!: string;
    public data!: object;
    public name!: string | null;
    public email!: string | null;
    public userId!: number | null;
    public userAgent!: string | null;
    public ipAddress!: string | null;

    static associate(models: Record<string, ModelStatic<Model>>) {
        
        DocumentAuditLog.belongsTo(models.Document, {
            foreignKey: 'documentId',
            as: 'document'
        });
        
        DocumentAuditLog.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
    }
}

DocumentAuditLog.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true, // Add this to make it clear it's auto-generated
        },
        documentId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Document',
                key: 'id',
            },
            allowNull: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        type: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        data: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        name: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        email: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'User',
                key: 'id',
            },
            allowNull: true,
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        ipAddress: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'DocumentAuditLog',
        timestamps: false, // createdAt handled manually
    }
);

export default DocumentAuditLog;
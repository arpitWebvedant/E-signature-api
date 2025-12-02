import { DataTypes, Model, ModelStatic, Op } from 'sequelize';
import { sequelize } from '../db/connectDb';

export interface RecipientAttributes {
    id?: number;
    documentId: number;
    email: string;
    name?: string;
    phone?: string; // Added phone field
    expired?: Date | null;
    role: string;
    readStatus?: string;
    signingStatus?: string;
    sendStatus?: string;
    authToken?: string;
    color?: string; 
    createdAt?: Date;
    updatedAt?: Date;
}

export class Recipient extends Model<RecipientAttributes> implements RecipientAttributes {
    public id!: number;
    public documentId!: number;
    public email!: string;
    public name!: string;
    public phone!: string; // Added phone field
    public expired!: Date | null;
    public role!: string;
    public readStatus!: string;
    public signingStatus!: string;
    public sendStatus!: string;
    public authToken!: string;
    public color?: string; 
    public createdAt!: Date;
    public updatedAt!: Date;

    static associate(models: Record<string, ModelStatic<Model>>) {
        Recipient.belongsTo(models.Document, {
            foreignKey: 'documentId',
            as: 'document'
        });
    }
}

Recipient.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        documentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Document',
                key: 'id',
            },
            onUpdate: 'CASCADE',
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: '',
        },
        phone: { // Added phone field
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: '',
        },
        expired: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isIn: [['SIGNER', 'VIEWER', 'APPROVER', 'CC', 'ASSISTANT']],
            },
            defaultValue: 'SIGNER',
        },
        readStatus: {
            type: DataTypes.STRING,
            validate: {
                isIn: [['NOT_OPENED', 'OPENED']],
            },
            allowNull: false,
            defaultValue: 'NOT_OPENED',
        },
        signingStatus: {
            type: DataTypes.STRING,
            validate: {
                isIn: [['NOT_SIGNED', 'SIGNED', 'REJECTED']],
            },
            allowNull: false,
            defaultValue: 'NOT_SIGNED',
        },
        sendStatus: {
            type: DataTypes.STRING,
            validate: {
                isIn: [['NOT_SENT', 'SENT']],
            },
            allowNull: false,
            defaultValue: 'NOT_SENT',
        },
        authToken: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        color: { 
            type: DataTypes.STRING(7), // #RRGGBB format
            allowNull: true,
            defaultValue: null,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'Recipient',
        timestamps: true,
        indexes: [
            // Add unique constraint for documentId + color combination
            {
                unique: true,
                fields: ['documentId', 'color'],
                where: {
                    color: {
                        [Op.ne]: null // Only enforce uniqueness for non-null colors
                    }
                }
            }
        ]
    }
);

export default Recipient;

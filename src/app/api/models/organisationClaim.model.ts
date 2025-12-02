import { DataTypes, Model, ModelStatic } from 'sequelize';
import { sequelize } from '../db/connectDb';

export interface OrganisationClaimAttributes {
    id?: number;
    documentId: number;
    originalSubscriptionClaimId: string;
    teamCount: number;
    memberCount: number;
    flags: string;
    createdAt?: Date;
    updatedAt?: Date;
}

class OrganisationClaim extends Model<OrganisationClaimAttributes, OrganisationClaimAttributes>
    implements OrganisationClaimAttributes {
    public id!: number;
    public documentId!: number;
    public originalSubscriptionClaimId!: string;
    public teamCount!: number;
    public memberCount!: number;
    public flags!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static associate(models: Record<string, ModelStatic<Model>>) {
        OrganisationClaim.belongsTo(models.Document, {
            foreignKey: 'documentId',
            as: 'document',
        });
    }
}

OrganisationClaim.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        documentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        originalSubscriptionClaimId: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        teamCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        memberCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        flags: {
            type: DataTypes.TEXT,
            allowNull: false,
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
        tableName: 'OrganisationClaim',
        timestamps: true,
    }
);

export default OrganisationClaim;

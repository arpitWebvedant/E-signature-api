import { DataTypes, Model, ModelStatic } from 'sequelize';
import { sequelize } from '../db/connectDb';

export interface OrganisationAttributes {
    id: string;
    createdAt?: Date;
    updatedAt: Date;
    type: string;
    name: string;
    url: string;
    avatarImageId?: string | null;
    customerId?: string | null;
    ownerUserId: number;
    organisationClaimId?: string | null;
    organisationGlobalSettingsId?: string | null;
    teamId?: number | null;
}

export class Organisation extends Model<OrganisationAttributes> implements OrganisationAttributes {
    public id!: string;
    public createdAt!: Date;
    public updatedAt!: Date;
    public type!: string;
    public name!: string;
    public url!: string;
    public avatarImageId!: string | null;
    public customerId!: string | null;
    public ownerUserId!: number;
    public organisationClaimId!: string | null;
    public organisationGlobalSettingsId!: string | null;
    public teamId!: number | null;

    static associate(models: Record<string, ModelStatic<Model>>) {
        
        Organisation.belongsTo(models.User, {
            foreignKey: 'ownerUserId',
            as: 'owner'
        });
        
        Organisation.belongsTo(models.Team, {
            foreignKey: 'teamId',
            as: 'team'
        });
    }
}

Organisation.init(
    {
        id: {
            type: DataTypes.TEXT,
            primaryKey: true,
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
        },
        type: {
            type: DataTypes.STRING,
            validate: {
                isIn: [['COMPANY', 'NON_PROFIT', 'EDUCATIONAL']],
            },
            allowNull: false,
        },
        name: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        url: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        avatarImageId: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        customerId: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        ownerUserId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'User',
                key: 'id',
            },
        },
        organisationClaimId: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        organisationGlobalSettingsId: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        teamId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Team',
                key: 'id',
            },
        },
    },
    {
        sequelize,
        tableName: 'Organisation',
        timestamps: true,
    }
);

export default Organisation;
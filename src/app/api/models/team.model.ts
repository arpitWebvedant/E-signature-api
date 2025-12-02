import { DataTypes, Model, ModelStatic } from 'sequelize';
import { sequelize } from '../db/connectDb';

export interface TeamAttributes {
    id?: number;
    name: string;
    url: string;
    createdAt?: Date;
    updatedAt?: Date;
    customerId?: string | null;
    ownerUserId: number;
}

export class Team extends Model<TeamAttributes> implements TeamAttributes {
    public id!: number;
    public name!: string;
    public url!: string;
    public createdAt!: Date;
    public updatedAt!: Date;
    public customerId!: string | null;
    public ownerUserId!: number;

    static associate(models: Record<string, ModelStatic<Model>>) {
        
        Team.belongsTo(models.User, {
            foreignKey: 'ownerUserId',
            as: 'owner'
        })

        // Team has many TeamEmails
        Team.hasMany(models.TeamEmail, {
            foreignKey: 'teamId',
            as: 'teamEmails'
        })

        // Team has many TeamGroups
        Team.hasMany(models.TeamGroup, {
            foreignKey: 'teamId',
            as: 'teamGroups'
        })

        // Team has many Documents
        Team.hasMany(models.Document, {
            foreignKey: 'teamId',
            as: 'documents'
        })

        // Team has many Folders
        Team.hasMany(models.Folder, {
            foreignKey: 'teamId',
            as: 'folders'
        })

        // Team has many Organisations
        Team.hasMany(models.Organisation, {
            foreignKey: 'teamId',
            as: 'organisations'
        })
    }
}

Team.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        url: {
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
        customerId: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        ownerUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'Team',
        timestamps: true,
    }
);

export default Team;

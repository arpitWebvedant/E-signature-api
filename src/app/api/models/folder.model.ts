import { DataTypes, Model, ModelStatic } from 'sequelize';
import { sequelize } from '../db/connectDb';

export interface FolderAttributes {
    id?: number;
    name: string;
    userId: number;
    teamId?: number | null;
    parentId?: number | null;
    visibility?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export class Folder extends Model<FolderAttributes> implements FolderAttributes {
    public id!: number;
    public name!: string;
    public userId!: number;
    public teamId!: number | null;
    public parentId!: number | null;
    public visibility!: string;
    public createdAt!: Date;
    public updatedAt!: Date;

    static associate(models: Record<string, ModelStatic<Model>>) {
        
        Folder.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
        
        Folder.belongsTo(models.Team, {
            foreignKey: 'teamId',
            as: 'team'
        });
        
        Folder.belongsTo(models.Folder, {
            foreignKey: 'parentId',
            as: 'parent'
        });
    }
}

Folder.init(
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
        userId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'User',
                key: 'id',
            },
            allowNull: false,
        },
        teamId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Team',
                key: 'id',
            },
            allowNull: true,
        },
        parentId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Folder',
                key: 'id',
            },
            allowNull: true,
        },
        visibility: {
            type: DataTypes.STRING,
            validate: {
                isIn: [['EVERYONE', 'MANAGER_AND_ABOVE', 'ADMIN']],
            },
            allowNull: false,
            defaultValue: 'EVERYONE',
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
        tableName: 'Folder',
        timestamps: true,
    }
);

export default Folder;

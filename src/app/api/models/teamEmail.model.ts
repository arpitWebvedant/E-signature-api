
import { DataTypes, Model, ModelStatic } from 'sequelize';
import { sequelize } from '../db/connectDb';

export interface TeamEmailAttributes {
    id: string;
    teamId: number;
    createdAt?: Date;
    name: string;
    email: string;
}

export class TeamEmail extends Model<TeamEmailAttributes> implements TeamEmailAttributes {
    public id!: string;
    public teamId!: number;
    public createdAt!: Date;
    public name!: string;
    public email!: string;

    static associate(models: Record<string, ModelStatic<Model>>) {
        
        TeamEmail.belongsTo(models.Team, {
            foreignKey: 'teamId',
            as: 'team'
        });
    }
}

TeamEmail.init(
    {
        id: {
            type: DataTypes.TEXT,
            primaryKey: true,
            allowNull: false,
        },
        teamId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Team',
                key: 'id',
            },
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        name: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        email: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'TeamEmail',
        timestamps: false,
    }
);

export default TeamEmail;
import { DataTypes, Model, ModelStatic } from 'sequelize';
import { sequelize } from '../db/connectDb';

export interface TeamGroupAttributes {
    id: string;
    organisationGroupId: string;
    teamRole: string;
    teamId: number;
}

export class TeamGroup extends Model<TeamGroupAttributes> implements TeamGroupAttributes {
    public id!: string;
    public organisationGroupId!: string;
    public teamRole!: string;
    public teamId!: number;

    static associate(models: Record<string, ModelStatic<Model>>) {
        
        TeamGroup.belongsTo(models.Team, {
            foreignKey: 'teamId',
            as: 'teamGroupTeam'
        });
    }
}

TeamGroup.init(
    {
        id: {
            type: DataTypes.TEXT,
            primaryKey: true,
            allowNull: false,
        },
        organisationGroupId: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        teamRole: {
            type: DataTypes.STRING,
            validate: {
                isIn: [['ADMIN', 'MANAGER', 'MEMBER']],
            },
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
    },
    {
        sequelize,
        tableName: 'TeamGroup',
        timestamps: false,
    }
);

export default TeamGroup;
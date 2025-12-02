import { DataTypes, Model, ModelStatic } from 'sequelize'
import { sequelize } from '../db/connectDb'

export interface UserAttributes {
  id?: number
  name: string
  email: string
  centralizedUserId: string
  fullName?: string
  signature?: string
  createdAt?: Date
  updatedAt?: Date
  isActive?: boolean
}

export class User extends Model<UserAttributes> implements UserAttributes {
  public id!: number
  public name!: string
  public email!: string
  public centralizedUserId!: string
  public fullName?: string
  public signature?: string
  public createdAt?: Date
  public updatedAt?: Date
  public isActive?: boolean

  static associate(models: Record<string, ModelStatic<Model>>) {
    // User has many Documents
    User.hasMany(models.Document, {
      foreignKey: 'userId',
      as: 'documents'
    })

    // User has many Folders
    User.hasMany(models.Folder, {
      foreignKey: 'userId',
      as: 'folders'
    })

    // User has many Teams (as owner)
    User.hasMany(models.Team, {
      foreignKey: 'ownerUserId',
      as: 'ownedTeams'
    })

    // User has many Organisations (as owner)
    User.hasMany(models.Organisation, {
      foreignKey: 'ownerUserId',
      as: 'ownedOrganisations'
    })

    // User has many DocumentAuditLogs
    User.hasMany(models.DocumentAuditLog, {
      foreignKey: 'userId',
      as: 'auditLogs'
    })

    // User has many ApiKeys
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    User.hasMany(models.ApiKey, {
      foreignKey: 'userId',
      as: 'apiKeys',
    })
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    signature: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    centralizedUserId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  { sequelize, tableName: 'User', timestamps: true },
)

export default User

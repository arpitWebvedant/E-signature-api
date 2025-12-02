import { DataTypes, Model, ModelStatic, Optional } from 'sequelize'
import { sequelize } from '../db/connectDb'

export interface ApiKeyAttributes {
  id?: number
  userId: number
  organizationId?: string
  name?: string | null
  prefix: string
  lastEight: string
  keyHash: string
  revokedAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
}

export type ApiKeyCreationAttributes = Optional<ApiKeyAttributes, 'id' | 'name' | 'revokedAt' | 'createdAt' | 'updatedAt'>

export class ApiKey extends Model<ApiKeyAttributes, ApiKeyCreationAttributes> implements ApiKeyAttributes {
  public id!: number
  public userId!: number
  public organizationId!: string
  public name!: string | null
  public prefix!: string
  public lastEight!: string
  public keyHash!: string
  public revokedAt!: Date | null
  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  static associate(models: Record<string, ModelStatic<Model>>) {
    ApiKey.belongsTo(models.User, { foreignKey: 'userId', as: 'user' })
  }
}

ApiKey.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'User', key: 'id' },
      onDelete: 'CASCADE',
    },
    organizationId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    prefix: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    lastEight: {
      type: DataTypes.STRING(8),
      allowNull: false,
    },
    keyHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    revokedAt: {
      type: DataTypes.DATE,
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
  { sequelize, tableName: 'ApiKey', timestamps: true },
)

export default ApiKey

import { DataTypes, Model } from 'sequelize'
import { sequelize } from '../db/connectDb'

export interface DocumentDataAttributes {
  id?: number
  type: string
  data: string
  fileType: string
  initialData?: string
  signedFileKey?: string
  signedFileResponse?: string
  pageCount?: number
  createdAt?: Date
  updatedAt?: Date
}

export class DocumentData
  extends Model<DocumentDataAttributes>
  implements DocumentDataAttributes
{
  public id!: number
  public type!: string
  public data!: string
  public fileType!: string
  public initialData!: string
  public signedFileKey!: string
  public signedFileResponse!: string
  public pageCount!: number
  public createdAt?: Date 
  public updatedAt?: Date
}

DocumentData.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['S3_PATH', 'BYTES', 'BYTES_64']],
      },
    },
    data: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    fileType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    initialData: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    pageCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    signedFileKey: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    signedFileResponse: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: 'DocumentData',
    timestamps: true,
  },
)

export default DocumentData

import { DataTypes, Model, ModelStatic } from 'sequelize'
import { sequelize } from '../db/connectDb'
import { DocumentMetaAttributes } from './documentMeta.model'
import DocumentData from './documentData.model'

export interface DocumentAttributes {
  id?: number
  userId: number
  title: string
  status?: string
  document: string
  createdAt?: Date
  updatedAt?: Date
  qrToken?: string
  externalId?: string | null
  sourceDocumentId?: string
  sourceSite?: string
  documentDataId?: number
  organizationId?: string
  teamId?: number
  folderId?: number
  visibility?: string
  formValues?: Record<string, string | number | boolean>
  source?: string
  documentMetaId?: number // Add this for the foreign key
  documentMeta?: DocumentMetaAttributes
  documentSignData?: object // Add this property to fix the error
}

export class Document
  extends Model<DocumentAttributes, DocumentAttributes>
  implements DocumentAttributes
{
  public id!: number
  public qrToken?: string
  public externalId?: string | null
  public documentDataId?: number
  public organizationId?: string
  public userId!: number
  public title!: string
  public status!: string
  public document!: string
  public teamId?: number
  public folderId?: number
  public visibility?: string
  public formValues?: Record<string, string | number | boolean>
  public source?: string
  public documentMetaId?: number // Add this property
  public documentMeta?: DocumentMetaAttributes
  public documentSignData?: object
  public sourceDocumentId?: string
  public sourceSite?: string
  public createdAt!: Date
  public updatedAt!: Date
  public documentData?: DocumentData

  static associate(models: Record<string, ModelStatic<Model>>) {
    Document.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    })

    Document.belongsTo(models.DocumentData, {
      foreignKey: 'documentDataId',
      as: 'documentData',
    })

    Document.belongsTo(models.Team, {
      foreignKey: 'teamId',
      as: 'team',
    })

    Document.belongsTo(models.Folder, {
      foreignKey: 'folderId',
      as: 'folder',
    })

    // Add this association
    Document.belongsTo(models.DocumentMeta, {
      foreignKey: 'documentMetaId',
      as: 'documentMeta',
    })
  }
}

Document.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'User',
        key: 'id',
      },
      allowNull: false,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      validate: {
        isIn: [['COMPLETED', 'DRAFT', 'PENDING', 'REJECTED', 'INBOX', 'ALL']],
      },
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    document: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    qrToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    externalId: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    documentDataId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'DocumentData',
        key: 'id',
      },
      allowNull: true,
    },
    sourceDocumentId: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sourceSite: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    documentMetaId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'DocumentMeta',
        key: 'id',
      },
      allowNull: true,
    },
    teamId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Team',
        key: 'id',
      },
      allowNull: true,
    },
    organizationId: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    folderId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Folder',
        key: 'id',
      },
      allowNull: true,
    },
    documentSignData: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    visibility: {
      type: DataTypes.STRING,
      validate: {
        isIn: [['EVERYONE', 'MANAGER_AND_ABOVE', 'ADMIN']],
      },
      allowNull: true,
      defaultValue: 'EVERYONE',
    },
    formValues: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    source: {
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
    tableName: 'Document',
    timestamps: true,
  },
)

export default Document

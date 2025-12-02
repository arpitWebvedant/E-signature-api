import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/connectDb';

export interface DocumentMetaAttributes {
    id?: number;
    language?: string | null;
    timezone?: string | null;
    dateFormat?: string | null;
    message?: string | null;
    subject?: string | null;
    password?: string | null;
    redirectUrl?: string | null;
    signingOrder?: string | null;
    allowDictateNextSigner?: boolean | null;
    distributionMethod?: string | null;
    typedSignatureEnabled?: boolean | null;
    uploadSignatureEnabled?: boolean | null;
    drawSignatureEnabled?: boolean | null;
    emailId?: string | null;
    emailReplyTo?: string | null;
    emailSettings?: string | null;
}

export class DocumentMeta
    extends Model<DocumentMetaAttributes>
    implements DocumentMetaAttributes
{
    public id!: number;
    public language!: string | null;
    public timezone!: string | null;
    public dateFormat!: string | null;
    public message!: string | null;
    public subject!: string | null;
    public password!: string | null;
    public redirectUrl!: string | null;
    public signingOrder!: string | null;
    public allowDictateNextSigner!: boolean | null;
    public distributionMethod!: string | null;
    public typedSignatureEnabled!: boolean | null;
    public uploadSignatureEnabled!: boolean | null;
    public drawSignatureEnabled!: boolean | null;
    public emailId!: string | null;
    public emailReplyTo!: string | null;
    public emailSettings!: string | null;
}

DocumentMeta.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        language: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        timezone: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        dateFormat: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        subject: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        password: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        redirectUrl: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        signingOrder: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        allowDictateNextSigner: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        distributionMethod: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        typedSignatureEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        uploadSignatureEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        drawSignatureEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        emailId: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        emailReplyTo: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        emailSettings: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'DocumentMeta',
        timestamps: false,
    }
);

export default DocumentMeta;

import { sequelize } from '@/app/api/db/connectDb'
import {
  Document,
  DocumentAuditLog,
  DocumentData,
  DocumentMeta,
  Folder,
  Recipient,
  Team,
  User,
} from '@/app/api/models'
// import { buildTeamWhereQuery, getTeamById, getTeamSettings } from '@/app/api/services/teamService';
import {
  ApiRequestMetadata,
  CreateDocumentAuditLogDataResponse,
  CreateDocumentOptions,
  RequestMetadata,
} from '@/app/api/types/create-document'
import { normalizePdf as makeNormalizedPdf } from '../../lib/pdf/normalize-pdf'
import { getFileServerSide } from '../../lib/upload/get-file.server'
import { putPdfFileServerSide } from '../../lib/upload/put-file.server'
import { DocumentMetaAttributes } from '../../models/documentMeta.model'
import { DocumentVisibility } from '../../types/common'
import { logActivity } from './logActivity.services'
import { EmailService } from '../email.services'
import { DocumentSigningData } from '../../types/email'
import { is } from 'zod/locales'

type CreateDocumentAuditLogDataOptions<T extends DocumentAuditLog['type']> = {
  documentId: number
  type: T
  data: object
  user?: {
    id?: number | null
    email?: string | null
    name?: string | null
  }
  requestMetadata?: RequestMetadata
  metadata?: ApiRequestMetadata
}

export const createDocument = async ({
  userId,
  title,
  externalId,
  documentDataId,
  teamId,
  normalizePdf,
  formValues,
  requestMetadata,
  timezone,
  userTimezone,
  folderId,
  organizationId,
  sourceDocumentId,
  sourceSite,
}: CreateDocumentOptions) => {
  // TODO: this will be used in the future after the team services is implemented
  // const team = await getTeamById({ userId, teamReference: teamId });
  // const settings = await getTeamSettings({ userId, teamId });

  let folderVisibility: DocumentVisibility | string | undefined

  if (folderId) {
    const folder = await Folder.findOne({ where: { id: Number(folderId), userId: Number(userId) } })

    if (!folder) {
      throw new Error('Folder not found')
    }

    folderVisibility = folder.visibility
  }

  if (normalizePdf) {
    const documentData = await DocumentData.findOne({
      where: { id: documentDataId },
    })

    if (documentData) {
      const buffer = await getFileServerSide({
        type: documentData.type as 'BYTES' | 'BYTES_64' | 'S3_PATH',
        data: documentData.data,
      })

      const normalizedPdfBuffer = await makeNormalizedPdf(Buffer.from(buffer))

      const newDocumentData = await putPdfFileServerSide({
        name: title?.endsWith('.pdf') ? title : `${title}.pdf`,
        type: 'application/pdf',
        arrayBuffer: async () =>
          Promise.resolve(
            normalizedPdfBuffer.buffer.slice(
              normalizedPdfBuffer.byteOffset,
              normalizedPdfBuffer.byteOffset + normalizedPdfBuffer.byteLength,
            ) as ArrayBuffer,
          ),
      },
        String(organizationId ?? ''),
        String(userId ?? ''),
      )

      documentDataId = newDocumentData.id
    }
  }

  // TODO: this will be used in the future after the team services is implemented
  // const timezoneToUse = timezone || settings.documentTimezone || userTimezone;
  const timezoneToUse = timezone || userTimezone

  return await sequelize.transaction(async (t) => {
    const document = await Document.create(
      {
        title: title || '',
        document: 'test',
        // TODO:
        // qrToken: prefixedId('qr'),
        qrToken: `qr_${Math.random().toString(36).substring(2, 13)}`,
        externalId,
        documentDataId,
        sourceDocumentId,
        sourceSite,
        userId,
        teamId,
        folderId,
        organizationId,
        // TODO: this will be used in the future after the team services is implemented
        // visibility: folderVisibility ?? determineDocumentVisibility(settings.documentVisibility, team.currentTeamRole),
        visibility:
          folderVisibility ?? determineDocumentVisibility(null, 'USER'),
        formValues,
        source: 'DOCUMENT',
        documentMeta: {
          ...extractDerivedDocumentMeta(null, {
            timezone: timezoneToUse,
          }),
        },
      },
      {
        transaction: t,
        include: [{ model: DocumentMeta, as: 'documentMeta' }],
      },
    )

    // Audit log
    await DocumentAuditLog.create(
      createDocumentAuditLogData({
        documentId: document.id,
        type: 'DOCUMENT_CREATED',
        metadata: requestMetadata,
        data: {
          title,
          source: { type: 'DOCUMENT' },
        },
      }),
      { transaction: t },
    )

    // Fetch document with relations
    const createdDocument = await Document.findOne({
      where: { id: document.id },
      include: [{ model: DocumentMeta, as: 'documentMeta' }],
      transaction: t,
    })

    if (!createdDocument) {
      throw new Error('Document not found')
    }

    // TODO: Trigger webhook
    // await triggerWebhook({
    //     event: WebhookTriggerEvents.DOCUMENT_CREATED,
    //     data: ZWebhookDocumentSchema.parse(mapDocumentToWebhookDocumentPayload(createdDocument)),
    //     userId,
    //     teamId,
    // });

    return createdDocument
  })
}

function getDocumentSignDataTitle(documentSignData: object | undefined): string | undefined {
    if (!documentSignData || typeof documentSignData !== 'object') {
      return undefined;
    }
    
    const signData = documentSignData as Record<string, any>;
    return signData["0"]?.data?.title?.trim();
  }

export const deleteDocument = async ({
  userId,
  documentId,
}: {
  userId: number
  documentId: number
}) => {
  return await sequelize.transaction(async (t) => {
    const document = await Document.findOne({
      where: {
        id: documentId,
        userId,
      },
      include: [
        { model: User, as: 'user' },
      ],
      transaction: t,
    })

    if (!document) {
      return { success: false, message: 'Document not found' }
    }

    const { Recipient } = await import('../../models/recipient.model')
    const recipients = await Recipient.findAll({
      where: { documentId },
      transaction: t,
    })
    const documentMetaDeatils = await DocumentMeta.findOne({
      where: {
        id: document.documentMetaId,
      },
    })

    if (documentMetaDeatils && documentMetaDeatils.emailSettings) {
      const isEmailSendOnCompleteDoc = JSON.parse(documentMetaDeatils.emailSettings || "").documentDeleted || false
      const emailService = new EmailService()
      if (isEmailSendOnCompleteDoc) {
        await Promise.all(
          recipients.map((recipient: any) =>
            emailService.sendEmail('DOCUMENT_DELETED', {
              documentId: document.id,
              // documentName: document.title,
              documentName: getDocumentSignDataTitle(document.documentSignData) || document.title,
              recipientName: recipient.name,
              recipientEmail: recipient.email,
              //@ts-ignore
              senderName: document.user.name,
              //@ts-ignore
              senderEmail: document.user.email,
            } as DocumentSigningData)
          )
        ).catch((err) => {
          console.error('Failed to send some cancellation emails:', err)
        })
      }
    }
    await Recipient.destroy({ where: { documentId }, transaction: t })

    const { DocumentAuditLog } = await import('../../models/documentAuditLog.model')
    await DocumentAuditLog.destroy({ where: { documentId }, transaction: t })

    const relatedDocumentDataId = document.documentDataId
    const relatedDocumentMetaId = document.documentMetaId

    await document.destroy({ transaction: t })

    if (relatedDocumentDataId) {
      const { DocumentData } = await import('../../models/documentData.model')
      await DocumentData.destroy({ where: { id: relatedDocumentDataId }, transaction: t })
    }

    if (relatedDocumentMetaId) {
      const { DocumentMeta } = await import('../../models/documentMeta.model')
      await DocumentMeta.destroy({ where: { id: relatedDocumentMetaId }, transaction: t })
    }

    await logActivity({
      userId,
      activity: 'delete',
      payload: {
        documentId: Number(documentId),
        // documentName: document.title,
        documentName: getDocumentSignDataTitle(document.documentSignData) || document.title,
      },
    })

    return { success: true, message: 'Document deleted' }
  })
}



export const updateDocument = async ({
  userId,
  documentId,
  documentDataId,
}: {
  userId: number;
  documentId: number;
  documentDataId: number;
}) => {
  const document = await Document.findOne({
    where: {
      id: documentId,
      userId,
    },
    include: [
      { model: DocumentData, as: 'documentData' },
      { model: DocumentMeta, as: 'documentMeta' },

      {
        model: Team,
        as: 'team',
        attributes: ['id', 'url'],
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email'],
      },
    ],
  })

  if (!document) {
    return { success: false, message: 'Document not found' }
  }
}

// Update the underlying DocumentData record (source file info)
export const updateDocumentFile = async ({
  userId,
  documentId,
  id,
  type,
  title,
  data,
  fileType,
  initialData,
  pageCount,
}: {
  userId: number
  id: number
  documentId: number
  type: 'S3_PATH' | 'BYTES' | 'BYTES_64'
  data: string
  title: string
  fileType?: string | null
  initialData?: string | null
  pageCount?: number | null
}) => {
  return await sequelize.transaction(async (t) => {
    const document = await Document.findOne({
      where: { id: documentId, userId },
      include: [{ model: DocumentData, as: 'documentData' }, { model: DocumentMeta, as: 'documentMeta' }],
      transaction: t,
    })

    if (!document) {
      return { success: false, message: 'Document not found' }
    }

    const documentData = document.documentData

    if (documentData) {
      await DocumentData.update({
        type,
        data,
        fileType: fileType ?? null as unknown as string,
        initialData: initialData ?? '',
        pageCount: pageCount ?? null as unknown as number,
      }, { where: { id: documentData.id }, transaction: t })
    }
    if (title) {
      await Document.update({
        title,
      }, { where: { id: document.id }, transaction: t })
    }

    // reload full document with relations
    const updated = await Document.findOne({
      where: { id: document.id },
      include: [
        { model: DocumentData, as: 'documentData' },
        { model: DocumentMeta, as: 'documentMeta' },
        { model: Team, as: 'team', attributes: ['id', 'url'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
      ],
      transaction: t,
    })

    return { success: true, data: updated?.get({ plain: true }) }
  })
}

export const getDocumentForPublic = async ({
  documentId,
  recipientEmail,
  ownerId,
  token,
}: {
  documentId: number
  recipientEmail: string
  ownerId: number
  token: string
}) => {
  const document = await Document.findOne({
    where: {
      id: documentId,
      userId: ownerId,
    },
    include: [
      { model: DocumentData, as: 'documentData' },
      { model: DocumentMeta, as: 'documentMeta' },
      {
        model: Team,
        as: 'team',
        attributes: ['id', 'url'],
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email'],
      },
    ],
  })
  console.log("document", document?.id)
  if (!document) return null
  
  const recipients = await Recipient.findAll({
    where: { documentId },
  })
  console.log("recipients", recipients)
  const matchingRecipient = recipients.find(
    (r: any) => r.email.toLowerCase() === recipientEmail.toLowerCase() && r.authToken === token
  )

  console.log("matchingRecipient", matchingRecipient)

  if (!matchingRecipient) return null

  return {
    data: {
      ...document.get({ plain: true }),
      recipients: recipients.map((r) => r.get({ plain: true })),
    },
  }
  // return JSON.parse(
  //   JSON.stringify({
  //     data: {
  //       ...document.get({ plain: true }),
  //       recipients: recipients.map((r) => r.get({ plain: true })),
  //     },
  //   })
  // );
}


export const updateDocumentData = async ({
  documentSignData,
  userId,
  documentId,
  isComplete,
}: CreateDocumentOptions) => {
  return await sequelize.transaction(async (t) => {
    const document = await Document.findOne({
      where: {
        id: documentId,
      },
      include: [
        { model: DocumentData, as: 'documentData' },
        { model: DocumentMeta, as: 'documentMeta' },
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'url'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    })

    if (!document) {
      return { success: false, message: 'Document not found' }
    }

    console.log("isComplete", isComplete);
    
    if (isComplete) {
      const existingData = JSON.parse(JSON.stringify(document.documentSignData || {}));
      const newData = documentSignData as Record<string, any>;

      // Handle the "2" key (fields array merging)
      if (newData?.["2"]?.data?.fields) {
        // Ensure the structure exists in existingData
        if (!existingData["2"]) {
          existingData["2"] = { data: { fields: [] }, step: newData["2"].step };
        }
        if (!existingData["2"].data) {
          existingData["2"].data = { fields: [] };
        }
        if (!Array.isArray(existingData["2"].data.fields)) {
          existingData["2"].data.fields = [];
        }

        const oldFields = existingData["2"].data.fields;
        const newFields = newData["2"].data.fields;

        // Merge fields based on signerEmail
        newFields.forEach((newField: any) => {
          const index = oldFields.findIndex(
            (oldField: any) =>
              oldField.signerEmail?.trim().toLowerCase() ===
              newField.signerEmail?.trim().toLowerCase() &&
              oldField.id === newField.id
          );

          if (index !== -1) {
            // Update existing field
            oldFields[index] = {
              ...oldFields[index],
              ...newField,
            };
          } else {
            // Add new field
            oldFields.push(newField);
          }
        });

        // Update step if provided
        if (newData["2"].step !== undefined) {
          existingData["2"].step = newData["2"].step;
        }
      }

      // Handle the "1" key (complete replacement)
      if (newData?.["1"]) {
        existingData["1"] = newData["1"];
      }

      // Handle any other keys that should be completely replaced
      Object.keys(newData).forEach(key => {
        if (key !== "2") { // "2" is already handled with merge logic
          existingData[key] = newData[key];
        }
      });

      document.documentSignData = existingData;
    } else {
      // Not complete - overwrite entirely
      document.documentSignData = documentSignData;
    }

    await document.save({ transaction: t })

    await logActivity({
      userId,
      activity: "update",
      payload: {
        documentId: Number(documentId),
        // documentName: document.title,
        documentName: getDocumentSignDataTitle(document.documentSignData) || document.title,
      }
    });

    return document
  })
}

const createDocumentAuditLogData = <T extends DocumentAuditLog['type']>({
  documentId,
  type,
  data,
  user,
  requestMetadata,
  metadata,
}: CreateDocumentAuditLogDataOptions<T>): CreateDocumentAuditLogDataResponse<T> => {
  let userId: number | null = metadata?.auditUser?.id || null
  let email: string | null = metadata?.auditUser?.email || null
  let name: string | null = metadata?.auditUser?.name || null

  // Prioritize explicit user parameter over metadata audit user.
  if (user) {
    userId = user.id || null
    email = user.email || null
    name = user.name || null
  }

  const ipAddress =
    metadata?.requestMetadata?.ipAddress ?? requestMetadata?.ipAddress ?? null
  const userAgent =
    metadata?.requestMetadata?.userAgent ?? requestMetadata?.userAgent ?? null

  return {
    type,
    data,
    documentId,
    userId,
    email,
    name,
    userAgent,
    ipAddress,
  }
}

export type DocumentSettings = {
  documentLanguage?: string | null
  documentTimezone?: string | null
  documentDateFormat?: string | null
  emailDocumentSettings?: string | null
} & Pick<
  DocumentMetaAttributes,
  | 'typedSignatureEnabled'
  | 'uploadSignatureEnabled'
  | 'drawSignatureEnabled'
  | 'emailId'
  | 'emailReplyTo'
>


const extractDerivedDocumentMeta = (
  settings: DocumentSettings | null | undefined,
  overrideMeta: Partial<DocumentMetaAttributes> | undefined | null,
) => {
  const meta = overrideMeta ?? {}

  return {
    language: meta.language || settings?.documentLanguage,
    timezone: meta.timezone || settings?.documentTimezone,
    dateFormat: meta.dateFormat || settings?.documentDateFormat,
    message: meta.message || null,
    subject: meta.subject || null,
    password: meta.password || null,
    redirectUrl: meta.redirectUrl || null,

    signingOrder: meta.signingOrder || 'PARALLEL',
    allowDictateNextSigner: meta.allowDictateNextSigner ?? false,
    distributionMethod: meta.distributionMethod || 'EMAIL',

    // Signature settings.
    typedSignatureEnabled:
      meta.typedSignatureEnabled ?? settings?.typedSignatureEnabled,
    uploadSignatureEnabled:
      meta.uploadSignatureEnabled ?? settings?.uploadSignatureEnabled,
    drawSignatureEnabled:
      meta.drawSignatureEnabled ?? settings?.drawSignatureEnabled,

    // Email settings.
    emailId: meta.emailId ?? settings?.emailId,
    emailReplyTo: meta.emailReplyTo ?? settings?.emailReplyTo,
    emailSettings: meta.emailSettings || settings?.emailDocumentSettings,
  } satisfies Omit<DocumentMetaAttributes, 'id'>
}

const determineDocumentVisibility = (
  globalVisibility: DocumentVisibility | null | undefined,
  userRole: string,
): DocumentVisibility => {
  if (globalVisibility) {
    return globalVisibility
  }

  if (userRole === 'ADMIN') {
    return 'ADMIN'
  }

  if (userRole === 'MANAGER') {
    return 'MANAGER_AND_ABOVE'
  }

  return 'EVERYONE'
}

const buildTeamWhereQuery = ({ teamId, userId, roles }: { teamId: number, userId: number, roles?: string[] }) => {
  if (!roles) {
    return {
      id: teamId,
      teamGroups: {
        some: {
          organisationGroup: {
            organisationGroupMembers: {
              some: {
                organisationMember: {
                  userId,
                },
              },
            },
          },
        },
      },
    }
  }

  return {
    id: teamId,
    teamGroups: {
      some: {
        organisationGroup: {
          organisationGroupMembers: {
            some: {
              organisationMember: {
                userId,
              },
            },
          },
        },
        teamRole: {
          in: roles,
        },
      },
    },
  }
}

import { Document, DocumentData, DocumentMeta, Folder, Recipient, Team, User } from '../../models'

interface GetDocumentBySourceParams {
  sourceDocumentId: string
  sourceSite: string
}

interface SingleDocumentResult {
  success: boolean
  message: string
  data: any | null
}

async function getDocumentBySourceService(
  params: GetDocumentBySourceParams,
): Promise<SingleDocumentResult> {
  const { sourceDocumentId, sourceSite } = params
  try {

    if (!sourceDocumentId || !sourceSite) {
      throw new Error('Both sourceDocumentId and sourceSite are required')
    }

    // Fetch document by sourceDocumentId and sourceSite
    const document = await Document.findOne({
      where: { sourceDocumentId, sourceSite },
      include: [
        { model: User, as: 'user' },
        {
          model: DocumentData,
          as: 'documentData',
          attributes: ['id', 'type', 'data', 'pageCount', 'fileType'],
        },
        { model: Team, as: 'team' },
        { model: Folder, as: 'folder' },
        { model: DocumentMeta, as: 'documentMeta' },
      ],
      order: [['createdAt', 'DESC']],
    })

    if (!document) {
      return {
        success: false,
        message: 'Document not found',
        data: {},
      }
    }

    // Fetch recipients
    const recipients = await Recipient.findAll({
      where: { documentId: document.id },
    })

    const recipientDetails = recipients.map((rec) => ({
      name: rec.name,
      email: rec.email,
      signingStatus: rec.signingStatus,
    }))

    const documentWithRecipients = {
      ...document.toJSON(),
      recipientDetails,
    }

    return {
      success: true,
      message: 'Document fetched successfully',
      data: documentWithRecipients,
    }
  } catch (error : any) {
    return {
      success: false,
      message: error.message,
      data: {},
    }
  }
}

export default getDocumentBySourceService

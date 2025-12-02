import {
  Document,
  DocumentData,
  DocumentMeta,
  Recipient,
  Team,
  User,
} from '../../models'
import { sendDocumentCompletedEmail, sendDocumentRejectionEmailToOwner, sendDocumentRejectionEmailToRecipient, sendDocumentSignedEmail, sendPendingDocumentEmail } from '../email.services'
import { generateToken } from '../jwt'
import { getPresignedUrlService } from './getPresignedUrl.services'
import { logActivity } from './logActivity.services'

export const getDocumentWithDetailsById = async ({
  documentId,
  userId,
}: {
  documentId: number
  userId: number
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
  const recipients = await Recipient.findAll({
    where: {
      documentId: documentId,
    },
  })
  const finalData = {
    ...document.get({ plain: true }),
    recipients: recipients.map((recipient) => recipient.get({ plain: true })),
  }

  return { data: finalData }
}
export const updateStatus = async ({
  documentId,
  userId,
  email,
  status,
  signature,
}: {
  documentId: number
  userId: number
  email: string
  status: string
  signature: string
}) => {
  // Step 1: Find the document and ensure it belongs to the user
  const document = await Document.findOne({
    where: { id: documentId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email'],
      },
      {
        model: DocumentData,
        as: 'documentData',
        attributes: ['data'],
      },
    ],
  })

  if (!document) {
    return { success: false, message: 'Document not found' }
  }

  // Step 2: Find recipient by documentId AND email
  let recipient
  if (email) {
    recipient = await Recipient.findOne({
      where: {
        documentId,
        email,
      },
    })
    if (!recipient) {
      return { success: false, message: 'Recipient not found' }
    }

    console.log('Before update:', recipient.dataValues)

    recipient.signingStatus = 'SIGNED'
    if (status === "COMPLETED") {
      await recipient.save()
    } else if (status === "REJECTED") {
      recipient.signingStatus = 'REJECTED'
      await recipient.save()
    }

    console.log('After update:', recipient.dataValues)
  }


  const recipientData = await Recipient.findAll({
    where: {
      documentId,
    },
  })
  const checkAllSigned = recipientData.every(
    (recipient) => recipient.signingStatus === 'SIGNED',
  )

  // Step 4: Update document's signature data
  if (checkAllSigned) {
    document.documentSignData = {
      ...document.documentSignData,
      signature,
    }
    document.set({ status })
  } else if (recipientData.length) {
    document.set({ status: 'PENDING' })
  }
  await document.save()

  const documentMetaDeatils = await DocumentMeta.findOne({
    where: {
      id: document.documentMetaId,
    },
  })

  const recipientsWithNotSigned = recipientData.filter(
    (recipient) => recipient.signingStatus === 'NOT_SIGNED',
  )

  function getDocumentSignDataTitle(documentSignData: object | undefined): string | undefined {
    if (!documentSignData || typeof documentSignData !== 'object') {
      return undefined;
    }
    
    const signData = documentSignData as Record<string, any>;
    return signData["0"]?.data?.title?.trim();
  }

  if (documentMetaDeatils && documentMetaDeatils.emailSettings && status === ("COMPLETED")) {
    const isEmailSendOnCompleteDoc = JSON.parse(documentMetaDeatils.emailSettings || "").documentCompleted || false
    const emailMetadata = {
      // documentName: document.title,
      documentName: getDocumentSignDataTitle(document.documentSignData) || document.title,
      recipientEmail: email as string || "",
      recipientName: recipient?.name as string || "",
      //@ts-ignore
      senderEmail: document.get({ plain: true }).user?.email as string,
    }
    if (isEmailSendOnCompleteDoc) {
      const presignedUrl = await getPresignedUrlService({
        userId: document.userId,
        documentId,
        key: document?.documentData?.data,
      }, {
        signerEmail: email
      }, true)
      sendDocumentSignedEmail(emailMetadata, presignedUrl)
    }

    const isEmailSendToSenderOnCompleteDoc = JSON.parse(documentMetaDeatils.emailSettings || "").ownerDocumentCompleted || false
    const isSendPendingDocEmail = JSON.parse(documentMetaDeatils.emailSettings || "").documentPending || false

    if (checkAllSigned && isEmailSendToSenderOnCompleteDoc) {
      sendDocumentCompletedEmail({
        // documentName: document.title,
        documentName: getDocumentSignDataTitle(document.documentSignData) || document.title,
        //@ts-ignore
        recipientEmail: document.user?.email as string,
        //@ts-ignore
        senderName: document.user?.name as string,
      })
    }
    const baseUrl = process.env.NEXT_PRIVATE_FRONTEND_URL || "http://localhost:3010";
    if (isSendPendingDocEmail && recipientsWithNotSigned?.length > 0) {
      recipientsWithNotSigned.forEach((recipient) => {
        const token = generateToken({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
        }, "30d");
        const signingUrl = `${baseUrl}/sign_document/${document.id}/sign?action=sign&checkId=${Number(document.userId)}&token=${encodeURIComponent(
          token
        )}&recipient=${encodeURIComponent(recipient.email)}`;
        sendPendingDocumentEmail({
          // documentName: document.title,
          documentName: getDocumentSignDataTitle(document.documentSignData) || document.title,
          recipientEmail: recipient.email as string,
          signingUrl,
          //@ts-ignore
          senderName: document.user?.name as string,
          //@ts-ignore
          senderEmail: document.user?.email as string,
        })
      })
    }
  }

  if (documentMetaDeatils && documentMetaDeatils.emailSettings && status === "REJECTED") {
    const isEmailSendOnSignRequest = JSON.parse(documentMetaDeatils.emailSettings || "").recipientSigningRequest || false

    if (isEmailSendOnSignRequest) {
      await sendDocumentRejectionEmailToRecipient({
        // documentName: document.title,
        documentName: getDocumentSignDataTitle(document.documentSignData) || document.title,
        recipientEmail: email as string || "",
        recipientName: recipient?.name as string || "",
        //@ts-ignore
        senderEmail: document.user?.email as string,
        //@ts-ignore
        senderName: document.user?.name as string,
      })

      await sendDocumentRejectionEmailToOwner({
        // documentName: document.title,
        documentName: getDocumentSignDataTitle(document.documentSignData) || document.title,
        //@ts-ignore
        recipientEmail: document.user?.email as string || "",
        //@ts-ignore
        recipientName: recipient?.name as string || "",
        //@ts-ignore
        senderEmail: document.user?.email as string,
        //@ts-ignore
        senderName: document.user?.name as string,
      })
    }

  }


  await logActivity({
    userId,
    activity: "sign",
    payload: {
      documentId: Number(documentId),
      signer: { email: email, name: recipient?.name || "" },
      // documentName: document.title,
      documentName: getDocumentSignDataTitle(document.documentSignData) || document.title,
    }
  });

  return { success: true, data: document.get({ plain: true }) }
}

const getDocumentSignDataTitle = (documentSignData: object | undefined): string | undefined => {
  if (!documentSignData || typeof documentSignData !== 'object') {
    return undefined;
  }

  const signData = documentSignData as Record<string, any>;
  return signData["0"]?.data?.title?.trim();
}

export const rejectDocument = async ({
  documentId,
  userId,
  email,
  reason,
  subject,
  category,
  notifySender,
}: {
  documentId: number
  userId: number
  email: string
  reason?: string
  subject?: string
  category?: string
  notifySender?: boolean
}) => {
  const document = await Document.findOne({
    where: { id: Number(documentId) },
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
    ],
  })

  if (!document) {
    return { success: false, message: 'Document not found' }
  }

  if (Number(userId) !== Number(document.userId)) {
    return { success: false, message: 'User does not own this document' }
  }

  const recipient = await Recipient.findOne({
    where: { documentId: Number(documentId), email: String(email) },
  })

  if (!recipient) {
    return { success: false, message: 'Recipient not found' }
  }

  recipient.signingStatus = 'REJECTED'
  await recipient.save()

  const prevRejection = (
    document.documentSignData as unknown as { rejection?: Record<string, unknown> }
  )?.rejection
  document.documentSignData = {
    ...document.documentSignData,
    rejection: {
      ...prevRejection,
      reason,
      subject,
      category,
      notifySender: Boolean(notifySender),
      by: String(email),
      at: new Date().toISOString(),
    },
  }
  document.set({ status: 'REJECTED' })
  await document.save()

  const documentMetaDeatils = await DocumentMeta.findOne({ where: { id: document.documentMetaId } })
  const emailSettings = documentMetaDeatils?.emailSettings ? JSON.parse(documentMetaDeatils.emailSettings) : {}
  const shouldNotify = notifySender === true || emailSettings?.recipientSigningRequest === true

  if (shouldNotify) {
    await sendDocumentRejectionEmailToRecipient({
      // documentName: document.title,
      documentName: getDocumentSignDataTitle(document.documentSignData) || document.title,
      recipientEmail: String(email),
      recipientName: recipient.name || '',
      // @ts-expect-error association user is included above
      senderEmail: document.user?.email as string,
      // @ts-expect-error association user is included above
      senderName: document.user?.name as string,
    })

    await sendDocumentRejectionEmailToOwner({
      // documentName: document.title,
      documentName: getDocumentSignDataTitle(document.documentSignData) || document.title,
      // @ts-expect-error association user is included above
      recipientEmail: document.user?.email as string,
      recipientName: recipient.name || '',
      // @ts-expect-error association user is included above
      senderEmail: document.user?.email as string,
      // @ts-expect-error association user is included above
      senderName: document.user?.name as string,
    })
  }

  await logActivity({
    userId,
    activity: 'update',
    payload: {
      documentId: Number(documentId),
      signer: { email: String(email), name: recipient.name || '' },
      // documentName: document.title,
      documentName: getDocumentSignDataTitle(document.documentSignData) || document.title,
      extra: `Document rejected by ${email}${reason ? `: ${reason}` : ''}`,
    },
  })

  return { success: true, data: document.get({ plain: true }) }
}

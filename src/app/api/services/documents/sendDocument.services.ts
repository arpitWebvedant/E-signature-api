import { EmailService } from '@/app/api/services/email.services'
import { sendSms, SendSmsRequest } from '@/app/api/services/phone.services';
import { DocumentSigningData } from '../../types/email'
import { DocumentMeta, Recipient } from '../../models'
import { Document } from '../../models';
import { logActivity } from './logActivity.services';
import { generateToken } from "../jwt";

type EmailMetadata = {
  emailId?: string;
  emailReplyTo?: string;
  subject?: string;
  message?: string;
  distributionMethod?: string;
  recipientSigningRequest?: boolean;
  recipientRemoved?: boolean;
  recipientSigned?: boolean;
  documentPending?: boolean;
  documentCompleted?: boolean;
  documentDeleted?: boolean;
  ownerDocumentCompleted?: boolean;
};

function getDocumentSignDataTitle(documentSignData: object | undefined): string | undefined {
    if (!documentSignData || typeof documentSignData !== 'object') {
      return undefined;
    }
    
    const signData = documentSignData as Record<string, any>;
    return signData["0"]?.data?.title?.trim();
  }

export class DocumentService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async initiateDocumentSigning(documentData: {
    documentId: string;
    documentName: string;
    emailMetadata?: EmailMetadata;
    recipients: { email: string; name: string; phone: string }[];
    senderName: string;
    senderEmail: string;
    userId: string;
  }): Promise<boolean> {
    try {
      const document = await Document.findOne({
        where: { id: documentData.documentId },
      });

      if (!document) throw new Error("Document not found");

      const documentMetaId = document.documentMetaId;

      documentData.documentName = getDocumentSignDataTitle(document.documentSignData) || document.title

      if (documentData.emailMetadata && documentMetaId) {
        await DocumentMeta.update(
          {
            emailId: documentData.emailMetadata?.emailId || null,
            emailReplyTo: documentData.emailMetadata?.emailReplyTo || null,
            subject: documentData.emailMetadata?.subject || null,
            message: documentData.emailMetadata?.message || null,
            distributionMethod: documentData.emailMetadata?.distributionMethod || null,
            emailSettings: JSON.stringify({
              recipientSigningRequest: documentData.emailMetadata?.recipientSigningRequest || false,
              recipientRemoved: documentData.emailMetadata?.recipientRemoved || false,
              recipientSigned: documentData.emailMetadata?.recipientSigned || false,
              documentPending: documentData.emailMetadata?.documentPending || false,
              documentCompleted: documentData.emailMetadata?.documentCompleted || false,
              documentDeleted: documentData.emailMetadata?.documentDeleted || false,
              ownerDocumentCompleted: documentData.emailMetadata?.ownerDocumentCompleted || false,
            }),
          },
          {
            where: { id: documentMetaId },
          }
        );
      }

      if (documentData.emailMetadata?.distributionMethod === "manual") {
        return true;
      }

      const baseUrl =
        process.env.NEXT_PRIVATE_FRONTEND_URL || "http://localhost:3010";

      const existingRecipients = await Recipient.findAll({
        where: { documentId: documentData.documentId },
      });

      const existingRecipientsWithSentStatus = existingRecipients.filter(
        (recipient) => recipient.sendStatus === "SENT"
      );

      const recipientsToSendEmail = documentData.recipients.filter(
        (recipient) => !existingRecipientsWithSentStatus.some(
          (existingRecipient) => existingRecipient.email === recipient.email
        )
      );

      const emailPromises = recipientsToSendEmail.map(async (recipient) => {
        const token = generateToken({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
        }, "30d");

        const signingUrl = `${baseUrl}/sign_document/${documentData.documentId}/sign?checkId=${Number(documentData.userId)}&action=sign&token=${encodeURIComponent(token)}&recipient=${encodeURIComponent(recipient.email)}`;
        const rejectUrl = `${baseUrl}/reject-document/${documentData.documentId}/reject?checkId=${Number(documentData.userId)}&action=reject&token=${encodeURIComponent(token)}&recipient=${encodeURIComponent(recipient.email)}`;
        
        const emailData: DocumentSigningData = {
          recipientName: recipient.name,
          recipientEmail: recipient.email,
          documentName: getDocumentSignDataTitle(document.documentSignData) || document.title,
          signingUrl,
          rejectUrl,
          senderName: documentData.senderName,
          senderEmail: documentData.senderEmail,
        };

        await this.emailService.sendEmail("DOCUMENT_CREATED", {
          ...emailData,
          emailMetadata: documentData.emailMetadata,
        });

        const smsMessage = `Hi ${recipient.name},
          You are receiving this because ${documentData.senderName} has requested your signatures on ${documentData.documentName}
          Please put your signatures here: ${signingUrl}
          Reply STOP to opt out.`;
        // Send SMS notification
        const smsData: SendSmsRequest = {
          client_phone: recipient.phone,
          message: smsMessage
        };
        try {
          await sendSms(smsData);
        } catch (error) {
          console.error(`Failed to send SMS to ${recipient.phone}:`, error);
        }

        // Update recipient status and store authToken
        await Recipient.update(
          { sendStatus: "SENT", authToken: token },
          {
            where: {
              documentId: documentData.documentId,
              email: recipient.email,
            },
          }
        );
      });

      const documentMetaDetails = await DocumentMeta.findOne({
        where: { id: documentMetaId },
      });

      if (documentMetaDetails && documentMetaDetails.emailSettings) {
        const isEmailSendOnSignRequest = JSON.parse(
          documentMetaDetails.emailSettings || ""
        )?.recipientSigningRequest;

        if (isEmailSendOnSignRequest) {
          await Promise.allSettled(emailPromises);

          await logActivity({
            userId: Number(documentData.userId),
            activity: "send",
            payload: {
              documentId: Number(documentData.documentId),
              // documentName: documentData.documentName,
              documentName: getDocumentSignDataTitle(document.documentSignData) || document.title,
              recipients: documentData.recipients,
            },
          });
        }
      }

      return true;
    } catch (error) {
      console.error("Document signing initiation failed:", error);
      return false;
    }
  }



}

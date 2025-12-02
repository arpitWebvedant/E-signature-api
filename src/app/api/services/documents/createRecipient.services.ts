import { Op } from "sequelize";
import { Document, DocumentMeta } from "../../models";
import { User } from "../../models";
import { DocumentSigningData } from "../../types/email";
import { EmailService } from "../../services/email.services";
import { Recipient } from "../../models";

export const createRecipientService = async (data: { documentId: number, email: string, name: string, role: string, phone: string | null, color?: string }[]) => {
    try {
        if (!data || data.length === 0) {
            throw new Error("No recipient data provided");
        }

        const documentId = data[0]?.documentId;
        if (!documentId) {
            throw new Error("Document ID is required");
        }

        // Step 1: Get all existing recipients for this documentId
        const existingRecipients = await Recipient.findAll({
            where: { documentId }
        });

        // Step 2: Get emails and phones from incoming data
        const incomingEmails = data.map(recipient => recipient.email);
        const incomingPhones = data.map(recipient => recipient.phone);

        // Step 3: Find recipients to delete (exist in DB but not in incoming data)
        const recipientsToDelete = existingRecipients.filter(
            recipient => !incomingEmails.includes(recipient.email) && !incomingPhones.includes(recipient.phone)
        );

        let deletedCount = 0;
        if (recipientsToDelete.length > 0) {
            const document = await Document.findOne({ where: { id: documentId }, include: [{ model: User, as: 'user' }] });
            const documentMetaDeatils = await DocumentMeta.findOne({
                where: {
                    id: document?.documentMetaId,
                },
            })

            if (documentMetaDeatils && documentMetaDeatils.emailSettings) {
                const isEmailSendOnRecipientRemoved = JSON.parse(documentMetaDeatils.emailSettings || "").recipientRemoved || false
                if (isEmailSendOnRecipientRemoved) {
                    const emailService = new EmailService();
                    await Promise.all(
                        recipientsToDelete.map((recipient) =>
                            emailService.sendEmail("DOCUMENT_REMOVED", {
                                documentId,
                                documentName: document?.title || "Untitled Document",
                                recipientName: recipient.name,
                                recipientEmail: recipient.email,
                                // @ts-ignore
                                senderName: document?.user.name || "System",
                                // @ts-ignore
                                senderEmail: document?.user.email || "no-reply@example.com",
                                signingUrl: "",
                                rejectUrl: "",
                            } as DocumentSigningData)
                        )
                    ).catch((err) => {
                        console.error("Failed to send some removal emails:", err);
                    });
                }
            }
            const deleteIds = recipientsToDelete.map((r) => r.id);
            await Recipient.destroy({
                where: { id: { [Op.in]: deleteIds } },
            });
            deletedCount = recipientsToDelete.length;
        }

        const createdRecipients: Recipient[] = [];
        const updatedRecipients: Recipient[] = [];

        for (const recipientData of data) {
            const { email } = recipientData;

            const existingRecipient = existingRecipients.find((r) => r.email === email);

            if (existingRecipient) {
                const updatedRecipient = await existingRecipient.update(recipientData);
                updatedRecipients.push(updatedRecipient);
            } else {
                const newRecipient = await Recipient.create(recipientData);
                createdRecipients.push(newRecipient);
            }
        }

        return {
            created: createdRecipients,
            updated: updatedRecipients,
            deleted: deletedCount,
            total: createdRecipients.length + updatedRecipients.length,
        };
    } catch (error: any) {
        if (error?.name === 'SequelizeUniqueConstraintError') {
            console.error("Database constraint violation:", error);
            throw new Error("Color uniqueness violation detected by database");
        }
        console.error("Failed to sync recipients:", error);
        throw error;
    }
};

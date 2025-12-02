
// Updated type definitions for createDocumentAuditLogData
import { z } from 'zod';
import DocumentAuditLog, { DocumentAuditLogCreationAttributes } from '@/app/api/models/documentAuditLog.model';

export type CreateDocumentAuditLogDataResponse<T extends DocumentAuditLog['type']> = Pick<
    DocumentAuditLogCreationAttributes,
    'type' | 'ipAddress' | 'userAgent' | 'email' | 'userId' | 'name' | 'documentId' | 'data'
> & {
    type: T;
};

const ZIpSchema = z.string().refine(
    (value) => {
        const ipSplit = value.split('.');
        if (ipSplit.length !== 4) {
            return false;
        }
        return ipSplit.every((octet) => {
            const int = parseInt(octet, 10);
            return int >= 0 && int <= 255;
        });
    },
    {
        message: 'IP is not valid',
    },
);

export const ZRequestMetadataSchema = z.object({
    ipAddress: ZIpSchema.optional(),
    userAgent: z.string().optional(),
});

export type RequestMetadata = z.infer<typeof ZRequestMetadataSchema>;

export type ApiRequestMetadata = {
    /**
     * The general metadata of the request.
     */
    requestMetadata: RequestMetadata;

    /**
     * The source of the request.
     */
    source: 'apiV1' | 'apiV2' | 'app';

    /**
     * The method of authentication used to access the API.
     *
     * If the request is not authenticated, the value will be `null`.
     */
    auth: 'api' | 'session' | null;

    /**
     * The user that is performing the action.
     *
     * If a team API key is used, the user will classified as the team.
     */
    auditUser?: {
        id: number | null;
        email: string | null;
        name: string | null;
    };
};

export type CreateDocumentOptions = {
    title?: string;
    externalId?: string | null;
    userId: number;
    teamId?: number;
    documentDataId?: number;
    formValues?: Record<string, string | number | boolean>;
    normalizePdf?: boolean;
    timezone?: string;
    userTimezone?: string;
    requestMetadata: ApiRequestMetadata;
    organizationId?: string;
    folderId?: number;
    documentSignData?: object;
    documentId?: number;
    sourceSite?: string;
    sourceDocumentId?: string;
    isComplete?: boolean;
};
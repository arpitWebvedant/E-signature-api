import {
  createDocument,
  deleteDocument,
  getDocumentForPublic,
  updateDocumentData,
  updateDocumentFile,
} from '@/app/api/services/documents/createDocument.services'
import { uploadPdfService } from '@/app/api/services/documents/files.services'
import { NextResponse } from 'next/server'
import { createRecipientService } from '../services/documents/createRecipient.services'
import getAllDocumentService from '../services/documents/getAllDocument.services'
import {
  getDocumentWithDetailsById,
  updateStatus,
  rejectDocument as rejectDocumentService,
} from '../services/documents/getDocument.services'
import { DocumentService } from '../services/documents/sendDocument.services'
import { getPresignedUrlService } from '../services/documents/getPresignedUrl.services'
import { Document } from '../models'
import getDocumentStatusesService from '../services/documents/getDocumentStatuses.services'
import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'
import getRecentActivityService from '../services/documents/getRecentActivity.services'
import getDocumentBySourceService from '../services/documents/getDocumentBySource.services'
import jwt from 'jsonwebtoken'
import { validateToken } from '../services/jwt'
import { apiKeyService } from '../services'

async function getPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();

  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    return pdfDoc.getPageCount();
  }

  if (file.name.endsWith(".docx")) {
    try {
      const zip = await JSZip.loadAsync(arrayBuffer);
      const docXml = await zip.file("word/document.xml")?.async("string");
      if (!docXml) return 1;

      const pageBreaks = (docXml.match(/<w:br[^>]*w:type="page"[^>]*\/>/g) || []).length;

      const sectionBreaks = (docXml.match(/<w:sectPr/g) || []).length;

      return Math.max(1, pageBreaks + sectionBreaks || 1);
    } catch (err) {
      console.error("DOCX page count parse failed:", err);
      return 1;
    }
  }

  return 1;
}

// Color validation utility
const isValidColorFormat = (color: string): boolean => {
  if (!color) return false;
  
  // Check if it's a valid hex color (#RRGGBB or #RGB)
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(color);
};

export const filesController = {

  async upload(req: Request) {
    try {
        const headers = req.headers
      const contentType = req.headers.get("content-type") || "";
      let file: File | null = null;
      let organizationId: string | null = null;
      let userId: string | null = null;

      if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        file = formData.get("file") as File | null;
        organizationId = formData.get("organizationId") as string | null;
        userId = formData.get("userId") as string | null;
        if (!organizationId) {
          organizationId = headers.get('x-organization-id') as string | null;
        }
        if (!userId) {
          userId = headers.get('x-api-user-id') as string | null;
        }
      } else {
        const body = await req.json();
        const fileUrl = body?.fileUrl || body?.url;
        organizationId = body?.organizationId || null;
        userId = body?.userId || null;

        if (!fileUrl) {
          return NextResponse.json(
            { success: false, message: "No file provided" },
            { status: 400 }
          );
        }
     if (!organizationId) {
        organizationId = headers.get('x-organization-id') || null
      }
      if (!userId) {
        userId = headers.get('x-api-user-id') || null
      }
        const response = await fetch(fileUrl);
        if (!response.ok) {
          return NextResponse.json(
            { success: false, message: "Failed to fetch file from URL" },
            { status: 400 }
          );
        }

        const blob = await response.blob();
        const fileName = fileUrl.split("/").pop() || "file.pdf";
        file = new File([blob], fileName, {
          type: blob.type || "application/octet-stream",
        });
      }

      if (!file) {
        return NextResponse.json(
          { success: false, message: "No file provided" },
          { status: 400 }
        );
      }

      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-word.document.macroEnabled.12",
        "application/vnd.ms-word.template.macroEnabled.12",
        "application/msword",
        "text/plain",
        "application/rtf",
        "text/html",
        "application/x-html",
        "application/xhtml+xml",
        "application/vnd.ms-outlook",
        "application/wordperfect",
        "application/vnd.ms-xpsdocument",
      ];

      if (
        !allowedTypes.includes(file.type) &&
        !file.name.match(
          /\.(pdf|docx|doc|dotm|docm|txt|rtf|html|xhtml|msg|wpd|xps)$/i
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid file type. Please upload PDF, Word, or Text documents only.",
          },
          { status: 400 }
        );
      }
      const pageCount = await getPageCount(file);

      // ✅ Save document
      const result = await uploadPdfService.savePdf(
        file,
        organizationId || "",
        userId || "",
        pageCount
      );

      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      console.error("File upload failed:", error);
      return NextResponse.json(
        { success: false, message: "File upload failed" },
        { status: 500 }
      );
    }
  },
  async createDocument(req: Request) {
    try {
      const formData = await req.json()
      const result = await createDocument({
        userId: formData?.userId || null,
        teamId: formData?.teamId || null,
        title: formData?.title || null,
        documentDataId: formData?.documentDataId || null,
        normalizePdf: formData?.normalizePdf || false,
        userTimezone: formData?.timezone || null,
        requestMetadata: formData?.requestMetadata || {},
        folderId: formData?.folderId || null,
        organizationId: formData?.organizationId || null,
        sourceDocumentId: formData?.sourceDocumentId || '',
        sourceSite: formData?.sourceSite || '',
      })

      if (!result) {
        return NextResponse.json(result, { status: 400 })
      }

      return NextResponse.json(result, { status: 200 })
    } catch (error) {
      console.error('Document creation failed:', error)
      return NextResponse.json(
        { success: false, message: 'Document creation failed' },
        { status: 500 },
      )
    }
  },
  async updateDocumentFile(req: Request) {
    try {
      const formData = await req.json()
      const result = await updateDocumentFile({
        documentId: Number(formData?.documentId),
        userId: Number(formData?.userId),
        type: formData?.type,
        data: formData?.data,
        title: formData?.title,
        fileType: formData?.fileType,
        initialData: formData?.initialData,
        pageCount: formData?.pageCount,
      })

      if (!result) {
        return NextResponse.json(result, { status: 400 })
      }

      return NextResponse.json(result, { status: 200 })
    } catch (error) {
      console.error('Document file update failed:', error)
      return NextResponse.json(
        { success: false, message: 'Document file update failed' },
        { status: 500 },
      )
    }
  },
  async deleteDocument(req: Request) {
    try {
      const url = new URL(req.url)
      const { userId: qUserId, documentId: qDocumentId } = Object.fromEntries(url.searchParams)

      // Support DELETE with JSON body as well
      let bUserId: number | undefined
      let bDocumentId: number | undefined
      try {
        const body = await req.json()
        bUserId = body?.userId != null ? Number(body.userId) : undefined
        bDocumentId = body?.documentId != null ? Number(body.documentId) : undefined
      } catch {
        // ignore if no JSON body
      }

      const userIdNum = qUserId != null ? Number(qUserId) : bUserId
      const documentIdNum = qDocumentId != null ? Number(qDocumentId) : bDocumentId

      if (!userIdNum || !documentIdNum || Number.isNaN(userIdNum) || Number.isNaN(documentIdNum)) {
        return NextResponse.json(
          { success: false, message: 'Missing or invalid userId/documentId' },
          { status: 400 },
        )
      }

      const result = await deleteDocument({
        userId: userIdNum,
        documentId: documentIdNum,
      })

      if (!result) {
        return NextResponse.json(result, { status: 400 })
      }

      return NextResponse.json(result, { status: 200 })
    } catch (error) {
      console.error('Document deletion failed:', error)
      return NextResponse.json(
        { success: false, message: 'Document deletion failed' },
        { status: 500 },
      )
    }
  },

  async getDocument(req: Request) {
    try {
      const urlParams = new URL(req.url).searchParams
      const token = urlParams.get('token')
      const documentIdParam = urlParams.get('documentId')
      const userIdParam = urlParams.get('userId')

      if (token) {
        // Public user flow: validate token
        const decoded = validateToken(token)
        if (!decoded) {
          return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 })
        }
        
        // console.log("documentIdParam", documentIdParam)
        // console.log("userIdParam", userIdParam)
        // console.log("decoded", decoded)
        // console.log("recipientEmail", decoded.recipientEmail)
        const originalResult  = await getDocumentForPublic({
          documentId: Number(documentIdParam),
          recipientEmail: decoded.recipientEmail,
          ownerId: Number(userIdParam),
          token, // pass token to service
        })
        // console.log("RESULT ---->", result)
        // console.log("Signed Data of email: "+decoded.recipientEmail+" ---->", (originalResult ?.data.documentSignData as Record<string, any>)["2"]?.data?.fields)
        if (!originalResult ) {
          return NextResponse.json({ success: false, message: 'Document not found or recipient mismatch' }, { status: 404 })
        }

        const result = JSON.parse(JSON.stringify(originalResult));

        if (
          result?.data?.documentSignData &&
          (result.data.documentSignData as Record<string, any>)["2"]?.data?.fields
        ) {
          const docData = result.data.documentSignData as Record<string, any>;

          const filteredFields = docData["2"].data.fields.filter(
            (field: { signerEmail: string }) =>
              field.signerEmail.trim().toLowerCase() ===
              decoded.recipientEmail.trim().toLowerCase()
          );

          // replace only in the cloned object
          docData["2"].data.fields = filteredFields;
        }

        //  console.log("Signed Data of email: "+decoded.recipientEmail+" After---->", (result?.data.documentSignData as Record<string, any>)["2"]?.data?.fields)
        // console.log("RESULT After---->", result)

        // console.log("Signed Data of email: "+decoded.recipientEmail+" After---->", (originalResult?.data.documentSignData as Record<string, any>)["2"]?.data?.fields)

        return NextResponse.json(result, { status: 200 })
      } else {
        // Logged-in user flow
        const documentId = Number(documentIdParam)
        const userId = Number(userIdParam)

        const result = await getDocumentWithDetailsById({ documentId, userId })
        // console.log("RESULT ---->", result)
        if (!result) {
          return NextResponse.json({ success: false, message: 'Document not found' }, { status: 404 })
        }

        return NextResponse.json(result, { status: 200 })
      }
    } catch (error) {
      console.error('Document fetch failed:', error)
      return NextResponse.json({ success: false, message: 'Document fetch failed' }, { status: 500 })
    }
  },

  async updateDocument(req: Request) {
    try {
      const { searchParams } = new URL(req.url);
      const isComplete = searchParams.get("isComplete");
      const formData = await req.json()
      console.log('Form Data:', formData)
      const result = await updateDocumentData({
        userId: formData?.userId || null,
        documentId: formData?.documentId || null,
        documentSignData: formData?.documentSignData || null,
        requestMetadata: formData?.requestMetadata || {},
        isComplete: isComplete === 'true' ? true : false,
      })

      if (!result) {
        return NextResponse.json(result, { status: 400 })
      }

      return NextResponse.json(result, { status: 200 })
    } catch (error) {
      console.error('Document update failed:', error)
      return NextResponse.json(
        { success: false, message: 'Document update failed' },
        { status: 500 },
      )
    }
  },
  async sendSigningRequest(req: Request) {
    try {
      const body = await req.json()
      const documentService = new DocumentService()

      // Validate that recipients array exists and has at least one recipient
      if (
        !body.recipients ||
        !Array.isArray(body.recipients) ||
        body.recipients.length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'At least one recipient is required',
          },
          { status: 400 },
        )
      }

      const result = await documentService.initiateDocumentSigning({
        documentId: body.documentId,
        documentName: body.documentName,
        emailMetadata: body.emailMeta,
        recipients: body.recipients,
        senderName: body.senderName,
        userId: body.userId,
        senderEmail: body.senderEmail,
      })
      const { documentId, userId, status, teamId, recipients, folderId, signature } = body
      const document = await Document.findOne({
        where: { id: documentId },
      })
      if (!document) {
        return NextResponse.json(
          {
            success: false,
            error: 'Document not found',
          },
          { status: 404 },
        )
      }

      if (result) {
        return NextResponse.json({
          success: true,
          result,
          message: 'Document signing requests sent successfully',
        })
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to send document signing requests',
          },
          { status: 500 },
        )
      }
    } catch (error) {
      console.error('Error sending signing request:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
        },
        { status: 500 },
      )
    }
  },

  async getAllDocuments(req: Request) {
    try {
      const url = new URL(req.url)
      const { userId, teamId, folderId, page, limit, status, period, q } =
        Object.fromEntries(url.searchParams)

      // Validate required parameters
      if (!userId || !page || !limit) {
        return NextResponse.json(
          { success: false, message: 'Missing required parameters' },
          { status: 400 },
        )
      }

      const result = await getAllDocumentService({
        userId: Number(userId),
        teamId: teamId ? Number(teamId) : undefined,
        folderId: folderId ? Number(folderId) : undefined,
        page: Number(page),
        limit: Number(limit),
        status: status || undefined,
        period: period || undefined,
        query: q || undefined,
      })

      return NextResponse.json(result, { status: 200 })
    } catch (error) {
      console.error('Document fetch failed:', error)
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Document fetch failed',
        },
        { status: 500 },
      )
    }
  },
  async updateDocumentStatus(req: Request) {
    try {
      const body = await req.json()
      const { documentId, userId, status, teamId, recipients, folderId, signature, email } = body

      // Validate required parameters
      if (!documentId || !userId || !status) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Missing required parameters: documentId, userId, and status are required',
          },
          { status: 400 },
        )
      }

      const result = await updateStatus({
        documentId: Number(documentId),
        userId: Number(userId),
        status: status,
        email: recipients || email,
        teamId: teamId ? Number(teamId) : undefined,
        folderId: folderId ? Number(folderId) : undefined,
        signature,
      })

      if (!result.success) {
        return NextResponse.json(
          { success: false, message: result.message },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          success: true,
          message: result.message,
          document: result.document,
        },
        { status: 200 },
      )
    } catch (error) {
      console.error('Document status update failed:', error)
      return NextResponse.json(
        {
          success: false,
          message: 'Document status update failed',
        },
        { status: 500 },
      )
    }
  },
  async createRecipient(req: Request) {
    try {
      const formData = await req.json()

      // Validate color uniqueness before processing
      const recipientsWithColors = formData?.recipients.filter((recipient: any) => recipient.color);
      const colors = recipientsWithColors.map((recipient: any) => recipient.color);
      const uniqueColors = new Set(colors);
      
      if (colors.length > 0 && uniqueColors.size !== colors.length) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Duplicate colors found. Each signer must have a unique color.' 
          },
          { status: 400 },
        )
      }

      // Validate color format (optional but recommended)
      const invalidColors = recipientsWithColors.filter((recipient: any) => 
        !isValidColorFormat(recipient.color)
      );
      
      if (invalidColors.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Invalid color format. Colors must be in hex format (#RRGGBB).' 
          },
          { status: 400 },
        )
      }

      const payload: { documentId: number, email: string, name: string, role: string, phone: string | null, color?: string }[] = formData?.recipients.map((recipient: Record<string, unknown>) => ({
        documentId: Number(formData?.documentId) || null,
        email: (recipient?.email as string | undefined) || null,
        name: (recipient?.name as string | undefined) || null,
        role: (recipient?.role as string | undefined) || null,
        phone: (recipient?.phone as string | undefined) || null,
        color: (recipient?.color as string | undefined) || null,
      }))
      console.log("PAYLOAD --.>", payload)
      const result = await createRecipientService(payload)

      if (!result) {
        return NextResponse.json(
          { success: false, message: 'Failed to create recipients' },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 200 },
      )
    } catch (error) {
      console.error('Recipient creation failed:', error)
      return NextResponse.json(
        { success: false, message: 'Recipient creation failed' },
        { status: 500 },
      )
    }
  },
  async getPresignedUrl(req: Request) {
    try {

      const formData = await req.json()

      const result = await getPresignedUrlService(formData)

      if (!result) {
        return NextResponse.json(
          { success: false, message: 'Failed to get presigned url' },
          { status: 400 },
        )
      }

      return new NextResponse(result, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="signed.pdf"',
        },
      });
    } catch (error) {
      console.error('Presigned url fetch failed:', error)
      return NextResponse.json(
        { success: false, message: 'Presigned url fetch failed' },
        { status: 500 },
      )
    }
  },
  async getDocumentStatuses(id: string) {
    try {

      const result = await getDocumentStatusesService(Number(id))

      if (!result) {
        return NextResponse.json(
          { success: false, message: 'Failed to get document statuses' },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 200 },
      )
    } catch (error) {
      console.error('Presigned url fetch failed:', error)
      return NextResponse.json(
        { success: false, message: 'Presigned url fetch failed' },
        { status: 500 },
      )
    }
  },
  async getRecentActivityService(id: string) {
    try {

      const result = await getRecentActivityService(id)

      if (!result) {
        return NextResponse.json(
          { success: false, message: 'Failed to get document statuses' },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 200 },
      )
    } catch (error) {
      console.error('Presigned url fetch failed:', error)
      return NextResponse.json(
        { success: false, message: 'Presigned url fetch failed' },
        { status: 500 },
      )
    }
  },

  async getDocumentBySource(req: Request) {
    try {
      const url = new URL(req.url)
      const { sourceDocumentId, sourceSite } = Object.fromEntries(url.searchParams)
      const result = await getDocumentBySourceService({ sourceDocumentId, sourceSite })

      if (!result) {
        return NextResponse.json(
          { success: false, message: 'Failed to get document statuses' },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 200 },
      )
    } catch (error) {
      console.error('Presigned url fetch failed:', error)
      return NextResponse.json(
        { success: false, message: 'Presigned url fetch failed' },
        { status: 500 },
      )
    }
  },
  async rejectDocument(req: Request) {
    try {
      const body = await req.json()
      const { documentId, userId, email, reason, subject, category, notifySender } = body || {}

      if (!documentId || !userId || !email) {
        return NextResponse.json(
          { success: false, message: 'Missing required fields: documentId, userId, email' },
          { status: 400 },
        )
      }

      const result = await rejectDocumentService({
        documentId: Number(documentId),
        userId: Number(userId),
        email: String(email),
        reason,
        subject,
        category,
        notifySender,
      })

      if (!result?.success) {
        return NextResponse.json(
          { success: false, message: result?.message || 'Document rejection failed' },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Document rejected successfully',
          data: result.data,
        },
        { status: 200 },
      )
    } catch (error) {
      console.error('Document rejection failed:', error)
      return NextResponse.json(
        { success: false, message: 'Document rejection failed' },
        { status: 500 },
      )
    }
  }
}

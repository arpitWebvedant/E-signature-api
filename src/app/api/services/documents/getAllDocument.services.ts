import { Op, Sequelize } from 'sequelize'
import {
  Document,
  DocumentData,
  DocumentMeta,
  Folder,
  Recipient,
  Team,
  User,
} from '../../models'

// Service
interface GetAllDocumentsParams {
  userId: number
  teamId?: number
  folderId?: number | null
  page: number
  limit: number
  status?: string
  period?: string
  query?: string
}

interface PaginatedDocuments {
  success: boolean
  message: string
  data: Document[]
  pagination: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
    statusCounts: {
      completed: number
      pending: number
      draft: number
      folderCount: number
      rejected: number
      all: number 
    }
  }
}

async function getAllDocumentService(
  params: GetAllDocumentsParams,
): Promise<PaginatedDocuments> {
  const { userId, teamId, folderId, page, limit, status, period, query } =
    params
  // Guard against NaN/invalid values for pagination
  const safePage = Number.isFinite(page) && page > 0 ? page : 1
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10
  const offset = (safePage - 1) * safeLimit

  // Build where clause for documents
  const whereClause: {
    userId: number
    teamId?: number
    folderId?: number | null
    status?: string
    createdAt?: { [Op.gte]: Date }
  } = { userId }

  // Build where clause for folders count
  const folderWhereClause: {
    userId: number
    teamId?: number | null
    parentId?: number | null
  } = { userId }

  // Add optional filters for documents
  if (teamId) {
    whereClause.teamId = teamId
    folderWhereClause.teamId = teamId
  }

  // Handle folderId logic for documents and folders:
  if (typeof folderId === 'number' && Number.isFinite(folderId)) {
    // Fetch only docs from this specific folder
    whereClause.folderId = folderId
    // Count subfolders inside this specific folder
    folderWhereClause.parentId = folderId
  } 

  // Add status filter
  if (status && status !== 'ALL') {
    whereClause.status = status
  }

  // Add period filter (if needed)
  if (period && period !== 'all') {
    const days = parseInt(period.replace('d', ''), 10)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    whereClause.createdAt = {
      [Op.gte]: cutoffDate,
    }
  }

  const result = await Document.findAndCountAll({
    where: whereClause,
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
    limit: safeLimit,
    offset,
  })

  // If there's a search query, we'll need to filter after fetching
  // because we need to search across related models (recipients)
  let filteredRows = result.rows

  if (query) {
    const searchTerm = query.toLowerCase()
    filteredRows = result.rows.filter((doc) => {
      const docJson: {
        title: string
        user?: { email: string }
        recipientDetails?: {
          name: string
          email: string
          signingStatus: string
        }[]
      } = doc.toJSON()
      const searchable = `${docJson.title} ${docJson.user?.email} ${
        docJson.recipientDetails?.map((r) => r.name + r.email).join(' ') || ''
      }`.toLowerCase()
      return searchable.includes(searchTerm)
    })
  }

  // Collect documentIds from filtered results
  const documentIds = filteredRows.map((doc) => doc.id)

  // Fetch recipients for all documents in bulk
  const recipients = await Recipient.findAll({
    where: { documentId: documentIds },
  })

  // Group recipients by documentId
  const recipientsByDoc: Record<
    string,
    { name: string; email: string; signingStatus: string, color?: string }[]
  > = {}
  recipients.forEach((rec) => {
    if (!recipientsByDoc[rec.documentId]) {
      recipientsByDoc[rec.documentId] = []
    }
    recipientsByDoc[rec.documentId].push({
      name: rec.name,
      email: rec.email,
      signingStatus: rec.signingStatus,
      color: rec.color,
    })
  })

  // Attach recipientDetails to each document
  const documentsWithRecipients = filteredRows.map((doc) => {
    const docJson: {
      title: string
      user?: { email: string }
      recipientDetails?: {
        name: string
        email: string
        signingStatus: string
        color?: string
      }[]
    } = doc.toJSON()
    return {
      ...docJson,
      recipientDetails: recipientsByDoc[doc.id] || [],
    }
  })

  // Get document status counts with the same filters as documents query
  const statusCountsWhereClause: {
    userId: number
    teamId?: number
    folderId?: number | null
  } = { userId }

  if (teamId) statusCountsWhereClause.teamId = teamId

  if (typeof folderId === 'number' && Number.isFinite(folderId)) {
    statusCountsWhereClause.folderId = folderId
  }

  const statusCounts = await Document.findAll({
    where: statusCountsWhereClause,
    attributes: [
      'status',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
    ],
    group: ['status'],
    raw: true,
  })

  const countsMap: Record<string, number> = {
    COMPLETED: 0,
    PENDING: 0,
    DRAFT: 0,
    REJECTED: 0,
  }

  statusCounts.forEach((item) => {
    const key = item.status.toUpperCase()
    if (countsMap[key] !== undefined) {
      countsMap[key] = parseInt(item.count as string, 10)
    }
  })

  // Get total count for "all" documents (with same filters)
  const totalDocuments = await Document.count({
    where: statusCountsWhereClause,
  })

  // Get folder count based on current context
  const folderCount = await Folder.count({
    where: folderWhereClause,
  })

  return {
    success: true,
    message: 'Documents fetched successfully',
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    data: documentsWithRecipients,
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalItems: query ? documentsWithRecipients.length : result.count,
      totalPages: Math.ceil(
        (query ? documentsWithRecipients.length : result.count) / safeLimit,
      ),
      statusCounts: {
        completed: countsMap.COMPLETED,
        pending: countsMap.PENDING,
        draft: countsMap.DRAFT,
        rejected: countsMap.REJECTED, 
        all: totalDocuments, 
        folderCount: folderCount,
      },
    },
  }
}

export default getAllDocumentService
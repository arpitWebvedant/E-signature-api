import { NextResponse } from 'next/server'

import { Op,Sequelize } from 'sequelize'
import Folder from "../models/folder.model";
import Document from "../models/document.model";
import { sequelize } from '../db/connectDb';
import { deleteDocument } from '@/app/api/services/documents/createDocument.services'

async function getBreadcrumbPath(folderId: number | null): Promise<{ id: number; name: string }[]> {
  const breadcrumbs: { id: number; name: string }[] = [];
  
  let currentFolderId = folderId;
  while (currentFolderId) {
    const folder = await Folder.findByPk(currentFolderId, {
      attributes: ['id', 'name', 'parentId'],
    });
    if (!folder) break;
    
    breadcrumbs.unshift({ id: folder.id, name: folder.name });
    currentFolderId = folder.parentId;
  }
  
  return breadcrumbs;
}

export const foldersController = {
  async createFolder(req: Request) {
    try {
      const body = await req.json()
      const { name, userId, teamId, parentId, visibility } = body || {}

      if (!name || !userId) {
        return NextResponse.json(
          { success: false, message: 'Missing required fields: name, userId' },
          { status: 400 },
        )
      }

      // Ensure parent exists if provided
      if (parentId) {
        const parent = await Folder.findByPk(Number(parentId))
        if (!parent) {
          return NextResponse.json(
            { success: false, message: 'Parent folder not found' },
            { status: 404 },
          )
        }
      }

      const folder = await Folder.create({
        name,
        userId: Number(userId),
        teamId: teamId != null ? Number(teamId) : null,
        parentId: parentId != null ? Number(parentId) : null,
        visibility: visibility || 'EVERYONE',
      })

      return NextResponse.json({ success: true, data: folder }, { status: 200 })
    } catch (error) {
      console.error('Folder creation failed:', error)
      return NextResponse.json(
        { success: false, message: 'Folder creation failed' },
        { status: 500 },
      )
    }
  },

  async createFolderPath(req: Request) {
    try {
      const body = await req.json()
      const { path, userId, teamId, visibility } = body || {}

      if (!path || !userId) {
        return NextResponse.json(
          { success: false, message: 'Missing required fields: path, userId' },
          { status: 400 },
        )
      }

      const rawParts = String(path)
        .split('/')
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 0)

      if (rawParts.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Invalid path' },
          { status: 400 },
        )
      }

      let parentId: number | null = null
      let lastFolder: Folder | null = null

      for (const name of rawParts) {
        const existing = (await Folder.findOne({
          where: {
            name,
            userId: Number(userId),
            teamId: teamId != null ? Number(teamId) : null,
            parentId,
          },
        })) as Folder | null

        if (existing) {
          lastFolder = existing
          parentId = existing.id
          continue
        }

        const createdInstance = await Folder.create({
          name,
          userId: Number(userId),
          teamId: teamId != null ? Number(teamId) : null,
          parentId,
          visibility: visibility || 'EVERYONE',
        })
        const created = createdInstance as Folder
        lastFolder = created
        parentId = created.id
      }

      return NextResponse.json(
        { success: true, data: lastFolder },
        { status: 200 },
      )
    } catch (error) {
      console.error('Folder path creation failed:', error)
      return NextResponse.json(
        { success: false, message: 'Folder path creation failed' },
        { status: 500 },
      )
    }
  },

  async listFolders(req: Request) {
    try {
      const url = new URL(req.url);
      const { userId, teamId, parentId, q } = Object.fromEntries(url.searchParams);
  
      if (!userId) {
        return NextResponse.json(
          { success: false, message: 'Missing required parameter: userId' },
          { status: 400 },
        );
      }
  
      const where: any = { userId: Number(userId) };
      if (teamId != null) where.teamId = Number(teamId);
      if (parentId === undefined) {
        // Default: only root folders unless parentId explicitly provided
        where.parentId = null;
      } else if (parentId !== '') {
        where.parentId = parentId === 'null' ? null : Number(parentId);
      }
      if (q) {
        where.name = { [Op.iLike]: `%${q}%` };
      }
  
      const folders = await Folder.findAll({
        where,
        order: [['updatedAt', 'DESC']],
        attributes: ['id', 'name', 'userId', 'teamId', 'parentId', 'visibility', 'createdAt', 'updatedAt'],
      });
  
      // Fetch subfolder and document counts for all folders in bulk
      const folderIds = folders.map((folder) => folder.id);
  
      // Count subfolders
      const subfolderCounts = await Folder.findAll({
        where: { parentId: folderIds },
        attributes: ['parentId', [Sequelize.fn('COUNT', Sequelize.col('id')), 'subfolderCount']],
        group: ['parentId'],
        raw: true,
      });
  
      // Count documents
      const documentCounts = await Document.findAll({
        where: { folderId: folderIds },
        attributes: ['folderId', [Sequelize.fn('COUNT', Sequelize.col('id')), 'documentCount']],
        group: ['folderId'],
        raw: true,
      });
  
      // Map counts to folders
      const subfolderCountMap: Record<number, number> = {};
      subfolderCounts.forEach((count: any) => {
        subfolderCountMap[count.parentId] = parseInt(count.subfolderCount, 10);
      });
  
      const documentCountMap: Record<number, number> = {};
      documentCounts.forEach((count: any) => {
        documentCountMap[count.folderId] = parseInt(count.documentCount, 10);
      });
  
      // Build response with subfolder counts, document counts, and breadcrumbs
      const foldersWithDetails = await Promise.all(
        folders.map(async (folder) => {
          const folderJson = folder.toJSON();
          const breadcrumbPath = await getBreadcrumbPath(folder.id);
          return {
            ...folderJson,
            subfolderCount: subfolderCountMap[folder.id] || 0,
            documentCount: documentCountMap[folder.id] || 0,
            breadcrumbs: breadcrumbPath,
          };
        }),
      );
  
      return NextResponse.json({ success: true, data: foldersWithDetails }, { status: 200 });
    } catch (error) {
      console.error('Folder list failed:', error);
      return NextResponse.json(
        { success: false, message: 'Folder list failed' },
        { status: 500 },
      );
    }
  },

  async renameFolder(req: Request) {
    try {
      const body = await req.json()
      const { folderId, name, userId } = body || {}

      if (!folderId || !name || !userId) {
        return NextResponse.json(
          { success: false, message: 'Missing required fields: folderId, name, userId' },
          { status: 400 },
        )
      }

      const folder = await Folder.findOne({ where: { id: Number(folderId), userId: Number(userId) } })
      if (!folder) {
        return NextResponse.json(
          { success: false, message: 'Folder not found' },
          { status: 404 },
        )
      }

      await folder.update({ name })
      return NextResponse.json({ success: true, data: folder }, { status: 200 })
    } catch (error) {
      console.error('Folder rename failed:', error)
      return NextResponse.json(
        { success: false, message: 'Folder rename failed' },
        { status: 500 },
      )
    }
  },

  async deleteFolder(req: Request) {
    const transaction = await sequelize.transaction();
    
    try {
      const url = new URL(req.url);
      const { folderId, userId } = Object.fromEntries(url.searchParams);

      if (!folderId || !userId) {
        return NextResponse.json(
          { success: false, message: 'Missing required parameters: folderId, userId' },
          { status: 400 },
        );
      }

      const numericFolderId = Number(folderId);
      const numericUserId = Number(userId);

      const folder = await Folder.findOne({ 
        where: { id: numericFolderId, userId: numericUserId },
        transaction 
      });
      
      if (!folder) {
        await transaction.rollback();
        return NextResponse.json(
          { success: false, message: 'Folder not found' },
          { status: 404 },
        );
      }

      // Get all subfolders recursively
      const getAllSubfolders = async (parentId: number): Promise<number[]> => {
        const directSubfolders = await Folder.findAll({
          where: { parentId },
          attributes: ['id'],
          transaction
        });
        
        let allSubfolderIds: number[] = [];
        
        for (const subfolder of directSubfolders) {
          const nestedSubfolders = await getAllSubfolders(subfolder.id);
          allSubfolderIds = [...allSubfolderIds, subfolder.id, ...nestedSubfolders];
        }
        
        return allSubfolderIds;
      };

      // Get all documents recursively (from folder and all subfolders)
      const getAllDocumentIds = async (folderIds: number[]): Promise<number[]> => {
        if (folderIds.length === 0) return [];
        
        const documents = await Document.findAll({
          where: { folderId: folderIds },
          attributes: ['id'],
          transaction
        });
        
        return documents.map(doc => doc.id);
      };


      const subfolderIds = await getAllSubfolders(numericFolderId);
      const allFolderIds = [numericFolderId, ...subfolderIds];

      const allDocumentIds = await getAllDocumentIds(allFolderIds);

      // Delete documents first
      let deletedDocumentCount = 0;
      let failedDeletions: number[] = [];

      for (const documentId of allDocumentIds) {
        try {
          const result = await deleteDocument({
            userId: numericUserId,
            documentId: documentId
          });

          if (result.success) {
            deletedDocumentCount++;
          } else {
            failedDeletions.push(documentId);
          }
        } catch (docError) {
          failedDeletions.push(documentId);
        }
      }

      if (failedDeletions.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Failed to delete ${failedDeletions.length} document(s). Folder deletion aborted.`,
            failedDocumentIds: failedDeletions
          },
          { status: 500 },
        );
      }


      // Delete folders (subfolders first due to parentId foreign key)
      const sortedFolderIds = [...subfolderIds, numericFolderId];
      
      await Folder.destroy({
        where: { id: sortedFolderIds },
        transaction
      });

      await transaction.commit();

      return NextResponse.json({ 
        success: true, 
        message: `Folder and ${subfolderIds.length} subfolder(s), ${allDocumentIds.length} document(s) deleted successfully` 
      }, { status: 200 });

    } catch (error) {
      await transaction.rollback();
      
      console.error('Folder delete failed:', error);
      
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        return NextResponse.json(
          { success: false, message: 'Cannot delete folder due to existing references' },
          { status: 409 },
        );
      }
      
      return NextResponse.json(
        { success: false, message: 'Folder delete failed' },
        { status: 500 },
      );
    }
  },

  async addDocumentToFolder(req: Request) {
    try {
      const body = await req.json()
      const { documentId, folderId, userId } = body || {}

      if (!documentId || !folderId || !userId) {
        return NextResponse.json(
          { success: false, message: 'Missing required fields: documentId, folderId, userId' },
          { status: 400 },
        )
      }

      const folder = await Folder.findOne({ where: { id: Number(folderId), userId: Number(userId) } })
      if (!folder) {
        return NextResponse.json(
          { success: false, message: 'Folder not found' },
          { status: 404 },
        )
      }

      const document = await Document.findOne({ where: { id: Number(documentId), userId: Number(userId) } })
      if (!document) {
        return NextResponse.json(
          { success: false, message: 'Document not found' },
          { status: 404 },
        )
      }

      await document.update({ folderId: Number(folderId) })
      return NextResponse.json({ success: true, data: document }, { status: 200 })
    } catch (error) {
      console.error('Add document to folder failed:', error)
      return NextResponse.json(
        { success: false, message: 'Add document to folder failed' },
        { status: 500 },
      )
    }
  },
}

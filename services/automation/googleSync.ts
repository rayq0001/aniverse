import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

export class GoogleSyncService {
  private drive: any;
  private docs: any;
  private auth: JWT | null = null;

  constructor() {
    const keyPath = path.join(process.cwd(), 'service-account.json');
    if (fs.existsSync(keyPath)) {
      const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      this.auth = new JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/documents',
        ],
      });
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      this.docs = google.docs({ version: 'v1', auth: this.auth });
    }
  }

  async isReady() {
    return this.auth !== null;
  }

  async getOrCreateFolder(name: string, parentId?: string): Promise<string> {
    if (!this.drive) throw new Error('Google Drive API not initialized');

    const query = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false ${
      parentId ? `and '${parentId}' in parents` : "and 'root' in parents"
    }`;

    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id, name)',
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    const fileMetadata = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : [],
    };

    const folder = await this.drive.files.create({
      resource: fileMetadata,
      fields: 'id',
    });

    return folder.data.id;
  }

  async uploadFile(folderId: string, filePath: string): Promise<string> {
    if (!this.drive) throw new Error('Google Drive API not initialized');

    const fileMetadata = {
      name: path.basename(filePath),
      parents: [folderId],
    };

    const media = {
      mimeType: 'image/jpeg', // Default for manhwa frames
      body: fs.createReadStream(filePath),
    };

    const file = await this.drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });

    return file.data.id;
  }

  async createOrUpdateDoc(folderId: string, title: string, content: string): Promise<string> {
    if (!this.docs || !this.drive) throw new Error('Google APIs not initialized');

    // Check if doc already exists in this folder
    const query = `name = '${title}' and mimeType = 'application/vnd.google-apps.document' and trashed = false and '${folderId}' in parents`;
    const listResponse = await this.drive.files.list({ q: query, fields: 'files(id)' });

    if (listResponse.data.files && listResponse.data.files.length > 0) {
      const docId = listResponse.data.files[0].id;
      // For simplicity, we overwrite by deleting and recreating or just appending.
      // Here we append a summary.
      await this.docs.documents.batchUpdate({
        documentId: docId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: content + '\n\n',
              },
            },
          ],
        },
      });
      return docId;
    }

    // Create new doc
    const newDoc = await this.docs.documents.create({
      requestBody: { title },
    });

    const docId = newDoc.data.documentId;

    // Move to correct folder
    const fileId = docId as string;
    const file = await this.drive.files.get({ fileId, fields: 'parents' });
    const previousParents = file.data.parents?.join(',');
    await this.drive.files.update({
      fileId,
      addParents: folderId,
      removeParents: previousParents,
      fields: 'id, parents',
    });

    // Add content
    await this.docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content,
            },
          },
        ],
      },
    });

    return docId as string;
  }
}

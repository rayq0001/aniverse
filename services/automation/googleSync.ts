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

  async getShareableLink(fileId: string): Promise<string> {
    if (!this.drive) return '';
    try {
      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: { role: 'reader', type: 'anyone' }
      });
      const file = await this.drive.files.get({
        fileId: fileId,
        fields: 'webViewLink'
      });
      return file.data.webViewLink || '';
    } catch (err) {
      console.warn("Failed to create shareable link", err);
      return '';
    }
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

  /**
   * List files in Drive folder with pagination
   */
  async listFiles(folderId: string, options: {
    pageSize?: number;
    pageToken?: string;
  } = {}): Promise<{ files: Array<{id: string; name: string; mimeType: string; size: number}>; nextPageToken?: string }> {
    if (!this.drive) throw new Error('Google Drive API not initialized');

    const q = `'${folderId}' in parents and trashed=false and mimeType != 'application/vnd.google-apps.folder'`;

    const response = await this.drive.files.list({
      q,
      fields: 'nextPageToken,files(id,name,mimeType,size)',
      pageSize: options.pageSize || 100,
      pageToken: options.pageToken,
    });

    const files = (response.data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: Number(f.size) || 0,
    }));

    return {
      files,
      nextPageToken: response.data.nextPageToken,
    };
  }

  /**
   * Download full folder with pagination + range control
   */
  async downloadFolderFiles(folderId: string, destDir: string, options: {
    maxFiles?: number;
    skipFiles?: number;  // Skip first N files (startIndex equivalent)
    pageSize?: number;
  } = {}): Promise<string[]> {
    if (!this.drive) throw new Error('Google Drive API not ready - needs service-account.json');

    const downloaded: string[] = [];
    let pageToken: string | undefined;
    let downloadedCount = 0;

    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    do {
      const { files, nextPageToken } = await this.listFiles(folderId, {
        pageSize: options.pageSize || 100,
        pageToken,
      });

      for (const file of files) {
        if (file.mimeType.startsWith('image/') === false) continue;

        if (options.skipFiles && downloadedCount < options.skipFiles) {
          downloadedCount++;
          continue;
        }
        if (options.maxFiles && downloadedCount >= options.maxFiles) break;

        const ext = path.extname(file.name) || '.jpg';
        const filename = `${String(downloaded.length + 1).padStart(3, '0')}${ext}`;
        const destPath = path.join(destDir, filename);

        try {
          const dlRes = await fetch(`https://drive.google.com/uc?export=download&id=${file.id}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });

          if (dlRes.ok) {
            fs.writeFileSync(destPath, Buffer.from(await dlRes.arrayBuffer()));
            downloaded.push(filename);
            console.log(`✅ Downloaded ${filename}`);
          }
        } catch (err) {
          console.error(`❌ Failed ${file.name}:`, err);
        }

        downloadedCount++;
      }

      pageToken = nextPageToken;
    } while (pageToken && (!options.maxFiles || downloadedCount < options.maxFiles));

    return downloaded;
  }
}


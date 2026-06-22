/**
 * GoogleDriveService.js
 * 
 * Serviço para comunicação direta com a Google Drive REST API v3.
 */

const GOOGLE_DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const GOOGLE_DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

let cachedFolderId = null;

async function googleFetch(url, options = {}) {
  let response = await fetch(url, options);
  if (response.status === 401) {
    console.warn("[GoogleDriveService] Token expirado (401). Tentando renovação silenciosa...");
    if (GoogleDriveService.onTokenRefreshNeeded) {
      try {
        const newToken = await GoogleDriveService.onTokenRefreshNeeded();
        if (newToken) {
          console.log("[GoogleDriveService] Token renovado silenciosamente. Retentando requisição...");
          if (options.headers) {
            options.headers['Authorization'] = `Bearer ${newToken}`;
          }
          response = await fetch(url, options);
          if (response.status !== 401) {
            return response;
          }
        }
      } catch (refreshErr) {
        console.error("[GoogleDriveService] Falha ao tentar renovar token no 401:", refreshErr);
      }
    }

    localStorage.removeItem('google-drive-access-token');
    localStorage.removeItem('google-drive-token-expiry');
    window.dispatchEvent(new Event('google-token-expired'));
    throw new Error('TOKEN_EXPIRED');
  }
  return response;
}

export const GoogleDriveService = {
  onTokenRefreshNeeded: null,

  /**
   * Busca ou cria a pasta "ConnectedNotes" no Google Drive do usuário.
   */
  async findOrCreateAppFolder(accessToken) {
    if (cachedFolderId) {
      try {
        const checkRes = await googleFetch(`${GOOGLE_DRIVE_API_URL}/${cachedFolderId}?fields=trashed`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (!checkData.trashed) {
            return cachedFolderId;
          }
        }
        cachedFolderId = null;
      } catch (e) {
        cachedFolderId = null;
      }
    }

    try {
      // 1. Tentar encontrar a pasta
      const query = encodeURIComponent("name = 'ConnectedNotes' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
      const response = await googleFetch(`${GOOGLE_DRIVE_API_URL}?q=${query}&fields=files(id)`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar pasta: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.files && data.files.length > 0) {
        cachedFolderId = data.files[0].id;
        return cachedFolderId;
      }

      // 2. Se não existir, criar a pasta
      const createResponse = await googleFetch(GOOGLE_DRIVE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'ConnectedNotes',
          mimeType: 'application/vnd.google-apps.folder'
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Erro ao criar pasta: ${createResponse.statusText}`);
      }

      const folder = await createResponse.json();
      cachedFolderId = folder.id;
      return cachedFolderId;
    } catch (error) {
      console.error('[GoogleDriveService] Erro em findOrCreateAppFolder:', error);
      throw error;
    }
  },

  /**
   * Resolve uma lista de subpastas (hierarquia) a partir da pasta raiz no Google Drive.
   * Cria subpastas que não existem.
   */
  async resolveFolderPath(folderSegments, accessToken) {
    let currentParentId = await this.findOrCreateAppFolder(accessToken);
    
    for (const segment of folderSegments) {
      if (!segment) continue;
      
      const cleanSegment = segment.trim();
      if (!cleanSegment) continue;
      
      try {
        const query = encodeURIComponent(`name = '${cleanSegment.replace(/'/g, "\\'")}' and '${currentParentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
        const response = await googleFetch(`${GOOGLE_DRIVE_API_URL}?q=${query}&fields=files(id)`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Erro ao buscar subpasta: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (data.files && data.files.length > 0) {
          currentParentId = data.files[0].id;
        } else {
          // Criar a subpasta
          const createResponse = await googleFetch(GOOGLE_DRIVE_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: cleanSegment,
              mimeType: 'application/vnd.google-apps.folder',
              parents: [currentParentId]
            })
          });
          
          if (!createResponse.ok) {
            throw new Error(`Erro ao criar subpasta: ${createResponse.statusText}`);
          }
          
          const folder = await createResponse.json();
          currentParentId = folder.id;
        }
      } catch (err) {
        console.error(`[GoogleDriveService] Erro ao resolver pasta '${cleanSegment}':`, err);
        throw err;
      }
    }
    
    return currentParentId;
  },

  /**
   * Busca o arquivo de uma nota específica pelo nome do arquivo ou property noteId.
   */
  async findNoteFileId(noteId, noteTitle, folderId, accessToken, fileExtension = '.md') {
    try {
      const fileName = `${noteTitle || noteId}${fileExtension}`;
      const escapedName = fileName.replace(/'/g, "\\'");
      const query = encodeURIComponent(
        `('${folderId}' in parents and trashed = false) and ` +
        `(name = '${escapedName}' or properties has { key='noteId' and value='${noteId}' })`
      );
      const response = await googleFetch(`${GOOGLE_DRIVE_API_URL}?q=${query}&fields=files(id, name)`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar arquivo: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.files && data.files.length > 0) {
        return data.files[0]; // Retorna { id, name }
      }
      return null;
    } catch (error) {
      console.error('[GoogleDriveService] Erro em findNoteFileId:', error);
      return null;
    }
  },

  /**
   * Salva os dados de uma nota no Google Drive dentro de uma estrutura hierárquica.
   */
  async saveNoteData(noteId, noteData, accessToken, folderSegments = [], noteTitle = '') {
    try {
      const folderId = await this.resolveFolderPath(folderSegments, accessToken);
      
      // Se for apenas uma pasta, já criamos/resolvemos acima
      if (noteData.type === 'folder') {
        return folderId;
      }
      
      const isCanvas = noteData.type === 'canvas';
      const fileExtension = isCanvas ? '.canvas.json' : '.md';
      const mimeType = isCanvas ? 'application/json' : 'text/markdown';
      const fileName = `${noteTitle || noteId}${fileExtension}`;
      
      let fileContent = '';
      if (isCanvas) {
         fileContent = JSON.stringify(noteData.content || noteData);
      } else {
         fileContent = typeof noteData.content === 'string' ? noteData.content : (noteData.content?.text || '');
      }

      const fileInfo = await this.findNoteFileId(noteId, noteTitle, folderId, accessToken, fileExtension);

      if (fileInfo) {
        const fileId = fileInfo.id;
        
        // Se o título mudou, renomeia o arquivo no Drive para condizer
        if (fileInfo.name !== fileName) {
          try {
            await googleFetch(`${GOOGLE_DRIVE_API_URL}/${fileId}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ name: fileName })
            });
          } catch (renameErr) {
            console.error('[GoogleDriveService] Falha ao renomear arquivo no Drive:', renameErr);
          }
        }

        // Atualizar conteúdo existente
        const updateResponse = await googleFetch(`${GOOGLE_DRIVE_UPLOAD_URL}/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': mimeType
          },
          body: fileContent
        });

        if (!updateResponse.ok) {
          throw new Error(`Erro ao atualizar arquivo no Drive: ${updateResponse.statusText}`);
        }

        return fileId;
      } else {
        // Criar novo arquivo (Multipart upload: Metadados com noteId property + Mídia)
        const boundary = '3d9f7128adeb4c19ab4e956c17f9e8ed';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const metadata = {
          name: fileName,
          parents: [folderId],
          mimeType: mimeType,
          properties: {
            noteId: noteId
          }
        };

        const multipartBody = 
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          `Content-Type: ${mimeType}\r\n\r\n` +
          fileContent +
          closeDelimiter;

        const createResponse = await googleFetch(`${GOOGLE_DRIVE_UPLOAD_URL}?uploadType=multipart`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartBody
        });

        if (!createResponse.ok) {
          throw new Error(`Erro ao criar arquivo no Drive: ${createResponse.statusText}`);
        }

        const newFile = await createResponse.json();
        return newFile.id;
      }
    } catch (error) {
      console.error('[GoogleDriveService] Erro ao salvar nota no Google Drive:', error);
      throw error;
    }
  },

  /**
   * Lê os dados do canvas do Drive pelo ID do arquivo.
   */
  async getCanvasData(fileId, accessToken) {
    try {
      const response = await googleFetch(`${GOOGLE_DRIVE_API_URL}/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao baixar arquivo do Drive: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[GoogleDriveService] Erro ao carregar canvas do Google Drive:', error);
      throw error;
    }
  },

  /**
   * Obtém a quota de armazenamento do Google Drive do usuário.
   */
  async getStorageQuota(accessToken) {
    try {
      const response = await googleFetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (response.status === 403) {
        return { error: 'API_DISABLED' };
      }
      if (response.ok) {
        const data = await response.json();
        return data.storageQuota; // { limit, usage, usageInDrive }
      }
      return null;
    } catch (e) {
      console.error('[GoogleDriveService] Erro ao obter quota do Google Drive:', e);
      return null;
    }
  }
};

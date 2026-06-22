/**
 * StorageService.js
 * 
 * Orquestrador de PersistÃªncia e SincronizaÃ§Ã£o HÃ­brida para ConnectedNotes.
 */

import { FileSystemBridge } from './FileSystemBridge';
import { db, auth, sanitize, storage } from '../firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  collection, 
  onSnapshot 
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

let isStorageCorsBlocked = false;
let corsChecked = false;

// Probe to check if Storage CORS is active
async function checkStorageCors(userId) {
  if (corsChecked) return;
  corsChecked = true;
  try {
    const tempRef = ref(storage, `users/${userId}/_cors_probe.txt`);
    await uploadString(tempRef, 'probe', 'raw', { contentType: 'text/plain' });
    isStorageCorsBlocked = false;
  } catch (err) {
    isStorageCorsBlocked = true;
    console.warn(
      "[ConnectedNotes] Firebase Storage CORS ou permissÃµes nÃ£o configuradas. Salvaremos os payloads base64 diretamente no Firestore para evitar spam de erros de CORS no console. Para resolver em definitivo, configure o CORS no seu console do Firebase."
    );
  }
}

// Helper to upload a base64 file to Firebase Storage
async function uploadBase64ToStorage(userId, noteId, fileId, base64String) {
  const match = base64String.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return base64String;
  const contentType = match[1];
  const rawBase64 = match[2];

  let extension = 'bin';
  if (contentType.includes('/')) {
    extension = contentType.split('/')[1];
  }
  const storagePath = `users/${userId}/notes/${noteId}/${fileId}.${extension}`;
  const fileRef = ref(storage, storagePath);

  await uploadString(fileRef, rawBase64, 'base64', { contentType });
  return await getDownloadURL(fileRef);
}

// Recursive helper to find and upload all base64 data URL strings inside content object
async function processBase64Fields(userId, noteId, data) {
  if (!data) return data;

  if (typeof data === 'string') {
    if (data.startsWith('data:') && data.includes(';base64,')) {
      if (isStorageCorsBlocked) {
        return data; // Safe fallback bypass
      }
      const fileId = 'file_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      try {
        return await uploadBase64ToStorage(userId, noteId, fileId, data);
      } catch (err) {
        console.error("Failed to upload base64 file to Storage:", err);
        return data;
      }
    }
    return data;
  }

  if (Array.isArray(data)) {
    const promises = data.map(item => processBase64Fields(userId, noteId, item));
    return Promise.all(promises);
  }

  if (typeof data === 'object') {
    const result = {};
    const keys = Object.keys(data);
    for (const key of keys) {
      result[key] = await processBase64Fields(userId, noteId, data[key]);
    }
    return result;
  }

  return data;
}

// Nome das chaves de configuraÃ§Ã£o no LocalStorage
const CONFIG_KEYS = {
  ACTIVE_PROVIDERS: 'connected-notes-active-providers', // { indexeddb: true, local_vault: false, firebase: false }
  VAULT_PATH: 'connected-notes-vault-path', // Para Electron
  FIREBASE_USER_ID: 'connected-notes-firebase-uid',
  CUSTOM_SERVER_URL: 'connected-notes-server-url',
  CUSTOM_SERVER_TOKEN: 'connected-notes-server-token'
};

// Helper para ler e migrar provedores do LocalStorage
function loadActiveProviders() {
  try {
    const saved = localStorage.getItem(CONFIG_KEYS.ACTIVE_PROVIDERS);
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.indexeddb = true; // Sempre ativo como cache local
      return parsed;
    }
    
    // Compatibilidade reversa de migraÃ§Ã£o
    const legacy = localStorage.getItem('connected-notes-active-provider');
    if (legacy) {
      const providers = { indexeddb: true, local_vault: false, firebase: false };
      providers[legacy] = true;
      localStorage.setItem(CONFIG_KEYS.ACTIVE_PROVIDERS, JSON.stringify(providers));
      return providers;
    }
  } catch (e) {
    console.warn("Falha ao carregar provedores ativos:", e);
  }
  return { indexeddb: true, local_vault: false, firebase: false };
}

// VariÃ¡veis internas
let activeProviders = loadActiveProviders();
let activeVaultHandle = null; // Para File System Access API
let activeVaultPath = localStorage.getItem(CONFIG_KEYS.VAULT_PATH) || null; // Para Electron
let firebaseUnsubscribes = {}; // ColeÃ§Ã£o de listeners onSnapshot ativos

// Retorna o caminho da pasta onde residem os filhos de uma nota
function getNoteDirectoryPath(noteId, notesState) {
  if (noteId === 'root') return '';
  const note = notesState[noteId];
  if (!note) return '';

  const parentId = Object.keys(notesState).find(key => 
    notesState[key]?.children?.includes(noteId)
  );

  const parentDir = getNoteDirectoryPath(parentId, notesState);
  const sanitizedTitle = FileSystemBridge.sanitizeFileName(note.title);

  if (note.type === 'folder' || (note.children && note.children.length > 0)) {
    return parentDir ? `${parentDir}/${sanitizedTitle}` : sanitizedTitle;
  }
  return parentDir;
}

// Retorna o caminho do arquivo fÃ­sico onde Ã© salvo o conteÃºdo da nota
function getNoteFilePath(noteId, notesState) {
  if (noteId === 'root') return '';
  const note = notesState[noteId];
  if (!note) return '';

  const parentId = Object.keys(notesState).find(key => 
    notesState[key]?.children?.includes(noteId)
  );

  const parentDir = getNoteDirectoryPath(parentId, notesState);
  const sanitizedTitle = FileSystemBridge.sanitizeFileName(note.title);

  let ext = '';
  if (note.type === 'canvas') ext = '.canvas';
  else if (note.type === 'text') ext = '.md';
  else if (note.type === 'code') ext = '.code';
  else if (note.type === 'mermaid') ext = '.mermaid';
  else if (note.type === 'mindmap') ext = '.mindmap';

  if (!ext) return null; // Folders nÃ£o possuem arquivos de conteÃºdo prÃ³prios

  if (note.children && note.children.length > 0) {
    // Se a nota tem filhos, ela tem sua prÃ³pria pasta e seu conteÃºdo reside dentro dela
    const ownDir = getNoteDirectoryPath(noteId, notesState);
    return `${ownDir}/${sanitizedTitle}${ext}`;
  } else {
    // Se a nota nÃ£o tem filhos, ela Ã© salva diretamente na pasta do pai
    return parentDir ? `${parentDir}/${sanitizedTitle}${ext}` : `${sanitizedTitle}${ext}`;
  }
}

export const StorageService = {
  /**
   * Inicializa o serviÃ§o e tenta restaurar conexÃµes ou permissÃµes salvas
   */
  async initialize() {
    activeProviders = loadActiveProviders();

    // Carrega o token do Google Drive do localStorage se for vÃ¡lido
    const savedToken = localStorage.getItem('google-drive-access-token');
    const expiry = localStorage.getItem('google-drive-token-expiry');
    if (savedToken && expiry && Date.now() < parseInt(expiry)) {
      googleToken = savedToken;
    }
    
    if (activeProviders.local_vault) {
      if (FileSystemBridge.isWeb) {
        try {
          // Tenta recuperar o DirectoryHandle do IndexedDB
          const restored = await FileSystemBridge.restoreSavedDirectory();
          if (restored) {
            activeVaultHandle = restored;
          } else {
            // Desativa local_vault se nÃ£o restaurou e garante ao menos um ativo
            activeProviders.local_vault = false;
            if (!activeProviders.indexeddb && !activeProviders.firebase) {
              activeProviders.indexeddb = true;
            }
            localStorage.setItem(CONFIG_KEYS.ACTIVE_PROVIDERS, JSON.stringify(activeProviders));
          }
        } catch (e) {
          activeProviders.local_vault = false;
          if (!activeProviders.indexeddb && !activeProviders.firebase) {
            activeProviders.indexeddb = true;
          }
          localStorage.setItem(CONFIG_KEYS.ACTIVE_PROVIDERS, JSON.stringify(activeProviders));
        }
      } else if (FileSystemBridge.isElectron) {
        activeVaultPath = localStorage.getItem(CONFIG_KEYS.VAULT_PATH);
        if (!activeVaultPath) {
          activeProviders.local_vault = false;
          if (!activeProviders.indexeddb && !activeProviders.firebase) {
            activeProviders.indexeddb = true;
          }
          localStorage.setItem(CONFIG_KEYS.ACTIVE_PROVIDERS, JSON.stringify(activeProviders));
        }
      }
    }
  },

  getActiveProviders() {
    return activeProviders;
  },

  getActiveProvider() {
    // Mantido por compatibilidade de cÃ³digo: retorna o principal
    if (activeProviders.local_vault) return 'local_vault';
    if (activeProviders.firebase) return 'firebase';
    return 'indexeddb';
  },

  getVaultPath() {
    return FileSystemBridge.isElectron ? activeVaultPath : (activeVaultHandle ? activeVaultHandle.name : null);
  },

  /**
   * Altera dinamicamente o status ativo de um Provedor de Armazenamento
   */
  async setProviderActive(providerName, isActive) {
    if (providerName === 'local_vault' && isActive) {
      if (FileSystemBridge.isElectron) {
        if (!activeVaultPath) {
          const pathSelected = await FileSystemBridge.selectDirectory();
          if (!pathSelected) return false;
          activeVaultPath = pathSelected;
          localStorage.setItem(CONFIG_KEYS.VAULT_PATH, pathSelected);
        }
      } else if (FileSystemBridge.isWeb) {
        if (!activeVaultHandle) {
          const handleSelected = await FileSystemBridge.selectDirectory();
          if (!handleSelected) return false;
          activeVaultHandle = handleSelected;
        }
      }
    }



    // Atualiza o estado
    activeProviders = {
      ...activeProviders,
      [providerName]: isActive,
      indexeddb: true // Sempre ativo para cache e funcionamento offline
    };

    localStorage.setItem(CONFIG_KEYS.ACTIVE_PROVIDERS, JSON.stringify(activeProviders));
    return true;
  },

  /**
   * Mantido para compatibilidade legado de setProvider
   */
  async setProvider(providerName, config = {}) {
    // Converte a chamada antiga para o formato novo
    Object.keys(activeProviders).forEach(k => {
      activeProviders[k] = (k === providerName || k === 'indexeddb');
    });

    if (providerName === 'local_vault') {
      if (FileSystemBridge.isElectron) {
        if (!config.path) {
          const pathSelected = await FileSystemBridge.selectDirectory();
          if (!pathSelected) return false;
          config.path = pathSelected;
        }
        activeVaultPath = config.path;
        localStorage.setItem(CONFIG_KEYS.VAULT_PATH, config.path);
      } else if (FileSystemBridge.isWeb) {
        if (!config.handle) {
          const handleSelected = await FileSystemBridge.selectDirectory();
          if (!handleSelected) return false;
          config.handle = handleSelected;
        }
        activeVaultHandle = config.handle;
      }
    }

    localStorage.setItem(CONFIG_KEYS.ACTIVE_PROVIDERS, JSON.stringify(activeProviders));
    return true;
  },

  /**
   * Carrega a estrutura completa do Workspace baseando-se no provedor ativo com maior prioridade
   */
  async loadWorkspace() {
    // Prioridade 1: Local Vault
    if (activeProviders.local_vault) {
      const target = FileSystemBridge.isElectron ? activeVaultPath : activeVaultHandle;
      if (target) {
        try {
          const metaStr = await FileSystemBridge.readFile(target, '.workspace.json');
          if (metaStr) {
            const parsed = JSON.parse(metaStr);
            const notesData = parsed.notes || {};
            
            for (const key of Object.keys(notesData)) {
              if (notesData[key].type !== 'folder') {
                const relPath = getNoteFilePath(key, notesData);
                if (relPath) {
                  const fileContent = await FileSystemBridge.readFile(target, relPath);
                  if (fileContent) {
                    try {
                      if (notesData[key].type === 'text') {
                        notesData[key].content = { markdown: fileContent };
                      } else {
                        notesData[key].content = JSON.parse(fileContent);
                      }
                    } catch (e) {
                      console.warn(`Falha ao ler dados de nota ${notesData[key].title}.`);
                    }
                  }
                }
              }
            }
            return notesData;
          }
        } catch (err) {
          console.error("Falha ao ler metadados .workspace.json:", err);
        }
      }
    }

    // Prioridade 2: Firebase Cloud
    if (activeProviders.firebase) {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid, 'workspace', 'state');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const workspaceData = docSnap.data().notes || {};
            return workspaceData;
          }
        } catch (err) {
          console.error("Erro ao carregar workspace do Firebase:", err);
        }
      }
    }

    // Prioridade 3: LocalStorage / IndexedDB
    const savedData = localStorage.getItem('connected-notes-data');
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (e) {
        console.error("Falha ao analisar notas do LocalStorage:", e);
      }
    }

    return null;
  },

  /**
   * Salva uma nota de forma incremental em todos os provedores ativos
   */
  async saveNote(noteId, noteData, notesState) {
    let success = false;

    // 1. Grava no Local Vault se estiver ativo
    if (activeProviders.local_vault) {
      const target = FileSystemBridge.isElectron ? activeVaultPath : activeVaultHandle;
      if (target) {
        try {
          if (noteData.type === 'folder') {
            const dirPath = getNoteDirectoryPath(noteId, notesState);
            if (dirPath) {
              await FileSystemBridge.createDirectory(target, dirPath);
            }
          } else {
            const filePath = getNoteFilePath(noteId, notesState);
            if (filePath) {
              // Se a nota tem filhos, garante que criamos seu prÃ³prio diretÃ³rio fÃ­sico antes
              if (noteData.children && noteData.children.length > 0) {
                const dirPath = getNoteDirectoryPath(noteId, notesState);
                await FileSystemBridge.createDirectory(target, dirPath);
              }
              let contentToSave = noteData.type === 'text' ? (noteData.content?.markdown || '') : (noteData.content || {});
              await FileSystemBridge.writeFile(target, filePath, contentToSave);
            }
          }
          await FileSystemBridge.writeFile(target, '.workspace.json', { notes: notesState });
          success = true;
        } catch (e) {
          console.error("Erro ao gravar nota fÃ­sica local:", e);
        }
      }
    }

    // 2. Grava no Firebase Cloud se estiver ativo
    if (activeProviders.firebase) {
      const user = auth.currentUser;
      if (user) {
        try {
          // Probe CORS dynamically if not checked yet
          if (!corsChecked) {
            checkStorageCors(user.uid);
          }

          const docRef = doc(db, 'users', user.uid, 'notes', noteId);
          
          // Offload base64 files to Firebase Storage to keep firestore doc size tiny
          const processedContent = await processBase64Fields(user.uid, noteId, noteData.content);
          const processedNoteData = {
            ...noteData,
            content: processedContent
          };
          
          await setDoc(docRef, sanitize(processedNoteData));

          // Strip heavy 'content' fields from all notes in notesState to keep the workspace document tiny and prevent Firebase 1MB limit crash
          const workspaceState = {};
          Object.keys(notesState).forEach(id => {
            const note = notesState[id];
            if (note) {
              const { content, ...rest } = note;
              workspaceState[id] = rest;
            }
          });

          const wsRef = doc(db, 'users', user.uid, 'workspace', 'state');
          await setDoc(wsRef, sanitize({ notes: workspaceState }));
          success = true;
        } catch (err) {
          console.error("Erro ao salvar nota no Firebase:", err);
        }
      }
    }

    // 3. IndexedDB / LocalStorage
    if (activeProviders.indexeddb) {
      // O contexto jÃ¡ gerencia o estado local e salvarÃ¡ no LocalStorage
      success = true;
    }

    return success;
  },

  /**
   * Exclui uma nota em todos os provedores ativos
   */
  async deleteNote(noteId, noteData, notesState) {
    // 1. Exclui do Local Vault se ativo
    if (activeProviders.local_vault) {
      const target = FileSystemBridge.isElectron ? activeVaultPath : activeVaultHandle;
      if (target) {
        if (noteData.type === 'folder' || (noteData.children && noteData.children.length > 0)) {
          const dirPath = getNoteDirectoryPath(noteId, notesState);
          if (dirPath) {
            await FileSystemBridge.deleteFile(target, dirPath);
          }
        } else {
          const filePath = getNoteFilePath(noteId, notesState);
          if (filePath) {
            await FileSystemBridge.deleteFile(target, filePath);
          }
        }
        await FileSystemBridge.writeFile(target, '.workspace.json', { notes: notesState });
      }
    }

    // 2. Exclui do Firebase Cloud se ativo
    if (activeProviders.firebase) {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid, 'notes', noteId);
          await deleteDoc(docRef);

          // Strip heavy 'content' fields from all notes in notesState to keep the workspace document tiny and prevent Firebase 1MB limit crash
          const workspaceState = {};
          Object.keys(notesState).forEach(id => {
            const note = notesState[id];
            if (note) {
              const { content, ...rest } = note;
              workspaceState[id] = rest;
            }
          });

          const wsRef = doc(db, 'users', user.uid, 'workspace', 'state');
          await setDoc(wsRef, sanitize({ notes: workspaceState }));
        } catch (err) {
          console.error("Erro ao deletar nota no Firebase:", err);
        }
      }
    }

    return true;
  },

  /**
   * Escuta alteraÃ§Ãµes de uma nota na nuvem para sincronizaÃ§Ã£o em tempo real
   */
  onNoteSync(noteId, callback) {
    if (!activeProviders.firebase) return () => {};

    const user = auth.currentUser;
    if (!user) return () => {};

    if (firebaseUnsubscribes[noteId]) {
      firebaseUnsubscribes[noteId]();
    }

    const docRef = doc(db, 'users', user.uid, 'notes', noteId);
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const remoteData = docSnap.data();
        
        if (remoteData.driveFileId) {
          const token = this.getGoogleToken();
          if (token) {
            try {
              console.log(`[StorageService] Buscando canvas no Google Drive para nota: ${noteId}`);
              const canvasData = await GoogleDriveService.getCanvasData(remoteData.driveFileId, token);
              remoteData.content = {
                ...remoteData.content,
                ...canvasData
              };
            } catch (err) {
              console.error("[StorageService] Falha ao baixar canvas do Google Drive:", err);
            }
          }
        }
        
        callback(remoteData);
      }
    }, (err) => {
      console.warn("Erro no listener de sincronizaÃ§Ã£o:", err);
    });

    firebaseUnsubscribes[noteId] = unsubscribe;
    return unsubscribe;
  },

  /**
   * Escuta alteraÃ§Ãµes globais do Workspace na nuvem para sincronizaÃ§Ã£o em tempo real da Ã¡rvore de notas
   */
  onWorkspaceSync(callback) {
    if (!activeProviders.firebase) return () => {};

    const user = auth.currentUser;
    if (!user) return () => {};

    const docRef = doc(db, 'users', user.uid, 'workspace', 'state');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const remoteWorkspace = docSnap.data().notes || {};
        callback(remoteWorkspace);
      }
    }, (err) => {
      console.warn("Erro no listener de workspace:", err);
    });

    return unsubscribe;
  },

  /**
   * Salva metadados globais adicionais (como abas abertas e notas ativas)
   */
  async saveSession(sessionData) {
    if (activeProviders.local_vault) {
      const target = FileSystemBridge.isElectron ? activeVaultPath : activeVaultHandle;
      if (target) {
        try {
          await FileSystemBridge.writeFile(target, '.connected-notes/session.json', sessionData);
        } catch (e) {
          console.error("Falha ao salvar sessÃ£o no Vault:", e);
        }
      }
    }
    
    if (activeProviders.firebase) {
      const user = auth.currentUser;
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid, 'settings', 'session'), sanitize(sessionData));
        } catch (e) {
          console.error("Falha ao salvar sessÃ£o no Firebase:", e);
        }
      }
    }
    
    if (activeProviders.indexeddb) {
      localStorage.setItem('connected-notes-session', JSON.stringify(sessionData));
    }
  },

  async loadSession() {
    let session = null;
    
    if (activeProviders.local_vault) {
      const target = FileSystemBridge.isElectron ? activeVaultPath : activeVaultHandle;
      if (target) {
        try {
          const data = await FileSystemBridge.readFile(target, '.connected-notes/session.json');
          if (data) session = JSON.parse(data);
        } catch (e) {}
      }
    }
    
    if (!session && activeProviders.firebase) {
      const user = auth.currentUser;
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid, 'settings', 'session'));
          if (snap.exists()) session = snap.data();
        } catch (e) {}
      }
    }
    
    if (!session && activeProviders.indexeddb) {
      try {
        const data = localStorage.getItem('connected-notes-session');
        if (data) session = JSON.parse(data);
      } catch (e) {}
    }
    
    return session;
  },

  setGoogleToken(token) {
    googleToken = token;
  },

  getGoogleToken() {
    // Retorna o token se nÃ£o estiver expirado
    const token = googleToken || localStorage.getItem('google-drive-access-token');
    const expiry = localStorage.getItem('google-drive-token-expiry');
    if (token && expiry && Date.now() < parseInt(expiry)) {
      if (!googleToken) googleToken = token;
      return token;
    }
    return null;
  },

  isGoogleTokenExpired() {
    const token = localStorage.getItem('google-drive-access-token');
    const expiry = localStorage.getItem('google-drive-token-expiry');
    if (token && expiry) {
      return Date.now() >= parseInt(expiry);
    }
    return false;
  }
};


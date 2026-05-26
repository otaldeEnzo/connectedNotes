/**
 * StorageService.js
 * 
 * Orquestrador de Persistência e Sincronização Híbrida para ConnectedNotes.
 */

import { FileSystemBridge } from './FileSystemBridge';
import { db, auth, sanitize } from '../firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  collection, 
  onSnapshot 
} from 'firebase/firestore';

// Nome das chaves de configuração no LocalStorage
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
      return JSON.parse(saved);
    }
    
    // Compatibilidade reversa de migração
    const legacy = localStorage.getItem('connected-notes-active-provider');
    if (legacy) {
      const providers = { indexeddb: false, local_vault: false, firebase: false };
      providers[legacy] = true;
      if (!providers.indexeddb && !providers.local_vault && !providers.firebase) {
        providers.indexeddb = true;
      }
      localStorage.setItem(CONFIG_KEYS.ACTIVE_PROVIDERS, JSON.stringify(providers));
      return providers;
    }
  } catch (e) {
    console.warn("Falha ao carregar provedores ativos:", e);
  }
  return { indexeddb: true, local_vault: false, firebase: false };
}

// Variáveis internas
let activeProviders = loadActiveProviders();
let activeVaultHandle = null; // Para File System Access API
let activeVaultPath = localStorage.getItem(CONFIG_KEYS.VAULT_PATH) || null; // Para Electron
let firebaseUnsubscribes = {}; // Coleção de listeners onSnapshot ativos

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

// Retorna o caminho do arquivo físico onde é salvo o conteúdo da nota
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

  if (!ext) return null; // Folders não possuem arquivos de conteúdo próprios

  if (note.children && note.children.length > 0) {
    // Se a nota tem filhos, ela tem sua própria pasta e seu conteúdo reside dentro dela
    const ownDir = getNoteDirectoryPath(noteId, notesState);
    return `${ownDir}/${sanitizedTitle}${ext}`;
  } else {
    // Se a nota não tem filhos, ela é salva diretamente na pasta do pai
    return parentDir ? `${parentDir}/${sanitizedTitle}${ext}` : `${sanitizedTitle}${ext}`;
  }
}

export const StorageService = {
  /**
   * Inicializa o serviço e tenta restaurar conexões ou permissões salvas
   */
  async initialize() {
    activeProviders = loadActiveProviders();
    
    if (activeProviders.local_vault) {
      if (FileSystemBridge.isWeb) {
        try {
          // Tenta recuperar o DirectoryHandle do IndexedDB
          const restored = await FileSystemBridge.restoreSavedDirectory();
          if (restored) {
            activeVaultHandle = restored;
          } else {
            // Desativa local_vault se não restaurou e garante ao menos um ativo
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
    // Mantido por compatibilidade de código: retorna o principal
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
      [providerName]: isActive
    };

    // Garante que pelo menos um provedor esteja ativo
    if (!activeProviders.indexeddb && !activeProviders.local_vault && !activeProviders.firebase) {
      activeProviders.indexeddb = true;
    }

    localStorage.setItem(CONFIG_KEYS.ACTIVE_PROVIDERS, JSON.stringify(activeProviders));
    return true;
  },

  /**
   * Mantido para compatibilidade legado de setProvider
   */
  async setProvider(providerName, config = {}) {
    // Converte a chamada antiga para o formato novo
    Object.keys(activeProviders).forEach(k => {
      activeProviders[k] = (k === providerName);
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
              // Se a nota tem filhos, garante que criamos seu próprio diretório físico antes
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
          console.error("Erro ao gravar nota física local:", e);
        }
      }
    }

    // 2. Grava no Firebase Cloud se estiver ativo
    if (activeProviders.firebase) {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid, 'notes', noteId);
          await setDoc(docRef, sanitize(noteData));

          const wsRef = doc(db, 'users', user.uid, 'workspace', 'state');
          await setDoc(wsRef, sanitize({ notes: notesState }));
          success = true;
        } catch (err) {
          console.error("Erro ao salvar nota no Firebase:", err);
        }
      }
    }

    // 3. IndexedDB / LocalStorage
    if (activeProviders.indexeddb) {
      // O contexto já gerencia o estado local e salvará no LocalStorage
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

          const wsRef = doc(db, 'users', user.uid, 'workspace', 'state');
          await setDoc(wsRef, sanitize({ notes: notesState }));
        } catch (err) {
          console.error("Erro ao deletar nota no Firebase:", err);
        }
      }
    }

    return true;
  },

  /**
   * Escuta alterações de uma nota na nuvem para sincronização em tempo real
   */
  onNoteSync(noteId, callback) {
    if (!activeProviders.firebase) return () => {};

    const user = auth.currentUser;
    if (!user) return () => {};

    if (firebaseUnsubscribes[noteId]) {
      firebaseUnsubscribes[noteId]();
    }

    const docRef = doc(db, 'users', user.uid, 'notes', noteId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const remoteData = docSnap.data();
        callback(remoteData);
      }
    }, (err) => {
      console.warn("Erro no listener de sincronização:", err);
    });

    firebaseUnsubscribes[noteId] = unsubscribe;
    return unsubscribe;
  },

  /**
   * Escuta alterações globais do Workspace na nuvem para sincronização em tempo real da árvore de notas
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
  async saveGlobalState(workspaceMeta) {
    if (activeProviders.local_vault) {
      const target = FileSystemBridge.isElectron ? activeVaultPath : activeVaultHandle;
      if (!target) return;
      
      try {
        const metaStr = await FileSystemBridge.readFile(target, '.workspace.json');
        if (metaStr) {
          const parsed = JSON.parse(metaStr);
          parsed.openTabs = workspaceMeta.openTabs;
          parsed.activeNoteId = workspaceMeta.activeNoteId;
          await FileSystemBridge.writeFile(target, '.workspace.json', parsed);
        }
      } catch (e) {
        console.error("Falha ao salvar metadados globais no Vault:", e);
      }
    }
  }
};

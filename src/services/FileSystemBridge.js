/**
 * FileSystemBridge.js
 * 
 * Abstração de acesso ao sistema de arquivos físico para Web, Electron e Capacitor.
 */

// 1. Identificação Segura do Ambiente
const isElectron = typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
const isCapacitor = typeof window !== 'undefined' && window.Capacitor !== undefined;
const isWeb = !isElectron && !isCapacitor;

// Carregamento dinâmico de módulos do Node no Electron
let fs = null;
let path = null;
let ipcRenderer = null;

if (isElectron) {
  try {
    fs = window.require('fs');
    path = window.require('path');
    ipcRenderer = window.require('electron').ipcRenderer;
  } catch (err) {
    console.error("Falha ao carregar módulos nativos do Electron:", err);
  }
}

// 2. Banco de Dados IndexedDB para persistir Handles de Pastas no Browser
const DB_NAME = 'ConnectedNotesFileSystemDB';
const STORE_NAME = 'handles';

function saveHandleToIndexedDB(handle) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(handle, 'active-vault');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

function loadHandleFromIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get('active-vault');
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(getReq.error);
    };
    request.onerror = () => reject(request.error);
  });
}

// 3. Verificação de permissões do navegador para a pasta
async function verifyPermission(fileHandle, readWrite = true) {
  const options = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
}

// 4. Sanitize File Names
function sanitizeFileName(title) {
  return title.replace(/[\\\/:\*\?"<>\|]/g, '_');
}

export const FileSystemBridge = {
  isElectron,
  isCapacitor,
  isWeb,

  /**
   * Solicita a seleção de uma pasta física de trabalho
   */
  async selectDirectory() {
    if (isElectron) {
      if (!ipcRenderer) throw new Error("IPC Renderer não disponível");
      const chosenPath = await ipcRenderer.invoke('select-directory');
      return chosenPath; // Retorna string contendo o caminho absoluto
    }

    if (isWeb) {
      if (!window.showDirectoryPicker) {
        throw new Error("Seu navegador não suporta a File System Access API. Ativando IndexedDB local.");
      }
      const handle = await window.showDirectoryPicker();
      const hasPermission = await verifyPermission(handle, true);
      if (!hasPermission) throw new Error("Permissão de leitura/escrita negada.");
      
      // Persiste o Handle no IndexedDB
      await saveHandleToIndexedDB(handle);
      return handle; // Retorna o FileSystemDirectoryHandle
    }

    // Capacitor / Mobile fallback
    return 'indexeddb-fallback';
  },

  /**
   * Tenta restaurar um Handle de pasta salvo anteriormente (somente Web)
   */
  async restoreSavedDirectory() {
    if (isWeb && window.showDirectoryPicker) {
      try {
        const handle = await loadHandleFromIndexedDB();
        if (handle) {
          const hasPermission = await verifyPermission(handle, true);
          if (hasPermission) return handle;
        }
      } catch (err) {
        console.warn("Nenhum diretório persistido no IndexedDB:", err);
      }
    }
    return null;
  },

  /**
   * Salva um arquivo físico (JSON ou Texto) na pasta informada
   */
  async writeFile(directoryPathOrHandle, relativePath, content) {
    const contentStr = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;

    if (isElectron && fs && path) {
      const fullPath = path.join(directoryPathOrHandle, relativePath);
      const parentDir = path.dirname(fullPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(fullPath, contentStr, 'utf8');
      return true;
    }

    if (isWeb && typeof directoryPathOrHandle === 'object') {
      const parts = relativePath.split('/');
      let currentDir = directoryPathOrHandle;
      
      // Navega e cria subpastas se necessário
      for (let i = 0; i < parts.length - 1; i++) {
        currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true });
      }

      const fileName = parts[parts.length - 1];
      const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(contentStr);
      await writable.close();
      return true;
    }

    return false;
  },

  /**
   * Lê um arquivo físico na pasta informada
   */
  async readFile(directoryPathOrHandle, relativePath) {
    if (isElectron && fs && path) {
      const fullPath = path.join(directoryPathOrHandle, relativePath);
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, 'utf8');
      }
      return null;
    }

    if (isWeb && typeof directoryPathOrHandle === 'object') {
      try {
        const parts = relativePath.split('/');
        let currentDir = directoryPathOrHandle;
        
        for (let i = 0; i < parts.length - 1; i++) {
          currentDir = await currentDir.getDirectoryHandle(parts[i]);
        }

        const fileName = parts[parts.length - 1];
        const fileHandle = await currentDir.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        const text = await file.text();
        return text;
      } catch (e) {
        return null;
      }
    }

    return null;
  },

  /**
   * Exclui um arquivo ou diretório físico na pasta
   */
  async deleteFile(directoryPathOrHandle, relativePath) {
    if (isElectron && fs && path) {
      const fullPath = path.join(directoryPathOrHandle, relativePath);
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
        return true;
      }
      return false;
    }

    if (isWeb && typeof directoryPathOrHandle === 'object') {
      try {
        const parts = relativePath.split('/');
        let currentDir = directoryPathOrHandle;
        
        for (let i = 0; i < parts.length - 1; i++) {
          currentDir = await currentDir.getDirectoryHandle(parts[i]);
        }

        const targetName = parts[parts.length - 1];
        await currentDir.removeEntry(targetName, { recursive: true });
        return true;
      } catch (e) {
        return false;
      }
    }

    return false;
  },

  /**
   * Auxiliar para criar pasta física diretamente
   */
  async createDirectory(directoryPathOrHandle, relativePath) {
    if (isElectron && fs && path) {
      const fullPath = path.join(directoryPathOrHandle, relativePath);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
      return true;
    }

    if (isWeb && typeof directoryPathOrHandle === 'object') {
      const parts = relativePath.split('/');
      let currentDir = directoryPathOrHandle;
      for (const part of parts) {
        currentDir = await currentDir.getDirectoryHandle(part, { create: true });
      }
      return true;
    }

    return false;
  },

  sanitizeFileName
};

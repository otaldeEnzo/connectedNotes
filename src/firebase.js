import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * CONFIGURAÇÃO DO FIREBASE
 * Recupera chaves personalizadas do usuário do LocalStorage ou 
 * cai de volta para as chaves padrão do desenvolvedor.
 */
function getFirebaseConfig() {
  const saved = localStorage.getItem('connected-notes-custom-firebase-config');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Falha ao analisar a configuração customizada do Firebase:", e);
    }
  }
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };
}

let app = initializeApp(getFirebaseConfig());
let auth = getAuth(app);
let db = getFirestore(app);
const appId = 'connectedNotes';

/**
 * Atualiza e reinicializa dinamicamente as credenciais do Firebase em runtime.
 * Graças às live bindings de módulos do ES, todos os arquivos que importam
 * `app`, `auth` e `db` verão as novas instâncias de imediato.
 */
function updateFirebaseConfig(newConfig) {
  if (newConfig) {
    localStorage.setItem('connected-notes-custom-firebase-config', JSON.stringify(newConfig));
  } else {
    localStorage.removeItem('connected-notes-custom-firebase-config');
  }

  if (app) {
    try {
      deleteApp(app);
    } catch (e) {
      console.warn("Aviso ao liberar app Firebase antigo:", e);
    }
  }

  const activeConfig = getFirebaseConfig();
  app = initializeApp(activeConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  // Despacha um evento personalizado para notificar os componentes React em tempo real
  window.dispatchEvent(new CustomEvent('firebase-config-changed', { detail: { auth, db } }));
}

/**
 * Função utilitária para limpar dados indefinidos antes de enviar ao Firestore.
 */
function sanitize(data) {
  return JSON.parse(JSON.stringify(data, (key, value) => value === undefined ? null : value));
}

/**
 * Retorna se o usuário está rodando o app sob um Firebase personalizado.
 */
function isCustomFirebaseActive() {
  return !!localStorage.getItem('connected-notes-custom-firebase-config');
}

export { app, auth, db, appId, sanitize, updateFirebaseConfig, getFirebaseConfig, isCustomFirebaseActive };
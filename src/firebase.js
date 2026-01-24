import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * CONFIGURAÇÃO DO FIREBASE
 * * Utilizamos variáveis de ambiente (VITE_...) para não expor 
 * as chaves reais diretamente no código que vai para o GitHub.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'connectedNotes';

/**
 * Função utilitária para limpar dados indefinidos antes de enviar ao Firestore.
 */
function sanitize(data) {
  return JSON.parse(JSON.stringify(data, (key, value) => value === undefined ? null : value));
}

export { app, auth, db, appId, sanitize };
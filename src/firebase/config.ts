import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Credenciales del proyecto Firebase "motodeals-app".
// El apiKey de Firebase es público por diseño (no es un secreto): el acceso real
// a los datos lo controlan las Firestore Security Rules (firestore.rules), no esta clave.
const firebaseConfig = {
  apiKey: 'AIzaSyDhJILbxkyUsfFcuakpl9CkzBLehFeMKE0',
  authDomain: 'motodeals-app.firebaseapp.com',
  projectId: 'motodeals-app',
  storageBucket: 'motodeals-app.firebasestorage.app',
  messagingSenderId: '35977659459',
  appId: '1:35977659459:web:4a32998e1daf9b5cc200f6',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const db = getFirestore(firebaseApp)
export const auth = getAuth(firebaseApp)

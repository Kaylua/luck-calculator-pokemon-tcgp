import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA_gCVP8ep_g2dc8-kamT2WH51AbpzUSh4",
  authDomain: "calculateur-de-chance-tcgp.firebaseapp.com",
  projectId: "calculateur-de-chance-tcgp",
  storageBucket: "calculateur-de-chance-tcgp.appspot.com",
  messagingSenderId: "22352390276",
  appId: "1:22352390276:web:4798d8001f9098e6867ad1"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

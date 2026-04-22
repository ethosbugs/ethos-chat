// ------------------------------
// FIREBASE
// ------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDpls-yeDmNRoDLq4jXUCKbaiip0A9oXmQ",
  authDomain: "ethos-chat-dfe0e.firebaseapp.com",
  databaseURL: "https://ethos-chat-dfe0e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ethos-chat-dfe0e",
  storageBucket: "ethos-chat-dfe0e.firebasestorage.app",
  messagingSenderId: "1033379402899",
  appId: "1:1033379402899:web:e0a71148c2c1e0a55e2966",
  measurementId: "G-GWK6PBTJV7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ------------------------------
// ELEMENTS HTML
// ------------------------------
const messagesEl = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const clearLocal = document.getElementById("clearLocal");
const openProfile = document.getElementById("openProfile");

const nameModal = document.getElementById("nameModal");
const nameInput = document.getElementById("nameInput");
const nameConfirm = document.getElementById("nameConfirm");

const profilePanel = document.getElementById("profilePanel");
const profileName = document.getElementById("profileName");
const profileLast = document.getElementById("profileLast");
const profileCount = document.getElementById("profileCount");
const profileId = document.getElementById("profileId");

// ------------------------------
// USUARI
// ------------------------------
let user = JSON.parse(localStorage.getItem("ethosUser")) || null;

if (!user) {
  nameModal.classList.remove("hidden");
}

nameConfirm.addEventListener("click", () => {
  const name = nameInput.value.trim();
  if (!name) return;

  user = {
    name,
    internalId: Math.random().toString(36).substring(2, 12),
    createdAt: Date.now(),
    lastSeen: Date.now(),
    messagesSent: 0
  };

  localStorage.setItem("ethosUser", JSON.stringify(user));
  updateProfileUI();
  nameModal.classList.add("hidden");
});

function updateProfileUI() {
  if (!user) return;
  profileName.textContent = user.name;
  profileLast.textContent = new Date(user.lastSeen).toLocaleString();
  profileCount.textContent = user.messagesSent;
  profileId.textContent = user.internalId;
}

updateProfileUI();

// ------------------------------
// ENVIAR MISSATGE
// ------------------------------
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !user) return;

  await addDoc(collection(db, "messages"), {
    user: user.name,
    text,
    createdAt: serverTimestamp()
  });

  user.messagesSent++;
  user.lastSeen = Date.now();
  localStorage.setItem("ethosUser", JSON.stringify(user));
  updateProfileUI();

  messageInput.value = "";
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

// ------------------------------
// LLEGIR MISSATGES
// ------------------------------
const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));

onSnapshot(q, (snapshot) => {
  messagesEl.innerHTML = "";

  snapshot.forEach((doc) => {
    const msg = doc.data();
    const div = document.createElement("div");
    div.innerHTML = `<strong>${msg.user}:</strong> ${msg.text}`;
    messagesEl.appendChild(div);
  });

  messagesEl.scrollTop = messagesEl.scrollHeight;
});

// ------------------------------
// PERFIL
// ------------------------------
openProfile.addEventListener("click", () => {
  profilePanel.classList.toggle("hidden");
});

// ------------------------------
// CLEAR LOCAL
// ------------------------------
clearLocal.addEventListener("click", () => {
  localStorage.removeItem("ethosUser");
  location.reload();
});

// ------------------------------
// TEMES ETHOS DEFINITIUS
// ------------------------------
const themeButtons = document.querySelectorAll(".theme-btn");

// Carregar tema guardat
const savedTheme = localStorage.getItem("ethosTheme");
if (savedTheme) {
  document.body.classList.add(`theme-${savedTheme}`);
}

// Canviar tema
themeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const theme = btn.dataset.theme;

    document.body.classList.remove(
      "theme-ethos_green",
      "theme-ethos_red",
      "theme-ethos_blue",
      "theme-ethos_light"
    );

    document.body.classList.add(`theme-${theme}`);

    localStorage.setItem("ethosTheme", theme);
  });
});

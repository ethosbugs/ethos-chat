console.log("ETHOS CHAT v3 LOADED");

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
const closeProfile = document.getElementById("closeProfile");

const profilePanel = document.getElementById("profilePanel");
const nameInput = document.getElementById("nameInput");
const profileLast = document.getElementById("profileLast");
const profileCount = document.getElementById("profileCount");
const profileId = document.getElementById("profileId");

// ------------------------------
// USUARI SENSE MODAL
// ------------------------------
let user = JSON.parse(localStorage.getItem("ethosUser")) || null;

function checkUser() {
  if (!user || !user.name) {
    messageInput.disabled = true;
    messageInput.placeholder = "Configura el teu nom a Settings";
    sendBtn.disabled = true;
  } else {
    messageInput.disabled = false;
    messageInput.placeholder = "Escriu un missatge...";
    sendBtn.disabled = false;
  }
}

checkUser();

function updateProfileUI() {
  if (!user) return;
  profileLast.textContent = new Date(user.lastSeen).toLocaleString();
  profileCount.textContent = user.messagesSent;
  profileId.textContent = user.internalId;
  nameInput.value = user.name;
}

updateProfileUI();

// ------------------------------
// CANVIAR NOM
// ------------------------------
nameInput.addEventListener("change", () => {
  const newName = nameInput.value.trim();
  if (!newName) return;

  user = {
    name: newName,
    internalId: user?.internalId || Math.random().toString(36).substring(2, 12),
    createdAt: user?.createdAt || Date.now(),
    lastSeen: Date.now(),
    messagesSent: user?.messagesSent || 0
  };

  localStorage.setItem("ethosUser", JSON.stringify(user));
  updateProfileUI();
  checkUser();
});

// ------------------------------
// ENVIAR MISSATGE
// ------------------------------
async function sendMessage() {
  if (!user || !user.name) return;

  const text = messageInput.value.trim();
  if (!text) return;

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

closeProfile.addEventListener("click", () => {
  profilePanel.classList.add("hidden");
});

// ------------------------------
// CLEAR LOCAL
// ------------------------------
clearLocal.addEventListener("click", () => {
  localStorage.clear();
  location.reload();
});

// ------------------------------
// TEMES
// ------------------------------
const themeButtons = document.querySelectorAll(".theme-btn");

const savedTheme = localStorage.getItem("ethosTheme");
const validThemes = ["ethos_green", "ethos_red", "ethos_blue", "ethos_light"];

if (savedTheme && validThemes.includes(savedTheme)) {
  document.body.classList.add(`theme-${savedTheme}`);
}

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

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
  apiKey: "API_KEY",
  authDomain: "PROJECT_ID.firebaseapp.com",
  projectId: "PROJECT_ID",
  storageBucket: "PROJECT_ID.appspot.com",
  messagingSenderId: "XXXXXX",
  appId: "XXXXXX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const chatStatusEl = document.getElementById("chatStatus");

const nameModal = document.getElementById("nameModal");
const nameInput = document.getElementById("nameInput");
const nameConfirm = document.getElementById("nameConfirm");

const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettings = document.getElementById("closeSettings");

const profileName = document.getElementById("profileName");
const profileLastSeen = document.getElementById("profileLastSeen");
const profileMessages = document.getElementById("profileMessages");
const profileId = document.getElementById("profileId");
const profileAvatar = document.getElementById("profileAvatar");

const clearLocal = document.getElementById("clearLocal");

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
    messagesSent: 0,
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`
  };

  localStorage.setItem("ethosUser", JSON.stringify(user));
  updateProfileUI();
  nameModal.classList.add("hidden");
});

function updateProfileUI() {
  if (!user) return;
  profileName.textContent = user.name;
  profileLastSeen.textContent = new Date(user.lastSeen).toLocaleString();
  profileMessages.textContent = user.messagesSent;
  profileId.textContent = user.internalId;
  profileAvatar.src = user.avatar;
}

updateProfileUI();

async function sendMessage() {
  const text = chatInput.value.trim();
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

  chatInput.value = "";
}

chatSend.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));

onSnapshot(
  q,
  (snapshot) => {
    chatStatusEl.textContent = "● Online";
    chatStatusEl.classList.remove("offline");
    chatStatusEl.classList.add("online");

    chatMessages.innerHTML = "";

    snapshot.forEach((doc) => {
      const msg = doc.data();
      const li = document.createElement("li");
      li.classList.add("chat-message");

      li.innerHTML = `<strong>${msg.user}:</strong> ${msg.text}`;
      chatMessages.appendChild(li);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  },
  () => {
    chatStatusEl.textContent = "● Offline";
    chatStatusEl.classList.remove("online");
    chatStatusEl.classList.add("offline");
  }
);

settingsBtn.addEventListener("click", () => {
  settingsPanel.classList.remove("hidden");
});

closeSettings.addEventListener("click", () => {
  settingsPanel.classList.add("hidden");
});

clearLocal.addEventListener("click", () => {
  localStorage.removeItem("ethosUser");
  location.reload();
});

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

const chatMessagesEl = document.getElementById("chatMessages");
const chatInputEl = document.getElementById("chatInput");
const chatSendEl = document.getElementById("chatSend");
const clearChatBtn = document.getElementById("clearChatBtn");
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettings = document.getElementById("closeSettings");
const themeButtons = document.querySelectorAll(".theme-btn");
const chatStatusEl = document.getElementById("chatStatus");

const nameModal = document.getElementById("nameModal");
const nameInput = document.getElementById("nameInput");
const nameConfirm = document.getElementById("nameConfirm");

const profileAvatar = document.getElementById("profileAvatar");
const profileName = document.getElementById("profileName");
const profileLastSeen = document.getElementById("profileLastSeen");
const profileMessages = document.getElementById("profileMessages");
const profileId = document.getElementById("profileId");

let currentUser = null;
let currentUserId = null;
let currentAvatar = null;
let messagesSent = 0;
let lastSeen = null;

function randomId() {
  return "ETHOS-" + Math.random().toString(16).slice(2, 10).toUpperCase();
}

function getThemeAccent() {
  const body = document.body;
  if (body.classList.contains("theme-ethos-blue")) return "#00c8ff";
  if (body.classList.contains("theme-ethos-purple")) return "#b000ff";
  return "#00ff88";
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function generateHexAvatarSvg(name, color) {
  const h = hashString(name);
  const size = 128;
  const cx = size / 2;
  const cy = size / 2;
  const r = 54;

  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  const hexPath = points.join(" ");

  const seed = h % 1000;
  const lines = [];
  const shapesCount = 4 + (seed % 4);
  for (let i = 0; i < shapesCount; i++) {
    const t = (seed * (i + 3)) % 1000;
    const x1 = 20 + (t % 80);
    const y1 = 20 + ((t * 7) % 80);
    const x2 = 20 + ((t * 13) % 80);
    const y2 = 20 + ((t * 17) % 80);
    lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" stroke-linecap="round" />`);
  }

  const circles = [];
  const circCount = 3 + (seed % 3);
  for (let i = 0; i < circCount; i++) {
    const t = (seed * (i + 11)) % 1000;
    const x = 30 + (t % 68);
    const y = 30 + ((t * 5) % 68);
    const rr = 3 + (t % 6);
    circles.push(`<circle cx="${x}" cy="${y}" r="${rr}" fill="${color}" />`);
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0.05"/>
    </linearGradient>
    <clipPath id="hexMask">
      <polygon points="${hexPath}" />
    </clipPath>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" fill="black"/>
  <polygon points="${hexPath}" fill="url(#bgGrad)" stroke="${color}" stroke-width="3"/>
  <g clip-path="url(#hexMask)">
    <g opacity="0.9">
      ${lines.join("\n")}
      ${circles.join("\n")}
    </g>
  </g>
</svg>
`;
  const encoded = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}
  const encoded = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}

function saveUserLocal() {
  if (!currentUser) return;
  localStorage.setItem("ethos_username", currentUser);
  localStorage.setItem("ethos_userId", currentUserId || "");
  localStorage.setItem("ethos_avatar", currentAvatar || "");
  localStorage.setItem("ethos_messagesSent", String(messagesSent || 0));
  if (lastSeen) {
    localStorage.setItem("ethos_lastSeen", String(lastSeen));
  }
}

function loadUserLocal() {
  const name = localStorage.getItem("ethos_username");
  if (!name) return null;
  currentUser = name;
  currentUserId = localStorage.getItem("ethos_userId") || randomId();
  currentAvatar = localStorage.getItem("ethos_avatar") || null;
  messagesSent = parseInt(localStorage.getItem("ethos_messagesSent") || "0", 10);
  const ls = localStorage.getItem("ethos_lastSeen");
  lastSeen = ls ? parseInt(ls, 10) : null;
  return currentUser;
}

async function syncUserToFirebase() {
  if (!currentUser) return;
  const userRef = doc(db, "users", currentUser);
  const snap = await getDoc(userRef);
  const now = Date.now();

  if (!snap.exists()) {
    if (!currentUserId) currentUserId = randomId();
    const accent = getThemeAccent();
    currentAvatar = generateHexAvatarSvg(currentUser, accent);

    await setDoc(userRef, {
      name: currentUser,
      internalId: currentUserId,
      createdAt: now,
      lastSeen: now,
      messagesSent: messagesSent || 0,
      avatar: currentAvatar,
    });
  } else {
    const data = snap.data();
    currentUserId = data.internalId || currentUserId || randomId();
    messagesSent = data.messagesSent || messagesSent || 0;
    lastSeen = data.lastSeen || now;
    currentAvatar = data.avatar || currentAvatar || generateHexAvatarSvg(currentUser, getThemeAccent());

    await updateDoc(userRef, {
      lastSeen: now,
      internalId: currentUserId,
      avatar: currentAvatar,
    });
  }

  lastSeen = now;
  saveUserLocal();
  updateProfileUI();
}

async function updateUserStatsOnSend() {
  if (!currentUser) return;
  messagesSent += 1;
  lastSeen = Date.now();
  saveUserLocal();

  const userRef = doc(db, "users", currentUser);
  await updateDoc(userRef, {
    messagesSent,
    lastSeen,
  });

  updateProfileUI();
}

function formatTimestamp(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mo} ${hh}:${mm}`;
}

function updateProfileUI() {
  if (currentAvatar) profileAvatar.src = currentAvatar;
  profileName.textContent = currentUser || "-";
  profileMessages.textContent = String(messagesSent || 0);
  profileId.textContent = currentUserId || "-";
  profileLastSeen.textContent = lastSeen ? formatTimestamp(lastSeen) : "-";
}

function showNameModal() {
  nameModal.classList.remove("hidden");
  nameModal.classList.add("visible");
  nameInput.value = "";
  setTimeout(() => nameInput.focus(), 50);
}

function hideNameModal() {
  nameModal.classList.remove("visible");
  setTimeout(() => {
    nameModal.classList.add("hidden");
  }, 400);
}

async function handleNameConfirm() {
  const name = nameInput.value.trim();
  if (!name) return;

  currentUser = name;
  currentUserId = randomId();
  const accent = getThemeAccent();
  currentAvatar = generateHexAvatarSvg(currentUser, accent);
  messagesSent = 0;
  lastSeen = Date.now();

  saveUserLocal();
  await syncUserToFirebase();
  hideNameModal();
}

nameConfirm.addEventListener("click", handleNameConfirm);

nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleNameConfirm();
});
settingsBtn.addEventListener("click", () => {
  settingsPanel.classList.remove("hidden");
  updateProfileUI();
});

closeSettings.addEventListener("click", () => {
  settingsPanel.classList.add("hidden");
});

themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const theme = btn.getAttribute("data-theme");
    document.body.classList.remove("theme-ethos-green", "theme-ethos-blue", "theme-ethos-purple");
    document.body.classList.add(theme);

    if (currentUser) {
      const accent = getThemeAccent();
      currentAvatar = generateHexAvatarSvg(currentUser, accent);
      saveUserLocal();
      updateProfileUI();
    }
  });
});

async function sendMessage() {
  const text = chatInputEl.value.trim();
  if (!text) return;

  if (!currentUser) {
    showNameModal();
    return;
  }

  chatInputEl.value = "";

  await addDoc(collection(db, "messages"), {
    user: currentUser,
    text,
    createdAt: serverTimestamp(),
  });

  await updateUserStatsOnSend();
}

chatSendEl.addEventListener("click", sendMessage);

chatInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

clearChatBtn.addEventListener("click", () => {
  chatMessagesEl.innerHTML = "";
});

function renderMessage(docSnap) {
  const data = docSnap.data();
  const li = document.createElement("li");
  li.className = "chat-message";

  const user = data.user || "Unknown";
  const text = data.text || "";

  const ts = data.createdAt?.toDate ? data.createdAt.toDate().getTime() : null;
  const timeStr = ts ? formatTimestamp(ts) : "--:--";

  const avatarColor = getThemeAccent();
  const avatarSvg = generateHexAvatarSvg(user, avatarColor);

  li.innerHTML = `
    <div class="msg-avatar-wrap">
      <img src="${avatarSvg}" class="msg-avatar" alt="avatar" />
    </div>
    <div class="msg-body">
      <div class="msg-header">
        <span class="msg-user">${user}</span>
        <span class="msg-time">${timeStr}</span>
      </div>
      <div class="msg-text">${text}</div>
    </div>
  `;

  chatMessagesEl.appendChild(li);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function initMessagesListener() {
  const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));

  onSnapshot(
    q,
    (snapshot) => {
      chatStatusEl.textContent = "● Online";
      chatStatusEl.classList.remove("offline");
      chatStatusEl.classList.add("online");

      chatMessagesEl.innerHTML = "";

      snapshot.forEach((docSnap) => renderMessage(docSnap));
    },
    () => {
      chatStatusEl.textContent = "● Offline";
      chatStatusEl.classList.remove("online");
      chatStatusEl.classList.add("offline");
    }
  );
}
function initMatrixCanvas() {
  const canvas = document.getElementById("matrix-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener("resize", resize);

  const letters = "01";
  const fontSize = 14;
  const columns = Math.floor(canvas.width / fontSize);
  const drops = Array.from({ length: columns }, () => Math.random() * canvas.height);

  function draw() {
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const accent = getThemeAccent();
    ctx.fillStyle = accent;
    ctx.font = fontSize + "px monospace";

    for (let i = 0; i < drops.length; i++) {
      const text = letters.charAt(Math.floor(Math.random() * letters.length));
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      ctx.fillText(text, x, y);

      if (y > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }

      drops[i]++;
    }

    requestAnimationFrame(draw);
  }

  draw();
}

function init() {
  initMatrixCanvas();

  const loaded = loadUserLocal();

  if (loaded) {
    syncUserToFirebase();
    updateProfileUI();
  } else {
    showNameModal();
  }

  initMessagesListener();
}

document.addEventListener("DOMContentLoaded", init);

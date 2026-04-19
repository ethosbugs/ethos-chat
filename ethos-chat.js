// ethos-chat.js (type="module")

// --- Firebase imports (modular) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  onChildChanged,
  get,
  update,
  query,
  limitToFirst,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// --- CONFIGURA AIXÒ AMB LES TEVES CLAUS ---
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
// --- Inicialització Firebase ---
let app, db;
let isOnline = false;

try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  isOnline = true;
} catch (e) {
  console.error("Error inicialitzant Firebase:", e);
  isOnline = false;
}

// --- DOM refs ---
const chatMessagesEl = document.getElementById("chatMessages");
const chatInputEl = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSend");
const replyingToContainer = document.getElementById("replyingTo");
const chatStatusEl = document.getElementById("chatStatus");
const clearChatBtn = document.getElementById("clearChatBtn");
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettingsBtn = document.getElementById("closeSettings");

// --- Estat ---
let replyingTo = null;
let localUserName = null;

// --- Node del xat a Firebase ---
const chatRef = db ? ref(db, "ethos_chat") : null;

// --- Utils ---
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function sanitizeKey(k) {
  return String(k).replace(/[.#$[\]]/g, "_");
}

function getUserName() {
  if (localUserName) return localUserName;
  const stored = localStorage.getItem("ethos_chat_username");
  if (stored) {
    localUserName = stored;
    return localUserName;
  }
  const randomName = `User#${Math.floor(1000 + Math.random() * 9000)}`;
  localUserName = randomName;
  localStorage.setItem("ethos_chat_username", randomName);
  return localUserName;
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// --- Estat de connexió ---
if (chatStatusEl) {
  if (isOnline && db) {
    chatStatusEl.textContent = "● Online";
    chatStatusEl.classList.remove("offline");
    chatStatusEl.classList.add("online");
  } else {
    chatStatusEl.textContent = "● Offline";
    chatStatusEl.classList.remove("online");
    chatStatusEl.classList.add("offline");
  }
}

// --- Renderitzar un missatge ---
function buildMessageHTML(data, isSelf) {
  const hora = formatTime(data.hora || Date.now());

  let replyHtml = "";
  if (data.replyTo) {
    replyHtml = `
      <div class="msg-reply-node">
        <strong>${escapeHtml(data.replyTo.nombre)}:</strong>
        <div>${escapeHtml(data.replyTo.texto)}</div>
      </div>
    `;
  }

  let reactionsHtml = `<div class="reactions-container">`;
  if (data.reactions) {
    const myName = getUserName();
    for (const emoji in data.reactions) {
      const users = data.reactions[emoji] || [];
      const count = users.length;
      const reactedClass = users.includes(myName) ? "reacted" : "";
      reactionsHtml += `
        <div class="reaction ${reactedClass}" data-emoji="${emoji}">
          <span>${emoji}</span><span>${count}</span>
        </div>
      `;
    }
  }
  reactionsHtml += `</div>`;

  const emojiPickerHtml = `
    <div class="emoji-picker">
      <span data-emoji="👍">👍</span>
      <span data-emoji="❤️">❤️</span>
      <span data-emoji="😂">😂</span>
      <span data-emoji="😮">😮</span>
      <span data-emoji="😢">😢</span>
      <span data-emoji="🤔">🤔</span>
    </div>
  `;

  return `
    <div class="chat-message-inner">
      ${replyHtml}
      <div class="msg-header">
        <span class="msg-author">${escapeHtml(data.nombre || "Anon")}</span>
        <span class="msg-time">${hora}</span>
      </div>
      <div class="msg-text">${escapeHtml(data.texto || "")}</div>
      ${reactionsHtml}
      ${emojiPickerHtml}
    </div>
  `;
}

// --- Afegir listeners a un <li> ---
function attachMessageListeners(li, messageId, data) {
  const myName = getUserName();

  // Click → reply
  li.addEventListener("click", () => {
    replyingTo = {
      id: messageId,
      nombre: data.nombre,
      texto: data.texto
    };
    renderReplyingTo();
    chatInputEl?.focus();
  });

  // Reaccions
  li.querySelectorAll(".reaction, .emoji-picker span").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      const emoji = el.dataset.emoji;
      if (!emoji) return;
      toggleReaction(messageId, emoji);
    });
  });
}

// --- Renderitzar "replying to" ---
function renderReplyingTo() {
  if (!replyingToContainer) return;
  if (!replyingTo) {
    replyingToContainer.innerHTML = "";
    replyingToContainer.classList.add("hidden");
    return;
  }

  replyingToContainer.innerHTML = `
    <p>Responent a <strong>${escapeHtml(replyingTo.nombre)}</strong></p>
    <span>${escapeHtml(replyingTo.texto)}</span>
    <span class="cancel-reply" title="Cancel·lar resposta">&times;</span>
  `;
  replyingToContainer.classList.remove("hidden");

  const cancelEl = replyingToContainer.querySelector(".cancel-reply");
  if (cancelEl) {
    cancelEl.addEventListener("click", () => {
      replyingTo = null;
      renderReplyingTo();
    });
  }
}

// --- Reaccions ---
async function toggleReaction(messageId, emoji) {
  if (!db || !chatRef) return;
  const myName = getUserName();
  const reactionRef = ref(db, `ethos_chat/${messageId}/reactions/${emoji}`);
  const snap = await get(reactionRef);
  let users = snap.val() || [];

  if (users.includes(myName)) {
    users = users.filter(u => u !== myName);
  } else {
    users.push(myName);
  }

  const updates = {};
  updates[`/ethos_chat/${messageId}/reactions/${emoji}`] = users.length ? users : null;
  await update(ref(db), updates);
}

// --- Enviar missatge ---
async function enviarMissatge() {
  if (!db || !chatRef || !chatInputEl) return;
  const text = chatInputEl.value.trim();
  if (!text) return;

  const nombre = getUserName();
  const messageData = {
    nombre,
    texto: text,
    hora: Date.now()
  };

  if (replyingTo) {
    messageData.replyTo = {
      id: replyingTo.id,
      nombre: replyingTo.nombre,
      texto: replyingTo.texto
    };
  }

  await push(chatRef, messageData);
  chatInputEl.value = "";
  replyingTo = null;
  renderReplyingTo();
  pruneOldMessages();
}

// --- Limitar a 100 missatges ---
async function pruneOldMessages() {
  if (!db || !chatRef) return;
  const snap = await get(chatRef);
  const total = snap.size;
  if (total <= 100) return;

  const toDeleteSnap = await get(query(chatRef, limitToFirst(total - 100)));
  toDeleteSnap.forEach(child => {
    remove(ref(db, `ethos_chat/${child.key}`));
  });
}

// --- Subscripció: missatges nous ---
if (db && chatRef && chatMessagesEl) {
  onChildAdded(chatRef, snap => {
    const data = snap.val();
    const id = snap.key;
    const myName = getUserName();
    const isSelf = data.nombre === myName;

    const li = document.createElement("li");
    li.classList.add("chat-message");
    li.classList.add(isSelf ? "self" : "other");
    li.id = id;
    li.innerHTML = buildMessageHTML(data, isSelf);

    attachMessageListeners(li, id, data);

    chatMessagesEl.appendChild(li);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  });

  // Actualitzacions (reaccions, etc.)
  onChildChanged(chatRef, snap => {
    const data = snap.val();
    const id = snap.key;
    const li = document.getElementById(id);
    if (!li) return;

    const myName = getUserName();
    const isSelf = data.nombre === myName;

    const isAtBottom =
      chatMessagesEl.scrollHeight - chatMessagesEl.clientHeight <=
      chatMessagesEl.scrollTop + 2;

    li.innerHTML = buildMessageHTML(data, isSelf);
    attachMessageListeners(li, id, data);

    if (isAtBottom) {
      chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }
  });
}

// --- Events d'input ---
if (chatSendBtn) {
  chatSendBtn.addEventListener("click", enviarMissatge);
}
if (chatInputEl) {
  chatInputEl.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      enviarMissatge();
    }
  });
}

// --- Clear local (només DOM, no Firebase) ---
if (clearChatBtn && chatMessagesEl) {
  clearChatBtn.addEventListener("click", () => {
    chatMessagesEl.innerHTML = "";
  });
}

// --- Settings / temes ---
if (settingsBtn && settingsPanel && closeSettingsBtn) {
  settingsBtn.addEventListener("click", () => {
    settingsPanel.classList.remove("hidden");
  });
  closeSettingsBtn.addEventListener("click", () => {
    settingsPanel.classList.add("hidden");
  });

  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.theme;
      if (!theme) return;
      document.body.classList.remove("theme-ethos-green", "theme-ethos-blue", "theme-ethos-purple");
      document.body.classList.add(theme);
    });
  });
}

// --- Pluja Matrix (M1, velocitat mitjana) ---
const canvas = document.getElementById("matrix-canvas");
const ctx = canvas.getContext("2d");
let matrixWidth, matrixHeight, fontSize, columns, drops;

function initMatrix() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  matrixWidth = canvas.width;
  matrixHeight = canvas.height;
  fontSize = 16;
  columns = Math.floor(matrixWidth / fontSize);
  drops = Array(columns).fill(0);
}

function drawMatrix() {
  const style = getComputedStyle(document.body);
  const color = style.getPropertyValue("--matrix-color") || "#00ff88";

  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fillRect(0, 0, matrixWidth, matrixHeight);

  ctx.fillStyle = color.trim();
  ctx.font = fontSize + "px monospace";

  for (let i = 0; i < drops.length; i++) {
    const text = String.fromCharCode(0x30a0 + Math.random() * 96);
    const x = i * fontSize;
    const y = drops[i] * fontSize;

    ctx.globalAlpha = 0.12; // opacitat baixa
    ctx.fillText(text, x, y);

    if (y > matrixHeight && Math.random() > 0.975) {
      drops[i] = 0;
    } else {
      drops[i] += 1; // velocitat mitjana
    }
  }

  requestAnimationFrame(drawMatrix);
}

window.addEventListener("resize", initMatrix);

initMatrix();
requestAnimationFrame(drawMatrix);

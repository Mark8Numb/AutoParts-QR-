// ==================== БАЗА ДЕТАЛЕЙ ====================
const partsDB = {
  "BRAKE-PAD-TOYOTA": { name: "Колодки тормозные передние", compatible: "Toyota Camry/RAV4", sku: "BPF-8821", stock: "✅ в наличии" },
  "OIL-FILTER-VW": { name: "Фильтр масляный", compatible: "VW Golf/Passat", sku: "MANN W712/92", stock: "📦 15 шт" },
  "SPARK-BOSCH": { name: "Свечи зажигания Bosch", compatible: "BMW/Mini", sku: "FR7KPP33+", stock: "🔥 48 шт" },
  "ALTERNATOR-MB": { name: "Генератор 150A", compatible: "Mercedes W204", sku: "GEN-150-MB", stock: "⏳ под заказ" }
};

// ==================== ДАННЫЕ ====================
let notes = [];           // { id, text, completed, hidden, createdAt }
let searchHistory = [];   // { qrCode, partName, timestamp }
let currentSort = "date_desc";

// ==================== СОХРАНЕНИЕ / ЗАГРУЗКА ====================
function saveAll() {
  localStorage.setItem("autoqr_notes", JSON.stringify(notes));
  localStorage.setItem("autoqr_history", JSON.stringify(searchHistory));
  localStorage.setItem("autoqr_sort", currentSort);
}

function loadAll() {
  const savedNotes = localStorage.getItem("autoqr_notes");
  if (savedNotes) notes = JSON.parse(savedNotes);
  else notes = [];

  const savedHistory = localStorage.getItem("autoqr_history");
  if (savedHistory) searchHistory = JSON.parse(savedHistory);
  else searchHistory = [];

  const savedSort = localStorage.getItem("autoqr_sort");
  if (savedSort) currentSort = savedSort;
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) sortSelect.value = currentSort;
}

// ==================== ДОБАВЛЕНИЕ ЗАМЕТКИ (ОДНА ЗАМЕТКА = ОДИН ВЫЗОВ) ====================
function addNote(text, hidden = false) {
  if (!text || !text.trim()) return;
  
  // Проверка на дубликат в течение 1 секунды (защита от случайных дублей)
  const lastNote = notes[0];
  if (lastNote && lastNote.text === text.trim() && (Date.now() - lastNote.id) < 1000) {
    console.log("Дубль заблокирован");
    return;
  }
  
  notes.unshift({
    id: Date.now(),
    text: text.trim(),
    completed: false,
    hidden: hidden,
    createdAt: new Date().toISOString()
  });
  saveAll();
  renderNotes();
  if (isJournalOpen()) renderFullNotes();
}

// ==================== ОТРИСОВКА ГЛАВНОГО ЭКРАНА ====================
function renderNotes() {
  const container = document.getElementById("notesList");
  const visibleNotes = notes.filter(n => !n.hidden);
  if (visibleNotes.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:#6c7a9e;">📭 Нет заметок</div>`;
    return;
  }
  container.innerHTML = visibleNotes.map(note => `
    <div class="note-item ${note.completed ? 'completed' : ''}" data-id="${note.id}">
      <div class="note-text">${escapeHtml(note.text)}</div>
      <button class="check-btn ${note.completed ? 'completed' : ''}" data-id="${note.id}">${note.completed ? '✓' : '○'}</button>
    </div>
  `).join('');
  
  document.querySelectorAll('.check-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(btn.dataset.id);
      const note = notes.find(n => n.id === id);
      if (note) { 
        note.completed = !note.completed; 
        saveAll(); 
        renderNotes(); 
        if (isJournalOpen()) renderFullNotes(); 
      }
      e.stopPropagation();
    });
  });
}

// ==================== ЖУРНАЛ ВОДИТЕЛЯ ====================
function renderFullNotes() {
  let filtered = [...notes];
  if (currentSort === "date_desc") filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  else if (currentSort === "date_asc") filtered.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  else if (currentSort === "text_asc") filtered.sort((a,b) => a.text.localeCompare(b.text));
  else if (currentSort === "text_desc") filtered.sort((a,b) => b.text.localeCompare(a.text));
  else if (currentSort === "completed_first") filtered.sort((a,b) => b.completed - a.completed);
  else if (currentSort === "pending_first") filtered.sort((a,b) => a.completed - b.completed);

  const container = document.getElementById("fullNotesList");
  if (filtered.length === 0) { 
    container.innerHTML = "<div style='padding:20px;text-align:center'>Нет заметок</div>"; 
    return; 
  }
  
  container.innerHTML = filtered.map(note => `
    <div class="journal-item" style="opacity: ${note.hidden ? 0.6 : 1}">
      <div><strong>${escapeHtml(note.text)}</strong> ${note.hidden ? "(скрыта)" : ""}</div>
      <div style="font-size:11px; color:#8e9bb5;">${new Date(note.createdAt).toLocaleString()}</div>
      <div class="flex-row" style="margin-top:8px;">
        <button class="small-btn complete-journal" data-id="${note.id}">${note.completed ? "✅ Выполнена" : "◻️ Выполнить"}</button>
        <button class="small-btn hide-journal" data-id="${note.id}">${note.hidden ? "👁️ Показать" : "🙈 Скрыть"}</button>
        <button class="small-btn danger delete-journal" data-id="${note.id}">🗑️ Удалить</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.complete-journal').forEach(btn => {
    btn.addEventListener('click', (e) => { 
      const id = parseInt(btn.dataset.id); 
      const n = notes.find(n=>n.id===id); 
      if(n){ n.completed = !n.completed; saveAll(); renderNotes(); renderFullNotes(); } 
    });
  });
  document.querySelectorAll('.hide-journal').forEach(btn => {
    btn.addEventListener('click', (e) => { 
      const id = parseInt(btn.dataset.id); 
      const n = notes.find(n=>n.id===id); 
      if(n){ n.hidden = !n.hidden; saveAll(); renderNotes(); renderFullNotes(); } 
    });
  });
  document.querySelectorAll('.delete-journal').forEach(btn => {
    btn.addEventListener('click', (e) => { 
      const id = parseInt(btn.dataset.id); 
      notes = notes.filter(n=>n.id!==id); 
      saveAll(); 
      renderNotes(); 
      renderFullNotes(); 
    });
  });
}

function renderHistory() {
  const container = document.getElementById("searchHistoryList");
  if (!container) return;
  if (searchHistory.length === 0) { 
    container.innerHTML = "<div style='padding:8px; color:#8e9bb5'>История пуста</div>"; 
    return; 
  }
  container.innerHTML = searchHistory.slice().reverse().map(h => `
    <div class="history-item">
      🔍 <strong>${escapeHtml(h.qrCode)}</strong> → ${escapeHtml(h.partName)}<br>
      <span style="font-size:10px;">${new Date(h.timestamp).toLocaleString()}</span>
    </div>
  `).join('');
}

function addToHistory(qr, partName) {
  searchHistory.unshift({ qrCode: qr, partName: partName, timestamp: new Date().toISOString() });
  if (searchHistory.length > 50) searchHistory.pop();
  saveAll();
  renderHistory();
}

// ==================== QR И ДЕТАЛИ ====================
function showPartInfo(qrData) {
  const part = partsDB[qrData];
  const infoDiv = document.getElementById("partInfo");
  if (part) {
    infoDiv.innerHTML = `<div class="detail-card"><strong>🔩 ${part.name}</strong><br>📌 ${part.sku}<br>🚗 ${part.compatible}<br>📦 ${part.stock}<br><span style="font-size:11px;">QR: ${qrData}</span></div>`;
    addToHistory(qrData, part.name);
  } else {
    infoDiv.innerHTML = `<div class="detail-card" style="border-left-color:#d43f34;">❌ Деталь не найдена<br>Код: ${qrData}</div>`;
    addToHistory(qrData, "Неизвестная деталь");
  }
}

async function scanQR() {
  if (!('BarcodeDetector' in window)) {
    const manual = prompt("Введите код с QR (BarcodeDetector не поддерживается):", "BRAKE-PAD-TOYOTA");
    if (manual) showPartInfo(manual);
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const video = document.createElement('video');
    video.srcObject = stream;
    video.setAttribute("playsinline", "");
    await video.play();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    let scanning = true;
    const interval = setInterval(async () => {
      if (!scanning) return;
      if (video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const barcodes = await detector.detect(canvas);
        if (barcodes.length > 0) {
          clearInterval(interval);
          scanning = false;
          stream.getTracks().forEach(t => t.stop());
          video.remove();
          showPartInfo(barcodes[0].rawValue);
        }
      }
    }, 300);
    setTimeout(() => {
      if (scanning) {
        clearInterval(interval);
        scanning = false;
        stream.getTracks().forEach(t => t.stop());
        video.remove();
        document.getElementById("partInfo").innerHTML = `<div class="detail-card">⏱️ Время вышло, QR не найден</div>`;
      }
    }, 15000);
  } catch(e) {
    document.getElementById("partInfo").innerHTML = `<div class="detail-card">⚠️ Ошибка камеры: ${e.message}</div>`;
  }
}

function demoPart() {
  const keys = Object.keys(partsDB);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  showPartInfo(randomKey);
}

// ==================== ГОЛОС (ИСПРАВЛЕН — ОДНА ЗАМЕТКА ЗА РАЗ) ====================
let recognition = null;
let isRecording = false;
let isProcessingVoice = false; // блокируем повторный вызов

function initVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    const btn = document.getElementById("startVoiceBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "❌ Голос не поддерживается";
    }
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = "ru-RU";
  recognition.continuous = false;      // одна фраза = одна заметка
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  
  recognition.onstart = () => {
    isRecording = true;
    isProcessingVoice = false;
    const btn = document.getElementById("startVoiceBtn");
    if (btn) {
      btn.classList.add("recording");
      btn.textContent = "🎙️ Говорите...";
    }
  };
  
  recognition.onend = () => {
    isRecording = false;
    const btn = document.getElementById("startVoiceBtn");
    if (btn) {
      btn.classList.remove("recording");
      btn.textContent = "🎤 Записать голосом → текст";
    }
  };
  
  recognition.onerror = (event) => {
    console.error("Speech error:", event.error);
    isRecording = false;
    isProcessingVoice = false;
    const btn = document.getElementById("startVoiceBtn");
    if (btn) {
      btn.classList.remove("recording");
      btn.textContent = "🎤 Ошибка, попробуйте снова";
      setTimeout(() => {
        if (btn.textContent === "🎤 Ошибка, попробуйте снова") {
          btn.textContent = "🎤 Записать голосом → текст";
        }
      }, 1500);
    }
  };
  
  recognition.onresult = (event) => {
    if (isProcessingVoice) return; // защита от дублей
    isProcessingVoice = true;
    
    const lastResult = event.results[event.results.length - 1];
    if (lastResult && lastResult[0]) {
      const text = lastResult[0].transcript;
      if (text && text.trim()) {
        addNote(text);
      }
    }
    
    // Сбрасываем блокировку после небольшой задержки
    setTimeout(() => {
      isProcessingVoice = false;
    }, 500);
  };
}

function startVoice() {
  if (!recognition) {
    alert("Голосовой ввод недоступен в этом браузере");
    return;
  }
  if (isRecording) {
    recognition.stop();
  } else {
    try {
      recognition.start();
    } catch(e) {
      console.error("Ошибка запуска голоса:", e);
      alert("Не удалось запустить микрофон. Проверьте разрешения.");
    }
  }
}

// ==================== УДАЛЕНИЕ, СБРОС, ЭКСПОРТ ====================
function deleteByWord() {
  const word = document.getElementById("deleteWordInput").value.trim();
  if (!word) return alert("Введите слово для удаления");
  notes = notes.filter(n => !n.text.toLowerCase().includes(word.toLowerCase()));
  saveAll();
  renderNotes();
  if (isJournalOpen()) renderFullNotes();
}

function fullReset() {
  if (confirm("⚠️ Удалить ВСЕ заметки и историю поисков? Отменить нельзя.")) {
    notes = [];
    searchHistory = [];
    saveAll();
    renderNotes();
    if (isJournalOpen()) { renderFullNotes(); renderHistory(); }
    document.getElementById("partInfo").innerHTML = "";
  }
}

function exportData() {
  const data = { exportDate: new Date().toISOString(), notes, searchHistory, sort: currentSort };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().slice(0,10);
  a.download = `Журнал_водителя_${today}.json`;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}

function clearHistoryOnly() {
  searchHistory = [];
  saveAll();
  renderHistory();
}

// ==================== МОДАЛКА ====================
function isJournalOpen() {
  const modal = document.getElementById("journalModal");
  return modal && modal.style.display === "flex";
}

function openJournal() {
  renderFullNotes();
  renderHistory();
  document.getElementById("journalModal").style.display = "flex";
}

function closeJournal() {
  document.getElementById("journalModal").style.display = "none";
}

// ==================== СОРТИРОВКА ====================
function onSortChange(e) {
  currentSort = e.target.value;
  saveAll();
  if (isJournalOpen()) renderFullNotes();
}

// ==================== HTML-ESCAPE ====================
function escapeHtml(str) {
  return String(str).replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// ==================== ЗАПУСК (БЕЗ АВТО-ЗАМЕТОК) ====================
document.addEventListener("DOMContentLoaded", () => {
  loadAll();
  renderNotes();
  initVoice();
  
  // Кнопки
  document.getElementById("scanQrBtn").addEventListener("click", scanQR);
  document.getElementById("demoQrBtn").addEventListener("click", demoPart);
  document.getElementById("startVoiceBtn").addEventListener("click", startVoice);
  document.getElementById("openJournalBtn").addEventListener("click", openJournal);
  document.querySelector(".close-modal").addEventListener("click", closeJournal);
  document.getElementById("deleteByWordBtn").addEventListener("click", deleteByWord);
  document.getElementById("fullResetBtn").addEventListener("click", fullReset);
  document.getElementById("exportDataBtn").addEventListener("click", exportData);
  document.getElementById("clearHistoryBtn").addEventListener("click", clearHistoryOnly);
  document.getElementById("sortSelect").addEventListener("change", onSortChange);
  
  window.addEventListener("click", (e) => { 
    if (e.target === document.getElementById("journalModal")) closeJournal(); 
  });
  
  // НЕТ АВТОМАТИЧЕСКИХ ДЕМО-ЗАМЕТОК! Только если совсем пусто — одна подсказка
  if (notes.length === 0) {
    setTimeout(() => {
      if (notes.length === 0) {
        addNote("🔧 Нажмите микрофон, чтобы создать голосовую заметку");
      }
    }, 500);
  }
});

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(e => console.log("SW error", e));
}

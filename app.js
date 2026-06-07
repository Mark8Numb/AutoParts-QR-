// Моковая база автодеталей по ключам QR
const partsDatabase = {
  "BRAKE-PAD-FRONT": {
    name: "Колодки тормозные передние",
    compatible: "Toyota Camry, RAV4, Corolla",
    sku: "BPF-8821",
    stock: "✅ в наличии",
  },
  "OIL-FILTER-101": {
    name: "Фильтр масляный",
    compatible: "VW Golf, Passat, Audi A3",
    sku: "MANN W712/92",
    stock: "📦 15 шт",
  },
  "SPARK-PLUG-BOSCH": {
    name: "Свечи зажигания Bosch",
    compatible: "BMW 3/5 серии, Mini Cooper",
    sku: "FR7KPP33+",
    stock: "🔥 48 шт",
  },
  "ALTERNATOR-A08": {
    name: "Генератор 150A",
    compatible: "Mercedes W204, W212",
    sku: "GEN-150-MB",
    stock: "⏳ под заказ 2 дня",
  },
};

// Хранилище заметок
let notes = [];

// DOM элементы
const partInfoDiv = document.getElementById("partInfo");
const notesListDiv = document.getElementById("notesList");
const scanBtn = document.getElementById("scanQrBtn");
const demoBtn = document.getElementById("demoQrBtn");
const voiceBtn = document.getElementById("startVoiceBtn");

// ---- Отображение заметок ----
function renderNotes() {
  if (!notesListDiv) return;
  if (notes.length === 0) {
    notesListDiv.innerHTML = `<div style="color:#6c7a9e; text-align:center; padding:20px;">📭 Нет заметок. Запишите голосовую</div>`;
    return;
  }

  notesListDiv.innerHTML = notes.map((note, idx) => `
    <div class="note-item ${note.completed ? 'completed' : ''}" data-idx="${idx}">
      <div class="note-text">${escapeHtml(note.text)}</div>
      <button class="check-btn ${note.completed ? 'completed' : ''}" data-idx="${idx}">
        ${note.completed ? '✓' : '○'}
      </button>
    </div>
  `).join('');

  // Вешаем события на кнопки
  document.querySelectorAll('.check-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.dataset.idx);
      if (!isNaN(idx) && notes[idx]) {
        notes[idx].completed = !notes[idx].completed;
        saveNotesToLocal();
        renderNotes();
      }
      e.stopPropagation();
    });
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function saveNotesToLocal() {
  localStorage.setItem('voice_notes_auto', JSON.stringify(notes));
}

function loadNotes() {
  const saved = localStorage.getItem('voice_notes_auto');
  if (saved) {
    try {
      notes = JSON.parse(saved);
    } catch(e) { notes = []; }
  } else {
    notes = [];
  }
  renderNotes();
}

// Добавить заметку из текста
function addNote(text) {
  if (!text.trim()) return;
  notes.unshift({
    id: Date.now(),
    text: text.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
  });
  saveNotesToLocal();
  renderNotes();
}

// ---- Отображение информации о детали по QR-коду ----
function showPartInfo(qrCodeData) {
  const part = partsDatabase[qrCodeData];
  if (part) {
    partInfoDiv.innerHTML = `
      <div class="detail-card">
        <strong>🔩 ${part.name}</strong><br>
        📌 Артикул: ${part.sku}<br>
        🚗 Совместимость: ${part.compatible}<br>
        📦 Наличие: ${part.stock}<br>
        <span style="font-size:12px; opacity:0.7;">🔎 QR: ${qrCodeData}</span>
      </div>
    `;
  } else {
    partInfoDiv.innerHTML = `
      <div class="detail-card" style="border-left-color: #d43f34;">
        ⚠️ Деталь не найдена<br>
        <span style="font-size:13px;">Код: ${qrCodeData}<br>Проверьте QR или добавьте вручную</span>
      </div>
    `;
  }
}

// --- Имитация сканера QR (в PWA реальный сканер через библиотеку, но для удобства используем prompt/input)
// Для полноты реализуем через браузерный сканер (BarcodeDetector API, если доступен)
async function scanQRCode() {
  // Попробуем современный BarcodeDetector (поддерживается в Chrome, Edge)
  if ('BarcodeDetector' in window) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // создаём canvas для кадров
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const detector = new BarcodeDetector({ formats: ['qr_code'] });

      let scanning = true;
      const scanInterval = setInterval(async () => {
        if (!scanning) return;
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          try {
            const barcodes = await detector.detect(imageData);
            if (barcodes.length > 0) {
              const qrValue = barcodes[0].rawValue;
              clearInterval(scanInterval);
              scanning = false;
              stream.getTracks().forEach(track => track.stop());
              video.remove();
              showPartInfo(qrValue);
            }
          } catch(e) {}
        }
      }, 300);

      // остановка через 15 секунд если не нашли
      setTimeout(() => {
        if (scanning) {
          clearInterval(scanInterval);
          scanning = false;
          stream.getTracks().forEach(track => track.stop());
          video.remove();
          partInfoDiv.innerHTML = `<div class="detail-card" style="border-left-color:#d43f34;">❌ QR не найден. Попробуйте демо-кнопку.</div>`;
        }
      }, 15000);

    } catch(err) {
      partInfoDiv.innerHTML = `<div class="detail-card">⚠️ Нет доступа к камере. Используйте демо-режим.</div>`;
    }
  } else {
    // fallback: простой ввод текста QR
    const manualQr = prompt("Введите код с QR-метки (или используйте демо):", "BRAKE-PAD-FRONT");
    if (manualQr) showPartInfo(manualQr);
  }
}

// Демо-режим: показать популярные детали
function demoPart() {
  const demoKey = Object.keys(partsDatabase)[Math.floor(Math.random() * Object.keys(partsDatabase).length)];
  showPartInfo(demoKey);
}

// --- ГОЛОСОВЫЕ ЗАМЕТКИ (SpeechRecognition) ---
let recognition = null;
let isRecording = false;

function initSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceBtn.disabled = true;
    voiceBtn.textContent = "🎤 Голос не поддерживается";
    voiceBtn.style.opacity = "0.5";
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = "ru-RU";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isRecording = true;
    voiceBtn.classList.add("recording");
    voiceBtn.textContent = "🎙️ Запись... скажите текст";
  };
  recognition.onend = () => {
    isRecording = false;
    voiceBtn.classList.remove("recording");
    voiceBtn.textContent = "🎤 Записать заметку (голос → текст)";
  };
  recognition.onerror = (event) => {
    console.error("Ошибка распознавания", event.error);
    isRecording = false;
    voiceBtn.classList.remove("recording");
    voiceBtn.textContent = "🎤 Повторить запись";
    setTimeout(() => {
      voiceBtn.textContent = "🎤 Записать заметку (голос → текст)";
    }, 1500);
  };
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (transcript && transcript.trim()) {
      addNote(transcript);
    } else {
      addNote("(неразборчиво)");
    }
  };
}

function startVoiceNote() {
  if (!recognition) {
    alert("Ваш браузер не поддерживает голосовой ввод (SpeechRecognition)");
    return;
  }
  if (isRecording) {
    recognition.stop();
  } else {
    try {
      recognition.start();
    } catch(e) {
      alert("Микрофон недоступен, проверьте разрешения");
    }
  }
}

// ---- Инициализация приложения и PWA ----
document.addEventListener("DOMContentLoaded", () => {
  loadNotes();
  initSpeech();

  scanBtn.addEventListener("click", scanQRCode);
  demoBtn.addEventListener("click", demoPart);
  voiceBtn.addEventListener("click", startVoiceNote);

  // Предзаполним демо-заметкой для примера, если пусто
  if (notes.length === 0) {
    setTimeout(() => {
      addNote("🔧 Заменить тормозные колодки (по QR-коду)");
    }, 500);
  }
});

// Регистрация Service Worker для PWA (оффлайн-кеш)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    console.log('SW registered', reg);
  }).catch(err => console.log('SW error', err));
}

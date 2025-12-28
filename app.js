const LS_KEY = "my_vocab_cards_v1";

let cards = [];
let idx = 0;
let flipped = false;

const elStats = document.getElementById("stats");
const elFront = document.getElementById("frontText");
const elBack = document.getElementById("backText");
const elBackLabel = document.getElementById("backLabel");
const elMode = document.getElementById("modeLabel");

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(cards));
  render();
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    cards = raw ? JSON.parse(raw) : [];
  } catch {
    cards = [];
  }
  idx = 0;
  flipped = false;
  render();
}

function render() {
  elStats.textContent = `${cards.length} kart • ${cards.length ? (idx+1) : 0}/${cards.length}`;
  if (!cards.length) {
    elFront.textContent = "CSV içe aktar";
    elBack.textContent = "";
    elBack.style.display = "none";
    elBackLabel.style.display = "none";
    elMode.textContent = "Ön yüz: İngilizce";
    return;
  }
  const c = cards[idx];
  elFront.textContent = c.en;
  elMode.textContent = "Ön yüz: İngilizce";
  if (flipped) {
    elBack.textContent = c.tr;
    elBack.style.display = "block";
    elBackLabel.style.display = "block";
  } else {
    elBack.textContent = "";
    elBack.style.display = "none";
    elBackLabel.style.display = "none";
  }
}

function next() {
  if (!cards.length) return;
  flipped = false;
  idx = (idx + 1) % cards.length;
  render();
}

function prev() {
  if (!cards.length) return;
  flipped = false;
  idx = (idx - 1 + cards.length) % cards.length;
  render();
}

function flip() {
  if (!cards.length) return;
  flipped = !flipped;
  render();
}

function shuffle() {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  idx = 0;
  flipped = false;
  save();
}

function resetAll() {
  cards = [];
  idx = 0;
  flipped = false;
  localStorage.removeItem(LS_KEY);
  render();
}

// CSV parser (comma or tab). Supports quoted fields.
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  const out = [];
  for (const line of lines) {
    const row = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' ) {
        if (inQ && line[i+1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (!inQ && (ch === ',' || ch === '\t' || ch === ';')) {
        row.push(cur.trim()); cur = "";
      } else {
        cur += ch;
      }
    }
    row.push(cur.trim());
    if (row.length >= 2) {
      const en = row[0];
      const tr = row[1];
      if (en && tr) out.push({ en, tr });
    }
  }
  return out;
}

document.getElementById("fileInput").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const imported = parseCSV(text);
  // merge unique by English text
  const map = new Map(cards.map(c => [c.en.toLowerCase(), c.tr]));
  for (const c of imported) map.set(c.en.toLowerCase(), c.tr);
  cards = Array.from(map.entries()).map(([enLower, tr]) => {
    // keep original casing from imported if exists
    const original = imported.find(x => x.en.toLowerCase() === enLower)?.en
      ?? cards.find(x => x.en.toLowerCase() === enLower)?.en
      ?? enLower;
    return { en: original, tr };
  });
  idx = 0; flipped = false;
  save();
  e.target.value = "";
});

document.getElementById("btnNext").addEventListener("click", next);
document.getElementById("btnPrev").addEventListener("click", prev);
document.getElementById("btnFlip").addEventListener("click", flip);
document.getElementById("btnShuffle").addEventListener("click", shuffle);
document.getElementById("btnReset").addEventListener("click", resetAll);

document.getElementById("btnExport").addEventListener("click", () => {
  const rows = cards.map(c => `${c.en}\t${c.tr}`).join("\n");
  const blob = new Blob([rows], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "my-vocab-export.txt";
  a.click();
  URL.revokeObjectURL(url);
});

// PWA offline
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

load();

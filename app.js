const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const el = {
  app: document.getElementById("app"),
  noteList: document.getElementById("noteList"),
  searchInput: document.getElementById("searchInput"),
  newNoteBtn: document.getElementById("newNoteBtn"),
  emptyNewBtn: document.getElementById("emptyNewBtn"),
  backBtn: document.getElementById("backBtn"),
  deleteBtn: document.getElementById("deleteBtn"),
  titleInput: document.getElementById("titleInput"),
  contentInput: document.getElementById("contentInput"),
  editorMeta: document.getElementById("editorMeta"),
  statusLine: document.getElementById("statusLine"),
  toast: document.getElementById("toast"),
};

let notes = [];        // all notes from the server, newest edited first
let activeId = null;   // id of the note currently open in the editor
let saveTimer = null;

// ---------- Helpers ----------

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.toast.classList.remove("show"), 2200);
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function firstLine(text) {
  return (text || "").split("\n").find(line => line.trim().length > 0) || "No additional text";
}

function getActiveNote() {
  return notes.find(n => n.id === activeId) || null;
}

// ---------- Rendering ----------

function renderList() {
  const query = el.searchInput.value.trim().toLowerCase();
  const filtered = query
    ? notes.filter(n =>
        (n.title || "").toLowerCase().includes(query) ||
        (n.content || "").toLowerCase().includes(query))
    : notes;

  el.noteList.innerHTML = "";

  if (filtered.length === 0) {
    const msg = document.createElement("div");
    msg.className = "note-list-empty";
    msg.textContent = query ? "No notes match your search." : "No notes yet. Tap + to write one.";
    el.noteList.appendChild(msg);
    return;
  }

  for (const note of filtered) {
    const item = document.createElement("div");
    item.className = "note-item" + (note.id === activeId ? " active" : "");
    item.dataset.id = note.id;

    const title = document.createElement("p");
    title.className = "note-item-title";
    title.textContent = note.title || "Untitled";

    const preview = document.createElement("p");
    preview.className = "note-item-preview";
    preview.textContent = firstLine(note.content);

    const date = document.createElement("span");
    date.className = "note-item-date";
    date.textContent = formatDate(note.updated_at);

    item.append(title, preview, date);
    item.addEventListener("click", () => openNote(note.id));
    el.noteList.appendChild(item);
  }
}

function renderEditor() {
  const note = getActiveNote();

  if (!note) {
    el.app.classList.add("no-note");
    return;
  }

  el.app.classList.remove("no-note");
  el.titleInput.value = note.title === "Untitled" ? "" : note.title;
  el.contentInput.value = note.content || "";
  el.editorMeta.textContent = "Edited " + formatDate(note.updated_at);
}

function setStatus(text) {
  el.statusLine.textContent = text;
}

// ---------- Data operations ----------

async function loadNotes() {
  setStatus("Loading…");
  const { data, error } = await supabaseClient
    .from("notes")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    setStatus("Couldn't connect to Supabase");
    showToast("Couldn't load notes — check config.js and your table setup");
    return;
  }

  notes = data;
  setStatus(notes.length + (notes.length === 1 ? " note" : " notes"));
  renderList();
  renderEditor();
}

async function createNote() {
  const { data, error } = await supabaseClient
    .from("notes")
    .insert({ title: "Untitled", content: "" })
    .select()
    .single();

  if (error) {
    console.error(error);
    showToast("Couldn't create note");
    return;
  }

  notes.unshift(data);
  activeId = data.id;
  setStatus(notes.length + (notes.length === 1 ? " note" : " notes"));
  renderList();
  renderEditor();
  enterMobileEditing();
  el.titleInput.focus();
}

function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveActiveNote, 500);
}

async function saveActiveNote() {
  const note = getActiveNote();
  if (!note) return;

  const title = el.titleInput.value.trim() || "Untitled";
  const content = el.contentInput.value;

  const { data, error } = await supabaseClient
    .from("notes")
    .update({ title, content })
    .eq("id", note.id)
    .select()
    .single();

  if (error) {
    console.error(error);
    showToast("Couldn't save — check your connection");
    return;
  }

  // Update local copy and move it to the top (most recently edited)
  notes = notes.filter(n => n.id !== note.id);
  notes.unshift(data);
  renderList();
  el.editorMeta.textContent = "Edited " + formatDate(data.updated_at);
}

async function deleteActiveNote() {
  const note = getActiveNote();
  if (!note) return;

  const ok = confirm('Delete "' + (note.title || "Untitled") + '"? This can\'t be undone.');
  if (!ok) return;

  const { error } = await supabaseClient.from("notes").delete().eq("id", note.id);

  if (error) {
    console.error(error);
    showToast("Couldn't delete note");
    return;
  }

  notes = notes.filter(n => n.id !== note.id);
  activeId = notes.length > 0 ? notes[0].id : null;
  setStatus(notes.length + (notes.length === 1 ? " note" : " notes"));
  renderList();
  renderEditor();
  showToast("Note deleted");
  if (!activeId) exitMobileEditing();
}

function openNote(id) {
  // Save whatever's pending on the currently open note before switching
  clearTimeout(saveTimer);
  if (activeId) saveActiveNote();

  activeId = id;
  renderList();
  renderEditor();
  enterMobileEditing();
}

// ---------- Mobile view switching ----------

function enterMobileEditing() {
  el.app.classList.add("mobile-editing");
}
function exitMobileEditing() {
  el.app.classList.remove("mobile-editing");
}

// ---------- Wiring ----------

el.newNoteBtn.addEventListener("click", createNote);
el.emptyNewBtn.addEventListener("click", createNote);
el.deleteBtn.addEventListener("click", deleteActiveNote);
el.titleInput.addEventListener("input", queueSave);
el.contentInput.addEventListener("input", queueSave);
el.searchInput.addEventListener("input", renderList);
el.backBtn.addEventListener("click", () => {
  clearTimeout(saveTimer);
  if (activeId) saveActiveNote();
  exitMobileEditing();
});

// Save immediately if the user leaves the page with unsaved changes
window.addEventListener("beforeunload", () => {
  if (saveTimer) saveActiveNote();
});

loadNotes();
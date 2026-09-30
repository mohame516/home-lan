const socket = io();

let currentPath = '';
let userName = localStorage.getItem('landrive_name') || '';
let lastUsers = [];

// ---------- عناصر ----------
const $ = (id) => document.getElementById(id);
const filesList = $('filesList');
const breadcrumb = $('breadcrumb');
const dropZone = $('dropZone');
const usersList = $('usersList');
const userCount = $('userCount');
const chatMessages = $('chatMessages');
const chatForm = $('chatForm');
const chatInput = $('chatInput');
const nameModal = $('nameModal');
const nameInput = $('nameInput');

// ---------- اسم المستخدم ----------
if (!userName) {
  nameModal.classList.add('show');
  setTimeout(() => nameInput.focus(), 100);
}
$('nameBtn').onclick = () => {
  const val = nameInput.value.trim() || 'مستخدم-' + Math.floor(Math.random()*1000);
  userName = val;
  localStorage.setItem('landrive_name', val);
  nameModal.classList.remove('show');
  socket.emit('join', userName);
};
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') $('nameBtn').click(); });

if (userName) socket.on('connect', () => socket.emit('join', userName));

// ---------- التنقل ----------
function navigate(rel) {
  currentPath = rel;
  loadFiles();
  renderBreadcrumb();
}

function renderBreadcrumb() {
  const parts = currentPath.split('/').filter(Boolean);
  let html = `<a onclick="navigate('')">🏠 الجذر</a>`;
  let acc = '';
  parts.forEach(p => {
    acc += (acc ? '/' : '') + p;
    const target = acc;
    html += ` / <a onclick="navigate('${escapeAttr(target)}')">${escapeHtml(p)}</a>`;
  });
  breadcrumb.innerHTML = html;
}

// ---------- تحميل الملفات ----------
async function loadFiles() {
  const res = await fetch('/api/list?path=' + encodeURIComponent(currentPath));
  const data = await res.json();
  renderFiles(data.items || []);
}

function iconFor(item) {
  if (item.isDir) return '📁';
  const n = item.name.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(n)) return '🖼️';
  if (/\.(mp4|mkv|avi|mov|webm)$/.test(n)) return '🎬';
  if (/\.(mp3|wav|ogg|m4a|flac)$/.test(n)) return '🎵';
  if (/\.(pdf)$/.test(n)) return '📄';
  if (/\.(zip|rar|7z|tar|gz)$/.test(n)) return '🗜️';
  if (/\.(doc|docx)$/.test(n)) return '📝';
  if (/\.(xls|xlsx)$/.test(n)) return '📊';
  if (/\.(ppt|pptx)$/.test(n)) return '📽️';
  if (/\.(txt|md|log)$/.test(n)) return '📃';
  if (/\.(exe|msi|apk|deb)$/.test(n)) return '⚙️';
  if (/\.(js|ts|py|java|c|cpp|html|css|json)$/.test(n)) return '💻';
  return '📄';
}

function renderFiles(items) {
  filesList.innerHTML = '';
  if (!items.length) {
    filesList.innerHTML = '<li style="grid-column:1/-1;text-align:center;color:#64748b">لا توجد ملفات</li>';
    return;
  }
  items.forEach(it => {
    const li = document.createElement('li');
    const fullPath = currentPath ? currentPath + '/' + it.name : it.name;
    li.innerHTML = `
      <div class="row">
        <span class="icon">${iconFor(it)}</span>
        <span class="menu">
          ${!it.isDir ? `<button title="تحميل" data-act="download">⬇</button>` : ''}
          <button title="إعادة تسمية" data-act="rename">✏️</button>
          <button class="del" title="حذف" data-act="delete">🗑</button>
        </span>
      </div>
      <div class="name">${escapeHtml(it.name)}</div>
      <div class="meta">${it.isDir ? 'مجلد' : it.sizeText}</div>
    `;
    li.onclick = (e) => {
      if (e.target.closest('.menu')) return;
      if (it.isDir) navigate(fullPath);
      else window.open('/api/preview?path=' + encodeURIComponent(fullPath), '_blank');
    };
    li.querySelectorAll('.menu button').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        handleAction(btn.dataset.act, fullPath, it);
      };
    });
    filesList.appendChild(li);
  });
}

async function handleAction(act, fullPath, item) {
  if (act === 'download') {
    window.location = '/api/download?path=' + encodeURIComponent(fullPath);
    return;
  }
  if (act === 'rename') {
    const newName = prompt('الاسم الجديد:', item.name);
    if (!newName || newName === item.name) return;
    const r = await fetch('/api/rename', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: fullPath, newName })
    });
    const d = await r.json();
    if (!r.ok) return alert('خطأ: ' + d.error);
    notifyUpdate();
  }
  if (act === 'delete') {
    if (!confirm(`تأكيد حذف "${item.name}"؟`)) return;
    const r = await fetch('/api/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: fullPath })
    });
    const d = await r.json();
    if (!r.ok) return alert('خطأ: ' + d.error);
    notifyUpdate();
  }
}

function notifyUpdate() {
  loadFiles();
  socket.emit('files-updated');
}
socket.on('files-updated', loadFiles);

// ---------- زر مجلد جديد ----------
$('btnMkdir').onclick = async () => {
  const name = prompt('اسم المجلد الجديد:');
  if (!name) return;
  const r = await fetch('/api/mkdir', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: currentPath, name })
  });
  const d = await r.json();
  if (!r.ok) return alert('خطأ: ' + d.error);
  notifyUpdate();
};

// ---------- الرفع ----------
$('btnUpload').onclick = () => $('fileInput').click();
$('fileInput').onchange = (e) => {
  if (e.target.files.length) uploadFiles(e.target.files);
  e.target.value = '';
};

async function uploadFiles(files) {
  const fd = new FormData();
  fd.append('path', currentPath);
  for (const f of files) fd.append('files', f);
  const hint = dropZone.querySelector('.dropHint');
  hint.textContent = `⏳ جاري رفع ${files.length} ملف...`;
  try {
    const r = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!r.ok) throw new Error('فشل الرفع');
    hint.textContent = '✅ تم الرفع';
    notifyUpdate();
  } catch (e) {
    hint.textContent = '❌ ' + e.message;
  }
  setTimeout(() => hint.textContent = 'اسحب وأفلت الملفات هنا للرفع', 2000);
}

// ---------- Drag & Drop ----------
['dragenter','dragover'].forEach(ev =>
  dropZone.addEventListener(ev, e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  })
);
['dragleave','drop'].forEach(ev =>
  dropZone.addEventListener(ev, e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  })
);
dropZone.addEventListener('drop', e => {
  if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
});

// ---------- الشات ----------
chatForm.onsubmit = (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  socket.emit('message', text);
  chatInput.value = '';
};

socket.on('message', (m) => {
  const li = document.createElement('li');
  const time = new Date(m.time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  li.innerHTML = `<span class="time">${time}</span><span class="from" style="color:${m.color}">${escapeHtml(m.name)}:</span> ${escapeHtml(m.text)}`;
  chatMessages.appendChild(li);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('system', (msg) => {
  const li = document.createElement('li');
  li.className = 'system';
  li.textContent = msg;
  chatMessages.appendChild(li);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('users', (list) => {
  lastUsers = list;
  userCount.textContent = list.length;
  usersList.innerHTML = list.map(u =>
    `<li style="--dot:${u.color}">${escapeHtml(u.name)}</li>`
  ).join('');
});

// ---------- Helpers ----------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function escapeAttr(s) {
  return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
}

// ---------- معلومات السيرفر ----------
fetch('/api/info').then(r => r.json()).then(info => {
  $('serverInfo').innerHTML =
    `🖥️ <b>${escapeHtml(info.hostname)}</b><br>` +
    `🔗 ${info.addresses.map(a => `${a}:${info.port}`).join('<br>🔗 ') || 'localhost:' + info.port}`;
});

// ---------- بدء ----------
navigate('');
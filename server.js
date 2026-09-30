const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
const mime = require('mime-types');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e8 });

const PORT = process.env.PORT || 3000;
const STORAGE = path.join(__dirname, 'storage');

// إنشاء مجلد التخزين
if (!fs.existsSync(STORAGE)) fs.mkdirSync(STORAGE, { recursive: true });

// ---------- Helpers ----------
function safeJoin(base, target) {
  const targetPath = path.resolve(base, '.' + path.sep + target);
  if (!targetPath.startsWith(base)) throw new Error('Invalid path');
  return targetPath;
}

function getSafePath(rel) {
  const clean = (rel || '').replace(/\\/g, '/').replace(/^\/+/, '');
  return safeJoin(STORAGE, clean);
}

function humanSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 ** 3) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 ** 3).toFixed(2) + ' GB';
}

// ---------- Middleware ----------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Multer (رفع الملفات) ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const dest = getSafePath(req.body.path || '');
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    } catch (e) { cb(e); }
  },
  filename: (req, file, cb) => {
    // إصلاح ترميز UTF-8 لأسماء الملفات العربية
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// ---------- API ----------

// عرض محتويات مجلد
app.get('/api/list', (req, res) => {
  try {
    const rel = req.query.path || '';
    const full = getSafePath(rel);
    if (!fs.existsSync(full)) return res.json({ items: [] });

    const items = fs.readdirSync(full).map(name => {
      const stat = fs.statSync(path.join(full, name));
      return {
        name,
        isDir: stat.isDirectory(),
        size: stat.size,
        sizeText: humanSize(stat.size),
        mtime: stat.mtimeMs
      };
    });

    // المجلدات أولاً ثم الملفات
    items.sort((a, b) =>
      (b.isDir - a.isDir) || a.name.localeCompare(b.name, 'ar')
    );

    res.json({ path: rel, items });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// رفع ملفات
app.post('/api/upload', upload.array('files'), (req, res) => {
  res.json({ ok: true, count: req.files?.length || 0 });
});

// تحميل ملف
app.get('/api/download', (req, res) => {
  try {
    const full = getSafePath(req.query.path);
    if (!fs.existsSync(full) || fs.statSync(full).isDirectory())
      return res.status(404).send('Not found');

    const stat = fs.statSync(full);
    const name = path.basename(full);
    res.setHeader('Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
    res.setHeader('Content-Type', mime.lookup(full) || 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    fs.createReadStream(full).pipe(res);
  } catch (e) { res.status(400).send(e.message); }
});

// معاينة ملف (بدون تحميل)
app.get('/api/preview', (req, res) => {
  try {
    const full = getSafePath(req.query.path);
    if (!fs.existsSync(full)) return res.status(404).send('Not found');
    res.setHeader('Content-Type', mime.lookup(full) || 'application/octet-stream');
    fs.createReadStream(full).pipe(res);
  } catch (e) { res.status(400).send(e.message); }
});

// إنشاء مجلد
app.post('/api/mkdir', (req, res) => {
  try {
    const { path: rel, name } = req.body;
    if (!name || /[\\/]/.test(name)) return res.status(400).json({ error: 'اسم غير صالح' });
    const full = path.join(getSafePath(rel), name);
    fs.mkdirSync(full, { recursive: false });
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// إعادة تسمية
app.post('/api/rename', (req, res) => {
  try {
    const { path: rel, newName } = req.body;
    if (!newName || /[\\/]/.test(newName)) return res.status(400).json({ error: 'اسم غير صالح' });
    const full = getSafePath(rel);
    const dest = path.join(path.dirname(full), newName);
    fs.renameSync(full, dest);
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// حذف
app.post('/api/delete', (req, res) => {
  try {
    const full = getSafePath(req.body.path);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) fs.rmSync(full, { recursive: true, force: true });
    else fs.unlinkSync(full);
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// معلومات السيرفر
app.get('/api/info', (req, res) => {
  const nets = os.networkInterfaces();
  const addrs = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) addrs.push(net.address);
    }
  }
  res.json({ hostname: os.hostname(), addresses: addrs, port: PORT });
});

// ---------- Socket.IO : الشات + المتصلون ----------
const users = new Map(); // socket.id -> {name, color}

function broadcastUsers() {
  io.emit('users', Array.from(users.values()));
}

io.on('connection', (socket) => {
  socket.on('join', (name) => {
    const colors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];
    users.set(socket.id, {
      id: socket.id,
      name: (name || 'مستخدم').slice(0, 20),
      color: colors[Math.floor(Math.random() * colors.length)]
    });
    broadcastUsers();
    io.emit('system', `${users.get(socket.id).name} انضم إلى الدردشة`);
  });

  socket.on('message', (text) => {
    const u = users.get(socket.id);
    if (!u || !text) return;
    io.emit('message', {
      name: u.name,
      color: u.color,
      text: String(text).slice(0, 1000),
      time: Date.now()
    });
  });

  // إشعار عند تحديث الملفات
  socket.on('files-updated', () => {
    socket.broadcast.emit('files-updated');
  });

  socket.on('disconnect', () => {
    const u = users.get(socket.id);
    if (u) {
      users.delete(socket.id);
      broadcastUsers();
      io.emit('system', `${u.name} غادر الدردشة`);
    }
  });
});

// ---------- تشغيل ----------
server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const addrs = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) addrs.push(net.address);
    }
  }
  console.log('\n🚀 LANDrive يعمل الآن');
  console.log('─'.repeat(50));
  console.log(`   محلي:  http://localhost:${PORT}`);
  addrs.forEach(a => console.log(`   شبكة:  http://${a}:${PORT}`));
  console.log('─'.repeat(50) + '\n');
});
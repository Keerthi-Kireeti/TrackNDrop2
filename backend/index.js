const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// SQLite DB setup
const dbPath = path.join(__dirname, 'trackndrop.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite DB:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// --- DB Schema Setup ---
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    user_type TEXT NOT NULL
  )`);

  // Boxes table
  db.run(`CREATE TABLE IF NOT EXISTS boxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    box_id TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    cycle_count INTEGER DEFAULT 0,
    location TEXT,
    last_used TEXT,
    manufacture_date TEXT,
    status TEXT DEFAULT 'active'
  )`);

  // Box history table
  db.run(`CREATE TABLE IF NOT EXISTS box_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    box_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    location TEXT,
    user_id TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
  )`);

  // Alerts table
  db.run(`CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    box_id TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    is_read INTEGER DEFAULT 0
  )`);

  // Settings table
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT
  )`);

  // Insert sample data
  db.run(`INSERT OR IGNORE INTO users (username, password, user_type) VALUES ('admin', 'admin123', 'admin')`);
  db.run(`INSERT OR IGNORE INTO boxes (box_id, type, cycle_count, location, last_used, manufacture_date, status) VALUES 
    ('BX-4892-75', 'Plastic Container', 147, 'Warehouse A', '2023-10-26', '2022-03-15', 'needs_inspection'),
    ('BX-3021-43', 'Metal Crate', 200, 'Dispatch Area', '2023-10-30', '2021-08-20', 'retired'),
    ('BX-5567-12', 'Wooden Pallet', 89, 'Loading Dock 3', '2023-10-25', '2022-11-10', 'needs_inspection'),
    ('BX-1123-98', 'Plastic Container', 32, 'Warehouse B', '2023-10-20', '2023-01-15', 'active'),
    ('BX-7789-34', 'Metal Crate', 112, 'Shipping Area', '2023-10-29', '2021-12-05', 'active'),
    ('BX-9901-56', 'Wooden Pallet', 76, 'Repair Station', '2023-10-10', '2022-06-20', 'active')`);
  
  // Insert sample alerts
  db.run(`INSERT OR IGNORE INTO alerts (box_id, alert_type, message, created_at) VALUES 
    ('BX-4892-75', 'inspection', 'Box BX-4892-75 approaching cycle limit', '2023-10-28 10:30:00'),
    ('BX-3021-43', 'eol', 'Box BX-3021-43 reached end of life', '2023-10-29 14:15:00'),
    ('BX-5567-12', 'inspection', 'Box BX-5567-12 needs inspection', '2023-10-27 09:45:00')`);
  
  // Insert sample settings
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES 
    ('email_notifications', 'true'),
    ('sms_notifications', 'false'),
    ('in_app_notifications', 'true'),
    ('plastic_max_cycles', '150'),
    ('metal_max_cycles', '200'),
    ('wooden_max_cycles', '100')`);
});

// --- Authentication Endpoint ---
app.post('/api/auth/login', (req, res) => {
  const { username, password, user_type } = req.body;
  if (!username || !password || !user_type) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  db.get(
    'SELECT * FROM users WHERE username = ? AND password = ? AND user_type = ?',
    [username, password, user_type],
    (err, user) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      res.json({ message: 'Login successful', user: { id: user.id, username: user.username, user_type: user.user_type } });
    }
  );
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// --- Boxes Endpoints ---
// List all boxes
app.get('/api/boxes', (req, res) => {
  db.all('SELECT * FROM boxes', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// Add a new box
app.post('/api/boxes', (req, res) => {
  const { box_id, type, manufacture_date } = req.body;
  if (!box_id || !type || !manufacture_date) {
    return res.status(400).json({ error: 'Missing box data' });
  }
  db.run(
    'INSERT INTO boxes (box_id, type, manufacture_date) VALUES (?, ?, ?)',
    [box_id, type, manufacture_date],
    function (err) {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ message: 'Box added', id: this.lastID });
    }
  );
});

// Get box details
app.get('/api/boxes/:id', (req, res) => {
  db.get('SELECT * FROM boxes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!row) return res.status(404).json({ error: 'Box not found' });
    res.json(row);
  });
});

// Update box details
app.put('/api/boxes/:id', (req, res) => {
  const { type, cycle_count, location, last_used, manufacture_date, status } = req.body;
  db.run(
    'UPDATE boxes SET type = ?, cycle_count = ?, location = ?, last_used = ?, manufacture_date = ?, status = ? WHERE id = ?',
    [type, cycle_count, location, last_used, manufacture_date, status, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (this.changes === 0) return res.status(404).json({ error: 'Box not found' });
      res.json({ message: 'Box updated' });
    }
  );
});

// Retire a box
app.post('/api/boxes/:id/retire', (req, res) => {
  db.run(
    "UPDATE boxes SET status = 'retired' WHERE id = ?",
    [req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (this.changes === 0) return res.status(404).json({ error: 'Box not found' });
      res.json({ message: 'Box retired' });
    }
  );
});

// Get box history
app.get('/api/boxes/:id/history', (req, res) => {
  db.get('SELECT box_id FROM boxes WHERE id = ?', [req.params.id], (err, box) => {
    if (err || !box) return res.status(404).json({ error: 'Box not found' });
    db.all('SELECT * FROM box_history WHERE box_id = ? ORDER BY timestamp DESC', [box.box_id], (err, rows) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json(rows);
    });
  });
});

// --- QR Scan Endpoint ---
app.post('/api/scan', (req, res) => {
  const { box_id, action_type, location, user_id } = req.body;
  if (!box_id || !action_type) {
    return res.status(400).json({ error: 'Missing scan data' });
  }
  // Update box status/cycle count if needed
  let updateSql = '';
  let updateParams = [];
  if (action_type === 'check_in') {
    updateSql = 'UPDATE boxes SET cycle_count = cycle_count + 1, last_used = CURRENT_TIMESTAMP, location = ? WHERE box_id = ?';
    updateParams = [location || '', box_id];
  } else if (action_type === 'check_out') {
    updateSql = 'UPDATE boxes SET last_used = CURRENT_TIMESTAMP, location = ? WHERE box_id = ?';
    updateParams = [location || '', box_id];
  } else if (action_type === 'inspection') {
    updateSql = 'UPDATE boxes SET status = ? WHERE box_id = ?';
    updateParams = ['needs_inspection', box_id];
  } else if (action_type === 'retire') {
    updateSql = 'UPDATE boxes SET status = ? WHERE box_id = ?';
    updateParams = ['retired', box_id];
  }
  if (updateSql) {
    db.run(updateSql, updateParams, function (err) {
      if (err) return res.status(500).json({ error: 'DB error' });
      // Add to box history
      db.run(
        'INSERT INTO box_history (box_id, action_type, location, user_id) VALUES (?, ?, ?, ?)',
        [box_id, action_type, location || '', user_id || ''],
        function (err2) {
          if (err2) return res.status(500).json({ error: 'DB error' });
          res.json({ message: 'Scan processed' });
        }
      );
    });
  } else {
    // Just add to history if no box update
    db.run(
      'INSERT INTO box_history (box_id, action_type, location, user_id) VALUES (?, ?, ?, ?)',
      [box_id, action_type, location || '', user_id || ''],
      function (err2) {
        if (err2) return res.status(500).json({ error: 'DB error' });
        res.json({ message: 'Scan processed' });
      }
    );
  }
});

// --- Tracking Endpoint ---
app.get('/api/track/:trackingNo', (req, res) => {
  const box_id = req.params.trackingNo;
  db.get('SELECT * FROM boxes WHERE box_id = ?', [box_id], (err, box) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!box) return res.status(404).json({ error: 'Box not found' });
    db.all('SELECT * FROM box_history WHERE box_id = ? ORDER BY timestamp DESC', [box_id], (err2, history) => {
      if (err2) return res.status(500).json({ error: 'DB error' });
      res.json({ box, history });
    });
  });
});

// --- Alerts Endpoint ---
app.get('/api/alerts', (req, res) => {
  db.all('SELECT * FROM alerts ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// --- Settings Endpoints ---
// Get all settings
app.get('/api/settings', (req, res) => {
  db.all('SELECT key, value FROM settings', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    const settings = {};
    rows.forEach(row => { settings[row.key] = row.value; });
    res.json(settings);
  });
});
// Update a setting
app.post('/api/settings', (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'Missing key' });
  db.run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
    function (err) {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ message: 'Setting updated' });
    }
  );
});

// --- Dashboard Stats Endpoint ---
app.get('/api/dashboard/stats', (req, res) => {
  const stats = {};
  db.serialize(() => {
    db.get('SELECT COUNT(*) as total FROM boxes', (err, row) => {
      stats.total_boxes = row ? row.total : 0;
      db.get("SELECT COUNT(*) as active FROM boxes WHERE status = 'active'", (err2, row2) => {
        stats.active_boxes = row2 ? row2.active : 0;
        db.get("SELECT COUNT(*) as needs_inspection FROM boxes WHERE status = 'needs_inspection'", (err3, row3) => {
          stats.needs_inspection = row3 ? row3.needs_inspection : 0;
          db.get("SELECT COUNT(*) as end_of_life FROM boxes WHERE status = 'retired'", (err4, row4) => {
            stats.end_of_life = row4 ? row4.end_of_life : 0;
            // Example chart data (replace with real aggregation if needed)
            stats.usage_chart = [stats.active_boxes, stats.needs_inspection, stats.end_of_life];
            stats.turnover_chart = {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              checked_in: [10, 12, 8, 15, 9, 11],
              checked_out: [8, 10, 7, 13, 8, 10]
            };
            res.json(stats);
          });
        });
      });
    });
  });
});

// --- QR Code Generation Endpoint ---
app.post('/api/boxes/:id/generate-qr', (req, res) => {
  const { location } = req.body; // location entered manually
  db.get('SELECT * FROM boxes WHERE id = ?', [req.params.id], (err, box) => {
    if (err || !box) return res.status(404).json({ error: 'Box not found' });
    // Compose QR data: BOX_ID|TYPE|CYCLE_COUNT|LOCATION|LAST_USED|MFG_DATE
    const qrData = [
      box.box_id,
      box.type,
      box.cycle_count,
      location || box.location || '',
      box.last_used || '',
      box.manufacture_date || ''
    ].join('|');
    QRCode.toDataURL(qrData, { errorCorrectionLevel: 'H' }, (err, url) => {
      if (err) return res.status(500).json({ error: 'QR generation failed' });
      res.json({ qr: url, data: qrData });
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`TrackNDrop backend running on http://localhost:${PORT}`);
});
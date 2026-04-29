const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const QRCode = require('qrcode');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3000;
const ADMIN_SIGNUP_CODE = process.env.ADMIN_SIGNUP_CODE || 'ADMIN-INVITE-2025';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(helmet());

// Rate limit auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth', authLimiter);

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
    user_type TEXT NOT NULL,
    name TEXT,
    email TEXT,
    phone TEXT,
    department TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
    status TEXT DEFAULT 'active',
    thickness TEXT,
    supplier TEXT,
    diameters TEXT,
    material_used TEXT,
    serial_code TEXT
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

  // Insert sample data (will be transparently supported even after enabling hashing)
  db.run(`INSERT OR IGNORE INTO users (username, password, user_type, name, email, phone, department) VALUES 
    ('admin', 'admin123', 'admin', 'Admin User', 'admin@trackndrop.com', '+1-555-0100', 'Management')`);
  db.run(`INSERT OR IGNORE INTO users (username, password, user_type, name, email, phone, department) VALUES 
    ('user1', 'user123', 'user', 'John Doe', 'john.doe@trackndrop.com', '+1-555-0101', 'Operations')`);
  db.run(`INSERT OR IGNORE INTO users (username, password, user_type, name, email, phone, department) VALUES 
    ('dex1', 'dex123', 'delivery_executive', 'Mike Johnson', 'mike.johnson@trackndrop.com', '+1-555-0102', 'Delivery')`);
  db.run(`INSERT OR IGNORE INTO boxes (box_id, type, cycle_count, location, last_used, manufacture_date, status, thickness, supplier, diameters, material_used, serial_code) VALUES 
    ('BX-4892-75', 'Plastic Container', 147, 'Warehouse A', '2023-10-26', '2022-03-15', 'needs_inspection', '2.5mm', 'PlastCorp Industries', '45x30x25cm', 'HDPE', 'PC-4892-75'),
    ('BX-3021-43', 'Metal Crate', 200, 'Dispatch Area', '2023-10-30', '2021-08-20', 'retired', '1.8mm', 'MetalBox Solutions', '60x40x35cm', 'Galvanized Steel', 'MC-3021-43'),
    ('BX-5567-12', 'Wooden Pallet', 89, 'Loading Dock 3', '2023-10-25', '2022-11-10', 'needs_inspection', '25mm', 'WoodCraft Ltd', '120x80x15cm', 'Pine Wood', 'WP-5567-12'),
    ('BX-1123-98', 'Plastic Container', 32, 'Warehouse B', '2023-10-20', '2023-01-15', 'active', '3.0mm', 'PlastCorp Industries', '50x35x30cm', 'HDPE', 'PC-1123-98'),
    ('BX-7789-34', 'Metal Crate', 112, 'Shipping Area', '2023-10-29', '2021-12-05', 'active', '2.0mm', 'MetalBox Solutions', '55x45x40cm', 'Galvanized Steel', 'MC-7789-34'),
    ('BX-9901-56', 'Wooden Pallet', 76, 'Repair Station', '2023-10-10', '2022-06-20', 'active', '30mm', 'WoodCraft Ltd', '100x80x20cm', 'Oak Wood', 'WP-9901-56'),
    ('BX-1234-56', 'Plastic Container', 45, NULL, '2023-10-15', '2022-05-10', 'missing', '2.8mm', 'PlastCorp Industries', '40x30x25cm', 'HDPE', 'PC-1234-56'),
    ('BX-7890-12', 'Metal Crate', 78, NULL, '2023-10-12', '2021-11-20', 'missing', '1.5mm', 'MetalBox Solutions', '50x40x35cm', 'Galvanized Steel', 'MC-7890-12'),
    ('BX-3456-78', 'Wooden Pallet', 23, NULL, '2023-10-08', '2023-02-15', 'missing', '28mm', 'WoodCraft Ltd', '110x85x18cm', 'Pine Wood', 'WP-3456-78')`);
  
  // Clear existing boxes and insert exactly 500 with specific distribution
  db.run('DELETE FROM boxes', (err) => {
    if (err) {
      console.error('Error clearing boxes:', err);
    } else {
      console.log('Cleared existing boxes');
      
      // Insert exactly 500 boxes with specific distribution
      for (let i = 1; i <= 500; i++) {
        const boxId = `BX-${String(i).padStart(4, '0')}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
        const types = ['Plastic Container', 'Metal Crate', 'Wooden Pallet', 'Corrugated Box', 'Mailer Box'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        // Realistic cycle count based on type
        let maxCycles;
        switch(type) {
          case 'Plastic Container': maxCycles = 150; break;
          case 'Metal Crate': maxCycles = 200; break;
          case 'Wooden Pallet': maxCycles = 100; break;
          case 'Corrugated Box': maxCycles = 120; break;
          case 'Mailer Box': maxCycles = 80; break;
          default: maxCycles = 150;
        }
        
        const cycleCount = Math.floor(Math.random() * maxCycles);
        const locations = ['Warehouse A', 'Warehouse B', 'Warehouse C', 'Shipping Area', 'Dispatch Area', 'Loading Dock 1', 'Loading Dock 2', 'Loading Dock 3', 'Repair Station'];
        const location = locations[Math.floor(Math.random() * locations.length)];
        
        // Specific status distribution: 300 active, 150 needs inspection, 50 retired, 50 missing
        let status;
        if (i <= 300) {
          status = 'active';
        } else if (i <= 450) {
          status = 'needs_inspection';
        } else if (i <= 500) {
          status = 'retired';
        }
        
        // For the last 50 boxes (451-500), make them missing instead of retired
        if (i > 450) {
          status = 'missing';
        }
        
        const lastUsed = new Date(2023, 9, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0];
        const manufactureDate = new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0];
        
        // Generate realistic values for new fields based on box type
        let thickness, supplier, diameters, materialUsed, serialCode;
        
        switch(type) {
          case 'Plastic Container':
            thickness = `${(2.0 + Math.random() * 2.0).toFixed(1)}mm`;
            supplier = 'PlastCorp Industries';
            diameters = `${(35 + Math.random() * 25).toFixed(0)}x${(25 + Math.random() * 20).toFixed(0)}x${(20 + Math.random() * 15).toFixed(0)}cm`;
            materialUsed = 'HDPE';
            serialCode = `PC-${String(i).padStart(4, '0')}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
            break;
          case 'Metal Crate':
            thickness = `${(1.5 + Math.random() * 1.0).toFixed(1)}mm`;
            supplier = 'MetalBox Solutions';
            diameters = `${(45 + Math.random() * 25).toFixed(0)}x${(35 + Math.random() * 20).toFixed(0)}x${(30 + Math.random() * 15).toFixed(0)}cm`;
            materialUsed = 'Galvanized Steel';
            serialCode = `MC-${String(i).padStart(4, '0')}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
            break;
          case 'Wooden Pallet':
            thickness = `${(20 + Math.random() * 15).toFixed(0)}mm`;
            supplier = 'WoodCraft Ltd';
            diameters = `${(80 + Math.random() * 40).toFixed(0)}x${(60 + Math.random() * 30).toFixed(0)}x${(12 + Math.random() * 12).toFixed(0)}cm`;
            materialUsed = Math.random() > 0.5 ? 'Pine Wood' : 'Oak Wood';
            serialCode = `WP-${String(i).padStart(4, '0')}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
            break;
          case 'Corrugated Box':
            thickness = `${(3.0 + Math.random() * 2.0).toFixed(1)}mm`;
            supplier = 'CorrBox Manufacturing';
            diameters = `${(40 + Math.random() * 20).toFixed(0)}x${(30 + Math.random() * 15).toFixed(0)}x${(25 + Math.random() * 10).toFixed(0)}cm`;
            materialUsed = 'Corrugated Cardboard';
            serialCode = `CB-${String(i).padStart(4, '0')}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
            break;
          case 'Mailer Box':
            thickness = `${(1.5 + Math.random() * 1.5).toFixed(1)}mm`;
            supplier = 'MailBox Pro';
            diameters = `${(25 + Math.random() * 15).toFixed(0)}x${(20 + Math.random() * 10).toFixed(0)}x${(15 + Math.random() * 8).toFixed(0)}cm`;
            materialUsed = 'Kraft Paper';
            serialCode = `MB-${String(i).padStart(4, '0')}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
            break;
          default:
            thickness = '2.0mm';
            supplier = 'Generic Supplier';
            diameters = '40x30x25cm';
            materialUsed = 'Standard Material';
            serialCode = `BX-${String(i).padStart(4, '0')}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
        }
        
        // For missing boxes, set location to null
        const finalLocation = status === 'missing' ? null : location;
        
        db.run(`INSERT INTO boxes (box_id, type, cycle_count, location, last_used, manufacture_date, status, thickness, supplier, diameters, material_used, serial_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          [boxId, type, cycleCount, finalLocation, lastUsed, manufactureDate, status, thickness, supplier, diameters, materialUsed, serialCode]);
      }
      console.log('Inserted 500 boxes with distribution: 300 active, 150 needs inspection, 50 retired, 50 missing');
    }
  });
  
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

// --- Authentication Endpoints ---
// Signup: hash password and store
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password, user_type, admin_invite_code } = req.body;
    const roleAllowed = new Set(['user', 'delivery_executive', 'admin']);
    if (!username || !password || !user_type || !roleAllowed.has(user_type)) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    if (typeof username !== 'string' || typeof password !== 'string' || username.length < 3 || password.length < 6) {
      return res.status(400).json({ error: 'Username or password too short' });
    }
    // Require invite code for admin registrations
    if (user_type === 'admin') {
      if (!admin_invite_code || admin_invite_code !== ADMIN_SIGNUP_CODE) {
        return res.status(403).json({ error: 'Admin invite code is invalid' });
      }
    }
    // Check if exists
    db.get('SELECT id FROM users WHERE username = ?', [username], async (err, row) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (row) return res.status(409).json({ error: 'Username already taken' });
      const hash = await bcrypt.hash(password, 10);
      db.run('INSERT INTO users (username, password, user_type) VALUES (?, ?, ?)', [username, hash, user_type], function (err2) {
        if (err2) return res.status(500).json({ error: 'DB error' });
        res.json({ message: 'Signup successful' });
      });
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login: verify hashed or legacy plain (for existing seeded users)
app.post('/api/auth/login', (req, res) => {
  const { username, password, user_type } = req.body;
  const allowed = new Set(['user', 'admin', 'delivery_executive']);
  if (!username || !password || !user_type || !allowed.has(user_type)) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  db.get('SELECT * FROM users WHERE username = ? AND user_type = ?', [username, user_type], async (err, user) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    try {
      let valid = false;
      // First try bcrypt compare (for hashed users)
      const maybeHash = user.password || '';
      if (maybeHash.startsWith('$2')) {
        valid = await bcrypt.compare(password, maybeHash);
      } else {
        // Legacy plain-text support (seeded sample users)
        valid = password === user.password;
      }
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
      res.json({ 
        message: 'Login successful', 
        user: { 
          id: user.id, 
          username: user.username, 
          user_type: user.user_type,
          name: user.name || user.username,
          email: user.email || user.username + '@trackndrop.com',
          phone: user.phone || '',
          department: user.department || ''
        } 
      });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// --- User Profile Endpoints ---
// Update user profile
app.put('/api/auth/profile', (req, res) => {
  const { username, name, email, phone, department } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  db.run(
    'UPDATE users SET name = ?, email = ?, phone = ?, department = ? WHERE username = ?',
    [name || null, email || null, phone || null, department || null, username],
    function (err) {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
      res.json({ message: 'Profile updated successfully' });
    }
  );
});

// Get user profile
app.get('/api/auth/profile/:username', (req, res) => {
  db.get(
    'SELECT id, username, user_type, name, email, phone, department, created_at FROM users WHERE username = ?',
    [req.params.username],
    (err, user) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    }
  );
});

// --- Boxes Endpoints ---
// List all boxes
app.get('/api/boxes', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 0, 1000);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const status = req.query.status;
  
  let query = 'SELECT * FROM boxes';
  let params = [];
  
  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  
  if (limit > 0) {
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  
  db.all(query, params, (err, rows) => {
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

// Reset settings to defaults
app.post('/api/settings/reset', (req, res) => {
  const defaults = [
    ['email_notifications', 'true'],
    ['sms_notifications', 'false'],
    ['in_app_notifications', 'true'],
    ['plastic_max_cycles', '100'],
    ['metal_max_cycles', '100'],
    ['wooden_max_cycles', '100'],
    ['plastic_inspection_threshold', '90'],
    ['metal_inspection_threshold', '90'],
    ['wooden_inspection_threshold', '90'],
    ['theme', 'light']
  ];
  const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  db.serialize(() => {
    defaults.forEach(([k, v]) => stmt.run([k, v]));
    stmt.finalize((err) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ message: 'Settings reset to defaults' });
    });
  });
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
            db.get("SELECT COUNT(*) as missing FROM boxes WHERE status = 'missing'", (err5, row5) => {
              stats.missing_boxes = row5 ? row5.missing : 0;
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
});

// --- QR Code Generation Endpoints ---
// Legacy endpoint for box-specific QR generation
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

// Direct QR code generation endpoint for any data
app.get('/api/qrcode', (req, res) => {
  const { data } = req.query;
  
  if (!data) {
    return res.status(400).json({ error: 'Missing data parameter' });
  }
  
  console.log('Generating QR code for data:', data);
  
  // If data is a box ID, fetch full box details and create comprehensive QR
  if (data.startsWith('BX-')) {
    db.get('SELECT * FROM boxes WHERE box_id = ?', [data], (err, box) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!box) {
        return res.status(404).json({ error: 'Box not found' });
      }
      
      // Create comprehensive QR data with all box details
      const qrData = {
        box_id: box.box_id,
        type: box.type,
        cycle_count: box.cycle_count,
        location: box.location || 'Unknown',
        last_used: box.last_used || 'N/A',
        manufacture_date: box.manufacture_date || 'N/A',
        status: box.status,
        thickness: box.thickness || 'N/A',
        supplier: box.supplier || 'N/A',
        diameters: box.diameters || 'N/A',
        material_used: box.material_used || 'N/A',
        serial_code: box.serial_code || 'N/A'
      };
      
      // Convert to JSON string for QR encoding
      const qrString = JSON.stringify(qrData);
      
      // Generate QR code as PNG image
      QRCode.toDataURL(qrString, { 
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 300,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (err, dataUrl) => {
        if (err) {
          console.error('QR generation error:', err);
          return res.status(500).json({ error: 'QR generation failed' });
        }
        
        // Convert data URL to buffer
        try {
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          
          res.set('Content-Type', 'image/png');
          res.send(buffer);
          console.log('Comprehensive QR code generated for box:', box.box_id);
        } catch (conversionError) {
          console.error('Error converting data URL to buffer:', conversionError);
          return res.status(500).json({ error: 'QR image processing failed' });
        }
      });
    });
  } else {
    // For non-box data, generate simple QR code
    QRCode.toDataURL(data, { 
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }, (err, dataUrl) => {
      if (err) {
        console.error('QR generation error:', err);
        return res.status(500).json({ error: 'QR generation failed' });
      }
      
      try {
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        res.set('Content-Type', 'image/png');
        res.send(buffer);
        console.log('Simple QR code generated for data:', data);
      } catch (conversionError) {
        console.error('Error converting data URL to buffer:', conversionError);
        return res.status(500).json({ error: 'QR image processing failed' });
      }
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`TrackNDrop backend running on http://localhost:${PORT}`);
});
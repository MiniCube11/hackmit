const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const { API_KEY, DB_FILE } = require('./config');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Session management
app.use(session({
    secret: 'vulnsecret123',
    resave: false,
    saveUninitialized: true
}));

// Connect to SQLite
const db = new sqlite3.Database(DB_FILE, (err) => {
    if(err) console.error(err);
    else console.log("Connected to SQLite DB.");
});

// Initialize database
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)");
    db.run("INSERT OR IGNORE INTO users (username, password) VALUES ('admin', 'password123')");
});

// --- Helper: shared styles/layout ---
function page(title, bodyHtml, opts = {}) {
    const user = opts.user || null;
    // includeApiLeak: when true, we inject a comment and a console.log so the API key is visible in source/console
    const includeApiLeak = true;
    const leakComment = includeApiLeak ? `\n    <!-- LEAKED_API_KEY: ${API_KEY} -->` : '';
    const leakScript = includeApiLeak ? `<script>console.log('Leaked API key:', '${API_KEY}');</script>` : '';
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    :root{--bg:#f4f7fb;--card:#ffffff;--accent:#2563eb;--muted:#4b5563;--glass:#f9fafb}
    html,body{height:100%;margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial;background:var(--bg);color:#1f2937}
    .wrap{min-height:100%;display:flex;align-items:center;justify-content:center;padding:32px}
    .card{width:100%;max-width:820px;background:var(--card);border-radius:14px;padding:28px;box-shadow:0 10px 30px rgba(0,0,0,0.1);border:1px solid #e5e7eb}
    h1{margin:0 0 8px;font-size:22px}
    p.lead{color:var(--muted);margin:0 0 16px}
    form{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    label{font-size:13px;color:var(--muted);display:block;margin-bottom:6px}
    input[type=text], input[type=password]{padding:10px;border-radius:8px;border:1px solid #d1d5db;background:var(--glass);color:inherit;width:100%;box-sizing:border-box}
    .full{grid-column:1/-1}
    .btn{display:inline-block;padding:10px 14px;border-radius:10px;border:none;background:var(--accent);color:white;font-weight:600;cursor:pointer}
    .muted{color:var(--muted);font-size:13px}
    nav{display:flex;gap:10px;align-items:center;margin-bottom:14px}
    a.navlink{color:var(--accent);text-decoration:none;font-size:14px}
    .table{width:100%;border-collapse:collapse;margin-top:12px}
    .table td{padding:8px;border-bottom:1px solid #e5e7eb}
    .small{font-size:12px;color:var(--muted)}
    .code{background:#f3f4f6;padding:6px 8px;border-radius:6px;font-family:monospace}
    footer{margin-top:12px;color:var(--muted);font-size:12px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <nav>
        <div style="flex:1">
          <strong class="small">VULN-APP</strong>
          ${user ? `<span style="margin-left:12px;color:var(--muted)">Signed in as <span class="code">${user}</span></span>` : ''}
        </div>
      </nav>

      ${bodyHtml}
    </div>
  </div>
  ${leakScript}
  ${leakComment}
</body>
</html>`;
}

app.get('/', (req, res) => {
    const html = `
      <h1>Welcome back</h1>
      <p class="lead">Sign in to access the dashboard. (This is a deliberately insecure demo.)</p>
      <form method="POST" action="/login">
        <div>
          <label>Username</label>
          <input type="text" name="username" placeholder="your username" />
        </div>
        <div>
          <label>Password</label>
          <input type="password" name="password" placeholder="••••••" />
        </div>
        <div class="full" style="display:flex;justify-content:space-between;align-items:center">
          <button class="btn">Sign in</button>
        </div>
      </form>
    `;
    res.send(page('Login — VULN-APP', html));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const query = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;
    db.get(query, (err, row) => {
        if(err) return res.send(page('Error', `<h1>Error</h1><p class="muted">An error occurred.</p>`));
        if(row){ req.session.user = username; res.redirect('/secret-info'); }
        else res.send(page('Invalid', `<h1>Invalid login</h1><p class="muted">Try again or hack it!</p><a href="/" class="btn">Back to login</a>`));
    });
});

app.get('/dashboard', (req, res) => {
    if(!req.session.user) return res.send(page('Access denied', `<h1>Access denied</h1><p class="muted">Log in first.</p>`));
    const html = `<h1>Dashboard</h1><p class="lead">Welcome, <strong>${req.session.user}</strong></p><div style="display:flex;gap:10px;margin-top:10px"><a class="btn" href="/secret-info">View Secret Info</a></div>`;
    // Inject the API leak into this page's source/console so it is visible when someone inspects the page
    res.send(page('Dashboard', html, { user: req.session.user, includeApiLeak: true }));
});

app.get('/secret-info', (req, res) => {
    if(!req.session.user) return res.send(page('Access denied', `<h1>Access denied</h1><p class="muted">Log in first.</p>`));
    db.all("SELECT id, username, password FROM users", (err, rows) => {
        if(err) return res.send(page('Error', `<h1>Error</h1><p class="muted">Error fetching data</p>`));
        let list = '<table class="table">';
        rows.forEach((r, idx)=>{ const n=idx+1; list+=`<tr><td>ID</td><td class="code">${r.id}</td><td>Username${n}</td><td class="code">${r.username}</td><td>Password${n}</td><td class="code">${r.password}</td></tr>`; });
        list += '</table>';
        res.send(page('Secret Info', `<h1>ALL USER INFO</h1><p class="muted">Demo only</p>${list}`, { user: req.session.user }));
    });
});

app.listen(3000, ()=>{ console.log("Server running at http://localhost:3000"); });

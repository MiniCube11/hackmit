const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const { API_KEY, DB_FILE } = require('./config');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Session management
app.use(session({
    secret: 'vulnsecret123', // just for dev purposes
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

// --- Routes ---

// Middleware to check authentication
function isAuthenticated(req, res, next) {
    if(req.session.user) next();
    else res.send("Access denied! Please log in.");
}

// Home / login page
app.get('/', (req, res) => {
    res.send(`
        <h2>Login</h2>
        <form method="POST" action="/login">
            Username: <input name="username" /><br>
            Password: <input name="password" type="password"/><br>
            <button>Login</button>
        </form>
    `);
});

// Vulnerable login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // ⚠️ SQL Injection vulnerability
    const query = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;
    db.get(query, (err, row) => {
        if(err) return res.send("Error");

        if(row) {
            // Legit login
            req.session.user = username;
            res.redirect('/secret-info');
        } else {
            res.send("Invalid login! Try hacking it 😉");
        }
    });
});

// Dashboard
app.get('/dashboard', isAuthenticated, (req, res) => {
    res.send(`
        <h2>Dashboard</h2>
        <p>Welcome, ${req.session.user}!</p>
        <p><a href="/secret-info">View Secret Info</a></p>
        <p>API info: <a href="/api">Get API Key</a></p>
    `);
});

// Secret info page
// Only accessible if session is set
app.get('/secret-info', (req, res) => {
    if(!req.session.user) return res.send("Access denied! Log in first.");

    // Show all sensitive data
    db.all("SELECT id, username, password FROM users", (err, rows) => {
        if(err) return res.send("Error fetching data");

        let html = "<h2>ALL USER INFO</h2><ul>";
        rows.forEach(r => {
            html += `<li>ID: ${r.id}, Username: ${r.username}, Password: ${r.password}</li>`;
        });
        html += "</ul>";
        res.send(html);
    });
});

// API key leak
app.get('/api', (req, res) => {
    if(req.query.show === "key") {
        res.send(`API KEY: ${API_KEY}`);
    } else {
        res.send('Use ?show=key to reveal API key');
    }
});

// Start server
app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});
const express = require('express');
const WebSocket = require('ws');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Mock data storage (replace with database)
let users = new Map();

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Express route handlers
app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/register", (req, res) => {
  res.sendFile(__dirname + '/register.html');
});

app.post("/register", (req, res) => {
  const user = req.body;
  const { userName, password } = user;

  if (users.has(userName)) {
    res.status(400).json({ error: "Username already taken" });
  } else {
    // Hash password and store user data (replace with actual logic)
    users.set(userName, { ...user, password: hashPassword(password) });
    res.status(200).json({ message: "Registration successful! Please log in." });
  }
});

app.get("/login", (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

app.post("/login", (req, res) => {
  const { userName, password } = req.body;

  if (users.has(userName)) {
    const user = users.get(userName);
    if (validatePassword(password, user.password)) {
      res.status(200).json({ message: "Login successful!" });
    } else {
      res.status(400).json({ error: "Invalid password" });
    }
  } else {
    res.status(400).json({ error: "Invalid username" });
  }
});

app.get("/logout", (req, res) => {
  res.status(200).json({ message: "Logout successful!" });
});

app.get("/profile", (req, res) => {
  res.status(200).json({ message: "Profile settings" });
});

app.get("/groups", (req, res) => {
  res.status(200).json({ message: "Interest groups" });
});

// WebSocket handler
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ message: 'WebSocket connection established' }));
  ws.on('message', (message) => {
    console.log('Received message:', message);
    // Handle WebSocket messages here
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const crypto = require('node:crypto');
const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3001',
  credentials: true,
}));
app.use(express.json());

/* ROUTES */

// Get all contacts
app.get('/contacts', (req, res) => {
  db.all('SELECT * FROM contacts', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get single contact
app.get('/contacts/:id', (req, res) => {
  db.get('SELECT * FROM contacts WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// Create contact
app.post('/contacts', (req, res) => {
  const {
    id,
    name,
    description,
    avatar,
    firstName,
    lastName,
    otherNames,
    relation,
    phone,
    email,
    website,
    notes,
    address,
    city,
    country,
    postalCode,
  } = req.body;

  // Generate ID if not provided
  const contactId = id || crypto.randomUUID();

  db.run(
    `INSERT INTO contacts (
      id, name, description, avatar, firstName, lastName,
      otherNames, relation, phone, email, website, notes,
      address, city, country, postalCode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contactId,
      name,
      description,
      avatar,
      firstName,
      lastName,
      otherNames,
      relation,
      phone,
      email,
      website,
      notes,
      address,
      city,
      country,
      postalCode,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: contactId });
    },
  );
});

// Update contact
app.put('/contacts/:id', (req, res) => {
  const {
    name,
    description,
    avatar,
    firstName,
    lastName,
    otherNames,
    relation,
    phone,
    email,
    website,
    notes,
    address,
    city,
    country,
    postalCode,
  } = req.body;

  db.run(
    `UPDATE contacts SET 
      name=?, description=?, avatar=?, firstName=?, lastName=?,
      otherNames=?, relation=?, phone=?, email=?, website=?, notes=?,
      address=?, city=?, country=?, postalCode=?
    WHERE id=?`,
    [
      name,
      description,
      avatar,
      firstName,
      lastName,
      otherNames,
      relation,
      phone,
      email,
      website,
      notes,
      address,
      city,
      country,
      postalCode,
      req.params.id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    },
  );
});

// Delete contact
app.delete('/contacts/:id', (req, res) => {
  db.run('DELETE FROM contacts WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

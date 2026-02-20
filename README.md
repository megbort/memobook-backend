# MemoBook Backend

Simple Node.js + Express + SQLite backend for the MemoBook contact management application.

## Setup

The backend is already set up with all necessary dependencies installed:

- Express.js (web framework)
- SQLite3 (database)
- CORS (for cross-origin requests)
- Nodemon (dev dependency for auto-reloading)

## Running the Backend

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will run on `http://localhost:3000`

## API Endpoints

### Get All Contacts

```
GET /contacts
```

### Get Single Contact

```
GET /contacts/:id
```

### Create Contact

```
POST /contacts
Content-Type: application/json

{
  "id": "string (optional - auto-generated if not provided)",
  "name": "string (required)",
  "description": "string",
  "avatar": "string (URL)",
  "firstName": "string",
  "lastName": "string",
  "otherNames": "string",
  "relation": "string",
  "phone": "string",
  "email": "string",
  "website": "string",
  "notes": "string",
  "address": "string",
  "city": "string",
  "country": "string",
  "postalCode": "string"
}
```

### Update Contact

```
PUT /contacts/:id
Content-Type: application/json

(same body structure as Create Contact)
```

### Delete Contact

```
DELETE /contacts/:id
```

## Database

The SQLite database (`contacts.db`) will be automatically created when the server starts for the first time.

### Seeding Sample Data

To populate the database with sample contacts from the frontend:

```bash
node seed.js
```

This will clear existing data and insert 5 sample contacts that match those from the frontend mock data.

## Database Schema

```sql
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar TEXT,
  firstName TEXT,
  lastName TEXT,
  otherNames TEXT,
  relation TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  notes TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  postalCode TEXT
)
```

## Connecting to Frontend

Make sure your frontend makes API calls to `http://localhost:3000`. CORS is already enabled for all origins.

Example frontend API service:

```typescript
const API_URL = 'http://localhost:3000';

export const contactService = {
  async getAll() {
    const response = await fetch(`${API_URL}/contacts`);
    return response.json();
  },

  async getById(id: string) {
    const response = await fetch(`${API_URL}/contacts/${id}`);
    return response.json();
  },

  async create(contact: Contact) {
    const response = await fetch(`${API_URL}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact),
    });
    return response.json();
  },

  async update(id: string, contact: Contact) {
    const response = await fetch(`${API_URL}/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact),
    });
    return response.json();
  },

  async delete(id: string) {
    const response = await fetch(`${API_URL}/contacts/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },
};
```

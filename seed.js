const db = require('./database');

const sampleContacts = [
  {
    id: '01',
    name: 'Harold Hidethepain',
    description: 'My childhood best friend who always knows what to say.',
    avatar:
      'https://res.cloudinary.com/dm1yyjg7i/image/upload/v1742153972/memobook/contact_avatar_1_y9j8dv.jpg',
    firstName: 'Harold',
    lastName: 'Hidethepain',
    relation: 'Best Friend',
    phone: '+1 (555) 123-4567',
    email: 'harold.h@email.com',
    website: 'www.haroldsphotography.com',
    notes:
      'Always available for deep conversations. Great listener and gives amazing advice.',
    address: '123 Maple Street',
    city: 'Springfield',
    country: 'United States',
    postalCode: '12345',
  },
  {
    id: '02',
    name: 'Bob Smith',
    description: 'My college roommate and the one who got me into gaming.',
    avatar:
      'https://res.cloudinary.com/dm1yyjg7i/image/upload/v1742153972/memobook/contact_avatar_2_fyelmr.jpg',
    firstName: 'Bob',
    lastName: 'Smith',
    relation: 'College Friend',
    phone: '+1 (555) 987-6543',
    email: 'bob.smith@gamemail.com',
    website: 'www.bobsgamingblog.com',
    notes: 'Gaming enthusiast. Still plays our favorite MMO every weekend.',
    address: '456 Oak Avenue',
    city: 'Portland',
    country: 'United States',
    postalCode: '97201',
  },
  {
    id: '03',
    name: 'Charlie Davis',
    description: 'My cousin who somehow always has the best travel deals.',
    avatar:
      'https://res.cloudinary.com/dm1yyjg7i/image/upload/v1742153973/memobook/contact_avatar_3_yk9vex.jpg',
    firstName: 'Charlie',
    lastName: 'Davis',
    otherNames: 'Charles',
    relation: 'Cousin',
    phone: '+1 (555) 555-0123',
    email: 'charlie.travels@email.com',
    website: 'www.charliesadventures.blog',
    notes:
      'Travel agent who always finds amazing deals. Ask before booking any trips!',
    address: '789 Pine Road',
    city: 'Denver',
    country: 'United States',
    postalCode: '80202',
  },
  {
    id: '04',
    name: 'Diana Lopez',
    description: 'My workout buddy who keeps me motivated at the gym.',
    avatar:
      'https://res.cloudinary.com/dm1yyjg7i/image/upload/v1742153973/memobook/contact_avatar_4_kfzm9f.jpg',
    firstName: 'Diana',
    lastName: 'Lopez',
    relation: 'Gym Buddy',
    phone: '+1 (555) 444-7890',
    email: 'diana.fitness@email.com',
    website: 'www.dianasfitness.com',
    notes:
      'Personal trainer and nutritionist. Great motivator for staying healthy.',
    address: '321 Elm Street',
    city: 'Austin',
    country: 'United States',
    postalCode: '73301',
  },
  {
    id: '05',
    name: 'Ethan Martinez',
    description: 'My go-to person for deep talks and random late-night drives.',
    avatar:
      'https://res.cloudinary.com/dm1yyjg7i/image/upload/v1742153974/memobook/contact_avatar_5_mcqgfm.jpg',
    firstName: 'Ethan',
    lastName: 'Martinez',
    relation: 'Close Friend',
    phone: '+1 (555) 222-3456',
    email: 'ethan.m@email.com',
    notes:
      'Philosophy student who loves late-night philosophical discussions. Always up for spontaneous adventures.',
    address: '654 Birch Lane',
    city: 'Seattle',
    country: 'United States',
    postalCode: '98101',
  },
];

// Clear existing data and insert sample contacts
db.serialize(() => {
  db.run('DELETE FROM contacts', (err) => {
    if (err) {
      console.error('Error clearing contacts:', err.message);
      return;
    }
    console.log('Cleared existing contacts');

    const stmt = db.prepare(`
      INSERT INTO contacts (
        id, name, description, avatar, firstName, lastName,
        otherNames, relation, phone, email, website, notes,
        address, city, country, postalCode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    sampleContacts.forEach((contact) => {
      stmt.run(
        contact.id,
        contact.name,
        contact.description,
        contact.avatar,
        contact.firstName,
        contact.lastName,
        contact.otherNames || null,
        contact.relation,
        contact.phone,
        contact.email,
        contact.website,
        contact.notes,
        contact.address,
        contact.city,
        contact.country,
        contact.postalCode,
        (err) => {
          if (err) {
            console.error('Error inserting contact:', err.message);
          }
        },
      );
    });

    stmt.finalize(() => {
      console.log('Sample contacts inserted successfully!');
      db.close();
    });
  });
});

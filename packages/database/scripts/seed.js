const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function seed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const seedsDir = path.join(__dirname, '../seeds');

    if (!fs.existsSync(seedsDir)) {
      console.log('No seeds directory found, creating sample data...');

      // Create a sample admin user
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('admin123', 10);

      await client.query(`
        INSERT INTO users (email, username, password_hash, role, is_verified)
        VALUES ('admin@improveit.today', 'admin', $1, 'admin', true)
        ON CONFLICT (email) DO NOTHING;
      `, [passwordHash]);

      console.log('✓ Created admin user (admin@improveit.today / admin123)');

    } else {
      const files = fs.readdirSync(seedsDir).sort();

      for (const file of files) {
        if (file.endsWith('.sql')) {
          console.log(`Running seed: ${file}`);
          const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
          await client.query(sql);
          console.log(`✓ Completed: ${file}`);
        }
      }
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();

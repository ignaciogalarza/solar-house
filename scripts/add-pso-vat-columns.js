const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../data/solar-house.db'));

try {
  db.exec(`ALTER TABLE electricity_tariffs ADD COLUMN pso_levy REAL`);
  console.log('Added pso_levy column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('pso_levy column already exists');
  } else {
    throw e;
  }
}

try {
  db.exec(`ALTER TABLE electricity_tariffs ADD COLUMN vat_rate REAL`);
  console.log('Added vat_rate column');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('vat_rate column already exists');
  } else {
    throw e;
  }
}

db.close();
console.log('Migration complete');

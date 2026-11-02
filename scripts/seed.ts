import { openScriptDb } from './db';
import { seed } from './seed-data';

const { db, migrate, close, label } = await openScriptDb();
console.log(`Seeding ${label}…`);
await migrate();
await seed(db);
await close();

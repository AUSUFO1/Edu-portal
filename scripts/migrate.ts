import { openScriptDb } from './db';

const { migrate, close, label } = await openScriptDb();
console.log(`Applying migrations to ${label}…`);
await migrate();
await close();
console.log('Migrations applied.');

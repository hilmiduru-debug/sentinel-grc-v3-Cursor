import fs from 'fs';

const filePath = 'supabase/seed.sql';
let content = fs.readFileSync(filePath, 'utf8');

// Replace invalid 'gt000000' with valid hex 'ee000000'
const newContent = content.replace(/gt000000/g, 'ee000000');

if (content !== newContent) {
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('Fixed invalid UUIDs in seed.sql');
} else {
  console.log('No invalid UUIDs found.');
}

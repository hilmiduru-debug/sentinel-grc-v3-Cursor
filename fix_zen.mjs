import fs from 'fs';
const filePath = 'src/features/finding-studio/components/ZenReaderWidget.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const updated = content.replace(
  /className="max-w-3xl mx-auto pb-20 space-y-12"/g, 
  'className="w-full max-w-5xl mx-auto pb-20 space-y-12 pt-4"'
);

fs.writeFileSync(filePath, updated);
console.log('Fixed wrapper in ZenReaderWidget.tsx');

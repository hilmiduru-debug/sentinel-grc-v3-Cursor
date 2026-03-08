import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  
  // Replace typical boxed layout constraints with fluid equivalents
  // It handles optional px-X that might be there already to prevent duplicate paddings
  newContent = newContent.replace(/max-w-(?:7xl|6xl|5xl|screen-xl|screen-2xl) mx-auto(?:\s+px-\d+)?/g, 'w-full px-4 sm:px-6 lg:px-8');
  newContent = newContent.replace(/max-w-\[(?:1600px|1800px|1440px)\] mx-auto(?:\s+px-\d+)?/g, 'w-full px-4 sm:px-6 lg:px-8');
  newContent = newContent.replace(/container mx-auto(?:\s+px-\d+)?/g, 'w-full px-4 sm:px-6 lg:px-8');
  newContent = newContent.replace(/w-full max-w-full(?:\s+px-\d+)?/g, 'w-full px-4 sm:px-6 lg:px-8');
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Fixed:', filePath);
  }
}

['src/pages', 'src/app/layout', 'src/features', 'src/widgets', 'src/entities'].forEach(dir => {
  walkDir(dir, processFile);
});

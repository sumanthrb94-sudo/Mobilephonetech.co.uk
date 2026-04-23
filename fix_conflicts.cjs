const fs = require('fs');

let content = fs.readFileSync('src/data.ts', 'utf8');

// Keep the "theirs" side (after =======, before >>>>>>>) in each conflict
// These are the correct generated image URLs from the new commit
let result = '';
let i = 0;
const lines = content.split('\n');
let inConflict = false;
let inOurs = false;
let inTheirs = false;

for (const line of lines) {
  if (line.startsWith('<<<<<<< HEAD')) {
    inConflict = true;
    inOurs = true;
    inTheirs = false;
    continue;
  }
  if (inConflict && line.startsWith('=======')) {
    inOurs = false;
    inTheirs = true;
    continue;
  }
  if (inConflict && line.startsWith('>>>>>>>')) {
    inConflict = false;
    inOurs = false;
    inTheirs = false;
    continue;
  }
  
  if (!inOurs) {
    result += line + '\n';
  }
}

// Remove trailing newline added at end
if (result.endsWith('\n')) {
  result = result.slice(0, -1);
}

fs.writeFileSync('src/data.ts', result);
console.log('Fixed data.ts - all conflicts resolved keeping new image URLs');

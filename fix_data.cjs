const fs = require('fs');
let content = fs.readFileSync('src/data.ts', 'utf8');
content = content.replace(/<<<<<<< HEAD[\s\S]*?=======\n([\s\S]*?)>>>>>>> 482a522.*?\n/g, '$1');
fs.writeFileSync('src/data.ts', content);
console.log('Fixed data.ts');

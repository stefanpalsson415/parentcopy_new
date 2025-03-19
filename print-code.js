// Save this as print-code.js
const fs = require('fs');
const path = require('path');

const directoryPath = '.'; // Use current directory
let allCode = '';

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('node_modules') && !file.startsWith('.git')) {
      processDirectory(filePath);
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx'))) {
      allCode += `\n\n--------------- ${filePath} ---------------\n\n`;
      allCode += fs.readFileSync(filePath, 'utf8');
    }
  });
}

processDirectory(directoryPath);
fs.writeFileSync('all-code.txt', allCode);
console.log('All code written to all-code.txt');
const fs = require('fs');
const content = fs.readFileSync('src/app/(main)/upload/extract/page.tsx', 'utf8');
// Strip strings (single, double, template) and comments
const stripped = content
  .replace(/'[^']*'/g, '"S"')
  .replace(/"[^"]*"/g, '"S"')
  .replace(/`[^`]*`/g, '"S"')
  .replace(/\/\/[^\n]*/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const openB = (stripped.match(/{/g) || []).length;
const closeB = (stripped.match(/}/g) || []).length;
const openP = (stripped.match(/\(/g) || []).length;
const closeP = (stripped.match(/\)/g) || []).length;
console.log('Braces: { ' + openB + ' } ' + closeB + ' diff=' + (openB - closeB));
console.log('Parens:  ( ' + openP + ' ) ' + closeP + ' diff=' + (openP - closeP));

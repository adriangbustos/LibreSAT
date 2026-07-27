const fs = require('fs');
const path = 'public/questions_database.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
let modified = 0;

data.forEach(q => {
  if (q.stimulus && q.stimulus.includes('|---|')) {
    const orig = q.stimulus;
    const lines = orig.split(/\\n|\r?\n/);
    
    let tableLines = [];
    let otherLines = [];
    
    for (const l of lines) {
      const t = l.trim();
      if (t.startsWith('|') && t.endsWith('|')) {
        tableLines.push(t);
      } else {
        otherLines.push(l);
      }
    }
    
    if (tableLines.length >= 3) {
      // Find the separator line to distinguish header and rows
      const sepIndex = tableLines.findIndex(l => l.includes('|---|'));
      if (sepIndex > 0) {
        const headerLine = tableLines[sepIndex - 1];
        const rowLines = tableLines.slice(sepIndex + 1);
        
        const cleanCell = (str) => {
          let s = str.trim();
          // Remove math $ signs for simple numbers, but we'll just replace $
          s = s.replace(/\$/g, '');
          return s;
        };
        
        const extractRow = (line) => {
          return line.split('|').slice(1, -1).map(cleanCell);
        };
        
        const headers = extractRow(headerLine);
        const rows = rowLines.map(extractRow);
        
        q.table_data = { headers, rows };
        
        // Now clean the stimulus
        const separator = orig.includes('\\n') ? '\\n' : '\n';
        let cleaned = otherLines.join(separator).trim();
        if (separator === '\\n') {
          cleaned = cleaned.replace(/(\\n)+/g, '\\n\\n');
        } else {
          cleaned = cleaned.replace(/\n+/g, '\n\n');
        }
        
        q.stimulus = cleaned;
        modified++;
      }
    }
  }
});

console.log('Modified', modified, 'questions.');
if (modified > 0) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

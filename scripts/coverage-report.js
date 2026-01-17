#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

try {
  const coverageFile = path.join(__dirname, '../coverage.json');
  const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));

  const total = coverage.total;
  
  console.log('\n' + '═'.repeat(90));
  console.log('📊 CODE COVERAGE SUMMARY');
  console.log('═'.repeat(90) + '\n');

  console.log('📈 OVERALL METRICS:');
  console.log(`  Lines:       ${total.lines.pct.toFixed(2)}% (${total.lines.covered}/${total.lines.total})`);
  console.log(`  Statements:  ${total.statements.pct.toFixed(2)}% (${total.statements.covered}/${total.statements.total})`);
  console.log(`  Functions:   ${total.functions.pct.toFixed(2)}% (${total.functions.covered}/${total.functions.total})`);
  console.log(`  Branches:    ${total.branches.pct.toFixed(2)}% (${total.branches.covered}/${total.branches.total})\n`);

  // Get files sorted by line coverage
  const files = Object.entries(coverage)
    .filter(([key]) => key !== 'total')
    .map(([filePath, data]) => {
      const relativePath = filePath
        .replace(/^.*\/src\//, 'src/')
        .replace(/^\/home\/runner\/work\/angular_prayerapp\/angular_prayerapp\//, '');
      
      return {
        path: relativePath,
        lines: data.l ? data.l.pct : 0,
        statements: data.s ? data.s.pct : 0,
        functions: data.f ? data.f.pct : 0,
        branches: data.b ? data.b.pct : 0,
      };
    })
    .sort((a, b) => b.lines - a.lines);

  console.log('📁 FILE COVERAGE (sorted by line coverage):');
  console.log('─'.repeat(90));
  console.log('File'.padEnd(50) + 'Lines'.padStart(12) + 'Stmts'.padStart(10) + 'Funcs'.padStart(10) + 'Branch'.padStart(10));
  console.log('─'.repeat(90));

  files.forEach(f => {
    const lines = f.lines.toFixed(1).padStart(11) + '%';
    const stmts = f.statements.toFixed(1).padStart(9) + '%';
    const funcs = f.functions.toFixed(1).padStart(9) + '%';
    const branch = f.branches.toFixed(1).padStart(9) + '%';
    
    console.log(f.path.padEnd(50) + lines + stmts + funcs + branch);
  });

  console.log('─'.repeat(90) + '\n');
  console.log(`Total files analyzed: ${files.length}\n`);

} catch (error) {
  console.error('Error reading coverage report:', error.message);
  process.exit(1);
}

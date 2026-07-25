#!/usr/bin/env node
 
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8');
let terser;
try {
  terser = require('terser');
} catch (e) {
  process.stderr.write('terser not available: ' + e.message + '\n');
  process.exit(3);
}
let result;
try {
  result = terser.minify(input, {
    compress: false,
    mangle: false,
    format: { comments: false },
    sourceMap: false,
  });
} catch (e) {
  process.stderr.write('terser threw: ' + (e && e.message ? e.message : String(e)) + '\n');
  process.exit(1);
}
if (result && result.error) {
  process.stderr.write('terser error: ' + JSON.stringify(result.error) + '\n');
  process.exit(1);
}
if (!result || typeof result.code !== 'string') {
  process.stderr.write('terser returned no code\n');
  process.exit(1);
}
process.stdout.write(result.code);
if (!result.code.endsWith('\n')) process.stdout.write('\n');

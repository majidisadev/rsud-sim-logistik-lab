const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Production Server...');
console.log('');

// Change to the directory where this script is located
process.chdir(__dirname);

// Run npm start
const npm = spawn('npm', ['start'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

npm.on('error', (error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});

npm.on('exit', (code) => {
  if (code !== 0) {
    console.error(`npm start exited with code ${code}`);
  }
  process.exit(code);
});


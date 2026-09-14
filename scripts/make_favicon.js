import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imgPath = 'C:/Users/lenovo/.gemini/antigravity-ide/brain/b41e5ee1-127c-45c6-a777-27399242f472/.user_uploaded/media_1789366959704.jpg';

if (!fs.existsSync(imgPath)) {
  console.error('File does not exist:', imgPath);
  process.exit(1);
}

const buffer = fs.readFileSync(imgPath);
const b64 = buffer.toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="100%" height="100%">
  <image width="1024" height="1024" href="data:image/png;base64,${b64}" />
</svg>
`;

fs.writeFileSync(path.join(__dirname, '../public/favicon.svg'), svg, 'utf8');
fs.copyFileSync(imgPath, path.join(__dirname, '../public/logo.png'));

if (fs.existsSync(path.join(__dirname, '../dist'))) {
  fs.writeFileSync(path.join(__dirname, '../dist/favicon.svg'), svg, 'utf8');
  fs.copyFileSync(imgPath, path.join(__dirname, '../dist/logo.png'));
}

console.log('Successfully updated favicon.svg and logo.png in public and dist directories!');

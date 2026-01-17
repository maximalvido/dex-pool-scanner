import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';

function getAllJsFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  files.forEach(file => {
    const filePath = join(dir, file);
    if (statSync(filePath).isDirectory()) {
      getAllJsFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const distDir = join(process.cwd(), 'dist');
const jsFiles = getAllJsFiles(distDir);

for (const file of jsFiles) {
  let content = readFileSync(file, 'utf-8');
  const fileDir = dirname(file);
  const distRelativePath = relative(distDir, fileDir);
  
  const importRegex = /from\s+['"](\.\.?\/[^'"]+)['"]/g;
  const exportRegex = /export\s+.*\s+from\s+['"](\.\.?\/[^'"]+)['"]/g;
  
  content = content.replace(importRegex, (match, importPath) => {
    if (!importPath.endsWith('.js') && !importPath.endsWith('.json') && !importPath.includes('node_modules')) {
      return `from '${importPath}.js'`;
    }
    return match;
  });
  
  content = content.replace(exportRegex, (match, importPath) => {
    if (!importPath.endsWith('.js') && !importPath.endsWith('.json') && !importPath.includes('node_modules')) {
      const beforeFrom = match.substring(0, match.indexOf('from'));
      return `${beforeFrom}from '${importPath}.js'`;
    }
    return match;
  });
  
  writeFileSync(file, content, 'utf-8');
}

console.log(`✅ Added .js extensions to ${jsFiles.length} files`);

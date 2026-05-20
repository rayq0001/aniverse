const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'App.tsx',
  'server.ts',
  'components/Layout.tsx',
  'components/AiConcierge.tsx',
  'components/ManhwaCard.tsx',
  'pages/Home.tsx',
  'pages/Details.tsx',
  'pages/Library.tsx',
  'pages/Reader.tsx',
  'pages/UserProfile.tsx',
  'pages/Profile.tsx'
];

const basePath = '/Users/rayq0001/Downloads/aniverse-main 6';

filesToUpdate.forEach(file => {
  const filePath = path.join(basePath, file);
  if (!fs.existsSync(filePath)) {
    console.log('Skipping ' + file + ' - not found');
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace /details/ to /manga/
  content = content.replace(/"\/details\//g, '"/manga/');
  content = content.replace(/'\/details\//g, "'/manga/");
  content = content.replace(/`\/details\//g, '`/manga/');

  // Replace /reader/ to /read/
  content = content.replace(/"\/reader\//g, '"/read/');
  content = content.replace(/'\/reader\//g, "'/read/");
  content = content.replace(/`\/reader\//g, '`/read/');

  // Replace advanced-search to explore
  content = content.replace(/"\/advanced-search/g, '"/explore');
  content = content.replace(/'\/advanced-search/g, "'/explore");
  content = content.replace(/`\/advanced-search/g, '`/explore');
  content = content.replace(/"advanced-search"/g, '"explore"'); // server.ts enum
  content = content.replace(/'advanced-search'/g, "'explore'");

  // Replace /library to /bookmarks
  content = content.replace(/"\/library/g, '"/bookmarks');
  content = content.replace(/'\/library/g, "'/bookmarks");
  content = content.replace(/`\/library/g, '`/bookmarks');
  content = content.replace(/"library"/g, '"bookmarks"'); // server.ts enum
  content = content.replace(/'library'/g, "'bookmarks'");
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + file);
  } else {
    console.log('No changes in ' + file);
  }
});

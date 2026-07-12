const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '..', 'assets');
const sourceIcon = path.join(assetsDir, 'source-icon.png');

const sizes = [
  { size: 1024, name: 'icon.png' },
  { size: 432, name: 'icon-foreground.png' },
  { size: 256, name: 'favicon.png' }
];

async function resizeIcons() {
  try {
    console.log('Starting icon resizing...');
    
    // Check if source exists
    if (!fs.existsSync(sourceIcon)) {
      console.error(`Source icon not found: ${sourceIcon}`);
      process.exit(1);
    }

    for (const { size, name } of sizes) {
      const outputPath = path.join(assetsDir, name);
      console.log(`Resizing to ${size}x${size} -> ${name}...`);
      
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Created ${name}`);
    }
    
    console.log('All icons resized successfully!');
  } catch (error) {
    console.error('Error resizing icons:', error);
    process.exit(1);
  }
}

resizeIcons();

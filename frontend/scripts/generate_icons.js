const JimpModule = require('jimp');
const Jimp = JimpModule && JimpModule.default ? JimpModule.default : JimpModule;
const path = require('path');

(async () => {
  try {
    const assetsDir = path.join(__dirname, '..', 'assets');
    const src = path.join(assetsDir, 'source-icon.png');
    const outIcon = path.join(assetsDir, 'icon.png');
    const outForeground = path.join(assetsDir, 'icon-foreground.png');
    const outFavicon = path.join(assetsDir, 'favicon.png');

    const image = await Jimp.read(src);

    await image.clone().cover(1024, 1024).writeAsync(outIcon);
    console.log('Wrote', outIcon);

    await image.clone().cover(432, 432).writeAsync(outForeground);
    console.log('Wrote', outForeground);

    await image.clone().cover(256, 256).writeAsync(outFavicon);
    console.log('Wrote', outFavicon);

    console.log('Icon generation complete.');
  } catch (err) {
    console.error('Failed to generate icons:', err);
    process.exit(1);
  }
})();

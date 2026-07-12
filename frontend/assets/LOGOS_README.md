Place the provided logo image into this folder and create the files below to use the logo as app icons.

Required files (recommended filenames):
- icon.png           — 1024x1024 PNG (Expo app icon)
- icon-foreground.png — 432x432 PNG (Android adaptive icon foreground image)
- favicon.png        — 256x256 PNG (web favicon)

Tips:
- For best results, export a square PNG with a transparent background (or dark background to match app). 1024x1024 is a common source size.
- You can generate multiple sizes from a single 1024x1024 source with ImageMagick, e.g.:

  magick convert icon-source.png -resize 1024x1024 icon.png
  magick convert icon-source.png -resize 432x432 icon-foreground.png
  magick convert icon-source.png -resize 256x256 favicon.png

- After placing the files, rebuild the app or run `expo start` for local dev. Expo will pick up `app.json` icon entries.

Notes:
- I could embed the uploaded image into the repo if you want — say the filenames above — tell me if you want me to add them automatically.

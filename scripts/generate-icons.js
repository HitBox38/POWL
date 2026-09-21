/* global __dirname, Buffer */
/** Raster exports come from the editable SVG, never the other way around.
 * Run with `node scripts/generate-icons.js` and sharp available on NODE_PATH
 * (or installed locally with `npm install --no-save --package-lock=false sharp`).
 * Add --android to refresh the existing generated Android project's resources.
 */
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
// Release native file handles before replacing existing resources on Windows.
sharp.cache(false);

const imageDir = path.join(__dirname, "..", "assets", "images");
const navy = "#161D1A";

async function main() {
  const source = await fs.readFile(
    path.join(imageDir, "powl-mark.svg"),
    "utf8",
  );
  const artwork = source
    .replace(
      /<svg[^>]*>|<\/svg>|<title>[\s\S]*?<\/title>|<desc>[\s\S]*?<\/desc>/g,
      "",
    )
    .trim();
  const svg = (body) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">\n${body}\n</svg>\n`;
  const background = `<rect width="512" height="512" fill="${navy}"/>`;
  const icon = svg(
    `${background}\n<g transform="translate(256 256) scale(1.3) translate(-256 -266)">${artwork}</g>`,
  );
  // The entire adaptive mark fits inside Android's central 66/108 safe zone.
  const adaptive = svg(
    `<g transform="translate(256 256) scale(0.85) translate(-256 -266)">${artwork}</g>`,
  );
  const splash = svg(`<g transform="translate(0 -10)">${artwork}</g>`);
  const monochrome = adaptive.replace(/#8DD5BC|#F7F7F2/g, "#FFFFFF");
  await fs.writeFile(path.join(imageDir, "powl-icon.svg"), icon);
  const render = (input, name, size, opaque = false) => {
    const output = sharp(Buffer.from(input)).resize(size, size);
    return (opaque ? output.removeAlpha() : output)
      .png()
      .toFile(path.join(imageDir, name));
  };
  await Promise.all([
    render(icon, "icon.png", 1024, true),
    render(icon, "favicon.png", 48, true),
    render(adaptive, "android-icon-foreground.png", 1024),
    render(svg(background), "android-icon-background.png", 1024, true),
    render(monochrome, "android-icon-monochrome.png", 1024),
    render(splash, "splash-icon.png", 512),
  ]);
  if (process.argv.includes("--android")) {
    const resDir = path.join(
      __dirname,
      "..",
      "android",
      "app",
      "src",
      "main",
      "res",
    );
    const roundIcon = icon.replace(
      '<rect width="512" height="512"',
      '<rect width="512" height="512" rx="256"',
    );
    const exports = {
      "ic_launcher.webp": icon,
      "ic_launcher_round.webp": roundIcon,
      "ic_launcher_foreground.webp": adaptive,
      "ic_launcher_background.webp": svg(background),
      "ic_launcher_monochrome.webp": monochrome,
      "splashscreen_logo.png": splash,
    };
    for (const folder of await fs.readdir(resDir)) {
      if (!/^(mipmap|drawable)-(mdpi|hdpi|xhdpi|xxhdpi|xxxhdpi)$/.test(folder))
        continue;
      for (const file of await fs.readdir(path.join(resDir, folder))) {
        if (!exports[file]) continue;
        const target = path.join(resDir, folder, file);
        const { width, height } = await sharp(target).metadata();
        const rendered = sharp(Buffer.from(exports[file])).resize(
          width,
          height,
        );
        const buffer = await (
          file.endsWith(".webp")
            ? rendered.webp({ lossless: true })
            : rendered.png()
        ).toBuffer();
        await fs.writeFile(target, buffer);
      }
    }
    console.log("Updated existing Android launcher and splash resources.");
  }
  console.log("Generated POWL SVG icon and six PNG assets.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

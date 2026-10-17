"""Export generated DA'MA masters. Requires Pillow; not needed for normal builds."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
VARIANTS = ["monogram-dark", "monogram-light", "board-light", "board-dark"]
for variant in VARIANTS:
    label = variant.replace("-", " · ").title()
    background = "#283e39" if variant.endswith("dark") else "#faf8f2"
    source = Image.open(ROOT / "design/app-icons/masters" / f"{variant}.png").convert("RGB")
    folder = ROOT / "public/icons" / variant
    folder.mkdir(parents=True, exist_ok=True)
    for size in [32, 180, 192, 512]:
        source.resize((size, size), Image.Resampling.LANCZOS).save(folder / f"icon-{size}.png", optimize=True)
    # Shrink the whole emblem inside the central maskable safe circle.
    maskable = Image.new("RGB", (512, 512), source.getpixel((0, 0)))
    maskable.paste(source.resize((368, 368), Image.Resampling.LANCZOS), (72, 72))
    maskable.save(folder / "maskable-512.png", optimize=True)
    manifest = {
        "id": "/", "name": "DA’MA", "short_name": "DA’MA",
        "description": "Three pawns. Find your way across. A free strategy game.",
        "start_url": f"/?app-icon={variant}", "scope": "/", "display": "standalone",
        "theme_color": background, "background_color": background,
        "icons": [
            {"src": f"/icons/{variant}/icon-{size}.png", "sizes": f"{size}x{size}", "type": "image/png", "purpose": "any"}
            for size in [192, 512]
        ] + [{"src": f"/icons/{variant}/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
    }
    manifests = ROOT / "public/manifests"
    manifests.mkdir(exist_ok=True)
    (manifests / f"{variant}.webmanifest").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    install = ROOT / "public/install"
    install.mkdir(exist_ok=True)
    (install / f"{variant}.html").write_text(f'''<!doctype html>
<html lang="en" data-install-icon="{variant}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex"><meta name="theme-color" content="{background}">
<title>DA’MA · {label} icon preview</title>
<link rel="manifest" href="/manifests/{variant}.webmanifest">
<link rel="apple-touch-icon" sizes="180x180" href="/icons/{variant}/icon-180.png">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/{variant}/icon-32.png">
<meta name="apple-mobile-web-app-title" content="DA’MA">
<link rel="stylesheet" href="/install/preview.css"><script src="/install/preview.js" defer></script>
</head><body><main>
<p class="eyebrow">DA’MA · APP ICON TEST</p><img class="preview" src="/icons/{variant}/icon-512.png" width="160" height="160" alt="{label} app icon">
<h1>{label}</h1><p>This icon is selected for a new DA’MA installation.</p>
<button id="install-button" hidden>Install DA’MA</button><p id="install-status" role="status"></p>
<p id="install-instructions">On iPhone, open this page in Safari and use Share → Add to Home Screen. On other devices, use the browser’s Install app or Add to Home Screen option if offered.</p>
<p class="note">Already installed? This preview does not instantly replace an existing home-screen icon. Light and dark are separate choices, independent of the game theme. Open the game once online and check Settings → Install &amp; offline play before relying on offline access.</p>
<a class="back" href="/?app-icon={variant}">Back to DA’MA →</a>
</main></body></html>
''', encoding="utf-8")
print("Exported four icon families, maskable assets, manifests and installation previews.")

# DA’MA app icon families

Generated with the built-in image-generation tool on 17 October 2026. These are the Board (concept 2) and D Monogram (concept 3), each in light and dark. **Monogram Dark** is the default. They are independent installation choices, not automatic OS appearance variants.

## Files

- `masters/monogram-dark.png`: original generated D mark, forest background, ivory D, coral/blue endpoint discs.
- `masters/monogram-light.png`: reference edit of the dark master; ivory background and forest D.
- `masters/board-light.png`: original generated nine-node board, sage paths on ivory, blue/coral discs.
- `masters/board-dark.png`: reference edit of the light board; forest background and ivory paths.
- `prompts.md`: generation/edit prompt set and constraints.
- `../../public/icons/<variant>/`: committed PNG exports at 32, 180, 192 and 512 pixels plus maskable 512.
- `../../scripts/export-icons.py`: deterministic Pillow resampling/export and static installation metadata generator. Masters are preserved; normal builds do not run this script.

Run the exporter with Python and Pillow when masters change, then run `npm.cmd run format`. The maskable export adds background padding so the emblem survives circular masks. App icon files are opaque squares; the preview UI and operating system supply rounded corners.

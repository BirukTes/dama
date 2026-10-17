# Prompt set

Tool: built-in `image_gen` (not the API/CLI fallback). Four calls: two originals, followed by two reference edits. These are the production prompt briefs; source images remain in `masters/`.

## Shared original specification

Use case: logo-brand. One finished square PWA app icon for DA’MA, a minimalist strategy game. Full-bleed opaque square, no rounded outer corners, frame, label, mockup, gradient, texture, shadow or watermark. Crisp flat vector-like shapes, central safe margins for operating-system masks. Palette: forest #283e39, ivory #faf8f2, sage #93a18f, blue #397daf, coral #c9644c.

## Board Light

Exactly nine nodes in a three-by-three square grid. Thick sage connections: perimeter, central vertical and horizontal paths and both diagonals through the centre. Seven sage nodes; middle left is a blue disc with a small white ring; middle right is a coral disc with a white diamond outline. Coloured discs slightly larger. Ivory full-bleed background, no border or lettering. Simple geometric board-game identity.

## Monogram Dark

Solid forest background. One large bold capital D in ivory, straight left stem and broadly rounded right bowl, forest counter. A thick continuous route. Coral circular disc at upper-left junction and blue disc at lower-left junction, narrow ivory separating rims. Legible D, no other lettering or tiny detail, approximately 20% safe margins.

## Board Dark reference edit

Reference: Board Light. Preserve all nine-node geometry, connections, disc positions, proportions, blue ring and coral diamond symbols. Change only background to forest and sage paths/nodes to ivory. Keep blue/coral discs and white symbols. Flat crisp colours; no extra shapes, border, rounded outer corners or text.

## Monogram Light reference edit

Reference: Monogram Dark. Preserve D geometry, position, proportions, margins and upper coral/lower blue discs. Change forest canvas to ivory and ivory D to forest. Keep coloured discs with narrow ivory separation rims. No extra lettering, frame, texture, gradients or rounded outer corners.

Only deterministic resampling, RGB PNG export and maskable padding are applied after generation. No generated master is overwritten.

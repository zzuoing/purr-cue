# Approved PurrCue icon

`purrcue-icon-approved.png` is the user-approved front-ear, no-mouth image.
The oval nose is retained. The ears overlap the round head with visible roots.

Run `npm run icons` to convert this exact bitmap to the production PNG and ICO
variants. This resizes and packages the bitmap; it does not redraw the design.

- `assets/cat-head.png`: 256 px, application window, tray, and README artwork.
- `assets/app-icon.png`: 1024 px, macOS/Linux packaging input.
- `assets/cat-head.ico`: 16, 24, 32, 48, 64, 128, and 256 px, Windows executable/installer.

The earlier `concepts/CatHeadIconRenderer.cs` is a historical design reference.
It produces the old mouth and rear-ear design and should not overwrite these files.
Animation assets, including the original stretch GIF, are independent of this icon.

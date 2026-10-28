#!/usr/bin/env bash
# Optional local Linux build from WSL, isolated from Windows node_modules.
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
build_root="$project_root/work/linux-build"
runtime_root="$project_root/work/linux-runtime"
mkdir -p "$build_root" "$runtime_root"
cd "$runtime_root"
curl -fLsS https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o SHASUMS256.txt
node_archive="$(awk '$2 ~ /linux-x64.tar.xz$/ { print $2 }' SHASUMS256.txt)"
[[ "$node_archive" =~ ^node-v24\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$ ]] || { echo 'Unexpected Node archive name'; exit 1; }
if [[ ! -f "$node_archive" ]]; then curl -fLsS "https://nodejs.org/dist/latest-v24.x/$node_archive" -o "$node_archive"; fi
awk -v archive="$node_archive" '$2 == archive' SHASUMS256.txt | sha256sum --check -
if [[ ! -x "${node_archive%.tar.xz}/bin/node" ]]; then tar -xJf "$node_archive"; fi
export PATH="$runtime_root/${node_archive%.tar.xz}/bin:$PATH"
reuse_dependencies=false
if [[ -d "$build_root/node_modules/flatpickr" ]] && cmp -s "$project_root/package-lock.json" "$build_root/package-lock.json"; then reuse_dependencies=true; fi
for directory in src scripts test assets; do mkdir -p "$build_root/$directory"; rsync -a "$project_root/$directory/" "$build_root/$directory/"; done
cp "$project_root/package.json" "$project_root/package-lock.json" "$build_root/"
cd "$build_root"
node --version
if [[ "$reuse_dependencies" == true ]]; then npm run postinstall; else npm ci --registry=https://registry.npmjs.org; fi
npm run check
npm test
xvfb-run -a node_modules/.bin/electron --no-sandbox --disable-gpu scripts/smoke.cjs
npm run dist:linux -- --x64 --publish never
app_version="$(node -p 'require("./package.json").version')"
APPIMAGE_EXTRACT_AND_RUN=1 PACKAGED_EXE="$build_root/release/DesktopReminder-$app_version-linux-x86_64.AppImage" xvfb-run -a node scripts/verify-package.cjs
mkdir -p "$project_root/release"
cp "release/DesktopReminder-$app_version-linux-x86_64.AppImage" "release/DesktopReminder-$app_version-linux-amd64.deb" "$project_root/release/"

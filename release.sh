#!/usr/bin/env bash
# release.sh: produce a clean zip ready for Steam Workshop upload.
#
# Usage:  ./release.sh
# Output: dist/readable-tooltips-vX.Y.Z.zip  (X.Y.Z read from the modinfo <Version>)
#
# What this does:
#   1. Mirrors the mod source into dist/readable-tooltips/ (excluding dev cruft).
#   2. Ships readable JS (no minification; transparent source is a core property).
#   3. Verifies the modinfo has Version + Authors set to non-default values.
#   4. Zips the result with `readable-tooltips/` as the zip root (Steam Workshop
#      needs the modinfo at zip root, not inside a wrapper folder).
#   5. Audits the zip against an allow-list so no docs/dev files leak in.
#   6. Renders the 1024x1024 Workshop preview and writes steamcmd .vdf manifests.
#
# Run from the mod source directory.

set -euo pipefail

cd "$(dirname "$0")"

MOD_ID="readable-tooltips"
MOD_TITLE="Readable Tool Tips"
DIST_DIR="dist"

# Source detection: this script lives at the mod root (next to the modinfo),
# but the zip needs `readable-tooltips/` as the root folder name regardless.
if [ -f "$MOD_ID.modinfo" ]; then
    SRC_DIR="."
elif [ -f "$MOD_ID/$MOD_ID.modinfo" ]; then
    SRC_DIR="$MOD_ID"
else
    echo "error: no $MOD_ID.modinfo in $(pwd) or $(pwd)/$MOD_ID/"
    exit 1
fi

# Pull <Version> from the modinfo (first match wins).
VERSION="$(grep -oE '<Version>[^<]+</Version>' "$SRC_DIR/$MOD_ID.modinfo" \
    | head -1 | sed -E 's|</?Version>||g')"
[ -n "$VERSION" ] || { echo "error: could not parse <Version> from modinfo"; exit 1; }

AUTHORS="$(grep -oE '<Authors>[^<]+</Authors>' "$SRC_DIR/$MOD_ID.modinfo" \
    | head -1 | sed -E 's|</?Authors>||g')"
case "$AUTHORS" in
    ""|"Your Name"|"TODO")
        echo "error: <Authors> in modinfo is '$AUTHORS'; provide a release author name before packaging."
        exit 1
        ;;
esac

case "$VERSION" in
    *-smoke|*-dev|0.0.*)
        echo "error: <Version> '$VERSION' looks like a dev tag; bump to a release version first."
        exit 1
        ;;
esac

# ── Steam Workshop published file id ──────────────────────────────────────
# The publishedfileid is what makes steamcmd UPDATE the existing Workshop item
# instead of creating a duplicate. It must survive the `rm -rf dist` below, so we
# persist it OUTSIDE dist/ in steam_workshop_id.txt (committed to the repo).
# Resolution priority: saved steam_workshop_id.txt is authoritative by default;
# WORKSHOP_PUBLISHED_FILE_ID may be used only when it matches the saved id (or
# no saved id exists); final fallback recovers from leftover dist/workshop_item.vdf.
WORKSHOP_ID_FILE="$SRC_DIR/steam_workshop_id.txt"
PUBLISHED_FILE_ID="${WORKSHOP_PUBLISHED_FILE_ID:-}"
SAVED_PUBLISHED_FILE_ID=""
if [ -f "$WORKSHOP_ID_FILE" ]; then
    SAVED_PUBLISHED_FILE_ID="$(tr -dc '0-9' < "$WORKSHOP_ID_FILE")"
fi
if [ -n "$PUBLISHED_FILE_ID" ] && [ -n "$SAVED_PUBLISHED_FILE_ID" ] \
    && [ "$PUBLISHED_FILE_ID" != "$SAVED_PUBLISHED_FILE_ID" ]; then
    echo "error: WORKSHOP_PUBLISHED_FILE_ID ($PUBLISHED_FILE_ID) conflicts with"
    echo "       steam_workshop_id.txt ($SAVED_PUBLISHED_FILE_ID)."
    echo "       Refusing to override the saved mod number."
    exit 1
fi
if [ -z "$PUBLISHED_FILE_ID" ] && [ -n "$SAVED_PUBLISHED_FILE_ID" ]; then
    PUBLISHED_FILE_ID="$SAVED_PUBLISHED_FILE_ID"
fi
if [ -z "$PUBLISHED_FILE_ID" ] && [ -f "$DIST_DIR/workshop_item.vdf" ]; then
    PUBLISHED_FILE_ID="$(grep -oE '"publishedfileid"[[:space:]]*"[0-9]+"' \
        "$DIST_DIR/workshop_item.vdf" | grep -oE '[0-9]+' | head -1 || true)"
fi

ZIP_NAME="$MOD_ID-v${VERSION}.zip"
TARGET_DIR="$DIST_DIR/$MOD_ID"
ZIP_PATH="$DIST_DIR/$ZIP_NAME"

echo "==> Cleaning $DIST_DIR/"
rm -rf "$DIST_DIR"
mkdir -p "$TARGET_DIR"

echo "==> Mirroring $SRC_DIR/ → $TARGET_DIR/ (excluding dev cruft)"
rsync -a --exclude='.git' --exclude='.gitignore' --exclude='.DS_Store' --exclude='dist' \
    --exclude='release.sh' --exclude='*.bak' --exclude='node_modules' \
    --exclude='docs' --exclude='steam_workshop_id.txt' --exclude='CONTRIBUTING.md' \
    "$SRC_DIR"/ "$TARGET_DIR"/

echo "==> Syntax-checking dist JS"
find "$TARGET_DIR" -name '*.js' -type f -print0 | xargs -0 -n1 node -c

echo "==> Verifying modinfo at zip root"
[ -f "$TARGET_DIR/$MOD_ID.modinfo" ] \
    || { echo "error: $TARGET_DIR/$MOD_ID.modinfo missing"; exit 1; }

echo "==> Zipping $ZIP_PATH"
( cd "$DIST_DIR" && zip -qr "$ZIP_NAME" "$MOD_ID" )

# Allow-list audit: fail the build on any shipped file that isn't expected, so a
# loose rsync exclude can't silently ship docs/, dev configs, .DS_Store, etc.
# Update ALLOW when a new shipped file type is added.
echo "==> Verifying zip contents against allow-list"
ALLOW="^$MOD_ID/($MOD_ID\.modinfo|README\.md|LICENSE|CHANGELOG\.md)$"
ALLOW="$ALLOW"'|^'"$MOD_ID"'/ui/.+\.(js|html|css)$'
ALLOW="$ALLOW"'|^'"$MOD_ID"'/images/.+\.(svg|png)$'
ALLOW="$ALLOW"'|^'"$MOD_ID"'/text/[a-z_]+/ModText\.xml$'
UNEXPECTED="$(unzip -Z1 "$ZIP_PATH" | grep -vE '/$' | grep -vE "$ALLOW" || true)"
if [ -n "$UNEXPECTED" ]; then
    echo "error: zip contains entries not on the allow-list:"
    echo "$UNEXPECTED" | sed 's/^/    /'
    echo "  → tighten the rsync --exclude list, or update ALLOW in release.sh if intended."
    exit 1
fi
echo "    OK: every shipped entry matches the allow-list."

echo "==> Zip contents:"
unzip -l "$ZIP_PATH" | head -25 || true

SIZE="$(du -h "$ZIP_PATH" | cut -f1)"

# ── Steam Workshop upload assets ──────────────────────────────────────────
# Prefer the branded preview card (docs/workshop-preview.svg: dark frame + logo
# + wordmark) over the bare icon, since the card reads far better in the grid.
PREVIEW_SRC="$SRC_DIR/docs/workshop-preview.svg"
[ -f "$PREVIEW_SRC" ] || PREVIEW_SRC="$SRC_DIR/images/$MOD_ID-icon.svg"
PREVIEW_OUT="$DIST_DIR/preview.png"
if [ -f "$PREVIEW_SRC" ]; then
    if command -v rsvg-convert >/dev/null 2>&1; then
        rsvg-convert -w 1024 -h 1024 "$PREVIEW_SRC" -o "$PREVIEW_OUT"
        echo "==> Workshop preview rendered:  $PREVIEW_OUT  (from $(basename "$PREVIEW_SRC"))"
    else
        echo "==> rsvg-convert not found; preview.png NOT generated."
        echo "    Install with:  brew install librsvg"
    fi
fi

VDF_PATH="$DIST_DIR/workshop_item.vdf"
VDF_NOPREVIEW_PATH="$DIST_DIR/workshop_item_no_preview.vdf"
ABS_CONTENT="$(cd "$TARGET_DIR" && pwd)"
ABS_PREVIEW=""
[ -f "$PREVIEW_OUT" ] && ABS_PREVIEW="$(cd "$DIST_DIR" && pwd)/preview.png"

# Change note: pull the current version's section out of CHANGELOG.md (Keep a
# Changelog format) and render its bullet lines as a Steam BBCode list. Falls
# back to a generic note if CHANGELOG.md or the matching section is absent.
CHANGELOG_FILE="$SRC_DIR/CHANGELOG.md"
CHANGENOTE="v${VERSION} release."
VERSION_RE="$(printf '%s' "$VERSION" | sed -E 's/[][(){}.^$*+?|\\]/\\&/g')"
if [ -f "$CHANGELOG_FILE" ]; then
    BULLETS="$(awk -v verre="$VERSION_RE" '
        function flush() { if (cur != "") { print cur; cur = "" } }
        $0 ~ ("^## \\[" verre "\\]") { grab = 1; next }
        grab && /^## / { flush(); exit }
        !grab { next }
        /^###/ { next }
        /^[[:space:]]*[-*][[:space:]]+/ {
            flush()
            line = $0
            sub(/^[[:space:]]*[-*][[:space:]]+/, "", line)
            cur = line
            next
        }
        /^[[:space:]]*$/ { next }
        cur != "" {
            line = $0
            sub(/^[[:space:]]+/, "", line)
            cur = cur " " line
        }
        END { flush() }
    ' "$CHANGELOG_FILE" \
        | sed -E 's/^/[*]/; s/\*\*//g; s/`//g' \
        | tr '\n' ' ')"
    if [ -n "$BULLETS" ]; then
        CHANGENOTE="$(printf '[b]v%s[/b] [list]%s[/list]' "$VERSION" "$BULLETS" \
            | sed -E 's/\\/\\\\/g; s/"/\\"/g')"
    fi
fi

write_workshop_vdf() {
    local out_path="$1"
    local include_preview="$2"
    cat > "$out_path" <<EOF
"workshopitem"
{
    "appid"          "1295660"
EOF
[ -n "$PUBLISHED_FILE_ID" ] && echo "    \"publishedfileid\" \"$PUBLISHED_FILE_ID\"" >> "$out_path"
cat >> "$out_path" <<EOF
    "contentfolder"  "$ABS_CONTENT"
EOF
    if [ "$include_preview" = "yes" ] && [ -n "$ABS_PREVIEW" ]; then
        echo "    \"previewfile\"    \"$ABS_PREVIEW\"" >> "$out_path"
    fi
cat >> "$out_path" <<EOF
    "visibility"     "0"
    "title"          "$MOD_TITLE"
EOF
# NOTE: "description" is intentionally omitted. steamcmd's workshop_build_item
# only updates the fields present in this VDF, so leaving it out preserves the
# description currently set on the Steam Workshop page instead of overwriting it.
cat >> "$out_path" <<EOF
    "changenote"     "${CHANGENOTE}"
EOF
if [ -z "$PUBLISHED_FILE_ID" ]; then
    cat >> "$out_path" <<EOF
    // First upload: steamcmd will print a publishedfileid when this completes.
    // Save it so re-runs UPDATE the existing item instead of creating a duplicate:
    //     echo <publishedfileid> > steam_workshop_id.txt
EOF
fi
    echo "}" >> "$out_path"
}

write_workshop_vdf "$VDF_PATH" yes
write_workshop_vdf "$VDF_NOPREVIEW_PATH" no

# Persist the id so it's durable across `rm -rf dist` on future runs.
if [ -n "$PUBLISHED_FILE_ID" ]; then
    printf '%s\n' "$PUBLISHED_FILE_ID" > "$WORKSHOP_ID_FILE"
fi

echo "==> Workshop manifest written: $VDF_PATH"
echo "==> Workshop no-preview manifest written: $VDF_NOPREVIEW_PATH"
if [ -n "$PUBLISHED_FILE_ID" ]; then
    echo "    UPDATE mode: publishedfileid $PUBLISHED_FILE_ID (existing item)"
else
    echo "    NEW-ITEM mode: no publishedfileid yet (first upload will create one)"
fi
echo ""
echo "✓ Release built:  $ZIP_PATH  ($SIZE)"
echo "  Version:        $VERSION"
echo "  Authors:        $AUTHORS"
echo ""
echo "── Upload to Steam Workshop (from Mac) ──"
echo "  1. Install SteamCMD if you haven't:"
echo "       mkdir -p ~/steamcmd && cd ~/steamcmd"
echo "       curl -sqL 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_osx.tar.gz' | tar zxvf -"
echo ""
echo "  2. Upload (Steam Guard prompt will appear on first login):"
echo "       ~/steamcmd/steamcmd.sh +login <yourSteamLogin> \\"
echo "           +workshop_build_item $(cd "$DIST_DIR" && pwd)/workshop_item.vdf +quit"
echo ""
echo "     If Steam rejects the preview upload with Access Denied, upload with:"
echo "       ~/steamcmd/steamcmd.sh +login <yourSteamLogin> \\"
echo "           +workshop_build_item $(cd "$DIST_DIR" && pwd)/workshop_item_no_preview.vdf +quit"
if [ -z "$PUBLISHED_FILE_ID" ]; then
echo "  3. The first run prints a publishedfileid. Save it so future runs UPDATE"
echo "     the existing item instead of creating a duplicate:"
echo "       echo <publishedfileid> > steam_workshop_id.txt"
else
echo "  3. This builds in UPDATE mode (publishedfileid $PUBLISHED_FILE_ID from"
echo "     steam_workshop_id.txt), so the upload updates the existing item."
fi

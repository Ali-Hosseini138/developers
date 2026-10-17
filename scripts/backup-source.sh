#!/bin/sh
# Committed source/history only: never packages untracked secrets or user uploads.
set -eu
umask 077
root=$(git rev-parse --show-toplevel)
cd "$root"
destination=${1:-backups}
mkdir -p "$destination"
revision=$(git rev-parse --short=12 HEAD)
stamp=$(date -u +%Y%m%dT%H%M%SZ)
bundle="$destination/netstore-$revision-$stamp.bundle"
git bundle create "$bundle" HEAD
git bundle verify "$bundle"
sha256sum "$bundle" > "$bundle.sha256"
printf 'Verified source bundle: %s\nCopy it to independent private backup storage. Database, uploads and runtime secrets require separate backups.\n' "$bundle"

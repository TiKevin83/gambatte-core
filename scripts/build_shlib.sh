#!/bin/sh
set -e
echo "cd libgambatte && scons shlib $1"
cd "$(dirname "$0")/../libgambatte"
scons shlib $1
cp libgambatte.mjs ../public/libgambatte.mjs
cp libgambatte.mjs ../t3boy/public/libgambatte.mjs
../scripts/.copy_bizhawk_after_build.sh

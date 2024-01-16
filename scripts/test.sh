#!/bin/sh

echo "cd libgambatte && scons"
(cd libgambatte && scons) || exit

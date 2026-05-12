#!/bin/bash

# This script converts SVG files to PNG format
rsvg-convert -w 512 -h 512 ./public/icon.svg -o ./public/icon-512x512.png
rsvg-convert -w 192 -h 192 ./public/icon.svg -o ./public/icon-192x192.png

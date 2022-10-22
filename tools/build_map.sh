#!/bin/bash

set -x

mutool extract -r "../HIRES/Nevsky - Game Board_CORRECTED 080919.pdf"
mv image-0017.png map300_uncropped.png

# ArtBox 63.5197 63.5197 1287.52 1647.52
# 5100x6600
convert map300_uncropped.png -gravity Center -crop 5100x6600+0+0 +repage map300.png
rm map300_uncropped.png

# convert map300.png -colorspace RGB -resize 33.3333333% -colorspace sRGB map100.png
# convert map300.png -colorspace RGB -resize 66.6666667% -colorspace sRGB map200.png
convert map300.png -colorspace RGB -resize 25% -colorspace sRGB map75.png
convert map300.png -colorspace RGB -resize 50% -colorspace sRGB map150.png

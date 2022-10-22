#!/bin/bash

set -x

#gs -sDEVICE=png16m -r1200 -o tmp/stickers1200.png ../HIRES/stickers3.pdf

mkdir -p tmp

# 672x672 stickers @1200
#pngtopnm tmp/stickers1200.png > tmp/stickers1200.ppm
pnmcut -top 1912 -height 672 tmp/stickers1200.ppm > tmp/row1x.ppm
pnmcut -top 2856 -height 672 tmp/stickers1200.ppm > tmp/row2x.ppm

I=1
for LEFT in 405 641 877 1113 1349 1586 1822
do
	pnmcut -left $(expr 4 '*' $LEFT) -width 672 tmp/row1x.ppm | pnmtopng > tmp/lord_teutonic_$I.png
	pnmcut -left $(expr 4 '*' $LEFT) -width 672 tmp/row2x.ppm | pnmtopng > tmp/lord_russian_$I.png
	I=$(expr $I + 1)
done

# 150dpi -> 84x84
# 75dpi -> 42x42
# 3d -> 42x28
for I in 1 2 3 4 5 6 7
do
	convert tmp/lord_teutonic_$I.png -colorspace RGB -geometry 84x56! -colorspace sRGB output150/lord_teutonic_${I}_3d.png
	convert tmp/lord_russian_$I.png -colorspace RGB -geometry 84x56! -colorspace sRGB output150/lord_russian_${I}_3d.png
	convert tmp/lord_teutonic_$I.png -colorspace RGB -geometry 84x84! -colorspace sRGB output150/lord_teutonic_${I}.png
	convert tmp/lord_russian_$I.png -colorspace RGB -geometry 84x84! -colorspace sRGB output150/lord_russian_${I}.png

	convert tmp/lord_teutonic_$I.png -colorspace RGB -geometry 42x28! -colorspace sRGB output75/lord_teutonic_${I}_3d.png
	convert tmp/lord_russian_$I.png -colorspace RGB -geometry 42x28! -colorspace sRGB output75/lord_russian_${I}_3d.png
	convert tmp/lord_teutonic_$I.png -colorspace RGB -geometry 42x42! -colorspace sRGB output75/lord_teutonic_${I}.png
	convert tmp/lord_russian_$I.png -colorspace RGB -geometry 42x42! -colorspace sRGB output75/lord_russian_${I}.png
done


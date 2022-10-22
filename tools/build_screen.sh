mkdir -p tmp
convert -size 2160x750 gradient:white-none tmp/gradient.png
convert -resize 2250x750 -gravity Center -crop 2160x750+0+0 +repage ../HIRES/screen1.png tmp/screen1.png
convert -resize 2250x750 -gravity Center -crop 2160x750+0+0 +repage ../HIRES/screen2.png tmp/screen2.png
convert -resize 2250x750 -gravity Center -crop 2160x750+0+0 +repage ../HIRES/screen3.png tmp/screen3.png
convert -resize 2250x750 -gravity Center -crop 2160x750+0+0 +repage ../HIRES/screen4.png tmp/screen4.png
convert tmp/screen1.png gradient.png -compose Over -flatten screen1.png
convert tmp/screen2.png gradient.png -compose Over -flatten screen2.png
convert tmp/screen3.png gradient.png -compose Over -flatten screen3.png
convert tmp/screen4.png gradient.png -compose Over -flatten screen4.png

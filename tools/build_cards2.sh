# 300dpi @ 744 x 1044

mkdir -p cards75 cards150

for IM in cards300/*.png
do
	echo $IM
	convert $IM -colorspace RGB -resize 25% -colorspace sRGB ${IM/cards300/cards75}
	convert $IM -colorspace RGB -resize 50% -colorspace sRGB ${IM/cards300/cards150}
done

mkdir -p output75
mkdir -p output150
for F in output300/*.png
do
	echo $F

	O=${F/300/75}
	gm convert $F -colorspace RGB -resize 25% -colorspace sRGB $O.tmp
	rm -f $O
	zopflipng -m $O.tmp $O
	rm -f $O.tmp

	O=${F/300/150}
	gm convert $F -colorspace RGB -resize 50% -colorspace sRGB $O.tmp
	rm -f $O
	zopflipng -m $O.tmp $O
	rm -f $O.tmp
done

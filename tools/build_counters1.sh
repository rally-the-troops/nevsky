# 3 counter sheet dies
# 1 and 3 has square counters, only bottom row differs
# 2 has rectangular tiles

# circular (sheet 1 bottom) 210x210
# large square 190x190 (188-190-ish)
# rectangle 380x190 (188-190-ish)
# small square 150x150

mkdir -p tmp

# large squares (top sheet 1 and 3)
ROW=1
for TOP in 340 586 833 1080 1326
do
	COL=1
	RCOL=12
	for LEFT in 304 551 797 1043 1290 1536 1874 2121 2367 2613 2860 3106
	do
		echo large square $ROW $COL
		pnmcut -top $(expr 10 + $TOP) -left $(expr 10 + $LEFT) -width 168 -height 168 ../HIRES/nocut/NEVSKY-1F-nf.ppm > tmp/cs_sq_large_1_${ROW}_${COL}_a.ppm
		pnmcut -top $(expr 10 + $TOP) -left $(expr 10 + $LEFT) -width 168 -height 168 ../HIRES/nocut/NEVSKY-1B-nf.ppm > tmp/cs_sq_large_1_${ROW}_${RCOL}_b.ppm
		pnmcut -top $(expr 10 + $TOP) -left $(expr 10 + $LEFT) -width 168 -height 168 ../HIRES/nocut/NEVSKY-3F-nf.ppm > tmp/cs_sq_large_3_${ROW}_${COL}_a.ppm
		pnmcut -top $(expr 10 + $TOP) -left $(expr 10 + $LEFT) -width 168 -height 168 ../HIRES/nocut/NEVSKY-3B-nf.ppm > tmp/cs_sq_large_3_${ROW}_${RCOL}_b.ppm
		COL=$(expr $COL + 1)
		RCOL=$(expr $RCOL - 1)
	done
	ROW=$(expr $ROW + 1)
done

# large squares (bottom sheet 2)
ROW=1
for TOP in 2075 2322
do
	COL=1
	RCOL=12
	for LEFT in 304 551 797 1043 1290 1536 1874 2121 2367 2613 2860 3106
	do
		echo large square $ROW $COL
		pnmcut -top $(expr 10 + $TOP) -left $(expr 10 + $LEFT) -width 168 -height 168 ../HIRES/nocut/NEVSKY-2F-nf.ppm > tmp/cs_sq_large_2_${ROW}_${COL}_a.ppm
		pnmcut -top $(expr 10 + $TOP) -left $(expr 10 + $LEFT) -width 168 -height 168 ../HIRES/nocut/NEVSKY-2B-nf.ppm > tmp/cs_sq_large_2_${ROW}_${RCOL}_b.ppm
		COL=$(expr $COL + 1)
		RCOL=$(expr $RCOL - 1)
	done
	ROW=$(expr $ROW + 1)
done

# small squares (bottom sheet 1 and 3)
ROW=1
for TOP in 1595 1745 1970 2120 2345
do
	COL=1
	RCOL=4
	for LEFT in 305 1275 2175 2695
	do
		echo small square $ROW $COL
		pnmcut -top $(expr 3 + $TOP) -left $(expr 3 + $LEFT) -width 144 -height 144 ../HIRES/nocut/NEVSKY-1F-nf.ppm > tmp/cs_sq_small_1_${ROW}_${COL}_a.ppm
		pnmcut -top $(expr 3 + $TOP) -left $(expr 3 + $LEFT) -width 144 -height 144 ../HIRES/nocut/NEVSKY-1B-nf.ppm > tmp/cs_sq_small_1_${ROW}_${RCOL}_b.ppm
		pnmcut -top $(expr 3 + $TOP) -left $(expr 3 + $LEFT) -width 144 -height 144 ../HIRES/nocut/NEVSKY-3F-nf.ppm > tmp/cs_sq_small_3_${ROW}_${COL}_a.ppm
		pnmcut -top $(expr 3 + $TOP) -left $(expr 3 + $LEFT) -width 144 -height 144 ../HIRES/nocut/NEVSKY-3B-nf.ppm > tmp/cs_sq_small_3_${ROW}_${RCOL}_b.ppm
		COL=$(expr $COL + 1)
		RCOL=$(expr $RCOL - 1)
	done
	ROW=$(expr $ROW + 1)
done

# large rects (top sheet 2)
ROW=1
for TOP in 340 586 833 1080 1326 1572 1818
do
	COL=1
	RCOL=7
	TOP=$(expr $TOP + 1)
	for LEFT in 304 739 1175 1611 2047 2483 2919
	do
		echo rectangle $ROW $COL
		pnmcut -top $(expr 10 + $TOP) -left $(expr 10 + $LEFT) -width 360 -height 168 ../HIRES/nocut/NEVSKY-2F-nf.ppm > tmp/cs_rect_2_${ROW}_${COL}_a.ppm
		pnmcut -top $(expr 10 + $TOP) -left $(expr 10 + $LEFT) -width 360 -height 168 ../HIRES/nocut/NEVSKY-2B-nf.ppm > tmp/cs_rect_2_${ROW}_${RCOL}_b.ppm
		COL=$(expr $COL + 1)
		RCOL=$(expr $RCOL - 1)
	done
	ROW=$(expr $ROW + 1)
done

# circles (sheet 1)
ROW=1
for TOP in 2332
do
	COL=1
	RCOL=6
	for LEFT in 987 1253 1518 1874 2139 2404
	do
		echo circle $ROW $COL
		pnmcut -top $(expr 3 + $TOP) -left $(expr 3 + $LEFT) -width 204 -height 204 ../HIRES/nocut/NEVSKY-1F-nf.ppm > tmp/cs_circle_1_${ROW}_${COL}_a.ppm
		pnmcut -top $(expr 3 + $TOP) -left $(expr 3 + $LEFT) -width 204 -height 204 ../HIRES/nocut/NEVSKY-1B-nf.ppm > tmp/cs_circle_1_${ROW}_${RCOL}_b.ppm
		COL=$(expr $COL + 1)
		RCOL=$(expr $RCOL - 1)
	done
	ROW=$(expr $ROW + 1)
done

# rectangles (sheet 1)
ROW=1
for TOP in 2342
do
	COL=1
	RCOL=2
	for LEFT in 416 2806
	do
		echo rectangle $ROW $COL
		pnmcut -top $(expr 10 + $TOP) -left $(expr 10 + $LEFT) -width 360 -height 168 ../HIRES/nocut/NEVSKY-1F-nf.ppm > tmp/cs_rect_1_${ROW}_${COL}_a.ppm
		pnmcut -top $(expr 10 + $TOP) -left $(expr 10 + $LEFT) -width 360 -height 168 ../HIRES/nocut/NEVSKY-1B-nf.ppm > tmp/cs_rect_1_${ROW}_${RCOL}_b.ppm
		COL=$(expr $COL + 1)
		RCOL=$(expr $RCOL - 1)
	done
	ROW=$(expr $ROW + 1)
done

#!/bin/bash

set -x

mkdir -p tmp/mat
mkdir -p output300

if [ ! -f ../HIRES/raw_mat_01.1200.png ]
then
	gs -sDEVICE=png16m -r1200 -o ../HIRES/raw_mat_%02d.1200.png "../HIRES/Lord Mats-FINAL-nf.pdf"
fi

for F in ../HIRES/raw_mat_*.1200.png
do
	convert -colorspace RGB -scale 25% -colorspace sRGB $F ${F/.1200.png/.png}
done

# crop: 150,150 to 1650,1650 = 1500x1500

# ARGS="-gravity Center -crop 1500x1500+0+0 +repage -background #d0bf7d -flatten"
ARGS="-gravity Center -crop 1440x1440+0+0 +repage -background #d0bf7d -flatten"

convert ../HIRES/raw_mat_01.png $ARGS output300/mat_russian_aleksandr.png
convert ../HIRES/raw_mat_02.png $ARGS output300/mat_russian_andrey.png
convert ../HIRES/raw_mat_03.png $ARGS output300/mat_russian_domash.png
convert ../HIRES/raw_mat_04.png $ARGS output300/mat_russian_gavrilo.png
convert ../HIRES/raw_mat_05.png $ARGS output300/mat_russian_vladislav.png
convert ../HIRES/raw_mat_06.png $ARGS output300/mat_russian_karelians.png
convert ../HIRES/raw_mat_07.png $ARGS output300/mat_teutonic_yaroslav.png
convert ../HIRES/raw_mat_08.png $ARGS output300/mat_teutonic_knud_and_abel.png
convert ../HIRES/raw_mat_09.png $ARGS output300/mat_teutonic_rudolf.png
convert ../HIRES/raw_mat_10.png $ARGS output300/mat_teutonic_heinrich.png
convert ../HIRES/raw_mat_11.png $ARGS output300/mat_teutonic_hermann.png
convert ../HIRES/raw_mat_12.png $ARGS output300/mat_teutonic_andreas.png
convert ../HIRES/raw_mat_13.png $ARGS output300/mat_battle.png

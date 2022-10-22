#!/bin/bash
# Extract, crop, and rename card images to create 300 dpi PNG versions.

function extract_images {
	echo "$1"
	mutool extract -r "$1"
	mkdir -p $2
	mv image* $2
	rm -f font*
}

extract_images "../HIRES/Nevsky_Arts of War Cards_42 Anverses.pdf" tmp/aow_front
extract_images "../HIRES/Nevsky_Arts of War Cards_42 Backs.pdf" tmp/aow_back
extract_images "../HIRES/Nevsky_Arts of War Cards_R1 and R2 Anverses_Corrected.pdf" tmp/aow_corr
extract_images "../HIRES/Nevsky_Command Cards_42 Anverses.pdf" tmp/cc_front
extract_images "../HIRES/Nevsky_Command Cards_42 Backs.pdf" tmp/cc_back

# cards are 63.5 x 89.0 mm - 2.5 x 3.5 inches - 750 x 1050 pixels
# rounded to multiple of 12 = 744 x 1044
for IM in tmp/aow_*/*.png tmp/cc_*/*.png
do
	echo $IM
	convert $IM -gravity Center -crop 744x1040+0+0 +repage ${IM/png/ppm}
done

mkdir -p cards300
pnmtopng tmp/aow_back/image-0083.ppm	>cards300/aow_russian_back.png
pnmtopng tmp/aow_back/image-0102.ppm	>cards300/aow_teutonic_back.png
pnmtopng tmp/aow_corr/image-0004.ppm	>cards300/aow_russian_02.png
pnmtopng tmp/aow_corr/image-0015.ppm	>cards300/aow_russian_01.png
pnmtopng tmp/aow_front/image-0004.ppm	>cards300/aow_teutonic_02.png
pnmtopng tmp/aow_front/image-0008.ppm	>cards300/aow_teutonic_03.png
pnmtopng tmp/aow_front/image-0012.ppm	>cards300/aow_teutonic_04.png
pnmtopng tmp/aow_front/image-0016.ppm	>cards300/aow_teutonic_05.png
pnmtopng tmp/aow_front/image-0020.ppm	>cards300/aow_teutonic_06.png
pnmtopng tmp/aow_front/image-0024.ppm	>cards300/aow_teutonic_07.png
pnmtopng tmp/aow_front/image-0028.ppm	>cards300/aow_teutonic_08.png
pnmtopng tmp/aow_front/image-0032.ppm	>cards300/aow_teutonic_09.png
pnmtopng tmp/aow_front/image-0036.ppm	>cards300/aow_teutonic_10.png
pnmtopng tmp/aow_front/image-0040.ppm	>cards300/aow_teutonic_11.png
pnmtopng tmp/aow_front/image-0044.ppm	>cards300/aow_teutonic_12.png
pnmtopng tmp/aow_front/image-0048.ppm	>cards300/aow_teutonic_13.png
pnmtopng tmp/aow_front/image-0052.ppm	>cards300/aow_teutonic_14.png
pnmtopng tmp/aow_front/image-0056.ppm	>cards300/aow_teutonic_15.png
pnmtopng tmp/aow_front/image-0060.ppm	>cards300/aow_teutonic_16.png
pnmtopng tmp/aow_front/image-0064.ppm	>cards300/aow_teutonic_17.png
pnmtopng tmp/aow_front/image-0068.ppm	>cards300/aow_teutonic_18.png
# pnmtopng tmp/aow_front/image-0078.ppm	>cards300/aow_russian_01.ppm # corrected
# pnmtopng tmp/aow_front/image-0082.ppm	>cards300/aow_russian_02.ppm # corrected
pnmtopng tmp/aow_front/image-0086.ppm	>cards300/aow_russian_03.png
pnmtopng tmp/aow_front/image-0090.ppm	>cards300/aow_russian_04.png
pnmtopng tmp/aow_front/image-0094.ppm	>cards300/aow_russian_05.png
pnmtopng tmp/aow_front/image-0098.ppm	>cards300/aow_russian_06.png
pnmtopng tmp/aow_front/image-0102.ppm	>cards300/aow_russian_07.png
pnmtopng tmp/aow_front/image-0106.ppm	>cards300/aow_russian_08.png
pnmtopng tmp/aow_front/image-0110.ppm	>cards300/aow_russian_09.png
pnmtopng tmp/aow_front/image-0114.ppm	>cards300/aow_russian_10.png
pnmtopng tmp/aow_front/image-0118.ppm	>cards300/aow_russian_11.png
pnmtopng tmp/aow_front/image-0122.ppm	>cards300/aow_russian_12.png
pnmtopng tmp/aow_front/image-0126.ppm	>cards300/aow_russian_13.png
pnmtopng tmp/aow_front/image-0130.ppm	>cards300/aow_russian_14.png
pnmtopng tmp/aow_front/image-0134.ppm	>cards300/aow_russian_15.png
pnmtopng tmp/aow_front/image-0138.ppm	>cards300/aow_russian_16.png
pnmtopng tmp/aow_front/image-0142.ppm	>cards300/aow_russian_17.png
pnmtopng tmp/aow_front/image-0146.ppm	>cards300/aow_russian_18.png
pnmtopng tmp/aow_front/image-0153.ppm	>cards300/aow_teutonic_none.png
pnmtopng tmp/aow_front/image-0155.ppm	>cards300/aow_russian_none.png
pnmtopng tmp/aow_front/image-0175.ppm	>cards300/aow_teutonic_01.png
pnmtopng tmp/cc_back/image-0083.ppm	>cards300/cc_russian_back.png
pnmtopng tmp/cc_back/image-0102.ppm	>cards300/cc_teutonic_back.png
pnmtopng tmp/cc_front/image-0083.ppm	>cards300/cc_teutonic_andreas.png
pnmtopng tmp/cc_front/image-0085.ppm	>cards300/cc_teutonic_pass.png
pnmtopng tmp/cc_front/image-0087.ppm	>cards300/cc_teutonic_heinrich.png
pnmtopng tmp/cc_front/image-0089.ppm	>cards300/cc_teutonic_rudolf.png
pnmtopng tmp/cc_front/image-0091.ppm	>cards300/cc_teutonic_knud_and_abel.png
pnmtopng tmp/cc_front/image-0093.ppm	>cards300/cc_teutonic_yaroslav.png
pnmtopng tmp/cc_front/image-0095.ppm	>cards300/cc_russian_aleksandr.png
pnmtopng tmp/cc_front/image-0097.ppm	>cards300/cc_russian_domash.png
pnmtopng tmp/cc_front/image-0099.ppm	>cards300/cc_russian_vladislav.png
pnmtopng tmp/cc_front/image-0101.ppm	>cards300/cc_russian_pass.png
pnmtopng tmp/cc_front/image-0103.ppm	>cards300/cc_russian_karelians.png
pnmtopng tmp/cc_front/image-0105.ppm	>cards300/cc_russian_andrey.png
pnmtopng tmp/cc_front/image-0107.ppm	>cards300/cc_russian_gavrilo.png
pnmtopng tmp/cc_front/image-0126.ppm	>cards300/cc_teutonic_hermann.png

rm -rf tmp

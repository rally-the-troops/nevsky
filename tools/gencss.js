const h = 42
for (let i = 0; i < 15; ++i)
	console.log(`.service_marker.image${i}{background-position:0 -${i*h}px}`)
for (let i = 0; i < 15; ++i)
	console.log(`.service_marker.image${i}:hover{background-position:100% -${i*h}px}`)

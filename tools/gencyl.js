// physical cylinders are diameter 15mm x 10mm
// at 75dpi => 44px x 29px
// stickers: 42x28
// image: 44x? - outline at 1 to 2 - start at 1.5

const fs = require('fs')

function print_lord(output, side, label) {
	let image = fs.readFileSync(label).toString('base64')
	let svg = []
	let bd = '#222'
	let f = 'url(#g)'
	svg.push('<svg xmlns="http://www.w3.org/2000/svg" width="44" height="48">')
	svg.push('<clipPath id="c"><ellipse cx="22" cy="15" rx="20.5" ry="13.5"/></clipPath>')

	if (1) {
		svg.push('<linearGradient id="g">')
		if (side === 'russian') {
			svg.push('<stop offset="0%" stop-color="#ddd"/>')
			svg.push('<stop offset="40%" stop-color="#fff"/>')
			svg.push('<stop offset="100%" stop-color="#ccc"/>')
			bd = '#555'
		} else {
			svg.push('<stop offset="0%" stop-color="#444"/>')
			svg.push('<stop offset="40%" stop-color="#666"/>')
			svg.push('<stop offset="100%" stop-color="#333"/>')
			bd = '#111'
		}
		svg.push('</linearGradient>')
	} else {
		if (side === 'russian') {
			f = '#ddd'
			bd = '#222'
		} else {
			f = '#555'
			bd = '#222'
		}
	}

	svg.push(`<path fill="${f}" stroke="${bd}" d="M1.5 15v18A20.5 13.5 0 0 0 22 46.5 20.5 13.5 0 0 0 42.5 33V15h-41z"/>`)
	svg.push(`<image href="data:image/png;base64,${image}" clip-path="url(#c)" x="1" y="1" width="42" height="28"/>`)
	svg.push(`<ellipse fill="none" stroke="${bd}" cx="22" cy="15" rx="20.5" ry="13.5"/>`)

	svg.push('</svg>')
	fs.writeFileSync(output, svg.join("\n") + "\n")
}

for (let i = 1; i <= 7; ++i) {
	print_lord(`images/lord_teutonic_${i}.svg`, "teutonic", `tools/output150/lord_teutonic_${i}_3d.png`)
	print_lord(`images/lord_russian_${i}.svg`, "russian", `tools/output150/lord_russian_${i}_3d.png`)
}

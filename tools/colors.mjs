import { formatHex, filterBrightness, parseHex, convertRgbToOklab, convertRgbToLrgb, interpolate } from 'culori'

const yuv = true;
const gamma = 2.2;

const data = [
[".mat .background", "d1c07e"],
[".card.teutonic", "e1e6e8"],
[".card.russian", "e1d6c1"],
[".service_marker.teutonic.vassal", "777474"],
[".service_marker.russian.vassal", "f0ead8"],
[".asset.sled", "e5dcc1"],
[".asset.boat", "adceed"],
[".asset.cart.x1", "daba8b"],
[".asset.cart.x2", "d1a973"],
[".asset.cart.x4", "c4975b"],
[".asset.coin.x1", "d2d5d4"],
[".asset.coin.x2", "d2d5d4"],
[".asset.coin.x3", "b3b5b4"],
[".asset.coin.x4", "b3b5b4"],
[".asset.prov.x1", "ffe293"],
[".asset.prov.x2", "ffe293"],
[".asset.prov.x3", "ffcd66"],
[".asset.prov.x4", "ffcd66"],
[".asset.ship.x1", "79b7e4"],
[".asset.ship.x2", "79b7e4"],
[".asset.ship.x4", "5da9dd"],
[".asset.loot.x1", "f0b64f"],
[".asset.loot.x2", "eda44c"],
[".asset.loot.x3", "eb924a"],
[".asset.loot.x4", "e1884a"],
[".marker.battle", "d0bf7d"],
[".marker.storm", "d0bf7d"],
[".marker.pursuit", "c6ab7f"],
[".marker.turn.campaign", "6a8aa8"],
[".marker.turn.levy", "967348"],
[".marker.teutonic.victory", "ffd400"],
[".marker.teutonic.siege", "a39382"],
[".marker.russian.conquered", "649655"],
[".marker.russian.enemy_lords_removed", "ffd400"],
[".marker.russian.victory", "2d8b47"],
[".marker.walls", "e3dedc"],
[".marker.russian.number", "c6992f"],
[".marker.teutonic.number", "a02532"],

/*
[".unit", "ffd768"],
[".marker.supply_source", "e6dcb9"],
[".marker.moved_fought", "0072bc"],
[".marker.pleskau_black", "324b5b"],
[".marker.pleskau_white", "e3dedc"],
*/
].map(([sel,color])=>[ sel, parseHex(color) ])

const colors = `knights_fill ffffff
knights_stroke d1d3d4
asiatic_horse_fill f7df93
asiatic_horse_stroke 908357
serfs_fill e39c43
serfs_stroke b17b33
militia_fill cc6a2c
militia_stroke 773b0c
men_at_arms_fill c0b6b3
men_at_arms_stroke 716c6b
die_1 662c91
die_2 ee161c
die_3 f7941d
die_4 ffd400
die_5 26903a`

let css = []

function brighten(color, n) {
	return { mode: 'lrgb',
		r: 1 - (1-color.r) * n,
		g: 1 - (1-color.g) * n,
		b: 1 - (1-color.b) * n,
	}
}

function darken(color, n) {
	return { mode: 'lrgb',
		r: (color.r) * n,
		g: (color.g) * n,
		b: (color.b) * n,
	}
}

let white = parseHex('#fff')
let black = parseHex('#000')

for (let [ sel, rgb ] of data) {
	let base = formatHex(rgb)
	//let hi = formatHex(brighten(convertRgbToLrgb(rgb), 0.8))
	//let lo = formatHex(darken(convertRgbToLrgb(rgb), 0.8))
	//let sh = formatHex(darken(convertRgbToLrgb(rgb), 0.125))
	//let hi = formatHex(interpolate([rgb,white],'lrgb')(0.2))
	//let lo = formatHex(interpolate([rgb,black],'lrgb')(0.2))
	//let sh = formatHex(interpolate([rgb,black],'lrgb')(0.6))
	let hic = convertRgbToOklab(rgb); hic.l = Math.min(1,hic.l+0.1)
	let loc = convertRgbToOklab(rgb); loc.l = Math.max(0,loc.l-0.1)
	let shc = convertRgbToOklab(rgb); shc.l = Math.max(0,shc.l-0.4)
	let sh = formatHex(shc)
	let hi = formatHex(hic)
	let lo = formatHex(loc)
	css.push(`${sel} { background-color: ${base}; border-color: ${hi} ${lo} ${lo} ${hi}; box-shadow: 0 0 0 1px ${sh}, 1px 2px 4px #0008; }`)
}
console.log(css.join("\n"))

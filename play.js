"use strict"

// TODO: tooltip on cylinders
//	fealty rating and starting assets + forces on calendar
//	current assets and forces on map

// TODO: held events, this_turn events

const MAP_DPI = 75

const CALENDAR = 100

const round = Math.round
const floor = Math.floor
const ceil = Math.ceil

const first_p1_card = 0
const last_p1_card = 20
const first_p2_card = 21
const last_p2_card = 41

// unit types
const KNIGHTS = 0
const SERGEANTS = 1
const LIGHT_HORSE = 2
const ASIATIC_HORSE = 3
const MEN_AT_ARMS = 4
const MILITIA = 5
const SERFS = 6

// asset types
const PROV = 0
const COIN = 1
const LOOT = 2
const CART = 3
const SLED = 4
const BOAT = 5
const SHIP = 6

const VECHE = 100

const on_click_asset = [
	(evt) => evt.button === 0 && send_action('prov', evt.target.my_id),
	(evt) => evt.button === 0 && send_action('coin', evt.target.my_id),
	(evt) => evt.button === 0 && send_action('loot', evt.target.my_id),
	(evt) => evt.button === 0 && send_action('cart', evt.target.my_id),
	(evt) => evt.button === 0 && send_action('sled', evt.target.my_id),
	(evt) => evt.button === 0 && send_action('boat', evt.target.my_id),
	(evt) => evt.button === 0 && send_action('ship', evt.target.my_id),
]

function on_click_veche_coin(evt) {
	if (evt.button === 0)
		send_action('veche_coin')
}

const SUMMER = 0
const EARLY_WINTER = 1
const LATE_WINTER = 2
const RASPUTITSA = 3

const SEASONS = [
	null,
	SUMMER, SUMMER, EARLY_WINTER, EARLY_WINTER, LATE_WINTER, LATE_WINTER, RASPUTITSA, RASPUTITSA,
	SUMMER, SUMMER, EARLY_WINTER, EARLY_WINTER, LATE_WINTER, LATE_WINTER, RASPUTITSA, RASPUTITSA,
	null
]

function current_season() {
	return SEASONS[view.turn >> 1]
}

function max_plan_length() {
	switch (current_season()) {
	case SUMMER: return 6
	case EARLY_WINTER: return 4
	case LATE_WINTER: return 4
	case RASPUTITSA: return 5
	}
}

function map_has(map, key) {
	let a = 0
	let b = (map.length >> 1) - 1
	while (a <= b) {
		let m = (a + b) >> 1
		let x = map[m<<1]
		if (key < x)
			b = m - 1
		else if (key > x)
			a = m + 1
		else
			return true
	}
	return false
}

function map_get(map, key, missing) {
	let a = 0
	let b = (map.length >> 1) - 1
	while (a <= b) {
		let m = (a + b) >> 1
		let x = map[m<<1]
		if (key < x)
			b = m - 1
		else if (key > x)
			a = m + 1
		else
			return map[(m<<1)+1]
	}
	return missing
}

function set_has(set, item) {
	let a = 0
	let b = set.length - 1
	while (a <= b) {
		let m = (a + b) >> 1
		let x = set[m]
		if (item < x)
			b = m - 1
		else if (item > x)
			a = m + 1
		else
			return true
	}
	return false
}

function pack1_get(word, n) {
	return (word >>> n) & 1
}

function pack4_get(word, n) {
	n = n << 2
	return (word >>> n) & 15
}

function is_lord_action(lord) {
	return !!(view.actions && view.actions.lord && set_has(view.actions.lord, lord))
}

function is_asset_action(lord, action) {
	return !!(view.actions && view.actions[action] && set_has(view.actions[action], lord))
}

function is_plan_action(lord) {
	return !!(view.actions && view.actions.plan && set_has(view.actions.plan, lord))
}

function is_service_action(lord) {
	return !!(view.actions && view.actions.service && set_has(view.actions.service, lord))
}

function is_vassal_action(vassal) {
	return !!(view.actions && view.actions.vassal && set_has(view.actions.vassal, vassal))
}

function is_locale_action(locale) {
	return !!(view.actions && view.actions.locale && set_has(view.actions.locale, locale))
}

function is_card_action(c) {
	return !!(view.actions && view.actions.card && set_has(view.actions.card, c))
}

const force_type_count = 7
const force_type_name = [ "knights", "sergeants", "light_horse", "asiatic_horse", "men_at_arms", "militia", "serfs" ]
const force_type_tip = [ "knights", "sergeants", "light horse", "asiatic horse", "men-at-arms", "militia", "serfs" ]

const asset_type_count = 7
const asset_type_name = [ "prov", "coin", "loot", "cart", "sled", "boat", "ship" ]
const asset_type_x3 = [ 1, 1, 1, 0, 0, 0, 0 ]

const first_p1_locale = 0
const last_p1_locale = 23
const first_p2_locale = 24
const last_p2_locale = 52

let used_cache = {}
let unused_cache = {}

function get_cached_element(className) {
	if (!(className in unused_cache)) {
		unused_cache[className] = []
		used_cache[className] = []
	}
	if (unused_cache[className].length > 0) {
		let elt = unused_cache[className].pop()
		used_cache[className].push(elt)
		return elt
	}
	let elt = document.createElement("div")
	elt.className = className
	used_cache[className].push(elt)
	return elt
}

function restart_cache() {
	for (let k in used_cache) {
		let u = used_cache[k]
		let uu = unused_cache[k]
		while (u.length > 0)
			uu.push(u.pop())
	}
}

function is_p1_locale(loc) {
	return loc >= first_p1_locale && loc <= last_p1_locale
}

function is_p2_locale(loc) {
	return loc >= first_p2_locale && loc <= last_p2_locale
}

function count_vp1() {
	let vp = 0
	for (let loc of view.locales.castles1)
		vp += 2
	for (let loc of view.locales.conquered)
		if (is_p2_locale(loc))
			vp += data.locales[loc].vp << 1
	for (let loc of view.locales.ravaged)
		if (is_p2_locale(loc))
			vp += 1
	return vp
}

function count_vp2() {
	let vp = view.call_to_arms.veche_vp * 2
	for (let loc of view.locales.castles2)
		vp += 2
	for (let loc of view.locales.conquered)
		if (is_p1_locale(loc))
			vp += data.locales[loc].vp << 1
	for (let loc of view.locales.ravaged)
		if (is_p1_locale(loc))
			vp += 1
	return vp
}

function is_card_in_use(c) {
	if (set_has(view.events, c))
		return true
	if (set_has(view.capabilities, c))
		return true
	if (view.lords.capabilities.includes(c))
		return true
	if (c === 18 || c === 19 || c === 20)
		return true
	if (c === 39 || c === 40 || c === 41)
		return true
	return false
}

function for_each_teutonic_card(fn) {
	for (let i = 0; i < 21; ++i)
		fn(i)
}

function for_each_russian_card(fn) {
	for (let i = 21; i < 42; ++i)
		fn(i)
}

function is_upper_lord(lord) {
	return map_has(view.lords.lieutenants, lord)
}

function is_lower_lord(lord) {
	for (let i = 1; i < view.lords.lieutenants.length; i += 2)
		if (view.lords.lieutenants[i] === lord)
			return true
	return false
}

function get_lower_lord(upper) {
	return map_get(view.lords.lieutenants, upper, -1)
}

function for_each_friendly_card(fn) {
	if (player === "Teutons")
		for_each_teutonic_card(fn)
	else
		for_each_russian_card(fn)
}

function for_each_enemy_card(fn) {
	if (player !== "Teutons")
		for_each_teutonic_card(fn)
	else
		for_each_russian_card(fn)
}

const original_boxes = {
	"way crossroads": [1500,4717,462,149],
	"way wirz": [1295,4526,175,350],
	"way peipus-east": [2232,4197,220,480],
	"way peipus-north": [2053,3830,361,228],
	// "way peipus-west": [1988,4141,218,520],
	"calendar summer box1": [40,168,590,916],
	"calendar summer box2": [650,168,590,916],
	"calendar winter box3": [1313,168,590,916],
	"calendar winter box4": [1922,168,590,916],
	"calendar winter box5": [2587,168,590,916],
	"calendar winter box6": [3196,168,590,916],
	"calendar rasputitsa box7": [3860,168,590,916],
	"calendar rasputitsa box8": [4470,168,590,916],
	"calendar summer box9": [40,1120,590,916],
	"calendar summer box10": [650,1120,590,916],
	"calendar winter box11": [1313,1120,590,916],
	"calendar winter box12": [1922,1120,590,916],
	"calendar winter box13": [2587,1120,590,916],
	"calendar winter box14": [3196,1120,590,916],
	"calendar rasputitsa box15": [3860,1120,590,916],
	"calendar rasputitsa box16": [4470,1120,590,916],
	// "victory": [176,185,210,210],
	// "turn": [402,185,210,210],
}

const calendar_xy = [
	[40,8],
	[40,168],
	[650,168],
	[1313,168],
	[1922,168],
	[2587,168],
	[3196,168],
	[3860,168],
	[4470,168],
	[40,1120],
	[650,1120],
	[1313,1120],
	[1922,1120],
	[2587,1120],
	[3196,1120],
	[3860,1120],
	[4470,1120],
	[4462,2068],
].map(([x,y])=>[x/4|0,y/4|0])

const locale_xy = []

let expand_calendar = -1

const ui = {
	locale: [],
	locale_extra: [],
	locale_markers: [],
	lord_cylinder: [],
	lord_service: [],
	lord_mat: [],
	lord_buttons: [],
	vassal_service: [],
	forces: [],
	routed: [],
	assets: [],
	ready_vassals: [],
	mustered_vassals: [],
	lord_capabilities: [],
	cards: [],
	boxes: {},
	legate: document.getElementById("legate"),
	veche: document.getElementById("veche"),
	plan_dialog: document.getElementById("plan"),
	plan_list: document.getElementById("plan_list"),
	plan_actions: document.getElementById("plan_actions"),
	plan_list_cards: [],
	plan_action_cards: [],
	arts_of_war_dialog: document.getElementById("arts_of_war"),
	arts_of_war_list: document.getElementById("arts_of_war_list"),
	events: document.getElementById("events"),
	capabilities1: document.getElementById("capabilities1"),
	capabilities2: document.getElementById("capabilities2"),
	hand: document.getElementById("hand"),
	command: document.getElementById("command"),
	turn: document.getElementById("turn"),
	vp1: document.getElementById("vp1"),
	vp2: document.getElementById("vp2"),
}

let locale_layout = new Array(data.locales.length).fill(0)
let calendar_layout_service = []
let calendar_layout_cylinder = []

function clean_name(name) {
	return name.toLowerCase().replaceAll("&", "and").replaceAll(" ", "_")
}

const extra_size_100 = {
	town: [ 60, 42 ],
	castle: [ 60, 42 ],
	fort: [ 72, 42 ],
	traderoute: [ 72, 42 ],
	bishopric: [ 84, 60 ],
	city: [ 132, 72 ],
	novgorod: [ 156, 96 ],
}

const extra_size = {
	town: [ 45, 32 ],
	castle: [ 45, 32 ],
	fort: [ 54, 32 ],
	traderoute: [ 54, 32 ],
	bishopric: [ 63, 45 ],
	city: [ 100, 54 ],
	novgorod: [ 117, 72 ],
}

function toggle_pieces() {
	document.getElementById("pieces").classList.toggle("hide")
}

function on_click_locale(evt) {
	if (evt.button === 0) {
		let id = evt.target.my_id
		send_action('locale', id)
	}
}

function on_focus_locale(evt) {
	let id = evt.target.my_id
	document.getElementById("status").textContent = `(${id}) ${data.locales[id].name} - ${data.locales[id].type}`
}

function on_click_cylinder(evt) {
	if (evt.button === 0) {
		let id = evt.target.my_id
		send_action('lord', id)
	}
}

function on_click_card(evt) {
	if (evt.button === 0) {
		let id = evt.target.my_id
		send_action('card', id)
	}
}

function on_click_plan(evt) {
	if (evt.button === 0) {
		let id = evt.target.my_id
		send_action('plan', id)
	}
}

function on_focus_cylinder(evt) {
	let lord = evt.target.my_id
	let info = data.lords[lord]
	let loc = view.lords.locale[lord]
	if (loc >= CALENDAR) {
		document.getElementById("status").textContent = `${info.full_name} - ${info.fealty} Fealty`
	} else {
		let tip = `${info.full_name}`

		/*
		if (view.turn & 1)
			tip += ` - ${info.command} Command`
		else
			tip += ` - ${info.lordship} Lordship`
		*/

		let first = true
		let assets = view.lords.assets[lord]
		for (let i = 0; i < asset_type_count; ++i) {
			let x = pack4_get(assets, i)
			if (x > 0) {
				if (first)
					tip += " \u2013 "
				else
					tip += ", "
				tip += `${x} ${asset_type_name[i]}`
				first = false
			}
		}

		first = true
		let forces = view.lords.forces[lord]
		let routed = view.lords.routed[lord]
		for (let i = 0; i < force_type_count; ++i) {
			let x = pack4_get(forces, i) + pack4_get(routed, i)
			if (x > 0) {
				if (first)
					tip += " \u2013 "
				else
					tip += ", "
				tip += `${x} ${force_type_tip[i]}`
				first = false
			}
		}

		let c = view.lords.capabilities[(lord<<1)]
		if (c >= 0)
			tip += ` \u2013 ${data.cards[c].capability}`
		c = view.lords.capabilities[(lord<<1) + 1]
		if (c >= 0)
			tip += `, ${data.cards[c].capability}`

		document.getElementById("status").textContent = tip
	}
}

function on_click_lord_service_marker(evt) {
	if (evt.button === 0) {
		let id = evt.target.my_id
		send_action('service', id)
	}
}

function on_focus_lord_service_marker(evt) {
	let lord = evt.target.my_id
	let info = data.lords[lord]
	document.getElementById("status").textContent = `${info.full_name} - ${info.title}`
	if (expand_calendar !== view.lords.service[lord]) {
		expand_calendar = view.lords.service[lord]
		layout_calendar()
	}
}

function on_blur_lord_service_marker(evt) {
	let id = evt.target.my_id
	on_blur(evt)
	if (expand_calendar === view.lords.service[id]) {
		expand_calendar = -1
		layout_calendar()
	}
}

function on_click_vassal_service_marker(evt) {
	if (evt.button === 0) {
		let id = evt.target.my_id
		send_action('vassal', id)
	}
}

function on_focus_vassal_service_marker(evt) {
	let id = evt.target.my_id
	let vassal = data.vassals[id]
	let lord = data.lords[vassal.lord]
	document.getElementById("status").textContent = `(${id}) ${lord.name} / ${vassal.name}`
}

function on_blur(evt) {
	document.getElementById("status").textContent = ""
}

function update_current_card_display() {
	if (typeof view.what === "number" && view.what >= 0) {
		if (view.what <= first_p1_card)
			ui.command.className = `card teutonic aow_${view.what}`
		else
			ui.command.className = `card russian aow_${view.what}`
	} else if ((view.turn & 1) === 0) {
		if (player === "Russians")
			ui.command.className = `card russian aow_back`
		else
			ui.command.className = `card teutonic aow_back`
	} else if (view.command < 0) {
		if (player === "Russians")
			ui.command.className = `card russian cc_back`
		else
			ui.command.className = `card teutonic cc_back`
	} else {
		if (view.command < 6)
			ui.command.className = `card russian cc_lord_${view.command}`
		else
			ui.command.className = `card teutonic cc_lord_${view.command}`
	}
}

function on_focus_card_tip(c) {
	if (c <= first_p1_card)
		ui.command.className = `card teutonic aow_${c}`
	else
		ui.command.className = `card russian aow_${c}`
}

function on_blur_card_tip(c) {
	update_current_card_display()
}

function sub_card_capability(match, p1) {
	let x = p1 | 0
	return `<span class="card_tip" onmouseenter="on_focus_card_tip(${x})" onmouseleave="on_blur_card_tip(${x})">${data.cards[x].capability}</span>`
}

function sub_card_event(match, p1) {
	let x = p1 | 0
	return `<span class="card_tip" onmouseenter="on_focus_card_tip(${x})" onmouseleave="on_blur_card_tip(${x})">${data.cards[x].event}</span>`
}

function on_focus_locale_tip(loc) {
	ui.locale[loc].classList.add("tip")
	ui.locale_extra[loc].classList.add("tip")
}

function on_blur_locale_tip(loc) {
	ui.locale[loc].classList.remove("tip")
	ui.locale_extra[loc].classList.remove("tip")
}

function on_click_locale_tip(loc) {
	ui.locale[loc].scrollIntoView({ block:"center", inline:"center", behavior:"smooth" })
}

function on_focus_lord_tip(lord) {
}

function on_blur_lord_tip(lord) {
}

function on_click_lord_tip(lord) {
	ui.lord_mat[lord].scrollIntoView({ block:"center", inline:"center", behavior:"smooth" })
}

function sub_locale_name(match, p1) {
	let x = p1 | 0
	let n = data.locales[x].name
	return `<span class="locale_tip" onmouseenter="on_focus_locale_tip(${x})" onmouseleave="on_blur_locale_tip(${x})" onclick="on_click_locale_tip(${x})">${n}</span>`
}

function sub_lord_name(match, p1) {
	let x = p1 | 0
	let n = data.lords[x].name
	return `<span class="lord_tip" onmouseenter="on_focus_lord_tip(${x})" onmouseleave="on_blur_lord_tip(${x})" onclick="on_click_lord_tip(${x})">${n}</span>`
}

function on_log(text) {
	let p = document.createElement("div")

	if (text.match(/^>>/)) {
                text = text.substring(2)
                p.className = "ii"
        }

	if (text.match(/^>/)) {
                text = text.substring(1)
                p.className = "i"
        }

	text = text.replace(/&/g, "&amp;")
	text = text.replace(/</g, "&lt;")
	text = text.replace(/>/g, "&gt;")

	text = text.replace(/C(\d+)/g, sub_card_capability)
	text = text.replace(/E(\d+)/g, sub_card_event)
	text = text.replace(/L(\d+)/g, sub_lord_name)
	text = text.replace(/%(\d+)/g, sub_locale_name)

	if (text.match(/^\.h1/)) {
		text = text.substring(4)
		p.className = "h1"
	}
	if (text.match(/^\.h2/)) {
		text = text.substring(4)
		if (text.startsWith("Teuton"))
			p.className = "h2 teutonic"
		else if (text.startsWith("Russian"))
			p.className = "h2 russian"
		else
			p.className = "h2"
	}
	if (text.match(/^\.h3/)) {
		text = text.substring(4)
		p.className = "h3"
	}
	if (text.match(/^\.h4/)) {
		text = text.substring(4)
		p.className = "h4"
	}

	p.innerHTML = text
	return p
}

function layout_locale_item(loc, e, is_upper, yofs = 0) {
	let [x, y] = locale_xy[loc]
	let z = 0
	if (is_upper) {
		y -= 18
		z = 1
	}
	x += locale_layout[loc] * 44
	y += yofs
	e.classList.toggle("lieutenant", is_upper)
	e.style.top = (y - 23) + "px"
	e.style.left = (x - 23) + "px"
	e.style.zIndex = z
	if (!is_upper)
		locale_layout[loc] ++
}

function layout_calendar() {
	for (let loc = 0; loc < 18; ++loc) {
		let [cx, cy] = calendar_xy[loc]
		let list = calendar_layout_service[loc]
		for (let i = 0; i < list.length; ++i) {
			let e = list[i]
			let x = cx, y = cy, z = 60 - i
			let d = 46 - 24
			if (loc === expand_calendar)
				d = 46
			if (loc === 0) {
				x += -6 + 46 * i
				z = 1
			} else if (loc === 17) {
				x += 60 - 46 * i
				z = 60 - i
			} else {
				x += (146 - 94 - 2)
				y += (227 - 46 - 2) - i * d
			}
			e.style.top = y + "px"
			e.style.left = x + "px"
			e.style.zIndex = z
		}

		list = calendar_layout_cylinder[loc]
		for (let i = 0; i < list.length; ++i) {
			let e = list[i]
			let x = cx, y = cy, z = 61
			if (loc === 0) {
				let k = calendar_layout_service[0].length
				if (k > 0)
					x += k * 46 + 46 + i * 46
				else
					x += 0 + i * 46
			} else if (loc === 17) {
				let k = calendar_layout_service[17].length
				if (k > 0)
					x += 60 - k * 46 - i * 46
				else
					x += 60 + i * 46
			} else if (loc === 1) {
				x += 46 + (i%2) * 46 + (i/2|0) * 12
				y += 66 + (i/2|0) * 36
			} else {
				x += 6 + (i%3) * 46 + (i/3|0) * 24
				y += 66 + (i/3|0) * 36
			}
			e.style.top = y + "px"
			e.style.left = x + "px"
			e.style.zIndex = z
		}
	}
}

function add_force(parent, type) {
	// TODO: reuse pool of elements?
	build_div(parent, "unit " + force_type_name[type], type)
}

function add_asset(parent, type, n, lord) {
	// TODO: reuse pool of elements?
	if (lord === VECHE) {
		if (view.actions && view.actions.veche_coin)
			build_div(parent, "action asset " + asset_type_name[type] + " x"+n, VECHE, on_click_veche_coin)
		else
			build_div(parent, "asset " + asset_type_name[type] + " x"+n)
	} else {
		if (is_asset_action(lord, asset_type_name[type]))
			build_div(parent, "action asset " + asset_type_name[type] + " x"+n, lord, on_click_asset[type])
		else
			build_div(parent, "asset " + asset_type_name[type] + " x"+n)
	}
}

function add_veche_vp(parent) {
	// TODO: reuse pool of elements?
	build_div(parent, "marker square conquered russian")
}

function update_forces(parent, forces) {
	parent.replaceChildren()
	for (let i = 0; i < force_type_count; ++i) {
		let n = pack4_get(forces, i)
		for (let k = 0; k < n; ++k) {
			add_force(parent, i)
		}
	}
}

function update_assets(id, parent, assets) {
	parent.replaceChildren()
	for (let i = 0; i < asset_type_count; ++i) {
		let n = pack4_get(assets, i)
		while (n >= 4) {
			add_asset(parent, i, 4, id)
			n -= 4
		}
		if (asset_type_x3[i]) {
			while (n >= 3) {
				add_asset(parent, i, 3, id)
				n -= 3
			}
		}
		while (n >= 2) {
			add_asset(parent, i, 2, id)
			n -= 2
		}
		while (n >= 1) {
			add_asset(parent, i, 1, id)
			n -= 1
		}
	}
}

function update_vassals(ready_parent, mustered_parent, lord_ix) {
	for (let v of data.lords[lord_ix].vassals) {
		let e = ui.vassal_service[v]
		if (view.lords.vassals[v] === 0) {
			e.classList.remove("hide")
			ready_parent.appendChild(e)
		} else {
			e.classList.remove("hide")
			mustered_parent.appendChild(e)
		}
		e.classList.toggle("action", is_vassal_action(v))
	}
}

function update_lord_mat(ix) {
	update_assets(ix, ui.assets[ix], view.lords.assets[ix])
	update_vassals(ui.ready_vassals[ix], ui.mustered_vassals[ix], ix)
	update_forces(ui.forces[ix], view.lords.forces[ix])
	update_forces(ui.routed[ix], view.lords.routed[ix])
}

function update_lord(ix) {
	let locale = view.lords.locale[ix]
	let service = view.lords.service[ix]
	if (locale < 0) {
		ui.lord_cylinder[ix].classList.add("hide")
		ui.lord_service[ix].classList.add("hide")
		ui.lord_mat[ix].classList.add("hide")
		ui.lord_mat[ix].classList.remove("action")
		return
	}
	if (locale < 100) {
		calendar_layout_service[service].push(ui.lord_service[ix])

		if (!is_lower_lord(ix)) {
			if (is_upper_lord(ix)) {
				let lo = get_lower_lord(ix)
				if (view.lords.locale[lo] === locale) {
					layout_locale_item(locale, ui.lord_cylinder[ix], 1)
					layout_locale_item(locale, ui.lord_cylinder[lo], 0)
				} else {
					layout_locale_item(locale, ui.lord_cylinder[ix], 0)
				}
			} else {
				layout_locale_item(locale, ui.lord_cylinder[ix], 0)
			}
		}

		ui.lord_cylinder[ix].classList.remove("hide")
		ui.lord_service[ix].classList.remove("hide")
		ui.lord_mat[ix].classList.remove("hide")
		update_lord_mat(ix)
	} else {
		calendar_layout_cylinder[locale - 100].push(ui.lord_cylinder[ix])
		ui.lord_cylinder[ix].classList.remove("hide")
		ui.lord_service[ix].classList.add("hide")
		ui.lord_mat[ix].classList.add("hide")
	}
	ui.lord_buttons[ix].classList.toggle("action", is_lord_action(ix))
	ui.lord_cylinder[ix].classList.toggle("action", is_lord_action(ix))
	ui.lord_service[ix].classList.toggle("action", is_service_action(ix))

	if (view.who === undefined)
		ui.lord_cylinder[ix].classList.toggle("selected", ix === view.command)
	else
		ui.lord_cylinder[ix].classList.toggle("selected", ix === view.who)
	ui.lord_mat[ix].classList.toggle("selected", ix === view.who)
}

function update_legate() {
	if (view.call_to_arms.legate < 0) {
		ui.legate.classList.add("hide")
	} else {
		ui.legate.classList.remove("hide")
		if (view.call_to_arms.legate === 100) {
			ui.legate.style.top = "1580px"
			ui.legate.style.left = "170px"
		} else {
			layout_locale_item(view.call_to_arms.legate, ui.legate, 0, -16)
		}
	}
}

function update_veche() {
	ui.veche.replaceChildren()

	let n = view.call_to_arms.veche_coin
	while (n >= 3) {
		add_asset(ui.veche, COIN, 3, VECHE)
		n -= 3
	}
	while (n >= 2) {
		add_asset(ui.veche, COIN, 2, VECHE)
		n -= 2
	}
	while (n >= 1) {
		add_asset(ui.veche, COIN, 1, VECHE)
		n -= 1
	}

	for (let i = 0; i < view.call_to_arms.veche_vp; ++i)
		add_veche_vp(ui.veche)
}

function update_locale(loc) {
	ui.locale[loc].classList.toggle("action", is_locale_action(loc))
	if (ui.locale_extra[loc])
		ui.locale_extra[loc].classList.toggle("action", is_locale_action(loc))

	ui.locale_markers[loc].replaceChildren()

	if (set_has(view.locales.ravaged, loc)) {
		let cn
		if (is_p1_locale(loc))
			cn = "marker small ravaged russian"
		else
			cn = "marker small ravaged teutonic"
		ui.locale_markers[loc].appendChild(get_cached_element(cn))
	}

	if (set_has(view.locales.conquered, loc)) {
		let cn
		if (is_p1_locale(loc))
			cn = "marker square conquered russian"
		else
			cn = "marker square conquered teutonic"
		for (let i = 0; i < data.locales[loc].vp; ++i)
			ui.locale_markers[loc].appendChild(get_cached_element(cn))
	}

	if (set_has(view.locales.castles1, loc)) {
		let cn = "marker rectangle castle teutonic"
		ui.locale_markers[loc].appendChild(get_cached_element(cn))
	}

	if (set_has(view.locales.castles2, loc)) {
		let cn = "marker rectangle castle russian"
		ui.locale_markers[loc].appendChild(get_cached_element(cn))
	}

	if (set_has(view.locales.walls, loc)) {
		let cn = "marker square walls"
		ui.locale_markers[loc].appendChild(get_cached_element(cn))
	}

	let sieges = map_get(view.locales.sieges, loc)
	if (sieges > 0) {
		let cn
		if (is_p1_locale(loc))
			cn = "marker square siege russian"
		else
			cn = "marker square siege teutonic"
		for (let i = 0; i < sieges; ++i)
			ui.locale_markers[loc].appendChild(get_cached_element(cn))
	}
}

function update_plan() {
	if (view.plan) {
		ui.plan_dialog.classList.remove("hide")
		for (let i = 0; i < 6; ++i) {
			if (i < view.plan.length) {
				let lord = view.plan[i]
				if (lord < 0) {
					if (player === "Teutons")
						ui.plan_list_cards[i].className = "card teutonic cc_pass"
					else
						ui.plan_list_cards[i].className = "card russian cc_pass"
				} else {
					if (lord < 6)
						ui.plan_list_cards[i].className = "card teutonic cc_lord_" + lord
					else
						ui.plan_list_cards[i].className = "card russian cc_lord_" + lord
				}
			} else if (i < max_plan_length()) {
				if (player === "Teutons")
					ui.plan_list_cards[i].className = "card teutonic cc_back"
				else
					ui.plan_list_cards[i].className = "card russian cc_back"
			} else {
				ui.plan_list_cards[i].className = "hide"
			}
		}
		for (let lord = 0; lord < 12; ++lord) {
			if (is_plan_action(lord)) {
				ui.plan_action_cards[lord].classList.add("action")
				ui.plan_action_cards[lord].classList.remove("disabled")
			} else {
				ui.plan_action_cards[lord].classList.remove("action")
				ui.plan_action_cards[lord].classList.add("disabled")
			}
		}
		if (is_plan_action(-1)) {
			ui.plan_action_pass_p1.classList.add("action")
			ui.plan_action_pass_p1.classList.remove("disabled")
			ui.plan_action_pass_p2.classList.add("action")
			ui.plan_action_pass_p2.classList.remove("disabled")
		} else {
			ui.plan_action_pass_p1.classList.remove("action")
			ui.plan_action_pass_p1.classList.add("disabled")
			ui.plan_action_pass_p2.classList.remove("action")
			ui.plan_action_pass_p2.classList.add("disabled")
		}
	} else {
		ui.plan_dialog.classList.add("hide")
	}
}

function update_cards() {
	if (view.show_arts_of_war) {
		ui.arts_of_war_dialog.classList.remove("hide")
		ui.arts_of_war_list.replaceChildren()
		for_each_friendly_card(c => {
			if (!is_card_in_use(c)) {
				let elt = ui.cards[c]
				ui.arts_of_war_list.appendChild(elt)
				elt.classList.toggle("action", is_card_action(c))
				elt.classList.toggle("disabled", !is_card_action(c))
			}
		})
	} else {
		ui.arts_of_war_dialog.classList.add("hide")
		for (let c = 0; c < 42; ++c) {
			let elt = ui.cards[c]
			elt.classList.toggle("action", is_card_action(c))
			elt.classList.remove("disabled")
		}
	}

	ui.events.replaceChildren()
	for (let c of view.events)
		ui.events.appendChild(ui.cards[c])

	ui.capabilities1.replaceChildren()
	for_each_teutonic_card(c => {
		if (view.capabilities.includes(c))
			ui.capabilities1.appendChild(ui.cards[c])
	})

	ui.capabilities2.replaceChildren()
	for_each_russian_card(c => {
		if (view.capabilities.includes(c))
			ui.capabilities2.appendChild(ui.cards[c])
	})

	ui.hand.replaceChildren()
	if (view.hand) {
		for (let c of view.hand)
			ui.hand.appendChild(ui.cards[c])
	}

	for (let ix = 0; ix < data.lords.length; ++ix) {
		let side = ix < 6 ? "teutonic" : "russian"
		ui.lord_capabilities[ix].replaceChildren()
		let c = view.lords.capabilities[(ix << 1) + 0]
		if (c >= 0)
			ui.lord_capabilities[ix].appendChild(ui.cards[c])
		c = view.lords.capabilities[(ix << 1) + 1]
		if (c >= 0)
			ui.lord_capabilities[ix].appendChild(ui.cards[c])
	}
}

function on_update() {
	restart_cache()

	locale_layout.fill(0)
	for (let i = 0; i < 18; ++i) {
		calendar_layout_cylinder[i] = []
		calendar_layout_service[i] = []
	}

	for (let ix = 0; ix < data.lords.length; ++ix) {
		if (view.lords.locale[ix] < 0) {
			ui.lord_cylinder[ix].classList.add("hide")
			ui.lord_service[ix].classList.add("hide")
			ui.lord_mat[ix].classList.add("hide")
		} else {
			ui.lord_cylinder[ix].classList.remove("hide")
			update_lord(ix)
		}
	}

	for (let loc = 0; loc < data.locales.length; ++loc)
		update_locale(loc)

	layout_calendar()

	update_legate()
	update_veche()

	update_current_card_display()

	if (view.turn & 1)
		ui.turn.className = `marker circle turn campaign t${view.turn>>1}`
	else
		ui.turn.className = `marker circle turn levy t${view.turn>>1}`

	let vp1 = count_vp1()
	let vp2 = count_vp2()
	if ((vp1 >> 1) === (vp2 >> 1)) {
		if (vp1 & 1)
			ui.vp1.className = `marker circle victory teutonic stack v${vp1>>1} half`
		else
			ui.vp1.className = `marker circle victory teutonic stack v${vp1>>1}`
		if (vp2 & 1)
			ui.vp2.className = `marker circle victory russian stack v${vp2>>1} half`
		else
			ui.vp2.className = `marker circle victory russian stack v${vp2>>1}`
	} else {
		if (vp1 & 1)
			ui.vp1.className = `marker circle victory teutonic v${vp1>>1} half`
		else
			ui.vp1.className = `marker circle victory teutonic v${vp1>>1}`
		if (vp2 & 1)
			ui.vp2.className = `marker circle victory russian v${vp2>>1} half`
		else
			ui.vp2.className = `marker circle victory russian v${vp2>>1}`
	}

	update_plan()
	update_cards()

	action_button("sail", "Sail")
	action_button("march", "March")
	action_button("siege", "Siege")
	action_button("storm", "Storm")
	action_button("sally", "Sally")
	action_button("supply", "Supply")
	action_button("forage", "Forage")
	action_button("ravage", "Ravage")
	action_button("tax", "Tax")
	action_button("pass", "Pass")

	action_button("ship", "Ship")
	action_button("boat", "Boat")
	action_button("cart", "Cart")
	action_button("sled", "Sled")

	action_button("capability", "Capability")

	action_button("discard", "Discard")
	action_button("play", "Play")
	action_button("hold", "Hold")
	action_button("deploy", "Deploy")

	action_button("done", "Done")
	action_button("unfed", "Unfed")
	action_button("end_plan", "End plan")
	action_button("end_feed", "End feed")
	action_button("end_pay", "End pay")
	action_button("end_disband", "End disband")
	action_button("end_actions", "End actions")
	action_button("end_levy", "End levy")
	action_button("end_muster", "End muster")
	action_button("end_setup", "End setup")

	action_button("undo", "Undo")
}

function build_div(parent, className, id, onclick) {
	let e = document.createElement("div")
	e.className = className
	if (onclick) {
		e.my_id = id
		e.addEventListener("mousedown", onclick)
	}
	parent.appendChild(e)
	return e
}

function build_lord_mat(lord, ix, side, name) {
	let parent = document.getElementById(side === 'teutonic' ? "court1" : "court2")
	let mat = build_div(parent, `mat ${side} ${name} hide`)
	let bg = build_div(mat, "background")
	ui.forces[ix] = build_div(bg, "forces")
	ui.routed[ix] = build_div(bg, "routed")
	ui.assets[ix] = build_div(bg, "assets")
	ui.ready_vassals[ix] = build_div(bg, "ready_vassals")
	ui.mustered_vassals[ix] = build_div(bg, "mustered_vassals")
	ui.lord_buttons[ix] = build_div(bg, "shield", ix, on_click_cylinder)
	ui.lord_capabilities[ix] = build_div(mat, "capabilities")
	ui.lord_mat[ix] = mat
}

function build_card(side, c) {
	let card = ui.cards[c] = document.createElement("div")
	card.className = `card ${side} aow_${c}`
	card.my_id = c
	card.addEventListener("mousedown", on_click_card)
}

function build_plan() {
	let elt
	for (let i = 0; i < 6; ++i) {
		elt = document.createElement("div")
		elt.className = "hide"
		ui.plan_list_cards.push(elt)
		ui.plan_list.appendChild(elt)
	}
	for (let lord = 0; lord < 12; ++lord) {
		let side = lord < 6 ? "teutonic" : "russian"
		elt = document.createElement("div")
		elt.className = `card ${side} cc_lord_${lord}`
		elt.my_id = lord
		elt.addEventListener("mousedown", on_click_plan)
		ui.plan_action_cards.push(elt)
		ui.plan_actions.appendChild(elt)
	}

	ui.plan_action_pass_p1 = elt = document.createElement("div")
	elt.className = `card teutonic cc_pass`
	elt.my_id = -1
	elt.addEventListener("mousedown", on_click_plan)
	ui.plan_actions.appendChild(elt)

	ui.plan_action_pass_p2 = elt = document.createElement("div")
	elt.className = `card russian cc_pass`
	elt.my_id = -1
	elt.addEventListener("mousedown", on_click_plan)
	ui.plan_actions.appendChild(elt)
}

function build_map() {
	data.locales.forEach((locale, ix) => {
		let e = ui.locale[ix] = document.createElement("div")
		let region = clean_name(locale.region)
		e.className = "locale " + locale.type + " " + region
		let x = round(locale.box.x * MAP_DPI / 300)
		let y = round(locale.box.y * MAP_DPI / 300)
		let w = floor((locale.box.x+locale.box.w) * MAP_DPI / 300) - x
		let h = floor((locale.box.y+locale.box.h) * MAP_DPI / 300) - y
		if (locale.type === 'town') {
			locale_xy[ix] = [ round(x + w / 2), y - 24 ]
			x -= 11
			y -= 5
			w += 16
			h += 5
		} else if (locale.type === 'region') {
			locale_xy[ix] = [ round(x + w / 2), round(y + h / 2) ]
			x -= 3
			y -= 4
		} else {
			locale_xy[ix] = [ round(x + w / 2), y - 36 ]
			x -= 2
			y -= 2
			w -= 2
			h -= 2
		}
		e.style.left = x + "px"
		e.style.top = y + "px"
		e.style.width = w + "px"
		e.style.height = h + "px"
		e.my_id = ix
		e.addEventListener("mousedown", on_click_locale)
		e.addEventListener("mouseenter", on_focus_locale)
		e.addEventListener("mouseleave", on_blur)
		document.getElementById("locales").appendChild(e)

		if (locale.type !== 'region') {
			e = ui.locale_extra[ix] = document.createElement("div")
			e.className = "locale_extra " + locale.type + " " + region
			let cx = x + (w >> 1) + 4
			let ew = extra_size[locale.type][0]
			let eh = extra_size[locale.type][1]
			e.style.top = (y - eh) + "px"
			e.style.left = (cx - ew/2) + "px"
			e.style.width = ew + "px"
			e.style.height = eh + "px"
			e.my_id = ix
			e.addEventListener("mousedown", on_click_locale)
			e.addEventListener("mouseenter", on_focus_locale)
			e.addEventListener("mouseleave", on_blur)
			document.getElementById("locales").appendChild(e)
		}

		e = ui.locale_markers[ix] = document.createElement("div")
		e.className = "locale_markers " + locale.type + " " + region
		x = (locale.box.x + locale.box.w / 2) * MAP_DPI / 300 - 196/2
		y = (locale.box.y + locale.box.h * 0) * MAP_DPI / 300 - 8
		e.style.top = y + "px"
		e.style.left = x + "px"
		e.style.width = 196 + "px"
		document.getElementById("pieces").appendChild(e)
	})

	let x = 160
	let y = 2740
	data.lords.forEach((lord, ix) => {
		let e = ui.lord_cylinder[ix] = document.createElement("div")
		e.className = "cylinder lord " + clean_name(lord.side) + " " + clean_name(lord.name) + " hide"
		e.my_id = ix
		e.addEventListener("mousedown", on_click_cylinder)
		e.addEventListener("mouseenter", on_focus_cylinder)
		e.addEventListener("mouseleave", on_blur)
		document.getElementById("pieces").appendChild(e)

		e = ui.lord_service[ix] = document.createElement("div")
		e.className = "service_marker lord image" + lord.image + " " + clean_name(lord.side) + " " + clean_name(lord.name) + " hide"
		e.my_id = ix
		e.addEventListener("mousedown", on_click_lord_service_marker)
		e.addEventListener("mouseenter", on_focus_lord_service_marker)
		e.addEventListener("mouseleave", on_blur_lord_service_marker)
		document.getElementById("pieces").appendChild(e)

		build_lord_mat(lord, ix, clean_name(lord.side), clean_name(lord.name))

		x += 70
	})

	data.vassals.forEach((vassal, ix) => {
		let lord = data.lords[vassal.lord]
		let e = ui.vassal_service[ix] = document.createElement("div")
		e.className = "service_marker vassal image" + vassal.image + " " + clean_name(lord.side) + " " + clean_name(vassal.name) + " hide"
		e.my_id = ix
		e.addEventListener("mousedown", on_click_vassal_service_marker)
		e.addEventListener("mouseenter", on_focus_vassal_service_marker)
		e.addEventListener("mouseleave", on_blur)
		document.getElementById("pieces").appendChild(e)
	})

	for (let name in original_boxes) {
		let x = round(original_boxes[name][0] * MAP_DPI / 300)
		let y = round(original_boxes[name][1] * MAP_DPI / 300)
		let w = round(original_boxes[name][2] * MAP_DPI / 300) - 8
		let h = round(original_boxes[name][3] * MAP_DPI / 300) - 8
		let e = ui.boxes[name] = document.createElement("div")
		e.className = "box " + name
		e.style.left = x + "px"
		e.style.top = y + "px"
		e.style.width = w + "px"
		e.style.height = h + "px"
		document.getElementById("boxes").appendChild(e)
	}

	build_plan()

	for (let c = 0; c < 21; ++c)
		build_card("teutonic", c)
	for (let c = 21; c < 42; ++c)
		build_card("russian", c)
}

build_map()
// drag_element_with_mouse("#battle", "#battle_header")
drag_element_with_mouse("#arts_of_war", "#arts_of_war_header")
scroll_with_middle_mouse("main")

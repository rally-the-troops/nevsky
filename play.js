"use strict"

// Feed x2 on lords with >6 units
// End marker on Calendar
// Remove battle mat.
// Siege/Walls/Garrison display in battle array.

// TODO: show sg and hg highlighting on battle mat (separate from view.group)

// TODO: tooltip on cylinders
//	fealty rating and starting assets + forces on calendar
//	current assets and forces on map

// TODO: battle.where marker on map, remove cylinders?

// inactive command cylinder color - other color outline
// moved/fought lord coloring - blue outline?

function find_lord(name) {
	return data.lords.findIndex((x) => x.name === name)
}

const LORD_ANDREAS = find_lord("Andreas")
const LORD_HERMANN = find_lord("Hermann")
const LORD_ALEKSANDR = find_lord("Aleksandr")
const LORD_ANDREY = find_lord("Andrey")

const MAP_DPI = 75

const VASSAL_UNAVAILABLE = 0
const VASSAL_READY = 1
const VASSAL_MUSTERED = 2

const NOWHERE = -1
const CALENDAR = 100

const LEGATE_INDISPOSED = -2
const LEGATE_ARRIVED = -1

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

const force_action_name = [ "knights", "sergeants", "light_horse", "asiatic_horse", "men_at_arms", "militia", "serfs" ]
const routed_force_action_name = [ "routed_knights", "routed_sergeants", "routed_light_horse", "routed_asiatic_horse", "routed_men_at_arms", "routed_militia", "routed_serfs" ]

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

const on_click_force = [
	(evt) => evt.button === 0 && send_action('knights', evt.target.my_id),
	(evt) => evt.button === 0 && send_action('sergeants', evt.target.my_id),
	(evt) => evt.button === 0 && send_action('light_horse', evt.target.my_id),
	(evt) => evt.button === 0 && send_action('asiatic_horse', evt.target.my_id),
	(evt) => evt.button === 0 && send_action('men_at_arms', evt.target.my_id),
	(evt) => evt.button === 0 && send_action('militia', evt.target.my_id),
	(evt) => evt.button === 0 && send_action('serfs', evt.target.my_id),
]

const on_click_routed_force = [
	(evt) => evt.button === 0 && send_action('routed_knights', evt.target.my_id),
	(evt) => evt.button === 0 && send_action('routed_sergeants', evt.target.my_id),
	(evt) => evt.button === 0 && send_action('routed_light_horse', evt.target.my_id),
	(evt) => evt.button === 0 && send_action('routed_asiatic_horse', evt.target.my_id),
	(evt) => evt.button === 0 && send_action('routed_men_at_arms', evt.target.my_id),
	(evt) => evt.button === 0 && send_action('routed_militia', evt.target.my_id),
	(evt) => evt.button === 0 && send_action('routed_serfs', evt.target.my_id),
]

function on_click_veche_coin(evt) {
	if (evt.button === 0)
		send_action('veche_coin')
}

function on_click_veche(evt) {
	if (evt.button === 0)
		send_action('veche')
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

function pack2_get(word, n) {
	n = n << 1
	return (word >>> n) & 3
}

function pack4_get(word, n) {
	n = n << 2
	return (word >>> n) & 15
}

function is_lord_besieged(lord) {
	let besieged = pack1_get(view.pieces.besieged, lord)
	// show sallying lords as not besieged
	if (view.battle && view.battle.reserves.includes(lord))
		return false
	return besieged
}

function is_lord_moved(lord) {
	return pack2_get(view.pieces.moved, lord) > 0
}

function is_veche_action() {
	return !!(view.actions && view.actions.veche === 1)
}

function is_calendar_action(turn) {
	return !!(view.actions && view.actions.calendar && set_has(view.actions.calendar, turn))
}

function is_lord_action(lord) {
	return !!(view.actions && view.actions.lord && set_has(view.actions.lord, lord))
}

function is_battle_array_action(ix) {
	return !!(view.actions && view.actions.array && set_has(view.actions.array, ix))
}

function is_routed_force_action(lord, action) {
	return !!(view.actions && view.actions[action] && set_has(view.actions[action], lord))
}

function is_force_action(lord, action) {
	return !!(view.actions && view.actions[action] && set_has(view.actions[action], lord))
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

function is_laden_march_action(locale) {
	return !!(view.actions && view.actions.laden_march && set_has(view.actions.laden_march, locale))
}

function is_way_action(way) {
	return !!(view.actions && view.actions.way && set_has(view.actions.way, way))
}

function is_card_action(c) {
	return !!(view.actions && view.actions.card && set_has(view.actions.card, c))
}

function is_legate_action() {
	return !!(view.actions && view.actions.legate)
}

function is_legate_selected() {
	return player === "Teutons" && !!view.pieces.legate_selected
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

function is_attacking_lord(lord) {
	if (view.battle.attacker === "Teutons")
		return lord < 6
	else
		return lord >= 6
}

function is_p1_locale(loc) {
	return loc >= first_p1_locale && loc <= last_p1_locale
}

function is_p2_locale(loc) {
	return loc >= first_p2_locale && loc <= last_p2_locale
}

function count_vp1() {
	let vp = 0
	for (let loc of view.pieces.castles1)
		vp += 2
	for (let loc of view.pieces.conquered)
		if (is_p2_locale(loc))
			vp += data.locales[loc].vp << 1
	for (let loc of view.pieces.ravaged)
		if (is_p2_locale(loc))
			vp += 1
	return vp
}

function count_vp2() {
	let vp = view.pieces.veche_vp * 2
	for (let loc of view.pieces.castles2)
		vp += 2
	for (let loc of view.pieces.conquered)
		if (is_p1_locale(loc))
			vp += data.locales[loc].vp << 1
	for (let loc of view.pieces.ravaged)
		if (is_p1_locale(loc))
			vp += 1
	return vp
}

function get_lord_locale(lord) {
	return view.pieces.locale[lord]
}

function is_lord_on_map(lord) {
	let loc = get_lord_locale(lord)
	return loc !== NOWHERE && loc < CALENDAR
}

function is_marshal(lord) {
	if (lord === LORD_HERMANN) return !is_lord_on_map(LORD_ANDREAS)
	if (lord === LORD_ANDREY) return !is_lord_on_map(LORD_ALEKSANDR)
}

function has_global_capability(cap) {
	for (let c of view.capabilities)
		if (data.cards[c].capability === cap)
			return true
	return false
}

function is_vassal_ready(vassal) {
	return view.pieces.vassals[vassal] === VASSAL_READY
}

function is_vassal_mustered(vassal) {
	return view.pieces.vassals[vassal] === VASSAL_MUSTERED
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
	return map_has(view.pieces.lieutenants, lord)
}

function is_lower_lord(lord) {
	for (let i = 1; i < view.pieces.lieutenants.length; i += 2)
		if (view.pieces.lieutenants[i] === lord)
			return true
	return false
}

function get_lower_lord(upper) {
	return map_get(view.pieces.lieutenants, upper, -1)
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
	"calendar box0": [6,62,1265,89],
	"calendar box17": [3827,2056,1265,86],
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
	locale_name: [],
	locale_markers: [],
	lord_cylinder: [],
	battle_cylinder: [],
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
	ways: [],
	smerdi: document.getElementById("smerdi"),
	legate: document.getElementById("legate"),
	veche: document.getElementById("veche"),

	plan_panel: document.getElementById("plan_panel"),
	plan: document.getElementById("plan"),
	plan_actions: document.getElementById("plan_actions"),
	plan_cards: [],
	plan_action_cards: [],

	arts_of_war_panel: document.getElementById("arts_of_war_panel"),
	arts_of_war: document.getElementById("arts_of_war"),

	events_panel: document.getElementById("events_panel"),
	events: document.getElementById("events"),

	hand_panel: document.getElementById("hand_panel"),
	hand: document.getElementById("hand"),

	capabilities1: document.getElementById("capabilities1"),
	capabilities2: document.getElementById("capabilities2"),
	command: document.getElementById("command"),
	turn: document.getElementById("turn"),
	vp1: document.getElementById("vp1"),
	vp2: document.getElementById("vp2"),
	court1_header: document.getElementById("court1_header"),
	court2_header: document.getElementById("court2_header"),
	court1: document.getElementById("court1"),
	court2: document.getElementById("court2"),
	garrison: document.getElementById("garrison"),
	battle_panel: document.getElementById("battle_panel"),
	battle_header: document.getElementById("battle_header"),
	pursuit: document.getElementById("pursuit"),
	battle_grid: document.getElementById("battle_grid"),
	battle_grid_array: [
		document.getElementById("grid_a1"),
		document.getElementById("grid_a2"),
		document.getElementById("grid_a3"),
		document.getElementById("grid_d1"),
		document.getElementById("grid_d2"),
		document.getElementById("grid_d3"),
		document.getElementById("grid_sa1"),
		document.getElementById("grid_sa2"),
		document.getElementById("grid_sa3"),
		document.getElementById("grid_rd1"),
		document.getElementById("grid_rd2"),
		document.getElementById("grid_rd3"),
	],
	castles: [
		document.getElementById("castle11"),
		document.getElementById("castle12"),
		document.getElementById("castle21"),
		document.getElementById("castle22"),
	],
}

let locale_layout = []
let calendar_layout_service = []
let calendar_layout_cylinder = []

function clean_name(name) {
	return name.toLowerCase().replaceAll("&", "and").replaceAll(" ", "_")
}

const extra_size_OLD = {
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
		send_action('laden_march', id)
	}
}

function on_focus_locale(evt) {
	let id = evt.target.my_id
	document.getElementById("status").textContent = `(${id}) ${data.locales[id].name} - ${data.locales[id].type}`
}

function on_click_way(evt) {
	if (evt.button === 0) {
		let id = evt.target.my_id
		send_action('way', id)
	}
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
	let loc = view.pieces.locale[lord]
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
		let assets = view.pieces.assets[lord]
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
		let forces = view.pieces.forces[lord]
		let routed = view.pieces.routed[lord]
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

		let c = view.pieces.capabilities[(lord<<1)]
		if (c >= 0)
			tip += ` \u2013 ${data.cards[c].capability}`
		c = view.pieces.capabilities[(lord<<1) + 1]
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

function on_click_calendar(evt) {
	if (evt.button === 0) {
		let id = evt.target.my_id
		send_action('calendar', evt.target.my_id)
	}
}

function on_focus_lord_service_marker(evt) {
	let lord = evt.target.my_id
	let info = data.lords[lord]
	document.getElementById("status").textContent = `${info.full_name} - ${info.title}`
	if (expand_calendar !== view.pieces.service[lord]) {
		expand_calendar = view.pieces.service[lord]
		layout_calendar()
	}
}

function on_blur_lord_service_marker(evt) {
	let id = evt.target.my_id
	on_blur(evt)
	if (expand_calendar === view.pieces.service[id]) {
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

function on_click_legate(evt) {
	if (evt.button === 0)
		send_action('legate')
}

function on_click_array(evt) {
	if (evt.button === 0)
		send_action('array', evt.target.my_id)
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
	if (ui.locale_name[loc])
		ui.locale_name[loc].classList.add("tip")
}

function on_blur_locale_tip(loc) {
	ui.locale[loc].classList.remove("tip")
	if (ui.locale_name[loc])
		ui.locale_name[loc].classList.remove("tip")
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

function layout_locale_item(loc, e, is_upper) {
	locale_layout[loc].push([e, is_upper])
	e.classList.toggle("lieutenant", is_upper)
}

function layout_locale_cylinders(loc) {
	let [xc, yc] = locale_xy[loc]

	let n = 0
	for (let [e,is_upper] of locale_layout[loc])
		if (!is_upper)
			++n

	let wrap = 3
	switch (data.locales[loc].type) {
	case "region": wrap = 2; break
	case "town": wrap = 2; break
	case "novgorod": wrap = 4; break
	}

	let m = Math.floor((n-1) / wrap)
	let i = 0
	let k = 0
	for (let [e,is_upper] of locale_layout[loc]) {
		let nn = n
		if (nn > wrap)
			nn = wrap
		let x = xc + (i - (nn-1)/2) * 44 + k * 22
		let y = yc + (k * 32) - m * 32
		let z = 1
		if (is_upper) {
			y -= 18
			z = 2
		}
		if (e === ui.legate)
			y -= 16
		e.style.top = (y - 23) + "px"
		e.style.left = (x - 23) + "px"
		e.style.zIndex = z
		if (!is_upper)
			++i
		if (i >= wrap) {
			i = 0
			++k
		}
	}
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

function add_force(parent, type, lord, routed) {
	// TODO: reuse pool of elements?
	if (routed) {
		if (is_routed_force_action(lord, routed_force_action_name[type]))
			build_div(parent, "action unit " + force_type_name[type], lord, on_click_routed_force[type])
		else
			build_div(parent, "unit " + force_type_name[type], lord, on_click_routed_force[type])
	} else {
		if (is_force_action(lord, force_action_name[type]))
			build_div(parent, "action unit " + force_type_name[type], lord, on_click_force[type])
		else
			build_div(parent, "unit " + force_type_name[type], lord, on_click_force[type])
	}
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

function update_forces(parent, forces, lord_ix, routed) {
	parent.replaceChildren()
	for (let i = 0; i < force_type_count; ++i) {
		let n = pack4_get(forces, i)
		for (let k = 0; k < n; ++k) {
			add_force(parent, i, lord_ix, routed)
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
		if (is_vassal_ready(v)) {
			e.classList.remove("hide")
			ready_parent.appendChild(e)
		}
		else if (is_vassal_mustered(v)) {
			e.classList.remove("hide")
			mustered_parent.appendChild(e)
		}
		else {
			e.classList.add("hide")
		}
		e.classList.toggle("action", is_vassal_action(v))
	}
}

function update_lord_mat(ix) {
	update_assets(ix, ui.assets[ix], view.pieces.assets[ix])
	update_vassals(ui.ready_vassals[ix], ui.mustered_vassals[ix], ix)
	update_forces(ui.forces[ix], view.pieces.forces[ix], ix, false)
	update_forces(ui.routed[ix], view.pieces.routed[ix], ix, true)
}

function is_lord_command(ix) {
	return view.command === ix
}

function is_lord_selected(ix) {
	if (view.who >= 0)
		return ix === view.who
	if (view.group)
		return view.group.includes(ix)
	return false
}

function update_lord(ix) {
	let locale = view.pieces.locale[ix]
	let service = view.pieces.service[ix]
	if (locale < 0) {
		ui.lord_cylinder[ix].classList.add("hide")
		ui.lord_service[ix].classList.add("hide")
		ui.lord_mat[ix].classList.remove("action")
		return
	}
	if (locale < 100) {
		calendar_layout_service[service].push(ui.lord_service[ix])

		if (!is_lower_lord(ix)) {
			if (is_upper_lord(ix)) {
				let lo = get_lower_lord(ix)
				if (view.pieces.locale[lo] === locale) {
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
		update_lord_mat(ix)
	} else {
		calendar_layout_cylinder[locale - 100].push(ui.lord_cylinder[ix])
		ui.lord_cylinder[ix].classList.remove("hide")
		ui.lord_service[ix].classList.add("hide")
	}
	ui.lord_cylinder[ix].classList.toggle("besieged", is_lord_besieged(ix))
	ui.lord_cylinder[ix].classList.toggle("moved", is_lord_moved(ix))
	ui.lord_buttons[ix].classList.toggle("action", is_lord_action(ix))
	ui.lord_cylinder[ix].classList.toggle("action", is_lord_action(ix))
	ui.lord_service[ix].classList.toggle("action", is_service_action(ix))

	if (ix === LORD_HERMANN)
		ui.lord_cylinder[ix].classList.toggle("marshal", !is_lord_on_map(LORD_ANDREAS))
	if (ix === LORD_ANDREY)
		ui.lord_cylinder[ix].classList.toggle("marshal", !is_lord_on_map(LORD_ALEKSANDR))

	ui.lord_cylinder[ix].classList.toggle("selected", is_lord_selected(ix))
	ui.lord_service[ix].classList.toggle("selected", is_lord_selected(ix))
	ui.lord_mat[ix].classList.toggle("selected", is_lord_selected(ix))

	ui.lord_cylinder[ix].classList.toggle("command", is_lord_command(ix))
	ui.lord_mat[ix].classList.toggle("command", is_lord_command(ix))

	ui.lord_mat[ix].classList.toggle("besieged", is_lord_besieged(ix))
	ui.lord_mat[ix].classList.toggle("moved", is_lord_moved(ix))
}

function update_legate() {
	if (view.pieces.legate === LEGATE_INDISPOSED) {
		ui.legate.classList.add("hide")
	} else {
		ui.legate.classList.remove("hide")
		ui.legate.classList.toggle("action", is_legate_action())
		ui.legate.classList.toggle("selected", is_legate_selected())
		if (view.pieces.legate === LEGATE_ARRIVED) {
			ui.legate.style.top = "1580px"
			ui.legate.style.left = "170px"
		} else {
			layout_locale_item(view.pieces.legate, ui.legate, 0)
		}
	}
}

function update_smerdi() {
	ui.smerdi.replaceChildren()
	for (let i = 0; i < view.pieces.smerdi; ++i)
		build_div(ui.smerdi, "unit serfs")
}

function update_veche() {
	ui.veche.replaceChildren()

	let n = view.pieces.veche_coin
	while (n >= 4) {
		add_asset(ui.veche, COIN, 4, VECHE)
		n -= 4
	}
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

	for (let i = 0; i < view.pieces.veche_vp; ++i)
		add_veche_vp(ui.veche)
}

function is_town_locale(loc) {
	return data.locales[loc].type === "town"
}

function update_castle(elt, loc) {
	if (loc === undefined) {
		elt.classList.toggle("hide", true)
	} else {
		elt.classList.toggle("hide", false)
		let [xc, yc] = locale_xy[loc]
		if (is_town_locale(loc)) {
			elt.style.top = (yc - 26) + "px"
			elt.style.left = (xc - 49) + "px"
		} else {
			elt.style.top = (yc - 15) + "px"
			elt.style.left = (xc - 49) + "px"
		}
		elt.style.zIndex = 0
	}
}

function update_locale(loc) {
	layout_locale_cylinders(loc)

	ui.locale[loc].classList.toggle("action", is_locale_action(loc) || is_laden_march_action(loc))
	ui.locale[loc].classList.toggle("laden", is_laden_march_action(loc))
	if (ui.locale_name[loc]) {
		ui.locale_name[loc].classList.toggle("action", is_locale_action(loc) || is_laden_march_action(loc))
		ui.locale_name[loc].classList.toggle("laden", is_laden_march_action(loc))
	}

	ui.locale_markers[loc].replaceChildren()

	if (set_has(view.pieces.ravaged, loc)) {
		let cn
		if (is_p1_locale(loc))
			cn = "marker small ravaged russian"
		else
			cn = "marker small ravaged teutonic"
		ui.locale_markers[loc].appendChild(get_cached_element(cn))
	}

	if (set_has(view.pieces.conquered, loc)) {
		let cn
		if (is_p1_locale(loc))
			cn = "marker square conquered russian"
		else
			cn = "marker square conquered teutonic"
		for (let i = 0; i < data.locales[loc].vp; ++i)
			ui.locale_markers[loc].appendChild(get_cached_element(cn))
	}

	// TODO: max 4 walls - reuse elements
	if (set_has(view.pieces.walls, loc)) {
		let cn = "marker square walls"
		ui.locale_markers[loc].appendChild(get_cached_element(cn))
	}

	let sieges = map_get(view.pieces.sieges, loc)
	if (sieges > 0) {
		let cn
		if (is_p1_locale(loc) || set_has(view.pieces.castles1, loc))
			cn = "marker square siege russian"
		else
			cn = "marker square siege teutonic"
		for (let i = 0; i < sieges; ++i)
			ui.locale_markers[loc].appendChild(get_cached_element(cn))
	}
}

function update_plan() {
	if (view.plan) {
		let is_planning = view.actions && view.actions.plan

		ui.plan_panel.classList.remove("hide")
		for (let i = 0; i < 6; ++i) {
			if (i < view.plan.length) {
				let lord = view.plan[i]
				if (lord < 0) {
					if (player === "Teutons")
						ui.plan_cards[i].className = "card teutonic cc_pass"
					else
						ui.plan_cards[i].className = "card russian cc_pass"
				} else {
					if (lord < 6)
						ui.plan_cards[i].className = "card teutonic cc_lord_" + lord
					else
						ui.plan_cards[i].className = "card russian cc_lord_" + lord
				}
			} else if (is_planning && i < max_plan_length()) {
				if (player === "Teutons")
					ui.plan_cards[i].className = "card teutonic cc_back"
				else
					ui.plan_cards[i].className = "card russian cc_back"
			} else {
				ui.plan_cards[i].className = "hide"
			}
		}

		if (is_planning) {
			ui.plan_actions.classList.remove("hide")
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
			ui.plan_actions.classList.add("hide")
		}
	} else {
		ui.plan_panel.classList.add("hide")
	}
}

function update_cards() {
	for (let c = 0; c < 42; ++c) {
		let elt = ui.cards[c]
		elt.classList.toggle("selected", c === view.what)
		elt.classList.toggle("action", is_card_action(c))
	}

	if (view.arts_of_war) {
		ui.arts_of_war_panel.classList.remove("hide")
		ui.arts_of_war.replaceChildren()
		for (let c of view.arts_of_war) {
			let elt = ui.cards[c]
			console.log("showin'", c, ui.cards[c])
			ui.arts_of_war.appendChild(ui.cards[c])
		}
	} else {
		ui.arts_of_war_panel.classList.add("hide")
	}

	if (view.events.length > 0) {
		ui.events_panel.classList.remove("hide")
		ui.events.replaceChildren()
		for (let c of view.events)
			ui.events.appendChild(ui.cards[c])
	} else {
		ui.events_panel.classList.add("hide")
	}

	if (view.hand && view.hand.length > 0) {
		ui.hand_panel.classList.remove("hide")
		ui.hand.replaceChildren()
		if (view.hand) {
			for (let c of view.hand)
				ui.hand.appendChild(ui.cards[c])
		}
	} else {
		ui.hand_panel.classList.add("hide")
	}

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

	for (let ix = 0; ix < data.lords.length; ++ix) {
		let side = ix < 6 ? "teutonic" : "russian"
		ui.lord_capabilities[ix].replaceChildren()
		let c = view.pieces.capabilities[(ix << 1) + 0]
		if (c >= 0)
			ui.lord_capabilities[ix].appendChild(ui.cards[c])
		c = view.pieces.capabilities[(ix << 1) + 1]
		if (c >= 0)
			ui.lord_capabilities[ix].appendChild(ui.cards[c])
	}
}

function update_battle() {
	let array = view.battle.array

	// Pursuit marker points "up" towards the conceding side
	if (view.battle.conceded === "Russians") {
		if (view.battle.attacker === "Russians")
			ui.pursuit.className = "marker rectangle pursuit teutonic"
		else
			ui.pursuit.className = "marker rectangle pursuit teutonic rotate"
	} else if (view.battle.conceded === "Teutons") {
		if (view.battle.attacker === "Teutons")
			ui.pursuit.className = "marker rectangle pursuit russian"
		else
			ui.pursuit.className = "marker rectangle pursuit russian rotate"
	} else {
		ui.pursuit.className = "hide"
	}

	for (let i = 0; i < array.length; ++i) {
		let lord = array[i]
		ui.battle_grid_array[i].replaceChildren()
		if (lord >= 0)
			ui.battle_grid_array[i].appendChild(ui.lord_mat[lord])
		ui.battle_grid_array[i].classList.toggle("action", is_battle_array_action(i))
	}

	for (let lord = 0; lord < 12; ++lord) {
		ui.battle_cylinder[lord].classList.toggle("action", is_lord_action(lord))
		ui.battle_cylinder[lord].classList.toggle("selected", is_lord_selected(lord))
	}

	ui.garrison.replaceChildren()
	if (view.battle.garrison) {
		for (let i = 0; i < view.battle.garrison.knights; ++i)
			add_force(ui.garrison, KNIGHTS, -1, 0)
		for (let i = 0; i < view.battle.garrison.men_at_arms; ++i)
			add_force(ui.garrison, MEN_AT_ARMS, -1, 0)
	}
}

function is_lord_in_grid(lord) {
	if (view.battle)
		for (let i = 0; i < 12; ++i)
			if (view.battle.array[i] === lord)
				return true
	return false
}

function update_court() {
	let tcourt_hdr = (player === "Teutons") ? ui.court1_header : ui.court2_header
	let rcourt_hdr = (player === "Teutons") ? ui.court2_header : ui.court1_header
	tcourt_hdr.textContent = "Teutonic Lords"
	rcourt_hdr.textContent = "Russian Lords"
	let tcourt = (player === "Teutons") ? ui.court1 : ui.court2
	let rcourt = (player === "Teutons") ? ui.court2 : ui.court1
	tcourt.replaceChildren()
	rcourt.replaceChildren()
	for (let lord = 0; lord < 6; ++lord)
		if (!is_lord_in_grid(lord) && is_lord_on_map(lord))
			tcourt.appendChild(ui.lord_mat[lord])
	for (let lord = 6; lord < 12; ++lord)
		if (!is_lord_in_grid(lord) && is_lord_on_map(lord))
			rcourt.appendChild(ui.lord_mat[lord])
}

function on_update() {
	restart_cache()

	for (let i = 0; i < 18; ++i) {
		calendar_layout_cylinder[i] = []
		calendar_layout_service[i] = []
	}

	for (let i = 0; i < data.locales.length; ++i)
		locale_layout[i].length = 0

	for (let ix = 0; ix < data.lords.length; ++ix) {
		if (view.pieces.locale[ix] < 0) {
			ui.lord_cylinder[ix].classList.add("hide")
			ui.lord_service[ix].classList.add("hide")
		} else {
			ui.lord_cylinder[ix].classList.remove("hide")
			update_lord(ix)
		}
	}

	for (let way = 0; way < ui.ways.length; ++way) {
		if (is_way_action(way))
			ui.ways[way].classList.add("action")
		else
			ui.ways[way].classList.remove("action")
	}

	layout_calendar()

	update_legate()
	update_smerdi()
	update_veche()

	for (let loc = 0; loc < data.locales.length; ++loc)
		update_locale(loc)

	update_castle(ui.castles[0], view.pieces.castles1[0])
	update_castle(ui.castles[1], view.pieces.castles1[1])
	update_castle(ui.castles[2], view.pieces.castles2[0])
	update_castle(ui.castles[3], view.pieces.castles2[1])

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

	ui.veche.classList.toggle("action", is_veche_action())

	if (view.battle && view.battle.array) {
		ui.battle_panel.classList.remove("hide")
		if (view.battle.storm)
			ui.battle_header.textContent = "Storm at " + data.locales[view.battle.where].name
		else if (view.battle.sally)
			ui.battle_header.textContent = "Sally at " + data.locales[view.battle.where].name
		else
			ui.battle_header.textContent = "Battle at " + data.locales[view.battle.where].name
		if (view.battle.attacker === player) {
			ui.battle_grid.className = "attacker"
		} else {
			ui.battle_grid.className = "defender"
		}
		update_battle()
	} else {
		ui.battle_panel.classList.add("hide")
	}

	update_court()

	for (let i = 0; i <= 17; ++i)
		ui.calendar[i].classList.toggle("action", is_calendar_action(i))

	// Misc
	action_button("lordship", "Lordship")
	action_button("march", "March")
	action_button("avoid", "Avoid battle")
	action_button("withdraw", "Withdraw")
	action_button("retreat", "Retreat")
	action_button("remove", "Remove")
	action_button("surrender", "Surrender")
	action_button("siegeworks", "Siegeworks")

	// Use all commands
	action_button("use_legate", "Legate")
	action_button("stonemasons", "Stonemasons")
	action_button("stone_kremlin", "Stone Kremlin")
	action_button("tax", "Tax")
	action_button("siege", "Siege")

	// Use one command
	action_button("smerdi", "Smerdi")
	action_button("storm", "Storm")
	action_button("sally", "Sally")
	action_button("sail", "Sail")
	action_button("ravage", "Ravage")
	action_button("forage", "Forage")
	action_button("supply", "Supply")

	// Muster & Spoils
	action_button("take_prov", "Prov")
	action_button("take_loot", "Loot")
	action_button("take_coin", "Coin")
	action_button("take_ship", "Ship")
	action_button("take_boat", "Boat")
	action_button("take_cart", "Cart")
	action_button("take_sled", "Sled")
	action_button("capability", "Capability")

	// Events
	action_button("delay", "Delay") // delay Aleksandr/Andrey
	action_button("deploy", "Deploy")
	action_button("discard", "Discard")
	action_button("hold", "Hold")
	action_button("play", "Play")

	action_button("concede", "Concede")
	action_button("battle", "Battle")

	action_button("end_actions", "End actions")
	action_button("end_array", "End array")
	action_button("end_avoid_battle", "End avoid battle")
	action_button("end_call_to_arms", "End call to arms")
	action_button("end_disband", "End disband")
	action_button("end_discard", "End discard")
	action_button("end_feed", "End feed")
	action_button("end_growth", "End growth")
	action_button("end_levy", "End levy")
	action_button("end_muster", "End muster")
	action_button("end_pay", "End pay")
	action_button("end_plan", "End plan")
	action_button("end_plow_and_reap", "End plow and reap")
	action_button("end_ransom", "End ransom")
	action_button("end_remove", "End remove")
	action_button("end_reposition", "End reposition")
	action_button("end_sack", "End sack")
	action_button("end_sally", "End sally")
	action_button("end_setup", "End setup")
	action_button("end_spoils", "End spoils")
	action_button("end_supply", "End supply")
	action_button("end_wastage", "End wastage")
	action_button("end_withdraw", "End withdraw")

	action_button("pass", "Pass")
	action_button("done", "Done")
	action_button("undo", "Undo")
}

function build_div(parent, className, id, onclick) {
	let e = document.createElement("div")
	e.className = className
	if (onclick) {
		e.my_id = id
		e.addEventListener("mousedown", onclick)
	}
	if (parent)
		parent.appendChild(e)
	return e
}

function build_lord_mat(lord, ix, side, name) {
	let mat = build_div(null, `mat ${side} ${name}`)
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
		ui.plan_cards.push(elt)
		ui.plan.appendChild(elt)
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

function build_way(name, sel) {
	let way = data.ways.findIndex(w => w.name === name)
	ui.ways[way] = document.querySelector(sel)
	ui.ways[way].my_id = way
	ui.ways[way].addEventListener("mousedown", on_click_way)
}

const locale_size = {
	region: [ 88, 56 ],
	town: [ 80, 72 ],
	traderoute: [ 90, 54 ],
	fort: [ 96, 54 ],
	castle: [ 96, 56 ],
	city: [ 126, 80 ],
	bishopric: [ 106, 72 ],
	novgorod: [ 144, 86 ],
}

function build_map() {
	for (let i = 0; i < data.locales.length; ++i)
		locale_layout[i] = []

	data.locales.forEach((locale, ix) => {
		let region = clean_name(locale.region)
		let x = floor(locale.box.x * MAP_DPI / 300)
		let y = floor(locale.box.y * MAP_DPI / 300)
		let w = ceil((locale.box.x+locale.box.w) * MAP_DPI / 300) - x
		let h = ceil((locale.box.y+locale.box.h) * MAP_DPI / 300) - y
		let xc = round(x + w / 2)
		let yc = round(y + h / 2)
		let e

		switch (locale.type) {
		case "town":
			locale_xy[ix] = [ xc, y - 24 ]
			w = locale_size.town[0]
			h = locale_size.town[1]
			x = xc - w/2
			y = y - h + 16
			break
		case "region":
			xc += 2
			yc -= 3
			locale_xy[ix] = [ xc, yc - 24 ]
			w = locale_size.region[0]
			h = locale_size.region[1]
			x = xc - w/2
			y = yc - h/2
			break
		default:
			locale_xy[ix] = [ xc, y - 36 ]
			break
		}

		// Main Area
		e = ui.locale[ix] = document.createElement("div")
		e.className = "locale " + locale.type + " " + region
		e.my_id = ix
		if (locale.type !== "region" && locale.type !== "town") {
			let ew = locale_size[locale.type][0]
			let eh = locale_size[locale.type][1]
			e.style.top = (y - eh) + "px"
			e.style.left = (xc - ew/2) + "px"
			e.style.width = (ew) + "px"
			e.style.height = (eh) + "px"
		} else {
			e.style.left = x + "px"
			e.style.top = y + "px"
			e.style.width = w + "px"
			e.style.height = h + "px"
		}
		e.addEventListener("mousedown", on_click_locale)
		e.addEventListener("mouseenter", on_focus_locale)
		e.addEventListener("mouseleave", on_blur)
		document.getElementById("locales").appendChild(e)

		// Name Plate
		if (locale.type !== 'region' && locale.type !== 'town') {
			e = ui.locale_name[ix] = document.createElement("div")
			e.className = "locale_name " + locale.type + " " + region
			e.style.left = x + "px"
			e.style.top = y + "px"
			e.style.width = w + "px"
			e.style.height = h + "px"
			e.my_id = ix
			e.addEventListener("mousedown", on_click_locale)
			e.addEventListener("mouseenter", on_focus_locale)
			e.addEventListener("mouseleave", on_blur)
			document.getElementById("locales").appendChild(e)
		}

		// Locale Markers
		e = ui.locale_markers[ix] = document.createElement("div")
		e.className = "locale_markers " + locale.type + " " + region
		x = locale_xy[ix][0] - 196/2
		y = locale_xy[ix][1] + 36
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

		e = ui.battle_cylinder[ix] = document.createElement("div")
		e.className = "cylinder lord " + clean_name(lord.side) + " " + clean_name(lord.name)
		e.my_id = ix
		e.addEventListener("mousedown", on_click_cylinder)
		e.addEventListener("mouseenter", on_focus_cylinder)
		e.addEventListener("mouseleave", on_blur)

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

	document.getElementById("legate").addEventListener("mousedown", on_click_legate)
	ui.veche.addEventListener("mousedown", on_click_veche)

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

	ui.calendar = [
		document.querySelector(".calendar.box0"),
		document.querySelector(".calendar.box1"),
		document.querySelector(".calendar.box2"),
		document.querySelector(".calendar.box3"),
		document.querySelector(".calendar.box4"),
		document.querySelector(".calendar.box5"),
		document.querySelector(".calendar.box6"),
		document.querySelector(".calendar.box7"),
		document.querySelector(".calendar.box8"),
		document.querySelector(".calendar.box9"),
		document.querySelector(".calendar.box10"),
		document.querySelector(".calendar.box11"),
		document.querySelector(".calendar.box12"),
		document.querySelector(".calendar.box13"),
		document.querySelector(".calendar.box14"),
		document.querySelector(".calendar.box15"),
		document.querySelector(".calendar.box16"),
		document.querySelector(".calendar.box17")
	]

	for (let i = 0; i <= 17; ++i) {
		ui.calendar[i].my_id = i
		ui.calendar[i].addEventListener("mousedown", on_click_calendar)
	}

	build_way("Crossroads", ".way.crossroads")
	build_way("Peipus E", ".way.peipus-east")
	build_way("Peipus W", ".way.peipus-north")
	build_way("Wirz", ".way.wirz")

	build_plan()

	for (let i = 0; i < 12; ++i) {
		ui.battle_grid_array[i].my_id = i
		ui.battle_grid_array[i].addEventListener("mousedown", on_click_array)
	}

	for (let c = 0; c < 21; ++c)
		build_card("teutonic", c)
	for (let c = 21; c < 42; ++c)
		build_card("russian", c)
}

build_map()
scroll_with_middle_mouse("main")

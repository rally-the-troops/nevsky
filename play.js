"use strict"

// TODO: show strikers and targets highlighting on battle mat?

function toggle_pieces() {
	document.getElementById("pieces").classList.toggle("hide")
}

// === COMMON LIBRARY ===

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

// === CONSTANTS (matching those in rules.js) ===

function find_lord(name) { return data.lords.findIndex((x) => x.name === name) }
function find_card(name) { return data.cards.findIndex((x) => x.name === name) }

const LORD_ANDREAS = find_lord("Andreas")
const LORD_HERMANN = find_lord("Hermann")
const LORD_ALEKSANDR = find_lord("Aleksandr")
const LORD_ANDREY = find_lord("Andrey")
const LORD_KNUD_ABEL = find_lord("Knud & Abel")
const LORD_RUDOLF = find_lord("Rudolf")

const first_p1_lord = 0
const last_p1_lord = 5
const first_p2_lord = 6
const last_p2_lord = 11

const first_p1_card = 0
const last_p1_card = 20
const first_p2_card = 21
const last_p2_card = 41

const first_p1_locale = 0
const last_p1_locale = 23
const first_p2_locale = 24
const last_p2_locale = 52

const R1 = find_card("R1")
const R11 = find_card("R11")
const R17 = find_card("R17")
const T4 = find_card("T4")
const T10 = find_card("T10")
const T14 = find_card("T14")
const EVENT_RUSSIAN_BRIDGE = R1
const EVENT_TEUTONIC_BRIDGE = T4
const EVENT_TEUTONIC_FIELD_ORGAN = T10
const AOW_TEUTONIC_TREBUCHETS = T14
const EVENT_RUSSIAN_VALDEMAR = R11
const EVENT_RUSSIAN_DIETRICH_VON_GRUNINGEN = R17

const A1 = 0, A2 = 1, A3 = 2, D1 = 3, D2 = 4, D3 = 5, SA1 = 6, SA2 = 7, SA3 = 8, RG1 = 9, RG2 = 10, RG3 = 11

const KNIGHTS = 0, SERGEANTS = 1, LIGHT_HORSE = 2, ASIATIC_HORSE = 3, MEN_AT_ARMS = 4, MILITIA = 5, SERFS = 6
const force_type_count = 7
const force_action_name = [ "knights", "sergeants", "light_horse", "asiatic_horse", "men_at_arms", "militia", "serfs" ]
const routed_force_action_name = [ "routed_knights", "routed_sergeants", "routed_light_horse", "routed_asiatic_horse", "routed_men_at_arms", "routed_militia", "routed_serfs" ]

const COIN = 1
const asset_type_count = 7
const asset_action_name = [ "prov", "coin", "loot", "cart", "sled", "boat", "ship" ]
const asset_type_x3 = [ 1, 1, 1, 0, 0, 0, 0 ]

const VECHE = 100
const SUMMER = 0, EARLY_WINTER = 1, LATE_WINTER = 2, RASPUTITSA = 3
const SEASONS = [ null,
	SUMMER, SUMMER, EARLY_WINTER, EARLY_WINTER, LATE_WINTER, LATE_WINTER, RASPUTITSA, RASPUTITSA,
	SUMMER, SUMMER, EARLY_WINTER, EARLY_WINTER, LATE_WINTER, LATE_WINTER, RASPUTITSA, RASPUTITSA,
	null ]

const VASSAL_READY = 1
const VASSAL_MUSTERED = 2
const NOWHERE = -1
const CALENDAR = 100
const LEGATE_INDISPOSED = -2
const LEGATE_ARRIVED = -1
const GARRISON = 100

// === ACTIONS ===

function is_action(action, arg) {
	if (arg === undefined)
		return !!(view.actions && view.actions[action] === 1)
	return !!(view.actions && view.actions[action] && set_has(view.actions[action], arg))
}

function on_action(evt) {
	if (evt.button === 0) {
		if (evt.target.my_id === undefined) {
			send_action(evt.target.my_action)
			if (evt.target.my_action_2)
				send_action(evt.target.my_action_2)
		} else {
			send_action(evt.target.my_action, evt.target.my_id)
			if (evt.target.my_action_2)
				send_action(evt.target.my_action_2, evt.target.my_id)
		}
	}
}

function register_action(elt, action, id, action_2) {
	elt.my_id = id
	elt.my_action = action
	elt.my_action_2 = action_2
	elt.onmousedown = on_action
}

// === TOOLTIPS ===

function register_tooltip(elt, focus, blur) {
	if (typeof focus === "function")
		elt.onmouseenter = focus
	else
		elt.onmouseenter = () => on_focus(focus)
	if (blur)
		elt.onmouseleave = blur
	else
		elt.onmouseleave = on_blur
}

function on_focus(text) {
	document.getElementById("status").textContent = text
}

function on_blur() {
	document.getElementById("status").textContent = ""
}

function get_locale_tip(id) {
	let loc = data.locales[id]
	let tip = loc.name
	if (loc.name !== "Novgorod") {
		if (loc.type === "traderoute")
			tip += " - Trade Route"
		else
			tip += " - " + loc.type[0].toUpperCase() + loc.type.substring(1)
	}
	if (data.seaports.includes(id))
		tip += " - Seaport"
	let list = []
	if (loc.name === "Adsel" || loc.name === "Fellin" || loc.name === "Leal" || loc.name === "Wenden")
		list.push("Commandery")
	if (loc.name === "Novgorod")
		list.push("Archbishopric")
	for (let lord = 0; lord < data.lords.length; ++lord) {
		if (data.lords[lord].seats.includes(id))
			list.push(data.lords[lord].name)
	}
	if (loc.name === "Pskov")
		list.push("Yaroslav")
	if (list.length > 0)
		tip += " - " + list.join(", ")
	return tip
}

function is_event_in_play(c) {
	return set_has(view.events, c)
}

function on_focus_cylinder(evt) {
	let lord = evt.target.my_id
	let info = data.lords[lord]
	let loc = view.pieces.locale[lord]
	let tip = info.name

	if (loc >= CALENDAR) {
		if (lord !== LORD_ALEKSANDR)
			tip += ` - ${info.fealty} Fealty`
		tip += ` - ${info.service} Service`
	}

	if (lord === LORD_KNUD_ABEL)
		if (is_event_in_play(EVENT_RUSSIAN_VALDEMAR))
			tip += ` - No Muster because of Valdemar!`
	if (lord === LORD_ANDREAS || lord === LORD_RUDOLF)
		if (is_event_in_play(EVENT_RUSSIAN_DIETRICH_VON_GRUNINGEN))
			tip += ` - No Muster because of Dietrich von Grüningen!`

	on_focus(tip)
}

function on_focus_lord_service_marker(evt) {
	let lord = evt.target.my_id
	let info = data.lords[lord]
	on_focus(`${info.full_name} - ${info.title}`)
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

// === GAME STATE ===

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

function is_p1_lord(lord) {
	return lord >= first_p1_lord && lord <= last_p1_lord
}

function is_p2_lord(lord) {
	return lord >= first_p2_lord && lord <= last_p2_lord
}

function is_lord_besieged(lord) {
	let besieged = pack1_get(view.pieces.besieged, lord)
	// show sallying lords as not besieged
	if (view.battle && view.battle.array && view.battle.reserves.includes(lord))
		return false
	return besieged
}

function is_lord_on_left_or_right(lord) {
	if (view.battle.array[A1] === lord) return true
	if (view.battle.array[A3] === lord) return true
	if (view.battle.array[D1] === lord) return true
	if (view.battle.array[D3] === lord) return true
	if (view.battle.array[SA1] === lord) return true
	if (view.battle.array[SA3] === lord) return true
	if (view.battle.array[RG1] === lord) return true
	if (view.battle.array[RG3] === lord) return true
	return false
}

function is_lord_ambushed(lord) {
	if (view.battle) {
		// ambush & 2 = attacker played ambush
		// ambush & 1 = defender played ambush
		if (view.battle.attacker === "Teutons") {
			if ((view.battle.ambush & 1) && is_p1_lord(lord))
				return is_lord_on_left_or_right(lord)
			if ((view.battle.ambush & 2) && is_p2_lord(lord))
				return is_lord_on_left_or_right(lord)
		} else {
			if ((view.battle.ambush & 1) && is_p2_lord(lord))
				return is_lord_on_left_or_right(lord)
			if ((view.battle.ambush & 2) && is_p1_lord(lord))
				return is_lord_on_left_or_right(lord)
		}
	}
	return false
}

function get_lord_moved(lord) {
	return pack2_get(view.pieces.moved, lord)
}

function get_lord_forces(lord, n) {
	return pack4_get(view.pieces.forces[lord], n)
}

function count_lord_all_forces(lord) {
	return (
		get_lord_forces(lord, KNIGHTS) +
		get_lord_forces(lord, SERGEANTS) +
		get_lord_forces(lord, LIGHT_HORSE) +
		get_lord_forces(lord, ASIATIC_HORSE) +
		get_lord_forces(lord, MEN_AT_ARMS) +
		get_lord_forces(lord, MILITIA) +
		get_lord_forces(lord, SERFS)
	)
}

function is_p1_locale(loc) {
	return loc >= first_p1_locale && loc <= last_p1_locale
}

function is_p2_locale(loc) {
	return loc >= first_p2_locale && loc <= last_p2_locale
}

function count_vp1() {
	let vp = view.pieces.elr1 << 1
	vp += view.pieces.castles1.length << 1
	for (let loc of view.pieces.conquered)
		if (is_p2_locale(loc))
			vp += data.locales[loc].vp << 1
	for (let loc of view.pieces.ravaged)
		if (is_p2_locale(loc))
			vp += 1
	return vp
}

function count_vp2() {
	let vp = view.pieces.elr2 << 1
	vp += view.pieces.veche_vp << 1
	vp += view.pieces.castles2.length << 1
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

function is_vassal_ready(vassal) {
	return view.pieces.vassals[vassal] === VASSAL_READY
}

function is_vassal_mustered(vassal) {
	return view.pieces.vassals[vassal] === VASSAL_MUSTERED
}

function is_legate_selected() {
	return player === "Teutons" && !!view.pieces.legate_selected
}

function is_levy_phase() {
	return (view.turn & 1) === 0
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

function is_lord_in_battle(lord) {
	if (view.battle && view.battle.array) {
		for (let i = 0; i < 12; ++i)
			if (view.battle.array[i] === lord)
				return true
		if (view.battle.reserves.includes(lord))
			return true
	}
	return false
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

function is_town_locale(loc) {
	return data.locales[loc].type === "town"
}

function has_castle_marker(loc) {
	return (
		set_has(view.pieces.castles1, loc) ||
		set_has(view.pieces.castles2, loc)
	)
}

function is_castle(loc) {
	return data.locales[loc].type === "castle" || has_castle_marker(loc)
}

function is_bishopric(loc) {
	return data.locales[loc].type === "bishopric"
}

function has_walls(loc) {
	return set_has(view.pieces.walls, loc)
}

function lord_has_unrouted_units(lord) {
	return view.pieces.forces[lord] !== 0
}

function get_lord_capability(lord, n) {
	return view.pieces.capabilities[(lord << 1) + n]
}

function lord_has_capability_card(lord, c) {
	let name = data.cards[c].capability
	let c1 = get_lord_capability(lord, 0)
	if (c1 >= 0 && data.cards[c1].capability === name)
		return true
	let c2 = get_lord_capability(lord, 1)
	if (c2 >= 0 && data.cards[c2].capability === name)
		return true
	return false
}

function lord_has_capability(lord, card_or_list) {
	if (Array.isArray(card_or_list)) {
		for (let card of card_or_list)
			if (lord_has_capability_card(lord, card))
				return true
		return false
	}
	return lord_has_capability_card(lord, card_or_list)
}

function attacker_has_trebuchets() {
	if (view.battle.attacker === "Teutons") {
		for (let lord = first_p1_lord; lord <= last_p1_lord; ++lord) {
			if (get_lord_locale(lord) === view.battle.where && lord_has_unrouted_units(lord)) {
				if (lord_has_capability(lord, AOW_TEUTONIC_TREBUCHETS))
					return true
			}
		}
	}
	return false
}

function count_siege_markers(loc) {
	return map_get(view.pieces.sieges, loc, 0)
}

// === BUILD UI ===

const original_boxes = {
	"way crossroads": [ 375, 1179, 116, 37 ],
	"way wirz": [ 324, 1132, 44, 88 ],
	"way peipus-east": [ 558, 1049, 55, 120 ],
	"way peipus-north": [ 513, 958, 90, 57 ],
	"calendar summer box1": [ 10, 42, 150, 231 ],
	"calendar summer box2": [ 163, 42, 150, 231 ],
	"calendar winter box3": [ 328, 42, 150, 231 ],
	"calendar winter box4": [ 481, 42, 150, 231 ],
	"calendar winter box5": [ 647, 42, 150, 231 ],
	"calendar winter box6": [ 799, 42, 150, 231 ],
	"calendar rasputitsa box7": [ 965, 42, 150, 231 ],
	"calendar rasputitsa box8": [ 1118, 42, 150, 231 ],
	"calendar summer box9": [ 10, 280, 150, 231 ],
	"calendar summer box10": [ 163, 280, 150, 231 ],
	"calendar winter box11": [ 328, 280, 150, 231 ],
	"calendar winter box12": [ 481, 280, 150, 231 ],
	"calendar winter box13": [ 647, 280, 150, 231 ],
	"calendar winter box14": [ 799, 280, 150, 231 ],
	"calendar rasputitsa box15": [ 965, 280, 150, 231 ],
	"calendar rasputitsa box16": [ 1118, 280, 150, 231 ],
	"calendar box0": [ 2, 16, 316, 22 ],
	"calendar box17": [ 957, 514, 316, 22 ],
}

const calendar_xy = [
	[ 10, 2 ],
	[ 10, 42 ],
	[ 162, 42 ],
	[ 328, 42 ],
	[ 480, 42 ],
	[ 646, 42 ],
	[ 799, 42 ],
	[ 965, 42 ],
	[ 1117, 42 ],
	[ 10, 280 ],
	[ 162, 280 ],
	[ 328, 280 ],
	[ 480, 280 ],
	[ 646, 280 ],
	[ 799, 280 ],
	[ 965, 280 ],
	[ 1117, 280 ],
	[ 1115, 517 ],
]

const locale_xy = []

let expand_calendar = -1

const ui = {
	locale: [],
	locale_name: [],
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
	lord_events: [],
	lord_moved1: [],
	lord_moved2: [],
	lord_feed_x2: [],
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

	reserves_panel: document.getElementById("reserves_panel"),
	reserves: document.getElementById("reserves"),

	events_panel: document.getElementById("events_panel"),
	events: document.getElementById("events"),

	hand_panel: document.getElementById("hand_panel"),
	hand: document.getElementById("hand"),

	held1: document.querySelector("#role_Teutons .role_held"),
	held2: document.querySelector("#role_Russians .role_held"),

	capabilities1: document.getElementById("capabilities1"),
	capabilities2: document.getElementById("capabilities2"),
	command: document.getElementById("command"),
	turn: document.getElementById("turn"),
	elr1: document.getElementById("elr1"),
	elr2: document.getElementById("elr2"),
	vp1: document.getElementById("vp1"),
	vp2: document.getElementById("vp2"),
	court1_header: document.getElementById("court1_header"),
	court2_header: document.getElementById("court2_header"),
	court1: document.getElementById("court1"),
	court2: document.getElementById("court2"),
	garrison: document.getElementById("garrison"),
	battle_walls: [
		document.getElementById("battle_walls1"),
		document.getElementById("battle_walls2"),
		document.getElementById("battle_walls3"),
		document.getElementById("battle_walls4"),
	],
	battle_siegeworks: document.getElementById("grid_sw"),
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
		document.getElementById("grid_rg1"),
		document.getElementById("grid_rg2"),
		document.getElementById("grid_rg3"),
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

function build_div(parent, className) {
	let e = document.createElement("div")
	e.className = className
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
	ui.lord_buttons[ix] = build_div(bg, "shield")
	ui.lord_capabilities[ix] = build_div(mat, "capabilities")
	ui.lord_events[ix] = build_div(mat, "events")
	ui.lord_moved1[ix] = build_div(mat, "marker square moved_fought one hide")
	ui.lord_moved2[ix] = build_div(mat, "marker square moved_fought two hide")
	ui.lord_feed_x2[ix] = build_div(mat, "marker small feed_x2")
	ui.lord_mat[ix] = mat
	register_action(ui.lord_buttons[ix], "lord", ix)
}

function build_card(side, c) {
	let card = ui.cards[c] = document.createElement("div")
	card.className = `card ${side} aow_${c}`
	register_action(card, "card", c)
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
		register_action(elt, "plan", lord)
		ui.plan_action_cards.push(elt)
		ui.plan_actions.appendChild(elt)
	}

	ui.plan_action_pass_p1 = elt = document.createElement("div")
	elt.className = `card teutonic cc_pass`
	register_action(elt, "plan", -1)
	ui.plan_actions.appendChild(elt)

	ui.plan_action_pass_p2 = elt = document.createElement("div")
	elt.className = `card russian cc_pass`
	register_action(elt, "plan", -1)
	ui.plan_actions.appendChild(elt)
}

function build_way(name, sel) {
	let way = data.ways.findIndex(w => w.name === name)
	ui.ways[way] = document.querySelector(sel)
	register_action(ui.ways[way], "way", way)
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
		let { x, y, w, h } = locale.box
		let xc = Math.round(x + w / 2)
		let yc = Math.round(y + h / 2)
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
		register_action(e, "locale", ix, "laden_march")
		register_tooltip(e, get_locale_tip(ix))
		document.getElementById("locales").appendChild(e)

		// Name Plate
		if (locale.type !== 'region' && locale.type !== 'town') {
			e = ui.locale_name[ix] = document.createElement("div")
			e.className = "locale_name " + locale.type + " " + region
			e.style.left = x + "px"
			e.style.top = y + "px"
			e.style.width = w + "px"
			e.style.height = h + "px"
			register_action(e, "locale", ix, "laden_march")
			register_tooltip(e, get_locale_tip(ix))
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

	data.lords.forEach((lord, ix) => {
		let e = ui.lord_cylinder[ix] = document.createElement("div")
		e.className = "cylinder lord " + clean_name(lord.side) + " " + clean_name(lord.name) + " hide"
		register_action(e, "lord", ix)
		register_tooltip(e, on_focus_cylinder)
		document.getElementById("pieces").appendChild(e)

		e = ui.lord_service[ix] = document.createElement("div")
		e.className = "service_marker lord image" + lord.image + " " + clean_name(lord.side) + " " + clean_name(lord.name) + " hide"
		register_action(e, "service", ix, "service_bad")
		register_tooltip(e, on_focus_lord_service_marker, on_blur_lord_service_marker)
		document.getElementById("pieces").appendChild(e)

		build_lord_mat(lord, ix, clean_name(lord.side), clean_name(lord.name))
	})

	data.vassals.forEach((vassal, ix) => {
		let lord = data.lords[vassal.lord]
		let e = ui.vassal_service[ix] = document.createElement("div")
		e.className = "service_marker vassal image" + vassal.image + " " + clean_name(lord.side) + " " + clean_name(vassal.name) + " hide"
		register_action(e, "vassal", ix)
		register_tooltip(e, data.vassals[ix].name)
		document.getElementById("pieces").appendChild(e)
	})

	register_action(ui.legate, "legate")
	register_tooltip(ui.legate, "William of Modena")

	register_action(ui.veche, "veche")

	for (let name in original_boxes) {
		let x = original_boxes[name][0]
		let y = original_boxes[name][1]
		let w = original_boxes[name][2] - 8
		let h = original_boxes[name][3] - 8
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

	for (let i = 0; i <= 17; ++i)
		register_action(ui.calendar[i], "calendar", i)

	build_way("Crossroads", ".way.crossroads")
	build_way("Peipus E", ".way.peipus-east")
	build_way("Peipus W", ".way.peipus-north")
	build_way("Wirz", ".way.wirz")

	build_plan()

	register_action(ui.garrison, "garrison")
	for (let i = 0; i < 12; ++i)
		register_action(ui.battle_grid_array[i], "array", i)

	for (let c = first_p1_card; c <= last_p1_card; ++c)
		build_card("teutonic", c)
	for (let c = first_p2_card; c <= last_p2_card; ++c)
		build_card("russian", c)
}

// === UPDATE UI ===

let used_cache = {}
let unused_cache = {}

function get_cached_element(className, action, id) {
	let key = className
	if (action !== undefined)
		key += "/" + action + "/" + id
	if (!(key in unused_cache)) {
		unused_cache[key] = []
		used_cache[key] = []
	}
	if (unused_cache[key].length > 0) {
		let elt = unused_cache[key].pop()
		used_cache[key].push(elt)
		return elt
	}
	let elt = document.createElement("div")
	elt.className = className
	used_cache[key].push(elt)
	if (action !== undefined)
		register_action(elt, action, id)
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
		if (e === ui.legate) {
			y -= 16
			z = 3
		}
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
			if (loc === expand_calendar) {
				d = 46
				z += 100
			}
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
	let elt
	if (routed) {
		if (is_action(routed_force_action_name[type], lord))
			elt = get_cached_element("action unit " + force_action_name[type], routed_force_action_name[type], lord)
		else
			elt = get_cached_element("unit " + force_action_name[type], routed_force_action_name[type], lord)
	} else {
		if (is_action(force_action_name[type], lord))
			elt = get_cached_element("action unit " + force_action_name[type], force_action_name[type], lord)
		else
			elt = get_cached_element("unit " + force_action_name[type], force_action_name[type], lord)
	}
	parent.appendChild(elt)
}

function add_asset(parent, type, n, lord) {
	let elt
	if (lord === VECHE) {
		if (is_action("veche_coin"))
			elt = get_cached_element("action asset " + asset_action_name[type] + " x"+n, "veche_coin", undefined)
		else
			elt = get_cached_element("asset " + asset_action_name[type] + " x"+n)
	} else {
		if (is_action(asset_action_name[type], lord))
			elt = get_cached_element("action asset " + asset_action_name[type] + " x"+n, asset_action_name[type], lord)
		else
			elt = get_cached_element("asset " + asset_action_name[type] + " x"+n)
	}
	parent.appendChild(elt)
}

function add_veche_vp(parent) {
	parent.appendChild(get_cached_element("marker square conquered russian"))
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
		e.classList.toggle("action", is_action("vassal", v))
	}
}

function update_lord_mat(ix) {
	if (view.reveal & (1 << ix)) {
		ui.lord_mat[ix].classList.remove("hidden")
		update_assets(ix, ui.assets[ix], view.pieces.assets[ix])
		update_vassals(ui.ready_vassals[ix], ui.mustered_vassals[ix], ix)
		update_forces(ui.forces[ix], view.pieces.forces[ix], ix, false)
		update_forces(ui.routed[ix], view.pieces.routed[ix], ix, true)
		ui.lord_feed_x2[ix].classList.toggle("hide", count_lord_all_forces(ix) <= 6)
	} else {
		ui.lord_mat[ix].classList.add("hidden")
		ui.assets[ix].replaceChildren()
		ui.ready_vassals[ix].replaceChildren()
		ui.mustered_vassals[ix].replaceChildren()
		ui.forces[ix].replaceChildren()
		ui.routed[ix].replaceChildren()
		ui.lord_moved1[ix].classList.add("hide")
		ui.lord_moved2[ix].classList.add("hide")
		ui.lord_feed_x2[ix].classList.add("hide")
	}
	let m = get_lord_moved(ix)
	ui.lord_moved1[ix].classList.toggle("hide", is_levy_phase() || (m !== 1 && m !== 2))
	ui.lord_moved2[ix].classList.toggle("hide", is_levy_phase() || (m !== 2))
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
		let t = locale - 100
		if (t > 17) t = 17
		calendar_layout_cylinder[t].push(ui.lord_cylinder[ix])
		ui.lord_cylinder[ix].classList.remove("hide")
		ui.lord_service[ix].classList.add("hide")
	}
	ui.lord_cylinder[ix].classList.toggle("besieged", is_lord_besieged(ix))
	ui.lord_buttons[ix].classList.toggle("action", is_action("lord", ix))
	ui.lord_cylinder[ix].classList.toggle("action", is_action("lord", ix))
	ui.lord_service[ix].classList.toggle("action", is_action("service", ix) || is_action("service_bad", ix))
	ui.lord_service[ix].classList.toggle("bad", is_action("service_bad", ix))

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
	ui.lord_mat[ix].classList.toggle("ambushed", is_lord_ambushed(ix))
}

function update_legate() {
	if (view.pieces.legate === LEGATE_INDISPOSED) {
		ui.legate.classList.add("hide")
	} else {
		ui.legate.classList.remove("hide")
		ui.legate.classList.toggle("action", is_action("legate"))
		ui.legate.classList.toggle("selected", is_legate_selected())
		if (view.pieces.legate === LEGATE_ARRIVED) {
			ui.legate.style.top = "1356px"
			ui.legate.style.left = "24px"
		} else {
			layout_locale_item(view.pieces.legate, ui.legate, 0)
		}
	}
}

function update_smerdi() {
	ui.smerdi.replaceChildren()
	for (let i = 0; i < view.pieces.smerdi; ++i)
		ui.smerdi.appendChild(get_cached_element("unit serfs"))
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

function is_teutonic_siege_marker(loc) {
	if (set_has(view.pieces.castles2, loc))
		return true
	if (set_has(view.pieces.castles1, loc))
		return false
	if (is_p1_locale(loc))
		return set_has(view.pieces.conquered, loc)
	else
		return !set_has(view.pieces.conquered, loc)
}

function update_locale(loc) {
	layout_locale_cylinders(loc)

	ui.locale[loc].classList.toggle("action", is_action("locale", loc) || is_action("laden_march", loc))
	ui.locale[loc].classList.toggle("laden", is_action("laden_march", loc))
	ui.locale[loc].classList.toggle("supply_path", !!(view.supply && view.supply[0] === loc))
	ui.locale[loc].classList.toggle("supply_source", !!(view.supply && view.supply[1] === loc))
	if (ui.locale_name[loc]) {
		ui.locale_name[loc].classList.toggle("action", is_action("locale", loc) || is_action("laden_march", loc))
	}

	ui.locale_markers[loc].replaceChildren()

	if (view.battle && view.battle.where === loc)
		if (view.battle.storm)
			ui.locale_markers[loc].appendChild(get_cached_element("marker circle storm"))
		else
			ui.locale_markers[loc].appendChild(get_cached_element("marker circle battle"))

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

	if (set_has(view.pieces.walls, loc))
		ui.locale_markers[loc].appendChild(get_cached_element("marker square walls"))

	let sieges = map_get(view.pieces.sieges, loc)
	if (sieges > 0) {
		let cn
		if (is_teutonic_siege_marker(loc))
			cn = "marker square siege teutonic"
		else
			cn = "marker square siege russian"
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
				if (is_action("plan", lord)) {
					ui.plan_action_cards[lord].classList.add("action")
					ui.plan_action_cards[lord].classList.remove("disabled")
				} else {
					ui.plan_action_cards[lord].classList.remove("action")
					ui.plan_action_cards[lord].classList.add("disabled")
				}
			}
			if (is_action("plan", -1)) {
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
		elt.classList.toggle("action", is_action("card", c))
	}

	if (view.arts_of_war) {
		ui.arts_of_war_panel.classList.remove("hide")
		ui.arts_of_war.replaceChildren()
		for (let c of view.arts_of_war)
			ui.arts_of_war.appendChild(ui.cards[c])
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
	for (let i = first_p1_card; i <= last_p1_card; ++i)
		if (view.capabilities.includes(i))
			ui.capabilities1.appendChild(ui.cards[i])

	ui.capabilities2.replaceChildren()
	for (let i = first_p2_card; i <= last_p2_card; ++i)
		if (view.capabilities.includes(i))
			ui.capabilities2.appendChild(ui.cards[i])

	for (let ix = 0; ix < data.lords.length; ++ix) {
		ui.lord_capabilities[ix].replaceChildren()
		ui.lord_events[ix].replaceChildren()
		if (view.reveal & (1 << ix)) {
			let c = view.pieces.capabilities[(ix << 1) + 0]
			if (c >= 0)
				ui.lord_capabilities[ix].appendChild(ui.cards[c])
			c = view.pieces.capabilities[(ix << 1) + 1]
			if (c >= 0)
				ui.lord_capabilities[ix].appendChild(ui.cards[c])
			if (view.battle && view.battle.field_organ === ix)
				ui.lord_events[ix].appendChild(ui.cards[EVENT_TEUTONIC_FIELD_ORGAN])
			if (view.battle && view.battle.bridge && view.battle.bridge.lord1 === ix)
				ui.lord_events[ix].appendChild(ui.cards[EVENT_RUSSIAN_BRIDGE])
			if (view.battle && view.battle.bridge && view.battle.bridge.lord2 === ix)
				ui.lord_events[ix].appendChild(ui.cards[EVENT_TEUTONIC_BRIDGE])
		}
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
		ui.battle_grid_array[i].classList.toggle("action", is_action("array", i))
	}

	ui.reserves.replaceChildren()
	for (let lord of view.battle.reserves)
		ui.reserves.appendChild(ui.lord_mat[lord])

	ui.garrison.classList.toggle("hide", !view.battle.storm)
	ui.garrison.classList.toggle("action", is_action("garrison"))

	ui.garrison.replaceChildren()
	if (view.battle.garrison) {
		for (let i = 0; i < view.battle.garrison.knights; ++i)
			add_force(ui.garrison, KNIGHTS, GARRISON, 0)
		for (let i = 0; i < view.battle.garrison.men_at_arms; ++i)
			add_force(ui.garrison, MEN_AT_ARMS, GARRISON, 0)
	}

	let here = view.battle.where

	let def_prot = 0
	let def_walls = 0
	let att_prot = 0
	let sally_prot = 0

	if (view.battle.storm) {
		if (is_bishopric(here) || is_castle(here))
			def_prot = 4
		else
			def_prot = 3
		if (attacker_has_trebuchets())
			def_prot--
		if (has_walls(here))
			def_walls++
		att_prot = count_siege_markers(view.battle.where)
	}

	if (view.battle.sally)
		def_prot = count_siege_markers(view.battle.where)
	else if (view.battle.array[SA2] >= 0)
		sally_prot = count_siege_markers(view.battle.where)

	let att_ui, def_ui
	if (player === view.battle.attacker) {
		att_ui = ui.battle_walls[3]
		def_ui = ui.battle_walls[2]
	} else {
		att_ui = ui.battle_walls[0]
		def_ui = ui.battle_walls[1]
	}

	for (let i = 0; i < 4; ++i)
		ui.battle_walls[i].replaceChildren()

	for (let i = 0; i < def_prot; ++i)
		if (view.battle.attacker === "Teutons")
			def_ui.appendChild(get_cached_element("marker square russian siege"))
		else
			def_ui.appendChild(get_cached_element("marker square teutonic siege"))
	for (let i = 0; i < def_walls; ++i)
		def_ui.appendChild(get_cached_element("marker square walls"))

	ui.battle_siegeworks.replaceChildren()
	for (let i = 0; i < sally_prot; ++i)
		if (view.battle.attacker === "Teutons")
			ui.battle_siegeworks.appendChild(get_cached_element("marker square russian siege"))
		else
			ui.battle_siegeworks.appendChild(get_cached_element("marker square teutonic siege"))

	for (let i = 0; i < att_prot; ++i)
		if (view.battle.attacker === "Teutons")
			att_ui.appendChild(get_cached_element("marker square teutonic siege"))
		else
			att_ui.appendChild(get_cached_element("marker square russian siege"))
}

function update_court() {
	let tcourt_hdr = (player === "Russians") ? ui.court2_header : ui.court1_header
	let rcourt_hdr = (player === "Russians") ? ui.court1_header : ui.court2_header
	tcourt_hdr.textContent = "Teutonic Lords"
	rcourt_hdr.textContent = "Russian Lords"
	let tcourt = (player === "Russians") ? ui.court2 : ui.court1
	let rcourt = (player === "Russians") ? ui.court1 : ui.court2
	tcourt.replaceChildren()
	rcourt.replaceChildren()
	for (let lord = 0; lord < 6; ++lord)
		if (!is_lord_in_battle(lord) && is_lord_on_map(lord))
			tcourt.appendChild(ui.lord_mat[lord])
	for (let lord = 6; lord < 12; ++lord)
		if (!is_lord_in_battle(lord) && is_lord_on_map(lord))
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
		if (is_action("way", way))
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

	if (view.pieces.elr1)
		ui.elr1.classList = `marker circle enemy_lords_removed teutonic v${view.pieces.elr1}`
	else
		ui.elr1.classList = `marker circle enemy_lords_removed teutonic hide`
	if (view.pieces.elr2)
		ui.elr2.classList = `marker circle enemy_lords_removed russian v${view.pieces.elr2}`
	else
		ui.elr2.classList = `marker circle enemy_lords_removed russian hide`

	ui.held1.textContent = `${view.held1} Held`
	ui.held2.textContent = `${view.held2} Held`

	update_plan()
	update_cards()

	ui.veche.classList.toggle("action", is_action("veche"))

	if (view.battle && view.battle.array) {
		ui.reserves_panel.classList.remove("hide")
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

	if (view.battle && view.battle.array && view.battle.reserves.length > 0)
		ui.reserves_panel.classList.remove("hide")
	else
		ui.reserves_panel.classList.add("hide")

	update_court()

	let first_turn = view.scenario >> 5
	let last_turn = view.scenario & 31
	for (let i = 0; i <= 17; ++i) {
		ui.calendar[i].classList.toggle("action", is_action("calendar", i))
		if (i >= 1 && i <= 16)
			ui.calendar[i].classList.toggle("end", i < first_turn || i > last_turn)
	}

	// Misc
	action_button("lordship", "Lordship")
	action_button("march", "March")
	action_button("avoid", "Avoid Battle")
	action_button("withdraw", "Withdraw")
	action_button("retreat", "Retreat")
	action_button("remove", "Remove")
	action_button("surrender", "Surrender")
	action_button("siegeworks", "Siegeworks")
	action_button("boats_x2", "Boats x2")

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
	action_button("take_prov", "Provender")
	action_button("take_loot", "Loot")
	action_button("take_coin", "Coin")
	action_button("take_ship", "Ship")
	action_button("take_boat", "Boat")
	action_button("take_cart", "Cart")
	action_button("take_sled", "Sled")
	action_button("capability", "Capability")

	// Events
	action_button("decline", "Decline")
	action_button("deploy", "Deploy")
	action_button("discard", "Discard")
	action_button("hold", "Hold")
	action_button("play", "Play")

	action_button("approach", "Approach")
	action_button("concede", "Concede")
	action_button("battle", "Battle")

	action_button("end_array", "End Array")
	action_button("end_avoid_battle", "End Avoid Battle")
	action_button("end_call_to_arms", "End Call to Arms")
	action_button("end_command", "End Command")
	action_button("end_disband", "End Disband")
	action_button("end_discard", "End Discard")
	action_button("end_feed", "End Feed")
	action_button("end_growth", "End Growth")
	action_button("end_levy", "End Levy")
	action_button("end_muster", "End Muster")
	action_button("end_pay", "End Pay")
	action_button("end_plan", "End Plan")
	action_button("end_plow_and_reap", "End Plow and Reap")
	action_button("end_ransom", "End Ransom")
	action_button("end_remove", "End Remove")
	action_button("end_reposition", "End Reposition")
	action_button("end_sack", "End Sack")
	action_button("end_sally", "End Sally")
	action_button("end_setup", "End Setup")
	action_button("end_spoils", "End Spoils")
	action_button("end_supply", "End Supply")
	action_button("end_wastage", "End Wastage")
	action_button("end_withdraw", "End Withdraw")

	action_button("pass", "Pass")
	action_button("done", "Done")
	action_button("undo", "Undo")
}

// === LOG ===

function on_focus_card_tip(c) {
	if (c <= first_p1_card)
		ui.command.className = `card teutonic aow_${c}`
	else
		ui.command.className = `card russian aow_${c}`
}

function on_blur_card_tip() {
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

function on_focus_way_tip(way) {
	ui.ways[way].classList.add("tip")
}

function on_blur_way_tip(way) {
	ui.ways[way].classList.remove("tip")
}

function on_click_way_tip(way) {
	ui.ways[way].scrollIntoView({ block:"center", inline:"center", behavior:"smooth" })
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
	return `<span class="lord_tip" onclick="on_click_lord_tip(${x})">${n}</span>`
}

function sub_way_name(match, p1) {
	let x = p1 | 0
	let n = data.ways[x].name
	return `<span class="way_tip" onmouseenter="on_focus_way_tip(${x})" onmouseleave="on_blur_way_tip(${x})" onclick="on_click_way_tip(${x})">${n}</span>`
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
	text = text.replace(/W(\d+)/g, sub_way_name)

	if (text.match(/^\.h1/)) {
		text = text.substring(4)
		p.className = "h1"
	}
	else if (text.match(/^\.h2t/)) {
		text = text.substring(5)
		p.className = "h2 teutonic"
	}
	else if (text.match(/^\.h2r/)) {
		text = text.substring(5)
		p.className = "h2 russian"
	}
	else if (text.match(/^\.h2/)) {
		text = text.substring(4)
		p.className = "h2"
	}
	else if (text.match(/^\.h3t/)) {
		text = text.substring(5)
		p.className = "h3 teutonic"
	}
	else if (text.match(/^\.h3r/)) {
		text = text.substring(5)
		p.className = "h3 russian"
	}
	else if (text.match(/^\.h3/)) {
		text = text.substring(4)
		p.className = "h3"
	}
	else if (text.match(/^\.h4/)) {
		text = text.substring(4)
		p.className = "h4"
	}
	else if (text.match(/^\.h5/)) {
		text = text.substring(4)
		p.className = "h5"
	}

	p.innerHTML = text
	return p
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

build_map()
scroll_with_middle_mouse("main")

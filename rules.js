"use strict"

const TODO = false

const BOTH = "Both"
const TEUTONS = "Teutons"
const RUSSIANS = "Russians"

const P1 = TEUTONS
const P2 = RUSSIANS

// NOTE: With Hidden Mats option, the player order of feed/pay may matter.
const FEED_PAY_DISBAND = false // feed, pay, disband in one go

let game = null
let view = null
let states = {}

exports.roles = [ P1, P2 ]

exports.scenarios = [
	"Pleskau - 1240",
	"Watland - 1241",
	"Peipus - 1242",
	"Return of the Prince - 1241 to 1242",
	"Return of the Prince - Nicolle Variant",
	"Crusade on Novgorod - 1240 to 1242",
	"Pleskau - 1240 (Quickstart)",
]

exports.scenarios = [
	"Pleskau",
	"Watland",
	"Peipus",
	"Return of the Prince",
	"Return of the Prince (Nicolle)",
	"Crusade on Novgorod",
	"Pleskau (Quickstart)",
]

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

const data = require("./data.js")

function find_card(name) { return data.cards.findIndex(x => x.name === name) }
function find_lord(name) { return data.lords.findIndex(x => x.name === name) }
function find_locale(name) { return data.locales.findIndex(x => x.name === name) }

const lord_name = data.lords.map(lord => lord.name)
const vassal_name = data.vassals.map(vassal => vassal.name)

const lord_count = data.lords.length
const vassal_count = data.vassals.length
const last_vassal = vassal_count - 1
const last_lord = lord_count - 1

const first_p1_locale = 0
const last_p1_locale = 23
const first_p2_locale = 24
const last_p2_locale = 52

const first_p1_card = 0
const last_p1_card = 20
const first_p2_card = 21
const last_p2_card = 41

const LORD_ANDREAS = find_lord("Andreas")
const LORD_HEINRICH = find_lord("Heinrich")
const LORD_HERMANN = find_lord("Hermann")
const LORD_KNUD_ABEL = find_lord("Knud & Abel")
const LORD_RUDOLF = find_lord("Rudolf")
const LORD_YAROSLAV = find_lord("Yaroslav")

const LORD_ALEKSANDR = find_lord("Aleksandr")
const LORD_ANDREY = find_lord("Andrey")
const LORD_DOMASH = find_lord("Domash")
const LORD_GAVRILO = find_lord("Gavrilo")
const LORD_KARELIANS = find_lord("Karelians")
const LORD_VLADISLAV = find_lord("Vladislav")

const LOC_REVAL = find_locale("Reval")
const LOC_WESENBERG = find_locale("Wesenberg")
const LOC_DORPAT = find_locale("Dorpat")
const LOC_LEAL = find_locale("Leal")
const LOC_RIGA = find_locale("Riga")
const LOC_ADSEL = find_locale("Adsel")
const LOC_FELLIN = find_locale("Fellin")
const LOC_ODENPAH = find_locale("Odenpäh")
const LOC_WENDEN = find_locale("Wenden")
const LOC_NOVGOROD = find_locale("Novgorod")
const LOC_LADOGA = find_locale("Ladoga")
const LOC_PSKOV = find_locale("Pskov")
const LOC_RUSA = find_locale("Rusa")
const LOC_LOVAT = find_locale("Lovat")
const LOC_LUGA = find_locale("Luga")
const LOC_NEVA = find_locale("Neva")
const LOC_VOLKHOV = find_locale("Volkhov")
const LOC_IZBORSK = find_locale("Izborsk")
const LOC_KAIBOLOVO = find_locale("Kaibolovo")
const LOC_KOPORYE = find_locale("Koporye")
const LOC_PORKHOV = find_locale("Porkhov")
const LOC_VELIKIYE_LUKI = find_locale("Velikiye Luki")

const LOC_DUBROVNO = find_locale("Dubrovno")
const LOC_VOD = find_locale("Vod")
const LOC_ZHELTSY = find_locale("Zheltsy")
const LOC_TESOVO = find_locale("Tesovo")
const LOC_SABLIA = find_locale("Sablia")

const NOBODY = -1
const NOWHERE = -1
const NOTHING = -1
const NEVER = -1
const CALENDAR = 100

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

const TURN_NAME = [
	null,
	"1 - Summer 1240",
	"2 - Summer 1240",
	"3 - Early Winter 1240",
	"4 - Early Winter 1240",
	"5 - Late Winter 1241",
	"6 - Late Winter 1241",
	"7 - Rasputitsa 1241",
	"8 - Rasputitsa 1241",
	"9 - Summer 1241",
	"10 - Summer 1241",
	"11 - Early Winter 1241",
	"12 - Early Winter 1241",
	"13 - Late Winter 1242",
	"14 - Late Winter 1242",
	"15 - Rasputitsa 1242",
	"16 - Rasputitsa 1242",
	null
]

const USABLE_TRANSPORT = [
	[ CART, BOAT, SHIP ],
	[ SLED ],
	[ SLED ],
	[ BOAT, SHIP ],
]

function current_season() {
	return SEASONS[game.turn >> 1]
}

function current_turn_name() {
	return TURN_NAME[game.turn >> 1]
}

// === GAME STATE ===

const first_p1_lord = 0
const last_p1_lord = 5
const first_p2_lord = 6
const last_p2_lord = 11

let first_friendly_lord = 0
let last_friendly_lord = 5
let first_enemy_lord = 6
let last_enemy_lord = 11

function update_aliases() {
	if (game.active === P1) {
		first_friendly_lord = 0
		last_friendly_lord = 5
		first_enemy_lord = 6
		last_enemy_lord = 11
	} else if (game.active === P2) {
		first_friendly_lord = 6
		last_friendly_lord = 11
		first_enemy_lord = 0
		last_enemy_lord = 5
	} else {
		first_friendly_lord = -1
		last_friendly_lord = -1
		first_enemy_lord = -1
		last_enemy_lord = -1
	}
}

function load_state(state) {
	if (game !== state) {
		game = state
		update_aliases()
	}
}

function push_state(next) {
	if (!states[next])
		throw Error("No such state: " + next)
	game.stack.push([game.state, game.who, game.count])
	game.state = next
}

function pop_state() {
	;[ game.state, game.who, game.count ] = game.stack.pop()
}

function set_active(new_active) {
	if (game.active !== new_active) {
		game.active = new_active
		update_aliases()
	}
}

function set_active_enemy() {
	game.active = enemy_player()
	update_aliases()
}

function enemy_player() {
	if (game.active === P1) return P2
	if (game.active === P2) return P1
	return null
}

function get_lord_locale(lord) {
	return game.lords.locale[lord]
}

function get_lord_service(lord) {
	return game.lords.service[lord]
}

function get_lord_capability(lord, n) {
	return game.lords.cards[(lord << 1) + n]
}

function set_lord_capability(lord, n, x) {
	game.lords.cards[(lord << 1) + n] = x
}

function get_lord_assets(lord, n) {
	return pack4_get(game.lords.assets[lord], n)
}

function get_lord_forces(lord, n) {
	return pack4_get(game.lords.forces[lord], n)
}

function get_lord_routed_forces(lord, n) {
	return pack4_get(game.lords.routed_forces[lord], n)
}

function get_lord_moved(lord) {
	return pack1_get(game.lords.moved, lord)
}

function set_lord_locale(lord, locale) {
	game.lords.locale[lord] = locale
}

function set_lord_service(lord, service) {
	if (service < 0) service = 0
	if (service > 16) service = 16
	game.lords.service[lord] = service
}

function add_lord_service(lord, n) {
	set_lord_service(lord, get_lord_service(lord) + n)
}

function set_lord_assets(lord, n, x) {
	if (x < 0) x = 0
	if (x > 8) x = 8
	game.lords.assets[lord] = pack4_set(game.lords.assets[lord], n, x)
}

function add_lord_assets(lord, n, x) {
	set_lord_assets(lord, n, get_lord_assets(lord, n) + x)
}

function set_lord_forces(lord, n, x) {
	if (x < 0) x = 0
	if (x > 15) x = 15
	game.lords.forces[lord] = pack4_set(game.lords.forces[lord], n, x)
}

function add_lord_forces(lord, n, x) {
	set_lord_forces(lord, n, get_lord_forces(lord, n) + x)
}

function set_lord_routed_forces(lord, n, x) {
	if (x < 0) x = 0
	if (x > 15) x = 15
	game.lords.routed_forces[lord] = pack4_set(game.lords.routed_forces[lord], n, x)
}

function add_lord_routed_forces(lord, n, x) {
	set_lord_routed_forces(lord, n, get_lord_routed_forces(lord, n) + x)
}

function set_lord_moved(lord, x) {
	game.lords.moved = pack1_set(game.lords.moved, lord, x)
}

function get_lord_vassal_count(lord) {
	return data.lords[lord].vassals.length
}

function get_lord_vassal_service(lord, n) {
	let v = data.lords[lord].vassals[n]
	return game.vassals[v]
}

function set_lord_vassal_service(lord, n, x) {
	let v = data.lords[lord].vassals[n]
	game.vassals[v] = x
}

// === GAME STATE HELPERS ===

function roll_die() {
	return random(6) + 1
}

function count_lord_forces(lord) {
	return get_lord_forces(lord, KNIGHTS)
		+ get_lord_forces(lord, SERGEANTS)
		+ get_lord_forces(lord, LIGHT_HORSE)
		+ get_lord_forces(lord, ASIATIC_HORSE)
		+ get_lord_forces(lord, MEN_AT_ARMS)
		+ get_lord_forces(lord, MILITIA)
		+ get_lord_forces(lord, SERFS)
}

function is_campaign_phase() {
	return (game.turn & 1) === 1
}

function is_levy_phase() {
	return (game.turn & 1) === 0
}

function max_plan_length() {
	switch (current_season()) {
	case SUMMER: return 6
	case EARLY_WINTER: return 4
	case LATE_WINTER: return 4
	case RASPUTITSA: return 5
	}
}

function count_cards_in_plan(plan, lord) {
	let n = 0
	for (let c of plan)
		if (c === lord)
			++n
	return n
}

function is_marshal(lord) {
	switch (lord) {
	case LORD_ANDREAS: return true
	case LORD_HERMANN: return is_lord_on_map(LORD_ANDREAS)
	case LORD_ALEKSANDR: return true
	case LORD_ANDREY: return is_lord_on_map(LORD_ALEKSANDR)
	default: return false
	}
}

function is_lord_besieged(lord) {
	// TODO
	return false
}

function is_card_in_use(c) {
	if (set_has(game.events, c))
		return true
	if (set_has(game.capabilities, c))
		return true
	if (game.lords.cards.includes(c))
		return true
	if (c === 18 || c === 19 || c === 20)
		return true
	if (c === 39 || c === 40 || c === 41)
		return true
	return false
}

function is_lord_on_map(lord) {
	let loc = get_lord_locale(lord)
	return loc !== NOWHERE && loc < CALENDAR
}

function is_lord_on_calendar(lord) {
	let loc = get_lord_locale(lord)
	return loc >= CALENDAR
}

function is_lord_ready(lord) {
	let loc = get_lord_locale(lord)
	return (loc >= CALENDAR && loc <= CALENDAR + (game.turn >> 1))
}

function is_vassal_ready(vassal) {
	return game.vassals[vassal] === 0
}

function is_friendly_lord(lord) {
	return lord >= first_friendly_lord && lord <= last_friendly_lord
}

function is_enemy_lord(lord) {
	return lord >= first_enemy_lord && lord <= last_enemy_lord
}

function is_lord_at_friendly_locale(lord) {
	let loc = get_lord_locale(lord)
	return is_friendly_locale(loc)
}

function has_free_seat(lord) {
	for (let loc of data.lords[lord].seats)
		if (is_friendly_locale(loc))
			return true
	return false
}

function has_enemy_lord(loc) {
	for (let lord = first_enemy_lord; lord <= last_enemy_lord; ++lord)
		if (get_lord_locale(lord) === loc)
			return true
	return false
}

function is_friendly_territory(loc) {
	if (game.active === P1)
		return loc >= first_p1_locale && loc <= last_p1_locale
	return loc >= first_p2_locale && loc <= last_p2_locale
}

function has_stronghold(loc) {
	return data.locales[loc].stronghold > 0
}

function has_conquered_marker(loc) {
	return set_has(game.conquered, loc)
}

function has_ravaged_marker(loc) {
	return set_has(game.ravaged, loc)
}

function has_enemy_castle(loc) {
	if (game.active === P1)
		return set_has(game.p2_castles, loc)
	return set_has(game.p1_castles, loc)
}

function has_friendly_castle(loc) {
	if (game.active === P1)
		return set_has(game.p1_castles, loc)
	return set_has(game.p2_castles, loc)
}

function has_conquered_stronghold(loc) {
	return has_stronghold(loc) && has_conquered_marker(loc)
}

function is_friendly_locale(loc) {
	if (loc !== NOWHERE && loc < CALENDAR) {
		if (has_enemy_lord(loc))
			return false
		if (is_friendly_territory(loc)) {
			if (has_conquered_marker(loc))
				return false
			if (has_enemy_castle(loc))
				return false
			return true
		} else {
			if (has_stronghold(loc) && has_conquered_marker(loc))
				return true
			if (has_friendly_castle(loc))
				return true
		}
	}
	return false
}

function for_each_friendly_arts_of_war(fn) {
	if (game.active === P1)
		for (let i = 0; i < 18; ++i)
			fn(i)
	else
		for (let i = 21; i < 39; ++i)
			fn(i)
}

function can_add_transport(who, what) {
	return get_lord_assets(who, what) < 8
}

function is_upper_lord(lord) {
	return map_has(game.lords.lieutenants, lord)
}

function is_lower_lord(lord) {
	for (let i = 1; i < game.lords.lieutenants.length; i += 2)
		if (game.lords.lieutenants[i] === lord)
			return true
	return false
}

function get_lower_lord(upper) {
	return map_get(game.lords.lieutenants, upper, NOBODY)
}

function set_lower_lord(upper, lower) {
	map_set(game.lords.lieutenants, upper, lower)
}

function add_lieutenant(upper) {
	map_set(game.lords.lieutenants, upper, NOBODY)
}

function remove_lieutenant(upper) {
	map_delete(game.lords.lieutenants, upper)
}

// === SETUP ===

function setup_lord_on_calendar(lord, turn) {
	set_lord_locale(lord, CALENDAR + turn)
}

function muster_lord(lord, locale, service) {
	let info = data.lords[lord]

	if (!service)
		service = (game.turn >> 1) + info.service

	set_lord_locale(lord, locale)
	set_lord_service(lord, service)

	set_lord_assets(lord, PROV, info.assets.prov | 0)
	set_lord_assets(lord, COIN, info.assets.coin | 0)
	set_lord_assets(lord, LOOT, info.assets.loot | 0)

	set_lord_assets(lord, CART, info.assets.cart | 0)
	set_lord_assets(lord, SLED, info.assets.sled | 0)
	set_lord_assets(lord, BOAT, info.assets.boat | 0)
	set_lord_assets(lord, SHIP, info.assets.ship | 0)

	set_lord_forces(lord, KNIGHTS, info.forces.knights | 0)
	set_lord_forces(lord, SERGEANTS, info.forces.serfs | 0)
	set_lord_forces(lord, LIGHT_HORSE, info.forces.light_horse | 0)
	set_lord_forces(lord, ASIATIC_HORSE, info.forces.asiatic_horse | 0)
	set_lord_forces(lord, MEN_AT_ARMS, info.forces.men_at_arms | 0)
	set_lord_forces(lord, MILITIA, info.forces.militia | 0)
	set_lord_forces(lord, SERFS, info.forces.serfs | 0)

	for (let v of info.vassals)
		game.vassals[v] = 0
}

function muster_vassal(lord, vassal) {
	let info = data.vassals[vassal]

	game.vassals[vassal] = 1

	add_lord_forces(lord, KNIGHTS, info.forces.knights | 0)
	add_lord_forces(lord, SERGEANTS, info.forces.serfs | 0)
	add_lord_forces(lord, LIGHT_HORSE, info.forces.light_horse | 0)
	add_lord_forces(lord, ASIATIC_HORSE, info.forces.asiatic_horse | 0)
	add_lord_forces(lord, MEN_AT_ARMS, info.forces.men_at_arms | 0)
	add_lord_forces(lord, MILITIA, info.forces.militia | 0)
	add_lord_forces(lord, SERFS, info.forces.serfs | 0)
}

exports.setup = function (seed, scenario, options) {
	console.log("DO SETUP", seed, scenario)
	game = {
		seed,
		scenario,
		options,
		log: [],
		undo: [],

		active: P1,
		state: 'setup_lords',
		stack: [],

		turn: 0,

		p1_hand: [],
		p2_hand: [],
		p1_plan: [],
		p2_plan: [],
		events: [], // this levy/this campaign cards
		capabilities: [], // global capabilities

		lords: {
			locale: Array(lord_count).fill(NOWHERE),
			service: Array(lord_count).fill(NEVER),
			assets: Array(lord_count).fill(0),
			forces: Array(lord_count).fill(0),
			routed_forces: Array(lord_count).fill(0),
			cards: Array(lord_count << 1).fill(NOTHING),
			lieutenants: [],
			moved: 0,
		},
		vassals: Array(vassal_count).fill(0),
		legate: NOWHERE,
		veche_vp: 0,
		veche_coin: 0,

		conquered: [],
		ravaged: [],
		sieges: [],

		p1_castles: [],
		p2_castles: [],
		walls: [],

		command: NOBODY,
		who: NOBODY,
		where: NOWHERE,
		what: NOTHING,
		levy: 0, // lordship used
		count: 0,
	}

	update_aliases()

	log_h1(scenario)

	switch (scenario) {
	default:
	case "Pleskau":
		setup_pleskau()
		break
	case "Watland":
		setup_watland()
		break
	case "Peipus":
		setup_peipus()
		break
	case "Return of the Prince":
		setup_return_of_the_prince()
		break
	case "Return of the Prince (Nicolle)":
		setup_return_of_the_prince_nicolle()
		break
	case "Crusade on Novgorod":
		setup_crusade_on_novgorod()
		break
	case "Pleskau (Quickstart)":
		setup_pleskau_quickstart()
		break
	}

	return game
}

function setup_pleskau() {
	game.turn = 1 << 1

	game.veche_vp = 1

	muster_lord(LORD_HERMANN, LOC_DORPAT, 4)
	muster_lord(LORD_KNUD_ABEL, LOC_REVAL, 3)
	muster_lord(LORD_YAROSLAV, LOC_ODENPAH, 2)
	muster_lord(LORD_GAVRILO, LOC_PSKOV, 4)
	muster_lord(LORD_VLADISLAV, LOC_NEVA, 3)

	setup_lord_on_calendar(LORD_RUDOLF, 1)
	setup_lord_on_calendar(LORD_DOMASH, 1)
}

function setup_watland() {
	game.turn = 4 << 1

	game.veche_vp = 1
	game.veche_coin = 1

	set_add(game.conquered, LOC_IZBORSK)
	set_add(game.conquered, LOC_PSKOV)
	set_add(game.ravaged, LOC_PSKOV)
	set_add(game.ravaged, LOC_DUBROVNO)

	muster_lord(LORD_ANDREAS, LOC_FELLIN, 7)
	muster_lord(LORD_KNUD_ABEL, LOC_WESENBERG, 6)
	muster_lord(LORD_YAROSLAV, LOC_PSKOV, 5)
	muster_lord(LORD_DOMASH, LOC_NOVGOROD, 7)

	setup_lord_on_calendar(LORD_HEINRICH, 4)
	setup_lord_on_calendar(LORD_RUDOLF, 4)
	setup_lord_on_calendar(LORD_VLADISLAV, 4)
	setup_lord_on_calendar(LORD_KARELIANS, 4)
	setup_lord_on_calendar(LORD_ANDREY, 5)
	setup_lord_on_calendar(LORD_ALEKSANDR, 7)
	setup_lord_on_calendar(LORD_HERMANN, 8)
}

function setup_peipus() {
	game.turn = 13 << 1

	game.veche_vp = 4
	game.veche_coin = 3

	set_add(game.p2_castles, LOC_KOPORYE)
	set_add(game.conquered, LOC_IZBORSK)
	set_add(game.conquered, LOC_PSKOV)
	set_add(game.ravaged, LOC_VOD)
	set_add(game.ravaged, LOC_ZHELTSY)
	set_add(game.ravaged, LOC_TESOVO)
	set_add(game.ravaged, LOC_SABLIA)
	set_add(game.ravaged, LOC_PSKOV)
	set_add(game.ravaged, LOC_DUBROVNO)

	muster_lord(LORD_HERMANN, LOC_DORPAT, 16)
	muster_lord(LORD_YAROSLAV, LOC_PSKOV, 14)
	muster_lord(LORD_ALEKSANDR, LOC_NOVGOROD, 16)
	muster_lord(LORD_ANDREY, LOC_NOVGOROD, 16)
	muster_lord(LORD_DOMASH, LOC_NOVGOROD, 16)
	muster_lord(LORD_KARELIANS, LOC_NOVGOROD, 14)

	setup_lord_on_calendar(LORD_HEINRICH, 13)
	setup_lord_on_calendar(LORD_KNUD_ABEL, 13)
	setup_lord_on_calendar(LORD_RUDOLF, 13)
	setup_lord_on_calendar(LORD_GAVRILO, 13)
	setup_lord_on_calendar(LORD_VLADISLAV, 15)

	// XXX
	goto_campaign_plan()
}

function setup_return_of_the_prince() {
	game.turn = 9 << 1

	game.veche_vp = 3
	game.veche_coin = 2

	set_add(game.p1_castles, LOC_KOPORYE)
	set_add(game.conquered, LOC_KAIBOLOVO)
	set_add(game.conquered, LOC_KOPORYE)
	set_add(game.conquered, LOC_IZBORSK)
	set_add(game.conquered, LOC_PSKOV)
	set_add(game.ravaged, LOC_VOD)
	set_add(game.ravaged, LOC_ZHELTSY)
	set_add(game.ravaged, LOC_TESOVO)
	set_add(game.ravaged, LOC_SABLIA)
	set_add(game.ravaged, LOC_PSKOV)
	set_add(game.ravaged, LOC_DUBROVNO)

	muster_lord(LORD_ANDREAS, LOC_KOPORYE, 12)
	muster_lord(LORD_ALEKSANDR, LOC_NOVGOROD, 14)

	setup_lord_on_calendar(LORD_HERMANN, 9)
	setup_lord_on_calendar(LORD_RUDOLF, 9)
	setup_lord_on_calendar(LORD_YAROSLAV, 9)
	setup_lord_on_calendar(LORD_ANDREY, 9)
	setup_lord_on_calendar(LORD_KARELIANS, 9)
	setup_lord_on_calendar(LORD_VLADISLAV, 10)
	setup_lord_on_calendar(LORD_HEINRICH, 11)
	setup_lord_on_calendar(LORD_KNUD_ABEL, 11)
	setup_lord_on_calendar(LORD_DOMASH, 11)
	setup_lord_on_calendar(LORD_GAVRILO, 13)
}

function setup_return_of_the_prince_nicolle() {
	game.turn = 9 << 1

	game.veche_vp = 3
	game.veche_coin = 2

	set_add(game.p1_castles, LOC_KOPORYE)
	set_add(game.conquered, LOC_KAIBOLOVO)
	set_add(game.conquered, LOC_KOPORYE)
	set_add(game.ravaged, LOC_VOD)
	set_add(game.ravaged, LOC_ZHELTSY)
	set_add(game.ravaged, LOC_TESOVO)
	set_add(game.ravaged, LOC_SABLIA)

	muster_lord(LORD_ANDREAS, LOC_RIGA, 12)
	muster_lord(LORD_HERMANN, LOC_DORPAT, 12)
	muster_lord(LORD_KNUD_ABEL, LOC_KOPORYE, 11)
	muster_lord(LORD_ALEKSANDR, LOC_NOVGOROD, 14)
	muster_lord(LORD_GAVRILO, LOC_PSKOV, 12)

	setup_lord_on_calendar(LORD_RUDOLF, 9)
	setup_lord_on_calendar(LORD_YAROSLAV, 9)
	setup_lord_on_calendar(LORD_ANDREY, 9)
	setup_lord_on_calendar(LORD_KARELIANS, 9)
	setup_lord_on_calendar(LORD_VLADISLAV, 10)
	setup_lord_on_calendar(LORD_HEINRICH, 11)
	setup_lord_on_calendar(LORD_DOMASH, 11)
}

function setup_crusade_on_novgorod() {
	game.turn = 1 << 1

	game.veche_vp = 1
	game.veche_coin = 0

	muster_lord(LORD_HERMANN, LOC_DORPAT, 4)
	muster_lord(LORD_KNUD_ABEL, LOC_REVAL, 3)
	muster_lord(LORD_YAROSLAV, LOC_ODENPAH, 2)
	muster_lord(LORD_GAVRILO, LOC_PSKOV, 4)
	muster_lord(LORD_VLADISLAV, LOC_NEVA, 3)

	setup_lord_on_calendar(LORD_ANDREAS, 1)
	setup_lord_on_calendar(LORD_HEINRICH, 1)
	setup_lord_on_calendar(LORD_RUDOLF, 1)
	setup_lord_on_calendar(LORD_DOMASH, 1)
	setup_lord_on_calendar(LORD_KARELIANS, 3)
	setup_lord_on_calendar(LORD_ALEKSANDR, 5)
	setup_lord_on_calendar(LORD_ANDREY, 5)
}

function setup_pleskau_quickstart() {
	setup_pleskau()

	add_lord_assets(LORD_HERMANN, CART, 1)
	add_lord_assets(LORD_YAROSLAV, CART, 1)

	add_lord_assets(LORD_GAVRILO, BOAT, 1)
	add_lord_assets(LORD_GAVRILO, CART, 1)
	add_lord_assets(LORD_VLADISLAV, BOAT, 1)

	log_h1("Levy " + current_turn_name())

	log(`Quickstart...`)

	muster_lord(LORD_RUDOLF, LOC_WENDEN)
	add_lord_assets(LORD_RUDOLF, CART, 1)

	add_lord_assets(LORD_KNUD_ABEL, BOAT, 1)

	muster_vassal(LORD_HERMANN, data.lords[LORD_HERMANN].vassals[0])
	set_lord_capability(LORD_HERMANN, 0, find_card("T4"))
	set_lord_capability(LORD_HERMANN, 1, find_card("T14"))

	set_lord_capability(LORD_YAROSLAV, 0, find_card("T3"))

	set_add(game.capabilities, find_card("T13"))
	game.legate = LOC_DORPAT

	set_add(game.capabilities, find_card("R8"))
	muster_lord(LORD_DOMASH, LOC_NOVGOROD)
	add_lord_assets(LORD_DOMASH, BOAT, 2)
	add_lord_assets(LORD_DOMASH, CART, 2)

	muster_vassal(LORD_GAVRILO, data.lords[LORD_GAVRILO].vassals[0])
	set_lord_capability(LORD_GAVRILO, 0, find_card("R2"))
	set_lord_capability(LORD_GAVRILO, 1, find_card("R6"))

	game.veche_coin += 1

	goto_campaign_plan()

	game.p1_plan = [ LORD_YAROSLAV, LORD_RUDOLF, LORD_HERMANN, LORD_HERMANN, LORD_RUDOLF, LORD_HERMANN ]
	game.p2_plan = [ LORD_GAVRILO, LORD_VLADISLAV, LORD_DOMASH, LORD_GAVRILO, LORD_DOMASH, LORD_DOMASH ]

	// goto_command_activation()
}

states.setup_lords = {
	prompt() {
		view.prompt = "Setup your Lords."
		console.log("SETUP", game.lords.moved)
		let done = true
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
			if (is_lord_on_map(lord) && !get_lord_moved(lord)) {
				if (data.lords[lord].assets.transport > 0) {
					gen_action_lord(lord)
					done = false
				}
			}
		}
		if (done) {
			view.prompt += " All done."
			view.actions.end_setup = 1
		}
	},
	lord(lord) {
		push_undo()
		log(`%L${lord} at %${get_lord_locale(lord)}`)
		push_state('muster_lord_transport')
		set_lord_moved(lord, 1)
		game.who = lord
		game.count = data.lords[lord].assets.transport
	},
	end_setup() {
		clear_undo()
		end_setup_lords()
	},
}

function end_setup_lords() {
	game.lords.moved = 0
	set_active_enemy()
	if (game.active === P1) {
		log_h1("Levy " + current_turn_name())
		log_h2("Arts of War")
		goto_levy_arts_of_war_first()
	}
}

// === LEVY: ARTS OF WAR (FIRST TURN) ===

function draw_two_cards() {
	// TODO: no PASS cards in some scenarios in 2nd ed
	let deck = []
	if (game.active === P1) {
		for (let c = first_p1_card; c <= last_p1_card; ++c)
			if (!is_card_in_use(c))
				deck.push(c)
	} else {
		for (let c = first_p2_card; c <= last_p2_card; ++c)
			if (!is_card_in_use(c))
				deck.push(c)
	}
	console.log("deck", deck)

	let result = []
	let i = random(deck.length)
	result.push(deck[i])
	array_remove(deck, i)

	i = random(deck.length)
	result.push(deck[i])
	array_remove(deck, i)
	return result
}

function goto_levy_arts_of_war_first() {
	log_br()
	log(game.active)
	game.state = 'levy_arts_of_war_first'
	game.what = draw_two_cards()
}

function resume_levy_arts_of_war_first() {
	if (game.what.length === 0)
		end_levy_arts_of_war_first()
}

states.levy_arts_of_war_first = {
	prompt() {
		let c = game.what[0]
		view.what = c
		if (data.cards[c].this_lord) {
			view.prompt = `Assign ${data.cards[c].capability} to a Lord.`
			let discard = true
			for (let lord of data.cards[c].lords) {
				if (is_lord_on_map(lord) && !lord_has_capability(lord, c)) {
					gen_action_lord(lord)
					discard = false
				}
			}
			if (discard)
				view.actions.discard = 1
		} else if (data.cards[c].capability) {
			view.prompt = `Deploy ${data.cards[c].capability}.`
			view.actions.deploy = 1
		} else {
			view.prompt = `No Capability.`
			view.actions.discard = 1
		}
	},
	lord(lord) {
		let c = game.what.shift()
		logi(`%C${c} - %L${lord}`)
		add_lord_capability(lord, c)
		resume_levy_arts_of_war_first()
	},
	deploy() {
		let c = game.what.shift()
		logi(`%C${c}`)
		set_add(game.capabilities, c)
		resume_levy_arts_of_war_first()
	},
	discard() {
		let c = game.what.shift()
		logi(`%C${c} - discarded`)
		resume_levy_arts_of_war_first()
	},
}

function end_levy_arts_of_war_first() {
	game.what = NOTHING
	set_active_enemy()
	if (game.active === P2)
		goto_levy_arts_of_war_first()
	else
		goto_pay()
}

// === LEVY: ARTS OF WAR ===

function goto_levy_arts_of_war() {
	log_br()
	log(game.active)
	game.state = 'levy_arts_of_war'
	game.what = draw_two_cards()
}

function resume_levy_arts_of_war() {
	if (game.what.length === 0)
		end_levy_arts_of_war()
}

states.levy_arts_of_war = {
	prompt() {
		let c = game.what[0]
		view.what = c
		switch (data.cards[c].when) {
		case 'this_levy':
		case 'this_campaign':
		case 'now':
			view.prompt = `Play ${data.cards[c].event}.`
			view.actions.play = 1
			break
		case 'hold':
			view.prompt = `Hold ${data.cards[c].event}.`
			view.actions.hold = 1
			break
		case 'never':
			view.prompt = `Discard ${data.cards[c].event}.`
			view.actions.discard = 1
			break
		}
	},
	play() {
		let c = game.what.shift()
		log(`Played %E${c}`)
		if (data.cards[c].when === 'this_levy' || data.cards[c].when === 'this_campaign')
			set_add(game.events, c)
		log(`TODO implement event`)
		resume_levy_arts_of_war()
	},
	hold() {
		let c = game.what.shift()
		log(`Held event card.`)
		if (game.active === P1)
			game.p1_hand.push(c)
		else
			game.p2_hand.push(c)
		resume_levy_arts_of_war()
	},
	discard() {
		let c = game.what.shift()
		log(`Discarded %E${c}`)
		resume_levy_arts_of_war()
	},
}

function end_levy_arts_of_war() {
	game.what = NOTHING
	set_active_enemy()
	if (game.active === P2)
		goto_levy_arts_of_war()
	else
		goto_pay()
}

// === LEVY: MUSTER ===

function goto_levy_muster() {
	log_h2(game.active + " Muster")
	game.state = 'levy_muster'
}

function end_levy_muster() {
	game.lords.moved = 0
	set_active_enemy()
	if (game.active === P2)
		goto_levy_muster()
	else
		goto_levy_call_to_arms()
}

states.levy_muster = {
	prompt() {
		view.prompt = "Muster your Lords."
		let done = true
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
			if (is_lord_at_friendly_locale(lord) && !get_lord_moved(lord)) {
				gen_action_lord(lord)
				done = false
			}
		}
		if (done) {
			view.prompt += " All done."
			view.actions.end_muster = 1
		}
	},
	lord(lord) {
		push_undo()
		log_h3(`%L${lord} at %${get_lord_locale(lord)}`)
		push_state('levy_muster_lord')
		game.who = lord
		game.count = data.lords[lord].lordship
	},
	end_muster() {
		clear_undo()
		end_levy_muster()
	},
}

function resume_levy_muster_lord() {
	--game.count
	if (game.count === 0) {
		set_lord_moved(game.who, 1)
		pop_state()
	}
}

states.levy_muster_lord = {
	prompt() {
		view.prompt = `Muster ${lord_name[game.who]}.`

		if (game.count > 0) {
			view.prompt += ` ${game.count} lordship left.`

			// Roll to muster Ready Lord at Seat
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
				if (lord === LORD_ALEKSANDR)
					continue
				if (lord === LORD_ANDREY && game.who !== LORD_ALEKSANDR)
					continue
				if (is_lord_ready(lord) && has_free_seat(lord))
					gen_action_lord(lord)
			}

			// Muster Ready Vassal Forces
			for (let vassal of data.lords[game.who].vassals) {
				if (is_vassal_ready(vassal))
					gen_action_vassal(vassal)
			}

			// Add Transport
			if (data.lords[game.who].ships) {
				if (can_add_transport(game.who, SHIP))
					view.actions.ship = 1
			}
			if (can_add_transport(game.who, BOAT))
				view.actions.boat = 1
			if (can_add_transport(game.who, CART))
				view.actions.cart = 1
			if (can_add_transport(game.who, SLED))
				view.actions.sled = 1

			// Add Capability
			view.actions.capability = 1
		} else {
			view.prompt += " All done."
		}

		view.actions.done = 1
	},

	lord(other) {
		clear_undo()
		let die = roll_die()
		let fealty = data.lords[other].fealty
		if (die <= fealty) {
			logi(`%L${other} rolled ${die} <= ${fealty}`)
			push_state('muster_lord_at_seat')
			game.who = other
		} else {
			logi(`%L${other} rolled ${die} > ${fealty}`)
			logii(`failed`)
			resume_levy_muster_lord()
		}
	},

	vassal(vassal) {
		push_undo()
		logi(vassal_name[vassal])
		muster_vassal(game.who, vassal)
		resume_levy_muster_lord()
	},

	ship() {
		push_undo()
		logi("Ship")
		add_lord_assets(game.who, SHIP, 1)
		resume_levy_muster_lord()
	},
	boat() {
		push_undo()
		logi("Boat")
		add_lord_assets(game.who, BOAT, 1)
		resume_levy_muster_lord()
	},
	cart() {
		push_undo()
		logi("Cart")
		add_lord_assets(game.who, CART, 1)
		resume_levy_muster_lord()
	},
	sled() {
		push_undo()
		logi("Sled")
		add_lord_assets(game.who, SLED, 1)
		resume_levy_muster_lord()
	},

	capability() {
		push_undo()
		push_state('muster_capability')
	},

	done() {
		set_lord_moved(game.who, 1)
		pop_state()
	},
}

states.muster_lord_at_seat = {
	prompt() {
		view.prompt = `Select seat for ${lord_name[game.who]}.`
		for (let loc of data.lords[game.who].seats)
			if (is_friendly_locale(loc))
				gen_action_locale(loc)
	},
	locale(loc) {
		push_undo()
		logii(`at %${loc}`)
		set_lord_moved(game.who, 1)
		muster_lord(game.who, loc)
		game.state = 'muster_lord_transport'
		game.count = data.lords[game.who].assets.transport | 0
		resume_muster_lord_transport()
	},
}

function resume_muster_lord_transport() {
	if (game.count === 0)
		pop_state()
	if (game.state === 'levy_muster_lord')
		resume_levy_muster_lord()
}

states.muster_lord_transport = {
	prompt() {
		view.prompt = `Select Transport for ${lord_name[game.who]}.`
		view.prompt += ` ${game.count} left.`
		if (data.lords[game.who].ships) {
			if (can_add_transport(game.who, SHIP))
				view.actions.ship = 1
		}
		if (can_add_transport(game.who, BOAT))
			view.actions.boat = 1
		if (can_add_transport(game.who, CART))
			view.actions.cart = 1
		if (can_add_transport(game.who, SLED))
			view.actions.sled = 1
		view.actions.done = 0
	},
	ship() {
		push_undo()
		logii("Ship")
		add_lord_assets(game.who, SHIP, 1)
		--game.count
		resume_muster_lord_transport()
	},
	boat() {
		push_undo()
		logii("Boat")
		add_lord_assets(game.who, BOAT, 1)
		--game.count
		resume_muster_lord_transport()
	},
	cart() {
		push_undo()
		logii("Cart")
		add_lord_assets(game.who, CART, 1)
		--game.count
		resume_muster_lord_transport()
	},
	sled() {
		push_undo()
		logii("Sled")
		add_lord_assets(game.who, SLED, 1)
		--game.count
		resume_muster_lord_transport()
	},
}

function lord_has_capability(lord, c) {
	let name = data.cards[c].capability
	console.log("has cap?", c, name)
	let c1 = get_lord_capability(lord, 0)
	if (c1 >= 0 && data.cards[c1].capability === name)
		return true
	let c2 = get_lord_capability(lord, 1)
	if (c2 >= 0 && data.cards[c2].capability === name)
		return true
	return false
}

function can_add_lord_capability(lord) {
	if (get_lord_capability(lord, 0) < 0)
		return true
	if (get_lord_capability(lord, 1) < 0)
		return true
	return false
}

function add_lord_capability(lord, c) {
	if (get_lord_capability(lord, 0) < 0)
		return set_lord_capability(lord, 0, c)
	if (get_lord_capability(lord, 1) < 0)
		return set_lord_capability(lord, 1, c)
	throw new Error("no empty capability slots!")
}

function discard_lord_capability(lord, c) {
	if (get_lord_capability(lord, 0) === c)
		return set_lord_capability(lord, 0, NOTHING)
	if (get_lord_capability(lord, 1) === c)
		return set_lord_capability(lord, 1, NOTHING)
	throw new Error("capability not found")
}

states.muster_capability = {
	prompt() {
		view.prompt = `Select a new capability for ${lord_name[game.who]}.`
		view.show_arts_of_war = 1
		for_each_friendly_arts_of_war(c => {
			if (!is_card_in_use(c)) {
				if (!data.cards[c].lords || set_has(data.cards[c].lords, game.who)) {
					if (data.cards[c].this_lord) {
						if (!lord_has_capability(game.who, c))
							gen_action_card(c)
					} else {
						gen_action_card(c)
					}
				}
			}
		})
	},
	card(c) {
		push_undo()
		logi(`Capability %C${c}`)
		if (data.cards[c].this_lord) {
			if (can_add_lord_capability(game.who, c)) {
				add_lord_capability(game.who, c)
			} else {
				game.what = c
				game.state = 'muster_capability_discard'
				return
			}
		} else {
			set_add(game.capabilities, c)
		}
		pop_state()
		resume_levy_muster_lord()
	},
}

states.muster_capability_discard = {
	prompt() {
		view.prompt = `Remove a capability from ${lord_name[game.who]}.`
		gen_action_card(get_lord_capability(game.who, 0))
		gen_action_card(get_lord_capability(game.who, 1))
	},
	card(c) {
		push_undo()
		logi(`Discarded %C${c}`)
		discard_lord_capability(game.who, c)
		add_lord_capability(game.who, game.what)
		game.what = NOTHING
		pop_state()
		resume_levy_muster_lord()
	},
}

// === LEVY: CALL TO ARMS ===

function goto_levy_call_to_arms() {
	game.state = 'levy_call_to_arms'
	end_levy_call_to_arms()
}

states.levy_call_to_arms = {
}

function end_levy_call_to_arms() {
	goto_campaign_plan()
}

// === CAMPAIGN: PLAN ===

function goto_campaign_plan() {
	game.turn++

	// Discard "This Levy" events from play.
	if (game.events.length > 0)
		game.events = game.events.filter(c => data.cards[c].when !== 'this_levy')

	log_h1("Campaign " + current_turn_name())

	set_active(BOTH)
	game.state = 'campaign_plan'
	game.p1_plan = []
	game.p2_plan = []
}

function plan_has_lieutenant(first, last) {
	for (let lord = first; lord <= last; ++lord)
		if (is_upper_lord(lord))
			return true
	return false
}

function plan_selected_lieutenant(first, last) {
	for (let lord = first; lord <= last; ++lord)
		if (is_upper_lord(lord) && get_lower_lord(lord) === NOBODY)
			return lord
	return NOBODY
}

function plan_can_make_lieutenant(plan, upper, first, last) {
	for (let lord = first; lord <= last; ++lord) {
		if (!is_lord_on_map(lord))
			continue
		if (lord === upper)
			continue
		if (plan.includes(lord))
			continue
		if (is_marshal(lord) || is_lord_besieged(lord))
			continue
		if (is_upper_lord(lord) || is_lower_lord(lord))
			continue
		if (get_lord_locale(upper) === get_lord_locale(lord))
			return true
	}
	return false
}

states.campaign_plan = {
	prompt(current) {
		let plan = (current === P1) ? game.p1_plan : game.p2_plan
		let first = (current === P1) ? first_p1_lord : first_p2_lord
		let last = (current === P1) ? last_p1_lord : last_p2_lord
		let upper = plan_selected_lieutenant(first, last)

		view.prompt = "Designate Lieutenants and build a Plan."
		view.plan = plan
		view.who = upper

		if (plan.length < max_plan_length()) {
			view.actions.end_plan = 0
			if (count_cards_in_plan(plan, NOBODY) < 3)
				gen_action_plan(NOBODY)
			for (let lord = first; lord <= last; ++lord) {
				if (is_lord_on_map(lord) && count_cards_in_plan(plan, lord) < 3)
					if (!is_lower_lord(lord))
						gen_action_plan(lord)
			}
		} else {
			if (upper === NOBODY)
				view.actions.end_plan = 1
		}

		if (upper !== NOBODY)
			gen_action_lord(upper)

		for (let lord = first; lord <= last; ++lord) {
			if (is_marshal(lord) || is_lord_besieged(lord))
				continue
			if (is_upper_lord(lord) || is_lower_lord(lord))
				continue
			if (upper === NOBODY) {
				if (plan_can_make_lieutenant(plan, lord, first, last))
					gen_action_lord(lord)
			} else {
				if (get_lord_locale(upper) === get_lord_locale(lord))
					if (!plan.includes(lord))
						gen_action_lord(lord)
			}
		}

		if (plan.length > 0 || plan_has_lieutenant(first, last))
			view.actions.undo = 1
		else
			view.actions.undo = 0
	},
	lord(lord, current) {
		let first = (current === P1) ? first_p1_lord : first_p2_lord
		let last = (current === P1) ? last_p1_lord : last_p2_lord
		let upper = plan_selected_lieutenant(first, last)
		if (lord === upper)
			remove_lieutenant(upper)
		else if (upper === NOBODY)
			add_lieutenant(lord)
		else
			set_lower_lord(upper, lord)
	},
	plan(lord, current) {
		let plan = (current === P1) ? game.p1_plan : game.p2_plan
		plan.push(lord)
	},
	undo(_, current) {
		let plan = (current === P1) ? game.p1_plan : game.p2_plan
		let first = (current === P1) ? first_p1_lord : first_p2_lord
		let last = (current === P1) ? last_p1_lord : last_p2_lord
		for (let lord = first; lord <= last; ++lord)
			if (is_upper_lord(lord))
				remove_lieutenant(lord)
		plan.length = 0
	},
	end_plan(_, current) {
		console.log("active", game.active)
		if (game.active === BOTH) {
			if (current === P1)
				set_active(P2)
			else
				set_active(P1)
		} else {
			end_campaign_plan()
		}
	},
}

function end_campaign_plan() {
	if (game.lords.lieutenants.length > 0) {
		log(`Lieutenants`)
		for (let i = 0; i < game.lords.lieutenants.length; i += 2) {
			let upper = game.lords.lieutenants[i]
			let lower = game.lords.lieutenants[i+1]
			log(`>%L${upper} over %L${lower}`)
		}
	}

	set_active(P1)
	goto_command_activation()
}

// === CAMPAIGN: COMMAND ACTIVATION ===

function goto_command_activation() {
	if (game.p2_plan.length === 0) {
		game.command = NOBODY
		goto_end_campaign()
		return
	}

	if (game.p2_plan.length > game.p1_plan.length) {
		set_active(P2)
		game.command = game.p2_plan.shift()
	} else {
		set_active(P1)
		game.command = game.p1_plan.shift()
	}

	if (game.command === NOBODY) {
		log_h2("Pass")
		goto_command_activation()
	} else {
		goto_actions()
	}
}

function goto_end_campaign() {
	// TODO: end game check
	game.turn++
	log_h1("Levy " + current_turn_name())
	log_h2("Arts of War")
	goto_levy_arts_of_war()
}

// === CAMPAIGN: ACTIONS ===

function goto_actions() {
	log_h2(`%L${game.command}`)

	game.state = 'actions'
	game.who = game.command
	game.count = data.lords[game.command].command
}

function end_actions() {
	set_active(P1)
	goto_feed()
}

states.actions = {
	prompt() {
		view.prompt = `${lord_name[game.who]} has ${game.count}x actions.`
		view.actions.end_actions = 1
	},
	end_actions() {
		clear_undo()
		end_actions()
	},
}

// === CAMPAIGN: FEED ===

function has_friendly_lord_who_moved_or_fought() {
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (get_lord_moved(lord))
			return true
	return false
}

function goto_feed() {
	game.state = 'feed'
	if (!has_friendly_lord_who_moved_or_fought())
		end_feed()
}

// TODO: feed_self
// TODO: feed_other

states.feed = {
	prompt() {
		view.prompt = "You must Feed lords who Moved or Fought."
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (get_lord_moved(lord))
				gen_action_lord(lord)
		view.actions.end_feed = 1
	},
	lord(lord) {
		push_undo()
		game.who = lord
		game.count = (count_lord_forces(lord) / 6 | 0) + 1
		game.state = 'feed_lord'
	},
	end_feed() {
		clear_undo()
		end_feed()
	},
}

states.feed_lord = {
	prompt() {
		view.prompt = "You must Feed ${lord_name[game.who]} ${game.count}x Loot or Provender."
		// TODO: find loot or prov!
		view.actions.unfed = 1
	},
	loot(lord) {
		logi(`Fed %L${game.who} with Loot from %L${lord}.`)
		add_lord_assets(lord, LOOT, -1)
		if (--game.count === 0)
			game.state = 'feed'
	},
	prov(lord) {
		logi(`Fed %L${game.who} with Provender from %L${lord}.`)
		add_lord_assets(lord, PROV, -1)
		if (--game.count === 0)
			game.state = 'feed'
	},
	unfed() {
		logi(`Did not feed %L${game.who}.`)
		add_lord_service(game.who, -1)
		game.state = 'feed'
	},
}

function end_feed() {
	if (FEED_PAY_DISBAND) {
		goto_pay()
	} else {
		set_active_enemy()
		if (game.active === P2)
			goto_feed()
		else
			goto_pay()
	}
}

// === LEVY & CAMPAIGN: PAY ===

function goto_pay() {
	game.state = 'pay'
	if (TODO)
		end_pay()
}

states.pay = {
	prompt() {
		view.prompt = "You may Pay your Lords."
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (is_lord_on_map(lord))
				gen_action_lord(lord)
		view.actions.end_pay = 1
	},
	lord(lord) {
		push_undo()
		push_state('pay_lord')
		game.who = lord
	},
	end_pay() {
		end_pay()
	},
}

states.pay_lord = {
	prompt() {
		view.prompt = `You may Pay ${lord_name[game.who]} with Coin or Loot.`
		if (game.active === RUSSIANS) {
			if (game.veche_coin > 0)
				view.actions.veche_coin = 1
		}
	},
	loot(lord) {
		logi(`Paid %L${game.who} with Loot from %L${lord}.`)
		add_lord_assets(lord, LOOT, -1)
		add_lord_service(game.who, 1)
		pop_state()
	},
	coin(lord) {
		logi(`Paid %L${game.who} with Coin from %L${lord}.`)
		add_lord_assets(lord, COIN, -1)
		add_lord_service(game.who, 1)
		pop_state()
	},
	veche_coin() {
		logi(`Paid %L${game.who} with Coin from Veche.`)
		game.veche_coin --
		add_lord_service(game.who, 1)
		pop_state()
	}
}

function end_pay() {
	// NOTE: We can combine Pay & Disband steps because disband is mandatory only.
	goto_disband()
}

// === LEVY & CAMPAIGN: DISBAND ===

function goto_disband() {
	game.state = 'disband'
	if (TODO)
		end_disband()
}

states.disband = {
	prompt() {
		view.prompt = "You must Disband Lords at their Service limit."
		view.actions.end_disband = 1
	},
	end_disband() {
		end_disband()
	},
}

function end_disband() {
	set_active_enemy()
	if (game.active === P2) {
		if (FEED_PAY_DISBAND)
			goto_feed()
		else
			goto_pay()
	} else {
		if (is_levy_phase())
			goto_levy_muster()
		else
			goto_remove_markers()
	}
}

// === CAMPAIGN: REMOVE MARKERS ===

function goto_remove_markers() {
	// Discard "This Campaign" events from play.
	if (game.events.length > 0)
		game.events = game.events.filter(c => data.cards[c].when !== 'this_campaign')

	game.lords.moved = 0
	goto_command_activation()
}

// === GAME OVER ===

function goto_game_over(result, victory) {
	game.state = 'game_over'
	game.active = "None"
	game.result = result
	game.victory = victory
	log_br()
	log(game.victory)
	return true
}

states.game_over = {
	get inactive() {
		return game.victory
	},
	prompt() {
		view.prompt = game.victory
	}
}

exports.resign = function (state, current) {
	load_state(state)
	if (game.state !== 'game_over') {
		for (let opponent of exports.roles) {
			if (opponent !== current) {
				goto_game_over(opponent, current + " resigned.")
				break
			}
		}
	}
	return game
}

// === UNCOMMON TEMPLATE ===

function log_br() {
	if (game.log.length > 0 && game.log[game.log.length-1] !== "")
		game.log.push("")
}

function log(msg) {
	game.log.push(msg)
}

function logi(msg) {
	game.log.push(">" + msg)
}

function logii(msg) {
	game.log.push(">>" + msg)
}

function log_h1(msg) {
	log_br()
	log(".h1 " + msg)
	log_br()
}

function log_h2(msg) {
	log_br()
	log(".h2 " + msg)
	log_br()
}

function log_h3(msg) {
	log_br()
	log(".h3 " + msg)
}

function log_h4(msg) {
	log_br()
	log(".h4 " + msg)
}


function gen_action(action, argument) {
	if (!(action in view.actions))
		view.actions[action] = []
	set_add(view.actions[action], argument)
}

function gen_action_locale(locale) {
	gen_action('locale', locale)
}

function gen_action_lord(lord) {
	gen_action('lord', lord)
}

function gen_action_service(service) {
	gen_action('service', service)
}

function gen_action_vassal(vassal) {
	gen_action('vassal', vassal)
}

function gen_action_card(c) {
	gen_action('card', c)
}

function gen_action_plan(lord) {
	gen_action('plan', lord)
}

exports.view = function(state, current) {
	load_state(state)

	view = {
		prompt: null,
		actions: null,
		log: game.log,

		turn: game.turn,
		lords: game.lords,
		vassals: game.vassals,
		events: game.events,
		capabilities: game.capabilities,

		conquered: game.conquered,
		ravaged: game.ravaged,
		sieges: game.sieges,

		p1_castles: game.p1_castles,
		p2_castles: game.p2_castles,
		walls: game.walls,

		legate: game.legate,
		veche_vp: game.veche_vp,
		veche_coin: game.veche_coin,

		command: game.command,
		hand: null,
	}

	if (current === P1)
		view.hand = game.p1_hand
	if (current === P2)
		view.hand = game.p2_hand

	if (game.state === 'game_over') {
		view.prompt = game.victory
	} else if (current === 'Observer' || (game.active !== current && game.active !== BOTH)) {
		let inactive = states[game.state].inactive || game.state
		view.prompt = `Waiting for ${game.active} \u2014 ${inactive}...`
	} else {
		view.actions = {}
		if (states[game.state])
			states[game.state].prompt(current)
		else
			view.prompt = "Unknown state: " + game.state
		if (view.actions.undo === undefined) {
			if (game.undo && game.undo.length > 0)
				view.actions.undo = 1
			else
				view.actions.undo = 0
		}
	}
	return view
}

exports.action = function (state, current, action, arg) {
	load_state(state)
	Object.seal(game) // XXX: don't allow adding properties
	let S = states[game.state]
	if (S && action in S) {
		S[action](arg, current)
	} else {
		if (action === 'undo' && game.undo && game.undo.length > 0)
			pop_undo()
		else
			throw new Error("Invalid action: " + action)
	}
	return game
}

// === COMMON TEMPLATE ===

function random(range) {
	// https://www.ams.org/journals/mcom/1999-68-225/S0025-5718-99-00996-5/S0025-5718-99-00996-5.pdf
	return (game.seed = game.seed * 200105 % 34359738337) % range
}

// Packed array of small numbers in one word

function pack1_get(word, n) {
	return (word >>> n) & 1
}

function pack4_get(word, n) {
	n = n << 2
	return (word >>> n) & 15
}

function pack1_set(word, n, x) {
	return (word & ~(1 << n)) | (x << n)
}

function pack4_set(word, n, x) {
	n = n << 2
	return (word & ~(15 << n)) | (x << n)
}

// === COMMON LIBRARY ===

function clear_undo() {
	if (game.undo.length > 0)
		game.undo = []
}

function push_undo() {
	let copy = {}
	for (let k in game) {
		let v = game[k]
		if (k === "undo")
			continue
		else if (k === "log")
			v = v.length
		else if (typeof v === "object" && v !== null)
			v = object_copy(v)
		copy[k] = v
	}
	game.undo.push(copy)
}

function pop_undo() {
	let save_log = game.log
	let save_undo = game.undo
	game = save_undo.pop()
	save_log.length = game.log
	game.log = save_log
	game.undo = save_undo
}

function random(range) {
	// An MLCG using integer arithmetic with doubles.
	// https://www.ams.org/journals/mcom/1999-68-225/S0025-5718-99-00996-5/S0025-5718-99-00996-5.pdf
	// m = 2**35 − 31
	return (game.seed = game.seed * 200105 % 34359738337) % range
}

function random_bigint(range) {
	// Largest MLCG that will fit its state in a double.
	// Uses BigInt for arithmetic, so is an order of magnitude slower.
	// https://www.ams.org/journals/mcom/1999-68-225/S0025-5718-99-00996-5/S0025-5718-99-00996-5.pdf
	// m = 2**53 - 111
	return (game.seed = Number(BigInt(game.seed) * 5667072534355537n % 9007199254740881n)) % range
}

function shuffle(list) {
	// Fisher-Yates shuffle
	for (let i = list.length - 1; i > 0; --i) {
		let j = random(i + 1)
		let tmp = list[j]
		list[j] = list[i]
		list[i] = tmp
	}
}

function shuffle_bigint(list) {
	// Fisher-Yates shuffle
	for (let i = list.length - 1; i > 0; --i) {
		let j = random_bigint(i + 1)
		let tmp = list[j]
		list[j] = list[i]
		list[i] = tmp
	}
}

// Fast deep copy for objects without cycles
function object_copy(original) {
	if (Array.isArray(original)) {
		let n = original.length
		let copy = new Array(n)
		for (let i = 0; i < n; ++i) {
			let v = original[i]
			if (typeof v === "object" && v !== null)
				copy[i] = object_copy(v)
			else
				copy[i] = v
		}
		return copy
	} else {
		let copy = {}
		for (let i in original) {
			let v = original[i]
			if (typeof v === "object" && v !== null)
				copy[i] = object_copy(v)
			else
				copy[i] = v
		}
		return copy
	}
}

// Array remove and insert (faster than splice)

function array_remove(array, index) {
	let n = array.length
	for (let i = index + 1; i < n; ++i)
		array[i - 1] = array[i]
	array.length = n - 1
}

function array_insert(array, index, item) {
	for (let i = array.length; i > index; --i)
		array[i] = array[i - 1]
	array[index] = item
}

function array_remove_pair(array, index) {
	let n = array.length
	for (let i = index + 2; i < n; ++i)
		array[i - 2] = array[i]
	array.length = n - 2
}

function array_insert_pair(array, index, key, value) {
	for (let i = array.length; i > index; i -= 2) {
		array[i] = array[i-2]
		array[i+1] = array[i-1]
	}
	array[index] = key
	array[index+1] = value
}

// Set as plain sorted array

function set_clear(set) {
	set.length = 0
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

function set_add(set, item) {
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
			return
	}
	array_insert(set, a, item)
}

function set_delete(set, item) {
	let a = 0
	let b = set.length - 1
	while (a <= b) {
		let m = (a + b) >> 1
		let x = set[m]
		if (item < x)
			b = m - 1
		else if (item > x)
			a = m + 1
		else {
			array_remove(set, m)
			return
		}
	}
}

function set_toggle(set, item) {
	let a = 0
	let b = set.length - 1
	while (a <= b) {
		let m = (a + b) >> 1
		let x = set[m]
		if (item < x)
			b = m - 1
		else if (item > x)
			a = m + 1
		else {
			array_remove(set, m)
			return
		}
	}
	array_insert(set, a, item)
}

// Map as plain sorted array of key/value pairs

function map_clear(map) {
	map.length = 0
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

function map_set(map, key, value) {
	let a = 0
	let b = (map.length >> 1) - 1
	while (a <= b) {
		let m = (a + b) >> 1
		let x = map[m<<1]
		if (key < x)
			b = m - 1
		else if (key > x)
			a = m + 1
		else {
			map[(m<<1)+1] = value
			return
		}
	}
	array_insert_pair(map, a<<1, key, value)
}

function map_delete(map, item) {
	let a = 0
	let b = (map.length >> 1) - 1
	while (a <= b) {
		let m = (a + b) >> 1
		let x = map[m<<1]
		if (item < x)
			b = m - 1
		else if (item > x)
			a = m + 1
		else {
			array_remove_pair(map, m<<1)
			return
		}
	}
}

"use strict"

// TODO: game.who = array for feeding
// TODO: highlight shield on mat instead of mat

const data = require("./data.js")

const TODO = false

const BOTH = "Both"
const TEUTONS = "Teutons"
const RUSSIANS = "Russians"

const P1 = TEUTONS
const P2 = RUSSIANS

// NOTE: With Hidden Mats option, the player order of feed/pay may matter.
const FEED_PAY_DISBAND = true // feed, pay, disband in one go

let game = null
let view = null
let states = {}

exports.roles = [ P1, P2 ]

exports.scenarios = [
	"Pleskau",
	"Watland",
	"Peipus",
	"Return of the Prince",
	"Return of the Prince (Nicolle)",
	"Crusade on Novgorod",
	"Pleskau (Quickstart)",
]

const scenario_remove_no_event_cards = [
	"Pleskau",
	"Watland",
	"Peipus",
	"Pleskau (Quickstart)"
]

const scenario_last_turn = {
	"Pleskau": 2,
	"Watland": 8,
	"Peipus": 16,
	"Return of the Prince": 16,
	"Return of the Prince (Nicolle)": 16,
	"Crusade on Novgorod": 16,
	"Pleskau (Quickstart)": 2,
}

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

function find_card(name) {
	return data.cards.findIndex((x) => x.name === name)
}
function find_lord(name) {
	return data.lords.findIndex((x) => x.name === name)
}
function find_locale(name) {
	return data.locales.findIndex((x) => x.name === name)
}

const lord_name = data.lords.map((lord) => lord.name)
const vassal_name = data.vassals.map((vassal) => vassal.name)

const lord_count = data.lords.length
const vassal_count = data.vassals.length
const last_vassal = vassal_count - 1
const last_lord = lord_count - 1

const first_p1_locale = 0
const last_p1_locale = 23
const first_p2_locale = 24
const last_p2_locale = 52

const first_p1_card = 0
const last_p1_card = 17
const last_p1_card_no_event = 20
const first_p2_card = 21
const last_p2_card = 38
const last_p2_card_no_event = 41

const T1 = find_card("T1")
const T2 = find_card("T2")
const T3 = find_card("T3")
const T4 = find_card("T4")
const T5 = find_card("T5")
const T6 = find_card("T6")
const T7 = find_card("T7")
const T8 = find_card("T8")
const T9 = find_card("T9")
const T10 = find_card("T10")
const T11 = find_card("T11")
const T12 = find_card("T12")
const T13 = find_card("T13")
const T14 = find_card("T14")
const T15 = find_card("T15")
const T16 = find_card("T16")
const T17 = find_card("T17")
const T18 = find_card("T18")

const R1 = find_card("R1")
const R2 = find_card("R2")
const R3 = find_card("R3")
const R4 = find_card("R4")
const R5 = find_card("R5")
const R6 = find_card("R6")
const R7 = find_card("R7")
const R8 = find_card("R8")
const R9 = find_card("R9")
const R10 = find_card("R10")
const R11 = find_card("R11")
const R12 = find_card("R12")
const R13 = find_card("R13")
const R14 = find_card("R14")
const R15 = find_card("R15")
const R16 = find_card("R16")
const R17 = find_card("R17")
const R18 = find_card("R18")

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

const LEGATE = 20
const LEGATE_INDISPOSED = -2
const LEGATE_ARRIVED = -1

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

// Capability usage tracking flags
const FLAG_FIRST_ACTION = 1 << 0
const FLAG_FIRST_MARCH = 1 << 1
const FLAG_USED_LEGATE = 1 << 2

const FLAG_TEUTONIC_RAIDERS = 1 << 3
const FLAG_TEUTONIC_ORDENSBURGEN = 1 << 4

const FLAG_TEUTONIC_WARRIOR_MONKS = 1 << 5
const FLAG_TEUTONIC_HILLFORTS = 1 << 6
const FLAG_RUSSIAN_LODYA_BOATS = 1 << 7
const FLAG_RUSSIAN_LODYA_SHIPS = 1 << 8

const AOW_TEUTONIC_TREATY_OF_STENSBY = T1
const AOW_TEUTONIC_RAIDERS = T2
const AOW_TEUTONIC_CONVERTS = T3
const AOW_TEUTONIC_BALISTARII = [ T4, T5, T6 ]
const AOW_TEUTONIC_WARRIOR_MONKS = [ T7, T15 ]
const AOW_TEUTONIC_HILLFORTS = T8
const AOW_TEUTONIC_HALBBRUDER = [ T9, T10 ]
const AOW_TEUTONIC_CRUSADE = T11
const AOW_TEUTONIC_ORDENSBURGEN = T12
const AOW_TEUTONIC_WILLIAM_OF_MODENA = T13
const AOW_TEUTONIC_TREBUCHETS = T14
const AOW_TEUTONIC_RANSOM = T16
const AOW_TEUTONIC_STONEMASONS = T17
const AOW_TEUTONIC_COGS = T18

const AOW_RUSSIAN_LUCHNIKI = [ R1, R2 ]
const AOW_RUSSIAN_STRELTSY = [ R3, R13 ]
const AOW_RUSSIAN_SMERDI = R4
const AOW_RUSSIAN_DRUZHINA = [ R5, R6 ]
const AOW_RUSSIAN_RANSOM = R7
const AOW_RUSSIAN_BLACK_SEA_TRADE = R8
const AOW_RUSSIAN_BALTIC_SEA_TRADE = R9
const AOW_RUSSIAN_STEPPE_WARRIORS = R10
const AOW_RUSSIAN_HOUSE_OF_SUZDAL = R11
const AOW_RUSSIAN_RAIDERS = [ R12, R14 ]
const AOW_RUSSIAN_ARCHBISHOPRIC = R15
const AOW_RUSSIAN_LODYA = R16
const AOW_RUSSIAN_VELIKY_KNYAZ = R17
const AOW_RUSSIAN_STONE_KREMLIN = R18

// TODO: advanced service
const VASSAL_UNAVAILABLE = 0
const VASSAL_READY = 1
const VASSAL_MUSTERED = 2

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
	SUMMER,
	SUMMER,
	EARLY_WINTER,
	EARLY_WINTER,
	LATE_WINTER,
	LATE_WINTER,
	RASPUTITSA,
	RASPUTITSA,
	SUMMER,
	SUMMER,
	EARLY_WINTER,
	EARLY_WINTER,
	LATE_WINTER,
	LATE_WINTER,
	RASPUTITSA,
	RASPUTITSA,
	null,
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
	null,
]

const USABLE_TRANSPORT = [
	[ CART, BOAT, SHIP ],
	[ SLED ],
	[ SLED ],
	[ BOAT, SHIP ]
]

const COMMANDERIES = [
	LOC_ADSEL,
	LOC_FELLIN,
	LOC_LEAL,
	LOC_WENDEN
]

function is_commandery(loc) {
	return (
		loc === LOC_ADSEL ||
		loc === LOC_FELLIN ||
		loc === LOC_LEAL ||
		loc === LOC_WENDEN
	)
}

function current_turn() {
	return game.turn >> 1
}

function current_season() {
	return SEASONS[game.turn >> 1]
}

function current_turn_name() {
	return TURN_NAME[game.turn >> 1]
}

function is_campaign_phase() {
	return (game.turn & 1) === 1
}

function is_levy_phase() {
	return (game.turn & 1) === 0
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
	game.stack.push([ game.state, game.who, game.count ])
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
	if (game.active === P1)
		return P2
	if (game.active === P2)
		return P1
	return null
}

function get_lord_locale(lord) {
	return game.lords.locale[lord]
}

function get_lord_service(lord) {
	return game.lords.service[lord]
}

function get_lord_capability(lord, n) {
	return game.lords.capabilities[(lord << 1) + n]
}

function set_lord_capability(lord, n, x) {
	game.lords.capabilities[(lord << 1) + n] = x
}

function get_lord_assets(lord, n) {
	return pack4_get(game.lords.assets[lord], n)
}

function get_lord_forces(lord, n) {
	return pack4_get(game.lords.forces[lord], n)
}

function get_lord_routed_forces(lord, n) {
	return pack4_get(game.lords.routed[lord], n)
}

function set_lord_locale(lord, locale) {
	game.lords.locale[lord] = locale
}

function set_lord_service(lord, service) {
	if (service < 0)
		service = 0
	if (service > 17)
		service = 17
	game.lords.service[lord] = service
}

function add_lord_service(lord, n) {
	set_lord_service(lord, get_lord_service(lord) + n)
}

function set_lord_assets(lord, n, x) {
	if (x < 0)
		x = 0
	if (x > 8)
		x = 8
	game.lords.assets[lord] = pack4_set(game.lords.assets[lord], n, x)
}

function add_lord_assets(lord, n, x) {
	set_lord_assets(lord, n, get_lord_assets(lord, n) + x)
}

function set_lord_forces(lord, n, x) {
	if (x < 0)
		x = 0
	if (x > 15)
		x = 15
	game.lords.forces[lord] = pack4_set(game.lords.forces[lord], n, x)
}

function add_lord_forces(lord, n, x) {
	set_lord_forces(lord, n, get_lord_forces(lord, n) + x)
}

function set_lord_routed_forces(lord, n, x) {
	if (x < 0)
		x = 0
	if (x > 15)
		x = 15
	game.lords.routed[lord] = pack4_set(game.lords.routed[lord], n, x)
}

function add_lord_routed_forces(lord, n, x) {
	set_lord_routed_forces(lord, n, get_lord_routed_forces(lord, n) + x)
}

function clear_lords_moved() {
	game.lords.moved = 0
}

function get_lord_moved(lord) {
	return pack2_get(game.lords.moved, lord)
}

function set_lord_moved(lord, x) {
	game.lords.moved = pack2_set(game.lords.moved, lord, x)
}

function set_lord_unfed(lord, n) {
	// reuse "moved" flag for hunger
	set_lord_moved(lord, n)
}

function is_lord_unfed(lord) {
	// reuse "moved" flag for hunger
	return get_lord_moved(lord)
}

function feed_lord(lord) {
	// reuse "moved" flag for hunger
	set_lord_moved(lord, get_lord_moved(lord) - 1)
}

// === GAME STATE HELPERS ===

function roll_die() {
	return random(6) + 1
}

function has_global_capability(cap) {
	for (let c of game.capabilities)
		if (c === cap)
			return true
	return false
}

function get_shared_assets(loc, what) {
	let n = 0
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (get_lord_locale(lord) === loc)
			n += get_lord_assets(lord, what)
	return n
}

function count_lord_forces(lord) {
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

function count_lord_horses(lord) {
	return (
		get_lord_forces(lord, KNIGHTS) +
		get_lord_forces(lord, SERGEANTS) +
		get_lord_forces(lord, LIGHT_HORSE) +
		get_lord_forces(lord, ASIATIC_HORSE)
	)
}

function max_plan_length() {
	switch (current_season()) {
		case SUMMER:
			return 6
		case EARLY_WINTER:
			return 4
		case LATE_WINTER:
			return 4
		case RASPUTITSA:
			return 5
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
		case LORD_ANDREAS:
			return true
		case LORD_HERMANN:
			return !is_lord_on_map(LORD_ANDREAS)
		case LORD_ALEKSANDR:
			return true
		case LORD_ANDREY:
			return !is_lord_on_map(LORD_ALEKSANDR)
		default:
			return false
	}
}

function is_card_in_use(c) {
	if (set_has(game.events, c))
		return true
	if (set_has(game.capabilities, c))
		return true
	if (game.lords.capabilities.includes(c))
		return true
	if (c === 18 || c === 19 || c === 20)
		return true
	if (c === 39 || c === 40 || c === 41)
		return true
	return false
}

function has_flag(bit) {
	return game.flags & bit
}

function set_flag(bit) {
	game.flags |= bit
}

function clear_flag(bit) {
	game.flags &= ~bit
}

function is_lord_on_map(lord) {
	let loc = get_lord_locale(lord)
	return loc !== NOWHERE && loc < CALENDAR
}

function is_lord_besieged(lord) {
	return pack1_get(game.lords.besieged, lord)
}

function is_lord_unbesieged(lord) {
	return !pack1_get(game.lords.besieged, lord)
}

function set_lord_besieged(lord, x) {
	game.lords.besieged = pack1_set(game.lords.besieged, lord, x)
}

function is_lord_on_calendar(lord) {
	let loc = get_lord_locale(lord)
	return loc >= CALENDAR
}

function is_lord_ready(lord) {
	let loc = get_lord_locale(lord)
	return loc >= CALENDAR && loc <= CALENDAR + (game.turn >> 1)
}

function is_vassal_available(vassal) {
	let cap = data.vassals[vassal].capability
	if (cap === "Crusade")
		return has_global_capability(AOW_TEUTONIC_CRUSADE)
	if (cap === "Steppe Warriors")
		return has_global_capability(AOW_RUSSIAN_STEPPE_WARRIORS)
	return true
}

function is_vassal_unavailable(vassal) {
	return game.lords.vassals[vassal] === VASSAL_UNAVAILABLE
}

function is_vassal_ready(vassal) {
	return game.lords.vassals[vassal] === VASSAL_READY
}

function is_vassal_mustered(vassal) {
	return game.lords.vassals[vassal] === VASSAL_MUSTERED
}

function is_teutonic_lord(lord) {
	return lord >= first_p1_lord && lord <= last_p1_lord
}

function is_russian_lord(lord) {
	return lord >= first_p2_lord && lord <= last_p2_lord
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

function for_each_seat(lord, fn) {
	let list = data.lords[lord].seats

	for (let seat of list)
		fn(seat)

	if (is_teutonic_lord(lord)) {
		if (has_global_capability(AOW_TEUTONIC_ORDENSBURGEN)) {
			for (let commandery of COMMANDERIES)
				if (!set_has(list, commandery))
					fn(commandery)
		}
	}

	if (is_russian_lord(lord)) {
		if (has_global_capability(AOW_RUSSIAN_ARCHBISHOPRIC))
			if (!set_has(list, LOC_NOVGOROD))
				fn(LOC_NOVGOROD)
	}

	if (lord === LORD_YAROSLAV) {
		if (has_conquered_marker(LOC_PSKOV))
			if (!set_has(list, LOC_PSKOV))
				fn(LOC_PSKOV)
	}
}

function is_lord_at_seat(lord) {
	let here = get_lord_locale(lord)
	let result = false
	for_each_seat(lord, seat => {
		if (seat === here)
			result = true
	})
	return result
}

function has_free_seat(lord) {
	let result = false
	for_each_seat(lord, seat => {
		if (!result && is_friendly_locale(seat))
			result = true
	})
	return result
}

function has_friendly_lord(loc) {
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (get_lord_locale(lord) === loc)
			return true
	return false
}

function has_enemy_lord(loc) {
	for (let lord = first_enemy_lord; lord <= last_enemy_lord; ++lord)
		if (get_lord_locale(lord) === loc)
			return true
	return false
}

function has_unbesieged_enemy_lord(loc) {
	for (let lord = first_enemy_lord; lord <= last_enemy_lord; ++lord)
		if (get_lord_locale(lord) === loc && is_lord_unbesieged(lord))
			return true
	return false
}

function is_friendly_territory(loc) {
	if (game.active === P1)
		return loc >= first_p1_locale && loc <= last_p1_locale
	return loc >= first_p2_locale && loc <= last_p2_locale
}

function is_enemy_territory(loc) {
	if (game.active === P1)
		return loc >= first_p2_locale && loc <= last_p2_locale
	return loc >= first_p1_locale && loc <= last_p1_locale
}

function is_seaport(loc) {
	return set_has(data.seaports, loc)
}

function is_trade_route(loc) {
	return data.locales[loc].type === "traderoute"
}

function is_stronghold(loc) {
	return data.locales[loc].stronghold > 0
}

function is_region(loc) {
	return data.locales[loc].type === "region"
}

function has_conquered_marker(loc) {
	return set_has(game.locales.conquered, loc)
}

function add_conquered_marker(loc) {
	set_add(game.locales.conquered, loc)
}

function remove_conquered_marker(loc) {
	set_delete(game.locales.conquered, loc)
}

function has_ravaged_marker(loc) {
	return set_has(game.locales.ravaged, loc)
}

function add_ravaged_marker(loc) {
	set_add(game.locales.ravaged, loc)
}

function count_siege_markers(loc) {
	return map_get(game.locales.sieges, loc, 0)
}

function has_siege_marker(loc) {
	return map_get(game.locales.sieges, loc, 0) > 0
}

function add_siege_marker(loc) {
	map_set(game.locales.sieges, loc, map_get(game.locales.sieges, loc, 0) + 1)
}

function remove_siege_marker(loc) {
	map_set(game.locales.sieges, loc, map_get(game.locales.sieges, loc, 0) - 1)
}

function remove_all_siege_markers(loc) {
	map_delete(game.locales.sieges, loc)
}

function conquer_trade_route(loc) {
	if (game.active === RUSSIANS) {
		if (has_conquered_marker(loc)) {
			log(`Conquered %${loc}.`)
			remove_conquered_marker(loc)
		}
	} else {
		if (!has_conquered_marker(loc)) {
			log(`Conquered %${loc}.`)
			add_conquered_marker(loc)
		}
	}
}

function has_enemy_castle(loc) {
	if (game.active === P1)
		return set_has(game.locales.castles2, loc)
	return set_has(game.locales.castles1, loc)
}

function has_friendly_castle(loc) {
	if (game.active === P1)
		return set_has(game.locales.castles1, loc)
	return set_has(game.locales.castles2, loc)
}

function has_conquered_stronghold(loc) {
	return is_stronghold(loc) && has_conquered_marker(loc)
}

function is_friendly_stronghold(loc) {
	// TODO: use full "is friendly locale" check here, or just color of stronghold?
	if (is_stronghold(loc) || has_friendly_castle(loc))
		return is_friendly_locale(loc)
	return false
}

function is_enemy_stronghold(loc) {
	if (is_stronghold(loc)) {
		if (is_enemy_territory(loc) && !has_conquered_marker(loc))
			return true
		if (is_friendly_territory(loc) && has_conquered_marker(loc))
			return true
	}
	if (has_enemy_castle(loc))
		return true
	return false
}

function is_unbesieged_enemy_stronghold(loc) {
	return is_enemy_stronghold(loc) && !has_siege_marker(loc)
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
			if (is_stronghold(loc) && has_conquered_marker(loc))
				return true
			if (has_friendly_castle(loc))
				return true
		}
	}
	return false
}

function is_not_friendly_locale(loc) {
	return !is_friendly_locale(loc)
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

function count_lord_transport(lord, way) {
	let type = data.ways[way].type
	let season = current_season()
	let n = 0
	switch (type) {
		case "trackway":
			switch (season) {
				case SUMMER:
					n += get_lord_assets(lord, CART)
					break
				case EARLY_WINTER:
				case LATE_WINTER:
					n += get_lord_assets(lord, SLED)
					break
				case RASPUTITSA:
					break
			}
			break
		case "waterway":
			switch (season) {
				case SUMMER:
					n += count_lord_boats(lord)
					break
				case EARLY_WINTER:
				case LATE_WINTER:
					n += get_lord_assets(lord, SLED)
					break
				case RASPUTITSA:
					n += count_lord_boats(lord)
					break
			}
			break
	}
	return n
}

function list_ways(from, to) {
	for (let ways of data.locales[from].ways)
		if (ways[0] === to)
			return ways
	return null
}

function has_two_ways(from, to) {
	return list_ways(from, to).length > 2
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

function get_upper_lord(lower) {
	for (let i = 0; i < game.lords.lieutenants.length; i += 2)
		if (game.lords.lieutenants[i+1] === lower)
			return i
	return NOBODY
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

function remove_lieutenant(lord) {
	for (let i = 0; i < game.lords.lieutenants.length; i += 2) {
		if(game.lords.lieutenants[i] === lord || game.lords.lieutenants[i+1] === lord) {
			array_remove_pair(game.lords.lieutenants, i)
			return
		}
	}
}

function is_located_with_legate(lord) {
	return get_lord_locale(lord) === game.call_to_arms.legate
}

function for_each_group_lord(fn) {
	for (let lord of game.group)
		if (lord !== LEGATE)
			fn(lord)
}

function group_has_capability(c) {
	for (let lord of game.group)
		if (lord !== LEGATE)
			if (lord_has_capability(lord, c))
				return true
	return false
}

function count_group_ships() {
	let n = 0
	for (let lord of game.group)
		if (lord !== LEGATE)
			n += count_lord_ships(lord)
	return n
}

function count_group_assets(asset) {
	let n = 0
	for (let lord of game.group)
		if (lord !== LEGATE)
			n += get_lord_assets(lord, asset)
	return n
}

function count_group_forces(type) {
	let n = 0
	for (let lord of game.group)
		if (lord !== LEGATE)
			n += count_lord_forces(lord, type)
	return n
}

function count_group_horses() {
	let n = 0
	for (let lord of game.group)
		if (lord !== LEGATE)
			n += count_lord_horses(lord)
	return n
}

function count_group_transport(way) {
	let n = 0
	for (let lord of game.group)
		if (lord !== LEGATE)
			n += count_lord_transport(lord, way)
	return n
}

// === SETUP ===

function setup_lord_on_calendar(lord, turn) {
	set_lord_locale(lord, CALENDAR + turn)
}

function muster_lord(lord, locale, service) {
	let info = data.lords[lord]

	if (!service)
		service = current_turn() + info.service

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
	set_lord_forces(lord, SERGEANTS, info.forces.sergeants | 0)
	set_lord_forces(lord, LIGHT_HORSE, info.forces.light_horse | 0)
	set_lord_forces(lord, ASIATIC_HORSE, info.forces.asiatic_horse | 0)
	set_lord_forces(lord, MEN_AT_ARMS, info.forces.men_at_arms | 0)
	set_lord_forces(lord, MILITIA, info.forces.militia | 0)
	set_lord_forces(lord, SERFS, info.forces.serfs | 0)

	for (let v of info.vassals) {
		if (is_vassal_available(v))
			game.lords.vassals[v] = VASSAL_READY
		else
			game.lords.vassals[v] = VASSAL_UNAVAILABLE
	}
}

function muster_vassal(lord, vassal) {
	let info = data.vassals[vassal]

	game.lords.vassals[vassal] = VASSAL_MUSTERED

	add_lord_forces(lord, KNIGHTS, info.forces.knights | 0)
	add_lord_forces(lord, SERGEANTS, info.forces.sergeants | 0)
	add_lord_forces(lord, LIGHT_HORSE, info.forces.light_horse | 0)
	add_lord_forces(lord, ASIATIC_HORSE, info.forces.asiatic_horse | 0)
	add_lord_forces(lord, MEN_AT_ARMS, info.forces.men_at_arms | 0)
	add_lord_forces(lord, MILITIA, info.forces.militia | 0)
	add_lord_forces(lord, SERFS, info.forces.serfs | 0)
}

exports.setup = function (seed, scenario, options) {
	game = {
		seed,
		scenario,
		options,

		log: [],
		undo: [],

		active: P1,
		state: "setup_lords",
		stack: [],

		hand1: [],
		hand2: [],
		plan1: [],
		plan2: [],

		turn: 0,
		capabilities: [], // global capabilities
		events: [], // this levy/this campaign cards

		lords: {
			locale: Array(lord_count).fill(NOWHERE),
			service: Array(lord_count).fill(NEVER),
			assets: Array(lord_count).fill(0),
			forces: Array(lord_count).fill(0),
			routed: Array(lord_count).fill(0),
			capabilities: Array(lord_count << 1).fill(NOTHING),
			besieged: 0,
			moved: 0,
			lieutenants: [],
			vassals: Array(vassal_count).fill(VASSAL_UNAVAILABLE),
		},

		locales: {
			conquered: [],
			ravaged: [],
			sieges: [],

			castles1: [],
			castles2: [],
			walls: [],
		},

		call_to_arms: {
			legate: LEGATE_INDISPOSED,
			veche_vp: 0,
			veche_coin: 0,
		},

		command: NOBODY,
		group: 0,
		who: NOBODY,
		where: NOWHERE,
		what: NOTHING,
		approach: 0,
		count: 0,
		flags: 0,
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

	game.call_to_arms.veche_vp = 1

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

	game.call_to_arms.veche_vp = 1
	game.call_to_arms.veche_coin = 1

	set_add(game.locales.conquered, LOC_IZBORSK)
	set_add(game.locales.conquered, LOC_PSKOV)
	set_add(game.locales.ravaged, LOC_PSKOV)
	set_add(game.locales.ravaged, LOC_DUBROVNO)

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

	game.call_to_arms.veche_vp = 4
	game.call_to_arms.veche_coin = 3

	set_add(game.locales.castles2, LOC_KOPORYE)
	set_add(game.locales.conquered, LOC_IZBORSK)
	set_add(game.locales.conquered, LOC_PSKOV)
	set_add(game.locales.ravaged, LOC_VOD)
	set_add(game.locales.ravaged, LOC_ZHELTSY)
	set_add(game.locales.ravaged, LOC_TESOVO)
	set_add(game.locales.ravaged, LOC_SABLIA)
	set_add(game.locales.ravaged, LOC_PSKOV)
	set_add(game.locales.ravaged, LOC_DUBROVNO)

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
}

function setup_return_of_the_prince() {
	game.turn = 9 << 1

	game.call_to_arms.veche_vp = 3
	game.call_to_arms.veche_coin = 2

	set_add(game.locales.castles1, LOC_KOPORYE)
	set_add(game.locales.conquered, LOC_KAIBOLOVO)
	set_add(game.locales.conquered, LOC_KOPORYE)
	set_add(game.locales.conquered, LOC_IZBORSK)
	set_add(game.locales.conquered, LOC_PSKOV)
	set_add(game.locales.ravaged, LOC_VOD)
	set_add(game.locales.ravaged, LOC_ZHELTSY)
	set_add(game.locales.ravaged, LOC_TESOVO)
	set_add(game.locales.ravaged, LOC_SABLIA)
	set_add(game.locales.ravaged, LOC_PSKOV)
	set_add(game.locales.ravaged, LOC_DUBROVNO)

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

	game.call_to_arms.veche_vp = 3
	game.call_to_arms.veche_coin = 2

	set_add(game.locales.castles1, LOC_KOPORYE)
	set_add(game.locales.conquered, LOC_KAIBOLOVO)
	set_add(game.locales.conquered, LOC_KOPORYE)
	set_add(game.locales.ravaged, LOC_VOD)
	set_add(game.locales.ravaged, LOC_ZHELTSY)
	set_add(game.locales.ravaged, LOC_TESOVO)
	set_add(game.locales.ravaged, LOC_SABLIA)

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

	game.call_to_arms.veche_vp = 1
	game.call_to_arms.veche_coin = 0

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
	set_lord_capability(LORD_HERMANN, 0, T4)
	set_lord_capability(LORD_HERMANN, 1, T14)

	set_lord_capability(LORD_YAROSLAV, 0, T3)

	set_add(game.capabilities, T13)
	game.call_to_arms.legate = LOC_DORPAT

	set_add(game.capabilities, R8)
	muster_lord(LORD_DOMASH, LOC_NOVGOROD)
	add_lord_assets(LORD_DOMASH, BOAT, 2)
	add_lord_assets(LORD_DOMASH, CART, 2)

	muster_vassal(LORD_GAVRILO, data.lords[LORD_GAVRILO].vassals[0])
	set_lord_capability(LORD_GAVRILO, 0, R2)
	set_lord_capability(LORD_GAVRILO, 1, R6)

	game.call_to_arms.veche_coin += 1

	goto_campaign_plan()

	game.plan1 = [ LORD_YAROSLAV, LORD_RUDOLF, LORD_HERMANN, LORD_HERMANN, LORD_RUDOLF, LORD_HERMANN ]
	game.plan2 = [ LORD_GAVRILO, LORD_VLADISLAV, LORD_DOMASH, LORD_GAVRILO, LORD_DOMASH, LORD_DOMASH ]

	// goto_command_activation()
}

states.setup_lords = {
	prompt() {
		view.prompt = "Setup your Lords."
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
		log(`L${lord} at %${get_lord_locale(lord)}`)
		push_state("muster_lord_transport")
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
	clear_lords_moved()
	set_active_enemy()
	if (game.active === P1) {
		log_h1("Levy " + current_turn_name())
		log_h2("Arts of War")
		goto_levy_arts_of_war_first()
	}
}

// === LEVY: ARTS OF WAR (FIRST TURN) ===

function draw_two_cards() {
	let remove_no_event_cards = scenario_remove_no_event_cards.includes(game.scenario)

	let deck = []
	if (game.active === P1) {
		for (let c = first_p1_card; c <= last_p1_card; ++c)
			if (!is_card_in_use(c))
				deck.push(c)
		if (!remove_no_event_cards)
			for (let c = last_p1_card; c <= last_p1_card_no_event; ++c)
				if (!is_card_in_use(c))
					deck.push(c)
	} else {
		for (let c = first_p2_card; c <= last_p2_card; ++c)
			if (!is_card_in_use(c))
				deck.push(c)
		if (!remove_no_event_cards)
			for (let c = last_p2_card; c <= last_p2_card_no_event; ++c)
				if (!is_card_in_use(c))
					deck.push(c)
	}

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
	game.state = "levy_arts_of_war_first"
	game.what = draw_two_cards()
}

function resume_levy_arts_of_war_first() {
	if (game.what.length === 0)
		end_levy_arts_of_war_first()
}

// TODO: show and assign capabilities simultaneously
states.levy_arts_of_war_first = {
	prompt() {
		let c = game.what[0]
		view.what = c
		if (data.cards[c].this_lord) {
			view.prompt = `Arts of War: Assign ${data.cards[c].capability} to a Lord.`
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
			view.prompt = `Arts of War: Deploy ${data.cards[c].capability}.`
			view.actions.deploy = 1
		} else {
			view.prompt = `Arts of War: No Capability.`
			view.actions.discard = 1
		}
	},
	lord(lord) {
		let c = game.what.shift()
		logi(`C${c} - L${lord}`)
		add_lord_capability(lord, c)
		resume_levy_arts_of_war_first()
	},
	deploy() {
		let c = game.what.shift()
		logi(`C${c}`)
		set_add(game.capabilities, c)
		resume_levy_arts_of_war_first()
	},
	discard() {
		let c = game.what.shift()
		logi(`C${c} - discarded`)
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
	game.state = "levy_arts_of_war"
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
			case "this_levy":
			case "this_campaign":
			case "now":
				view.prompt = `Arts of War: Play ${data.cards[c].event}.`
				view.actions.play = 1
				break
			case "hold":
				view.prompt = `Arts of War: Hold ${data.cards[c].event}.`
				view.actions.hold = 1
				break
			case "never":
				view.prompt = `Arts of War: Discard ${data.cards[c].event}.`
				view.actions.discard = 1
				break
		}
	},
	play() {
		let c = game.what.shift()
		log(`Played E${c}`)
		if (data.cards[c].when === "this_levy" || data.cards[c].when === "this_campaign")
			set_add(game.events, c)
		log(`TODO implement event`)
		resume_levy_arts_of_war()
	},
	hold() {
		let c = game.what.shift()
		log(`Held event card.`)
		if (game.active === P1)
			game.hand1.push(c)
		else
			game.hand2.push(c)
		resume_levy_arts_of_war()
	},
	discard() {
		let c = game.what.shift()
		log(`Discarded E${c}.`)
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
	game.state = "levy_muster"
}

function end_levy_muster() {
	clear_lords_moved()
	set_active_enemy()
	if (game.active === P2)
		goto_levy_muster()
	else
		goto_levy_call_to_arms()
}

states.levy_muster = {
	prompt() {
		view.prompt = "Levy: Muster your Lords."
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
		log_h3(`L${lord} at %${get_lord_locale(lord)}`)
		push_state("levy_muster_lord")
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
		view.prompt = `Levy: Muster ${lord_name[game.who]}.`

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
			logi(`L${other} rolled ${die} <= ${fealty}`)
			push_state("muster_lord_at_seat")
			game.who = other
		} else {
			logi(`L${other} rolled ${die} > ${fealty}`)
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
		push_state("muster_capability")
	},

	done() {
		set_lord_moved(game.who, 1)
		pop_state()
	},
}

states.muster_lord_at_seat = {
	prompt() {
		view.prompt = `Muster: Select seat for ${lord_name[game.who]}.`
		for_each_seat(game.who, seat => {
			if (is_friendly_locale(loc))
				gen_action_locale(loc)
		})
	},
	locale(loc) {
		push_undo()
		logii(`at %${loc}`)
		set_lord_moved(game.who, 1)
		muster_lord(game.who, loc)
		game.state = "muster_lord_transport"
		game.count = data.lords[game.who].assets.transport | 0
		resume_muster_lord_transport()
	},
}

function resume_muster_lord_transport() {
	if (game.count === 0)
		pop_state()
	if (game.state === "levy_muster_lord")
		resume_levy_muster_lord()
}

states.muster_lord_transport = {
	prompt() {
		if (game.state === "veliky_knyaz")
			view.prompt = `Veliky Knyaz: Select Transport for ${lord_name[game.who]}.`
		else
			view.prompt = `Muster: Select Transport for ${lord_name[game.who]}.`
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
		view.prompt = `Muster: Select a new capability for ${lord_name[game.who]}.`
		view.show_arts_of_war = 1
		for_each_friendly_arts_of_war((c) => {
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
		logi(`Capability C${c}`)
		if (data.cards[c].this_lord) {
			if (can_add_lord_capability(game.who, c)) {
				add_lord_capability(game.who, c)
			} else {
				game.what = c
				game.state = "muster_capability_discard"
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
		view.prompt = `Muster: Remove a capability from ${lord_name[game.who]}.`
		gen_action_card(get_lord_capability(game.who, 0))
		gen_action_card(get_lord_capability(game.who, 1))
	},
	card(c) {
		push_undo()
		logi(`Discarded C${c}.`)
		discard_lord_capability(game.who, c)
		add_lord_capability(game.who, game.what)
		game.what = NOTHING
		pop_state()
		resume_levy_muster_lord()
	},
}

// === LEVY: CALL TO ARMS ===

function goto_levy_call_to_arms() {
	game.state = "levy_call_to_arms"
	end_levy_call_to_arms()
}

states.levy_call_to_arms = {}

function end_levy_call_to_arms() {
	goto_campaign_plan()
}

// === CAMPAIGN: PLAN ===

function goto_campaign_plan() {
	game.turn++

	// Discard "This Levy" events from play.
	if (game.events.length > 0)
		game.events = game.events.filter((c) => data.cards[c].when !== "this_levy")

	log_h1("Campaign " + current_turn_name())

	set_active(BOTH)
	game.state = "campaign_plan"
	game.plan1 = []
	game.plan2 = []
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
		let plan = current === P1 ? game.plan1 : game.plan2
		let first = current === P1 ? first_p1_lord : first_p2_lord
		let last = current === P1 ? last_p1_lord : last_p2_lord
		let upper = plan_selected_lieutenant(first, last)

		view.prompt = "Plan: Designate Lieutenants and build a Plan."
		view.plan = plan
		view.who = upper

		if (plan.length < max_plan_length()) {
			view.actions.end_plan = 0
			if (count_cards_in_plan(plan, NOBODY) < 3)
				gen_action_plan(NOBODY)
			for (let lord = first; lord <= last; ++lord) {
				if (is_lord_on_map(lord) && count_cards_in_plan(plan, lord) < 3)
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
					gen_action_lord(lord)
			}
		}

		if (plan.length > 0 || plan_has_lieutenant(first, last))
			view.actions.undo = 1
		else
			view.actions.undo = 0
	},
	lord(lord, current) {
		let upper
		if (current === P1)
			upper = plan_selected_lieutenant(first_p1_lord, last_p1_lord)
		else
			upper = plan_selected_lieutenant(first_p2_lord, last_p2_lord)
		if (lord === upper)
			remove_lieutenant(upper)
		else if (upper === NOBODY)
			add_lieutenant(lord)
		else
			set_lower_lord(upper, lord)
	},
	plan(lord, current) {
		if (current === P1)
			game.plan1.push(lord)
		else
			game.plan2.push(lord)
	},
	undo(_, current) {
		if (current === P1) {
			for (let lord = first_p1_lord; lord <= last_p1_lord; ++lord)
				if (is_upper_lord(lord))
					remove_lieutenant(lord)
			game.plan1.length = 0
		} else {
			for (let lord = first_p2_lord; lord <= last_p2_lord; ++lord)
				if (is_upper_lord(lord))
					remove_lieutenant(lord)
			game.plan2.length = 0
		}
	},
	end_plan(_, current) {
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
		log("Lieutenants")
		for (let i = 0; i < game.lords.lieutenants.length; i += 2) {
			let upper = game.lords.lieutenants[i]
			let lower = game.lords.lieutenants[i + 1]
			log(`>L${upper} over L${lower}`)
		}
	}

	set_active(P1)
	goto_command_activation()
}

// === CAMPAIGN: COMMAND ACTIVATION ===

function goto_command_activation() {
	if (game.plan2.length === 0) {
		game.command = NOBODY
		goto_end_campaign()
		return
	}

	if (game.plan2.length > game.plan1.length) {
		set_active(P2)
		game.command = game.plan2.shift()
	} else {
		set_active(P1)
		game.command = game.plan1.shift()
	}

	if (game.command === NOBODY) {
		log_h2("Pass")
		goto_command_activation()
	} else if (is_lower_lord(game.command)) {
		log_h2(`L${game.command} - Pass`)
		goto_command_activation()
	} else if (!is_lord_on_map(game.command)) {
		log_h2(`L${game.command} - Pass`)
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

function is_first_action() {
	return has_flag(FLAG_FIRST_ACTION)
}

function is_first_march() {
	return has_flag(FLAG_FIRST_MARCH)
}

function goto_actions() {
	log_h2(`L${game.command}`)

	game.state = "actions"
	game.who = game.command
	game.count = 0

	set_flag(FLAG_FIRST_ACTION)
	set_flag(FLAG_FIRST_MARCH)

	// 4.1.3 Lieutenants MUST take lower lord
	let lower = get_lower_lord(game.who)
	if (lower !== NOBODY)
		game.group = [ game.command, lower ]
	else
		game.group = [ game.command ]

	if (game.active === TEUTONS) {
		if (has_global_capability(AOW_TEUTONIC_ORDENSBURGEN)) {
			if (is_commandery(get_lord_locale(game.who)))
				set_flag(FLAG_TEUTONIC_ORDENSBURGEN)
		}
	}
}

function spend_action(cost) {
	clear_flag(FLAG_FIRST_ACTION)
	game.count += cost
}

function spend_march_action(cost) {
	clear_flag(FLAG_FIRST_ACTION)
	clear_flag(FLAG_FIRST_MARCH)
	game.count += cost
}

function spend_all_actions() {
	clear_flag(FLAG_FIRST_ACTION)
	clear_flag(FLAG_FIRST_MARCH)
	game.count += get_available_actions()
}

function end_actions() {
	log_br()

	set_active(P1)
	game.command = NOBODY
	game.who = NOBODY
	game.group = 0

	clear_flag(FLAG_FIRST_ACTION)
	clear_flag(FLAG_FIRST_MARCH)
	clear_flag(FLAG_USED_LEGATE)
	clear_flag(FLAG_TEUTONIC_RAIDERS)
	clear_flag(FLAG_TEUTONIC_ORDENSBURGEN)

	goto_feed()
}

function this_lord_has_russian_druzhina() {
	if (game.active === RUSSIANS)
		if (lord_has_capability(game.who, AOW_RUSSIAN_DRUZHINA))
			return count_lord_forces(game.who, KNIGHTS) > 0
	return false
}

function this_lord_has_house_of_suzdal() {
	if (game.active === RUSSIANS)
		if (lord_has_capability(game.who, AOW_RUSSIAN_DRUZHINA))
			return is_lord_on_map(LORD_ALEKSANDR) || is_lord_on_map(LORD_ANDREY)
	return false
}

function get_available_actions() {
	let n = data.lords[game.command].command

	if (game.active === TEUTONS) {
		if (has_flag(FLAG_USED_LEGATE))
			++n
		if (has_flag(FLAG_TEUTONIC_ORDENSBURGEN))
			++n
		if (game.who === LORD_HEINRICH || game.who === LORD_KNUD_ABEL)
			if (has_global_capability(AOW_TEUTONIC_TREATY_OF_STENSBY))
				++n
	}

	if (game.active === RUSSIANS) {
		if (this_lord_has_russian_druzhina())
			++n
		if (this_lord_has_house_of_suzdal())
			++n
	}

	return n - game.count
}

states.actions = {
	prompt() {
		let avail = get_available_actions()

		view.prompt = `${lord_name[game.who]} has ${avail}x actions.`

		if (avail > 0)
			view.actions.pass = 1
		else
			view.actions.end_actions = 1

		if (is_lord_besieged(game.who)) {
			view.actions.sally = 1
		}

		else {
			if (game.active === TEUTONS) {
				if (has_flag(FLAG_FIRST_ACTION) && !has_flag(FLAG_USED_LEGATE) && is_located_with_legate(game.who))
					view.actions.use_legate = 1
			}

			march_prompt(avail)

			if (can_action_siege(avail))
				view.actions.siege = 1
			if (can_action_storm(avail))
				view.actions.storm = 1
			if (can_action_supply(avail))
				view.actions.supply = 1
			if (can_action_forage(avail))
				view.actions.forage = 1
			if (can_action_ravage(avail))
				view.actions.ravage = 1
			if (can_action_tax(avail))
				view.actions.tax = 1
			if (can_action_sail(avail))
				view.actions.sail = 1
		}
	},

	use_legate() {
		push_undo()
		log(`Used Legate for +1 Command.`)
		set_flag(FLAG_USED_LEGATE)
		set_delete(game.group, LEGATE)
		game.call_to_arms.legate = LEGATE_ARRIVED
	},
	pass() {
		push_undo()
		log("Passed.")
		spend_all_actions() // TODO: maybe only one action?
	},
	end_actions() {
		clear_undo()
		end_actions()
	},

	forage: do_action_forage,
	ravage: do_action_ravage,
	sail: do_action_sail,
	tax: do_action_tax,

	locale: march_action_locale,
	lord: march_action_lord,
	legate: march_action_legate,
}

// === ACTION: MARCH ===

function lift_siege(from) {
	if (has_siege_marker(from)) {
		log(`Lifted siege at %${from}.`)
		remove_all_siege_markers(from)
		for (let lord = first_enemy_lord; lord <= last_enemy_lord; ++lord)
			if (get_lord_locale(lord) === from && is_lord_besieged(lord))
				set_lord_besieged(lord, 0)
	}
}

function group_has_teutonic_converts() {
	if (game.active === TEUTONS) {
		if (is_first_march())
			if (group_has_capability(AOW_TEUTONIC_CONVERTS))
				if (count_group_forces(LIGHT_HORSE) > 0)
					return true
	}
	return false
}

function march_prompt(avail) {
	if (avail > 0 || group_has_teutonic_converts()) {
		let here = get_lord_locale(game.who)

		for (let [ to ] of data.locales[here].ways)
			gen_action_locale(to)

		view.group = game.group

		// 4.3.2 Marshals MAY take other lords
		if (is_marshal(game.who)) {
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
				if (lord !== game.who && !is_lower_lord(lord))
					if (get_lord_locale(lord) === here)
						gen_action_lord(lord)
		}

		// 1.4.1 Teutonic lords MAY take the Legate
		if (game.active === TEUTONS && is_located_with_legate(game.who)) {
			view.actions.legate = 1
		}
	}
}

function march_action_locale(to) {
	push_undo()
	let from = get_lord_locale(game.who)
	let ways = list_ways(from, to)
	if (ways.length > 2) {
		game.where = to
		game.state = "march_way"
	} else {
		game.where = to
		game.approach = ways[1]
		march_with_group_1()
	}
}

function march_action_lord(lord) {
	set_toggle(game.group, lord)
	if (is_upper_lord(lord))
		set_toggle(game.group, get_lower_lord(lord))
}

function march_action_legate() {
	set_toggle(game.group, LEGATE)
}

states.march_way = {
	prompt() {
		view.prompt = `March: Select way.`
		view.group = game.group
		let from = get_lord_locale(game.who)
		let to = game.where
		let ways = list_ways(from, to)
		for (let i = 1; i < ways.length; ++i)
			gen_action_way(ways[i])
	},
	way(way) {
		game.approach = way
		march_with_group_1()
	},
}

function march_with_group_1() {
	let way = game.approach
	let transport = count_group_transport(way)
	let prov = count_group_assets(PROV)
	let loot = count_group_assets(LOOT)

	if (group_has_teutonic_converts() && prov <= transport * 2)
		return march_with_group_2(false)

	if (prov > transport || loot > 0)
		game.state = 'march_laden'
	else
		march_with_group_2(false)
}

states.march_laden = {
	prompt() {
		let to = game.where
		let way = game.approach
		let transport = count_group_transport(way)
		let prov = count_group_assets(PROV)
		let loot = count_group_assets(LOOT)

		view.prompt = `March with ${loot} loot, ${prov} provender, and ${transport} transport.`
		view.group = game.group

		if (prov <= transport * 2) {
			if (loot > 0 || prov > transport) {
				let avail = get_available_actions()
				if (avail >= 2) {
					view.prompt += " Laden!"
					gen_action_laden_march(to)
				} else {
					view.prompt += " Laden with 1 action left."
				}
			} else {
				gen_action_locale(to)
			}
		} else {
			view.prompt += " Too much provender."
		}

		if (loot > 0 || prov > transport) {
			for_each_group_lord(lord => {
				if (loot > 0) {
					if (get_lord_assets(lord, LOOT) > 0)
						gen_action_loot(lord)
					if (prov > transport * 2)
						if (get_lord_assets(lord, PROV) > 0)
							gen_action_prov(lord)
				} else {
					if (prov > transport)
						if (get_lord_assets(lord, PROV) > 0)
							gen_action_prov(lord)
				}
			})
		}
	},
	prov(lord) {
		drop_prov(lord)
	},
	loot(lord) {
		drop_loot(lord)
	},
	laden_march(to) {
		march_with_group_2(true)
	},
	locale(to) {
		march_with_group_2(false)
	},
}

function march_with_group_2(laden) {
	let from = get_lord_locale(game.who)
	let way = game.approach
	let to = game.where

	if (group_has_teutonic_converts())
		spend_march_action(0)
	else if (laden)
		spend_march_action(2)
	else
		spend_march_action(1)

	if (data.ways[way].name)
		log(`Marched via ${data.ways[way].name} to %${to}.`)
	else
		log(`Marched to %${to}.`)

	for_each_group_lord(lord => {
		set_lord_locale(lord, to)
		set_lord_moved(lord, 1)
	})
	if (set_has(game.group, LEGATE)) {
		game.call_to_arms.legate = to
	}

	if (is_enemy_stronghold(from)) {
		lift_siege(from)
	}

	if (has_unbesieged_enemy_lord(to)) {
		set_active_enemy()
		game.save_group = game.group
		game.group = 0
		game.state = "approach"
	} else {
		game.state = "actions"
		march_with_group_3()
	}
}

function march_with_group_3() {
	let to = game.where

	if (is_unbesieged_enemy_stronghold(to)) {
		add_siege_marker(to)
		log(`Encamped.`)
		spend_all_actions() // ENCAMP
	}

	if (is_trade_route(to)) {
		conquer_trade_route(to)
	}
}

// === ACTION: MARCH - APPROACH - AVOID BATTLE / WITHDRAW ===

states.approach = {
	prompt() {
		view.prompt = `Approach: Avoid Battle, Withdraw, or Battle.`
	},
	battle() {
	},
}

function end_approach() {
	game.who = game.command
	game.group = game.save_group
	game.save_group = 0
	march_with_group_3()
}

// === ACTION: SIEGE ===

function can_action_siege(avail) {
	if (!is_first_action())
		return false
	return false
}

// === ACTION: STORM ===

function can_action_storm(avail) {
	if (avail < 1)
		return false
	return false
}

// === ACTION: SALLY ===

// === ACTION: SUPPLY ===

function can_action_supply(avail) {
	if (avail < 1)
		return false

	return false
}

// === ACTION: FORAGE ===

function can_action_forage(avail) {
	if (avail < 1)
		return false
	let here = get_lord_locale(game.who)
	if (has_ravaged_marker(here))
		return false
	if (current_season() === SUMMER)
		return true
	if (is_friendly_stronghold(here))
		return true
	return false
}

function do_action_forage() {
	push_undo()
	let here = get_lord_locale(game.who)
	log(`Foraged at %${here}`)
	add_lord_assets(game.who, PROV, 1)
	spend_action(1)
}

// === ACTION: RAVAGE ===

function has_not_used_teutonic_raiders() {
	return !has_flag(FLAG_TEUTONIC_RAIDERS)
}

function this_lord_has_teutonic_raiders() {
	if (game.active === TEUTONS)
		if (has_not_used_teutonic_raiders())
			if (lord_has_capability(game.who, AOW_TEUTONIC_RAIDERS))
				return count_lord_horses(game.who) > 0
	return false
}

function this_lord_has_russian_raiders() {
	if (game.active === RUSSIANS)
		if (lord_has_capability(game.who, AOW_RUSSIAN_RAIDERS))
			return get_lord_forces(game.who, LIGHT_HORSE) + get_lord_forces(game.who, ASIATIC_HORSE) > 0
	return false
}

function can_ravage_locale(loc) {
	return (
		is_enemy_territory(loc) &&
		!has_conquered_marker(loc) &&
		!has_ravaged_marker(loc) &&
		!is_friendly_locale(loc)
	)
}

function can_action_ravage(avail) {
	// TODO: cost 2 if enemy lord is adjacent (2nd ed)
	if (avail < 1)
		return false

	let here = get_lord_locale(game.who)

	if (can_ravage_locale(here))
		return true

	if (this_lord_has_teutonic_raiders()) {
		for (let there of data.locales[here].adjacent_by_trackway)
			if (can_ravage_locale(there) && !has_enemy_lord(there))
				return true
	}

	if (this_lord_has_russian_raiders()) {
		for (let there of data.locales[here].adjacent_by_trackway)
			if (can_ravage_locale(there) && !has_enemy_lord(there))
				return true
	}

	return false
}

function do_action_ravage() {
	push_undo()
	if (this_lord_has_teutonic_raiders() || this_lord_has_russian_raiders()) {
		game.state = "ravage"
	} else {
		let here = get_lord_locale(game.who)
		ravage_location(here, here)
	}
}

states.ravage = {
	prompt() {
		view.prompt = `Ravage: Choose enemy territory to ravage!`

		let here = get_lord_locale(game.who)

		if (can_ravage_locale(here))
			gen_action_locale(here)

		if (this_lord_has_teutonic_raiders()) {
			for (let there of data.locales[here].adjacent_by_trackway)
				if (can_ravage_locale(there) && !has_enemy_lord(there))
					gen_action_locale(there)
		}

		if (this_lord_has_russian_raiders()) {
			for (let there of data.locales[here].adjacent_by_trackway)
				if (can_ravage_locale(there) && !has_enemy_lord(there))
					gen_action_locale(there)
		}
	},
	locale(there) {
		let here = get_lord_locale(game.who)
		ravage_location(here, there)
		game.state = "actions"
	},
}

function ravage_location(here, there) {
	log(`Ravaged at %${there}.`)

	add_ravaged_marker(there)
	add_lord_assets(game.who, PROV, 1)

	if (here !== there && game.active === TEUTONS)
		set_flag(FLAG_TEUTONIC_RAIDERS)

	if (!is_region(there)) {
		// R12 Raiders - take no loot from adjacent
		if (here === there || game.active !== RUSSIANS)
			add_lord_assets(game.who, LOOT, 1)
	}

	spend_action(1)
}

// === ACTION: TAX ===

function can_action_tax(avail) {
	// Must use whole action
	if (!is_first_action())
		return false

	// Must have space left to hold Coin
	if (get_lord_assets(game.who, COIN) >= 8)
		return false

	// Must be at own seat
	return is_lord_at_seat(game.who);
}

function do_action_tax()  {
	push_undo()

	let here = get_lord_locale(game.who)
	log(`Taxed %${here}.`)

	add_lord_assets(game.who, COIN, 1)

	spend_all_actions()

	if (lord_has_capability(game.who, AOW_RUSSIAN_VELIKY_KNYAZ)) {
		push_state("veliky_knyaz")
		// TODO: restore mustered forces
		game.count = 2
	}
}

states.veliky_knyaz = states.muster_lord_transport

// === ACTION: SAIL ===

function drop_prov(lord) {
	log("Discarded Provender.")
	add_lord_assets(lord, PROV, -1)
}

function drop_loot(lord) {
	log("Discarded Loot.")
	add_lord_assets(lord, LOOT, -1)
}

function count_lord_ships(lord) {
	let ships = get_lord_assets(lord, SHIP)

	if (lord_has_capability(lord, AOW_TEUTONIC_COGS)) {
		ships *= 2
	}

	if (lord_has_capability(lord, AOW_RUSSIAN_LODYA)) {
		// TODO: one option or the other (only matters for supply)
		let boats = get_lord_assets(lord, BOAT)
		if (boats > 2)
			boats = 2
		ships += boats
	}

	return ships
}

function count_lord_boats(lord) {
	let boats = get_lord_assets(lord, BOAT)

	if (lord_has_capability(lord, AOW_RUSSIAN_LODYA)) {
		// TODO: one option or the other (only matters for supply)
		let ships = get_lord_assets(lord, SHIP)
		if (ships > 2)
			ships = 2
		if (boats * 2 > boats + ships)
			boats = boats * 2
		else
			boats = boats + ships
	}

	return boats
}

function has_enough_available_ships_for_horses() {
	let here = get_lord_locale(game.who)

	let horse_size = 1
	if (game.active === RUSSIANS)
		horse_size = 2

	let ships = count_lord_ships(game.who)
	let horses = count_lord_horses(game.who) * horse_size

	let lower = get_lower_lord(game.who)
	if (lower !== NOBODY) {
		ships += count_lord_ships(lower)
		horses += count_lord_horses(lower) * horse_size
	}

	if (is_marshal(game.who)) {
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
			if (lord !== game.who && !is_lower_lord(lord) && get_lord_locale(lord) === here) {
				let extra_ships = count_lord_ships(lord)
				let extra_horses = count_lord_horses(lord) * horse_size
				if (extra_ships >= extra_horses)
					ships += extra_ships - extra_horses
			}
		}
	}

	// TODO: share Cogs anywhere

	return ships >= horses
}

function can_action_sail(avail) {
	// Must use whole action
	if (!is_first_action())
		return false

	// at a seaport
	let here = get_lord_locale(game.who)
	if (!is_seaport(here))
		return false

	// during Rasputitsa or Summer
	let season = current_season()
	if (season !== SUMMER && season !== RASPUTITSA)
		return false

	// with enough ships to carry all the horses
	if (!has_enough_available_ships_for_horses())
		return false

	// TODO: and a valid destination

	return true
}

function do_action_sail() {
	push_undo()
	game.state = 'sail'
}

states.sail = {
	prompt() {
		view.group = game.group

		let here = get_lord_locale(game.who)
		let ships = count_group_ships()
		let horses = count_group_horses()
		let prov = count_group_assets(PROV)
		let loot = count_group_assets(LOOT)

		// TODO: share Cogs anywhere

		let overflow = 0
		let min_overflow = 0
		if (game.active === TEUTONS) {
			overflow = (horses + loot * 2 + prov) - ships
			min_overflow = horses - ships
		}
		if (game.active === RUSSIANS) {
			overflow = (horses * 2 + loot * 2 + prov) - ships
			min_overflow = horses * 2 - ships
		}

		if (overflow <= 0) {
			view.prompt = `Sail: Choose a destination Seaport.`
			for (let to of data.seaports) {
				if (to === here)
					continue
				if (!has_enemy_lord(to))
					gen_action_locale(to)
			}
		} else if (min_overflow <= 0) {
			view.prompt = `Sail: Discard Loot or Provender.`

			// TODO: how strict is greed?
			if (loot > 0 || prov > 0) {
				for_each_group_lord(lord => {
					if (loot > 0)
						if (get_lord_assets(lord, LOOT) > 0)
							gen_action_loot(lord)
					if (prov > 0)
						if (get_lord_assets(lord, PROV) > 0)
							gen_action_prov(lord)
				})
			}
		} else {
			view.prompt = `Sail: Too few ships to carry all the horses!`
		}

		// 4.3.2 Marshals MAY take other lords
		if (is_marshal(game.who)) {
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
				if (lord !== game.who && !is_lower_lord(lord))
					if (get_lord_locale(lord) === here)
						// TODO: toggle instead of undo, but then no discarding?
						if (!set_has(game.group, lord))
							gen_action_lord(lord)
		}

		// 1.4.1 Teutonic lords MAY take the Legate
		if (game.active === TEUTONS && is_located_with_legate(game.who)) {
			view.actions.legate = 1
		}

	},
	lord(lord) {
		// TODO: toggle instead of undo, unless we discarded loot/prov
		push_undo()
		set_toggle(game.group, lord)
		if (is_upper_lord(lord))
			set_toggle(game.group, get_lower_lord(lord))
	},
	legate() {
		set_toggle(game.group, LEGATE)
	},
	prov(lord) {
		push_undo()
		drop_prov(lord)
	},
	loot(lord) {
		push_undo()
		drop_loot(lord)
	},
	locale(to) {
		push_undo()
		log(`Sailed to %${to}.`)

		if (is_trade_route(to))
			conquer_trade_route(to)

		if (is_unbesieged_enemy_stronghold(to))
			add_siege_marker(to)

		for_each_group_lord(lord => {
			set_lord_locale(lord, to)
			set_lord_moved(lord, 1)
		})
		if (set_has(game.group, LEGATE)) {
			game.call_to_arms.legate = to
		}

		spend_all_actions()

		game.state = "actions"
	},
}

// === CAMPAIGN: FEED ===

function can_feed_from_shared(lord) {
	let loc = get_lord_locale(lord)
	return get_shared_assets(loc, PROV) > 0 || get_shared_assets(loc, LOOT) > 0
}

function has_friendly_lord_who_must_feed() {
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (is_lord_unfed(lord))
			return true
	return false
}

function goto_feed() {
	// Count how much food each lord needs
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
		if (get_lord_moved(lord)) {
			if (count_lord_forces(lord) >= 7)
				set_lord_unfed(lord, 2)
			else
				set_lord_unfed(lord, 1)
		} else {
			set_lord_unfed(lord, 0)
		}
	}

	game.state = "feed"
	if (!has_friendly_lord_who_must_feed())
		end_feed()
}

states.feed = {
	prompt() {
		view.prompt = "Feed: You must Feed lords who Moved or Fought."

		let done = true

		// Feed from own mat
		if (done) {
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
				if (is_lord_unfed(lord)) {
					if (get_lord_assets(lord, PROV) > 0) {
						gen_action_prov(lord)
						done = false
					}
					if (get_lord_assets(lord, LOOT) > 0) {
						gen_action_loot(lord)
						done = false
					}
				}
			}
		}

		// Sharing
		if (done) {
			view.prompt = "You must Feed lords who Moved or Fought (shared)."
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
				if (is_lord_unfed(lord) && can_feed_from_shared(lord)) {
					gen_action_lord(lord)
					done = false
				}
			}
		}

		// Unfed
		if (done) {
			view.prompt = "You must shift the Service of any unfed lords."
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
				if (is_lord_unfed(lord)) {
					gen_action_service(lord)
					done = false
				}
			}
		}

		// All done!
		if (done) {
			view.prompt = "Feed: All done."
			view.actions.end_feed = 1
		}
	},
	prov(lord) {
		push_undo()
		log(`Fed L${lord}.`)
		add_lord_assets(lord, PROV, -1)
		feed_lord(lord)
	},
	loot(lord) {
		push_undo()
		log(`Fed L${lord} with Loot.`)
		add_lord_assets(lord, LOOT, -1)
		feed_lord(lord)
	},
	lord(lord) {
		push_undo()
		game.who = lord
		game.state = "feed_lord_shared"
	},
	service(lord) {
		push_undo()
		log(`Unfed L${lord}.`)
		add_lord_service(lord, -1)
		set_lord_unfed(lord, 0)
	},
	end_feed() {
		clear_undo()
		end_feed()
	},
}

function resume_feed_lord_shared() {
	if (!is_lord_unfed(game.who) || !can_feed_from_shared(game.who)) {
		game.who = NOBODY
		game.state = 'feed'
	}
}

states.feed_lord_shared = {
	prompt() {
		view.prompt = `Feed: You must Feed ${lord_name[game.who]} shared Loot or Provender.`
		let loc = get_lord_locale(game.who)
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
			if (get_lord_locale(lord) === loc) {
				if (get_lord_assets(lord, PROV) > 0)
					gen_action_prov(lord)
				if (get_lord_assets(lord, LOOT) > 0)
					gen_action_loot(lord)
			}
		}
	},
	prov(lord) {
		push_undo()
		log(`Fed L${game.who} from L${lord}.`)
		add_lord_assets(lord, PROV, -1)
		feed_lord(game.who)
		resume_feed_lord_shared()
	},
	loot(lord) {
		push_undo()
		log(`Fed L${game.who} with Loot from L${lord}.`)
		add_lord_assets(lord, LOOT, -1)
		feed_lord(game.who)
		resume_feed_lord_shared()
	},
}

function end_feed() {
	clear_undo()
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

function can_pay_lord(lord) {
	if (game.active === RUSSIANS) {
		if (game.call_to_arms.veche_coin > 0 && !is_lord_besieged(lord))
			return true
	}
	let loc = get_lord_locale(lord)
	if (get_shared_assets(loc, COIN) > 0)
		return true
	if (is_friendly_locale(loc))
		if (get_shared_assets(loc, LOOT) > 0)
			return true
	return false
}

function has_friendly_lord_who_may_be_paid() {
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (is_lord_on_map(lord) && can_pay_lord(lord))
			return true
	return false
}

function goto_pay() {
	game.state = "pay"
	if (!has_friendly_lord_who_may_be_paid())
		end_pay()
}

states.pay = {
	prompt() {
		view.prompt = "Pay: You may Pay your Lords."
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (is_lord_on_map(lord) && can_pay_lord(lord))
				gen_action_lord(lord)
		view.actions.end_pay = 1
	},
	lord(lord) {
		push_undo()
		push_state("pay_lord")
		game.who = lord
	},
	end_pay() {
		push_undo()
		end_pay()
	},
}

states.pay_lord = {
	prompt() {
		view.prompt = `Pay: You may Pay ${lord_name[game.who]} with Coin or Loot.`

		if (game.active === RUSSIANS) {
			if (game.call_to_arms.veche_coin > 0 && !is_lord_besieged(game.who))
				view.actions.veche_coin = 1
		}

		let loc = get_lord_locale(game.who)
		let pay_with_loot = is_friendly_locale(loc)
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
			if (get_lord_locale(lord) === loc) {
				if (get_lord_assets(lord, COIN) > 0)
					gen_action_coin(lord)
				if (pay_with_loot && get_lord_assets(lord, LOOT) > 0)
					gen_action_loot(lord)
			}
		}
	},
	loot(lord) {
		if (game.who === lord)
			log(`Paid L${game.who} with Loot.`)
		else
			log(`Paid L${game.who} with Loot from L${lord}.`)
		add_lord_assets(lord, LOOT, -1)
		add_lord_service(game.who, 1)
		pop_state()
	},
	coin(lord) {
		if (game.who === lord)
			log(`Paid L${game.who} with Coin.`)
		else
			log(`Paid L${game.who} with Coin from L${lord}.`)
		add_lord_assets(lord, COIN, -1)
		add_lord_service(game.who, 1)
		pop_state()
	},
	veche_coin() {
		log(`Paid L${game.who} with Coin from Veche.`)
		game.call_to_arms.veche_coin--
		add_lord_service(game.who, 1)
		pop_state()
	},
}

function end_pay() {
	// NOTE: We can combine Pay & Disband steps because disband is mandatory only.
	goto_disband()
}

// === LEVY & CAMPAIGN: DISBAND ===

function has_friendly_lord_who_must_disband() {
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (is_lord_on_map(lord) && get_lord_service(lord) <= current_turn())
			return true
	return false
}

function goto_disband() {
	game.state = "disband"
	if (!has_friendly_lord_who_must_disband())
		end_disband()
}

function disband_lord(lord) {
	if (get_lord_service(lord) < current_turn()) {
		log(`Disbanded L${lord} beyond service limit`)
		set_lord_locale(lord, NOWHERE)
		set_lord_service(lord, NEVER)
	} else {
		log(`Disbanded L${lord}`)
		let turn = current_turn() + data.lords[lord].service
		set_lord_locale(lord, CALENDAR + turn)
		set_lord_service(lord, turn)
	}

	remove_lieutenant(lord)

	set_lord_capability(lord, 0, NOTHING)
	set_lord_capability(lord, 1, NOTHING)
	game.lords.assets[lord] = 0
	game.lords.forces[lord] = 0
	game.lords.routed[lord] = 0

	set_lord_besieged(lord, 0)
	set_lord_moved(lord, 0)

	for (let v of data.lords[lord].vassals)
		game.lords.vassals[v] = VASSAL_UNAVAILABLE

	// TODO: check lifted siege
}

states.disband = {
	prompt() {
		view.prompt = "Disband: You must Disband Lords at their Service limit."
		let done = true
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
			if (is_lord_on_map(lord) && get_lord_service(lord) <= current_turn()) {
				gen_action_lord(lord)
				done = false
			}
		}
		if (done)
			view.actions.end_disband = 1
	},
	lord(lord) {
		disband_lord(lord)
	},
	end_disband() {
		end_disband()
	},
}

function end_disband() {
	clear_undo()
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
		game.events = game.events.filter((c) => data.cards[c].when !== "this_campaign")

	clear_lords_moved()
	goto_command_activation()
}

// === GAME OVER ===

function goto_game_over(result, victory) {
	game.state = "game_over"
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
	},
}

exports.resign = function (state, current) {
	load_state(state)
	if (game.state !== "game_over") {
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
	if (game.log.length > 0 && game.log[game.log.length - 1] !== "")
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

function gen_action_way(way) {
	gen_action("way", way)
}

function gen_action_locale(locale) {
	gen_action("locale", locale)
}

function gen_action_laden_march(locale) {
	gen_action("laden_march", locale)
}

function gen_action_lord(lord) {
	gen_action("lord", lord)
}

function gen_action_service(service) {
	gen_action("service", service)
}

function gen_action_vassal(vassal) {
	gen_action("vassal", vassal)
}

function gen_action_card(c) {
	gen_action("card", c)
}

function gen_action_plan(lord) {
	gen_action("plan", lord)
}

function gen_action_prov(lord) {
	gen_action("prov", lord)
}

function gen_action_coin(lord) {
	gen_action("coin", lord)
}

function gen_action_loot(lord) {
	gen_action("loot", lord)
}

exports.view = function (state, current) {
	load_state(state)

	view = {
		prompt: null,
		actions: null,
		log: game.log,

		turn: game.turn,
		events: game.events,
		capabilities: game.capabilities,

		lords: game.lords,
		locales: game.locales,
		call_to_arms: game.call_to_arms,

		command: game.command,
		hand: null,
	}

	if (current === P1)
		view.hand = game.hand1
	if (current === P2)
		view.hand = game.hand2

	if (game.state === "game_over") {
		view.prompt = game.victory
	} else if (current === "Observer" || (game.active !== current && game.active !== BOTH)) {
		let inactive = states[game.state].inactive || game.state
		view.prompt = `Waiting for ${game.active} \u2014 ${inactive}...`
	} else {
		view.actions = {}
		view.who = game.who
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
		if (action === "undo" && game.undo && game.undo.length > 0)
			pop_undo()
		else
			throw new Error("Invalid action: " + action)
	}
	return game
}

// === COMMON TEMPLATE ===

function random(range) {
	// https://www.ams.org/journals/mcom/1999-68-225/S0025-5718-99-00996-5/S0025-5718-99-00996-5.pdf
	return (game.seed = (game.seed * 200105) % 34359738337) % range
}

// Packed array of small numbers in one word

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

function pack1_set(word, n, x) {
	return (word & ~(1 << n)) | (x << n)
}

function pack2_set(word, n, x) {
	n = n << 1
	return (word & ~(3 << n)) | (x << n)
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
	return (game.seed = (game.seed * 200105) % 34359738337) % range
}

function random_bigint(range) {
	// Largest MLCG that will fit its state in a double.
	// Uses BigInt for arithmetic, so is an order of magnitude slower.
	// https://www.ams.org/journals/mcom/1999-68-225/S0025-5718-99-00996-5/S0025-5718-99-00996-5.pdf
	// m = 2**53 - 111
	return (game.seed = Number((BigInt(game.seed) * 5667072534355537n) % 9007199254740881n)) % range
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

function array_remove_item(array, item) {
	let n = array.length
	for (let i = 0; i < n; ++i)
		if (array[i] === item)
			return array_remove(array, i)
}

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
		array[i] = array[i - 2]
		array[i + 1] = array[i - 1]
	}
	array[index] = key
	array[index + 1] = value
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
		let x = map[m << 1]
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
		let x = map[m << 1]
		if (key < x)
			b = m - 1
		else if (key > x)
			a = m + 1
		else
			return map[(m << 1) + 1]
	}
	return missing
}

function map_set(map, key, value) {
	let a = 0
	let b = (map.length >> 1) - 1
	while (a <= b) {
		let m = (a + b) >> 1
		let x = map[m << 1]
		if (key < x)
			b = m - 1
		else if (key > x)
			a = m + 1
		else {
			map[(m << 1) + 1] = value
			return
		}
	}
	array_insert_pair(map, a << 1, key, value)
}

function map_delete(map, item) {
	let a = 0
	let b = (map.length >> 1) - 1
	while (a <= b) {
		let m = (a + b) >> 1
		let x = map[m << 1]
		if (item < x)
			b = m - 1
		else if (item > x)
			a = m + 1
		else {
			array_remove_pair(map, m << 1)
			return
		}
	}
}

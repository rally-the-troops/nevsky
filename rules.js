"use strict"

// TODO: delay pay step if there is no feed or disband to be done

// TODO: Lodya capability during supply!
// TODO: 2nd edition supply rule - no reuse of transports
// TODO: 2nd edition ravage cost
// TODO: 2nd edition disband during campaign

// TODO: click on summer crusaders to muster them
// TODO: click on summer crusaders to restore them

// CAPABILITIES
// TODO: Ransom (T)
// TODO: Ransom (R)
// TODO: Hillforts

// TODO: BATTLE + STORM + SALLY

// TODO: remove push_state/pop_state stuff - use explicit substates with common functions instead

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

const first_lord = 0
const last_lord = lord_count - 1

const first_p1_locale = 0
const last_p1_locale = 23
const first_p2_locale = 24
const last_p2_locale = 52
const first_locale = 0
const last_locale = 52

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

// Misc tracking flags
const FLAG_FIRST_ACTION = 1 << 0
const FLAG_FIRST_MARCH = 1 << 1
const FLAG_TEUTONIC_RAIDERS = 1 << 2

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

function is_in_rus(loc) {
	return data.locales[loc].region === "Novgorodan Rus"
}

function is_in_livonia(loc) {
	return data.locales[loc].region === "Crusader Livonia"
}

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

function get_spoils(type) {
	return pack4_get(game.spoils, type)
}

function set_spoils(type, n) {
	game.spoils = pack4_set(game.spoils, type, n)
}

function add_spoils(type, n) {
	game.spoils = pack4_set(game.spoils, type, pack4_get(game.spoils) + n)
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

function slide_lord_cylinder(lord, dir) {
	set_lord_locale(lord, get_lord_locale(lord) + dir)
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

function count_shared_boats() {
	let here = get_lord_locale(game.command)
	let n = 0
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (get_lord_locale(lord) === here)
			n += count_lord_boats(lord)
	return n
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

function count_shared_ships() {
	let here = get_lord_locale(game.command)
	let n = 0
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (get_lord_locale(lord) === here)
			n += count_lord_ships(lord)
	return n
}

function count_shared_cogs_not_in_group() {
	let n = 0
	if (game.active === TEUTONS) {
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (lord_has_capability(lord, AOW_TEUTONIC_COGS))
				if (!set_has(game.group, lord)) // not already counted for
					n += get_lord_assets(lord, SHIP) * 2
	}
	return n
}

function count_shared_cogs_not_in_locale(here) {
	let n = 0
	if (game.active === TEUTONS) {
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (lord_has_capability(lord, AOW_TEUTONIC_COGS))
				if (get_lord_locale(lord) !== here)
					n += get_lord_assets(lord, SHIP) * 2
	}
	return n
}

function count_group_ships() {
	let n = 0
	for (let lord of game.group)
		n += count_lord_ships(lord)
	return n
}

function count_group_assets(asset) {
	let n = 0
	for (let lord of game.group)
		n += get_lord_assets(lord, asset)
	return n
}

function count_group_forces(type) {
	let n = 0
	for (let lord of game.group)
		n += count_lord_forces(lord, type)
	return n
}

function count_group_horses() {
	let n = 0
	for (let lord of game.group)
		n += count_lord_horses(lord)
	return n
}

function count_group_transport(type) {
	let n = 0
	for (let lord of game.group)
		n += count_lord_transport(lord, type)
	return n
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

function is_special_vassal_available(vassal) {
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

function for_each_seat(lord, fn, repeat = false) {
	let list = data.lords[lord].seats

	for (let seat of list)
		fn(seat)

	if (is_teutonic_lord(lord)) {
		if (has_global_capability(AOW_TEUTONIC_ORDENSBURGEN)) {
			for (let commandery of COMMANDERIES)
				if (repeat || !set_has(list, commandery))
					fn(commandery)
		}
	}

	if (is_russian_lord(lord)) {
		if (has_global_capability(AOW_RUSSIAN_ARCHBISHOPRIC))
			if (repeat || !set_has(list, LOC_NOVGOROD))
				fn(LOC_NOVGOROD)
	}

	if (lord === LORD_YAROSLAV) {
		if (has_conquered_marker(LOC_PSKOV))
			if (repeat || !set_has(list, LOC_PSKOV))
				fn(LOC_PSKOV)
	}
}

function is_lord_seat(lord, here) {
	let result = false
	for_each_seat(lord, seat => {
		if (seat === here)
			result = true
	})
	return result
}

function is_lord_at_seat(lord) {
	return is_lord_seat(lord, get_lord_locale(lord))
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

function has_unbesieged_friendly_lord(loc) {
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
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

function is_fort(loc) {
	return data.locales[loc].type === "fort"
}

function is_town(loc) {
	return data.locales[loc].type === "town"
}

function is_city(loc) {
	return data.locales[loc].type === "city"
}

function is_region(loc) {
	return data.locales[loc].type === "region"
}

function is_stronghold(loc) {
	return data.locales[loc].stronghold > 0
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

function count_castles(loc) {
	return game.locales.castles1.length + game.locales.castles2.length
}

function add_friendly_castle(loc) {
	// only P1 can add
	set_add(game.locales.castles1, loc)
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

function has_castle(loc) {
	return (
		set_has(game.locales.castles1, loc) ||
		set_has(game.locales.castles2, loc)
	)
}

function has_conquered_stronghold(loc) {
	return is_stronghold(loc) && has_conquered_marker(loc)
}

function is_friendly_stronghold_locale(loc) {
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

function is_friendly_stronghold(loc) {
	if (is_stronghold(loc)) {
		if (is_friendly_territory(loc) && !has_conquered_marker(loc))
			return true
		if (is_enemy_territory(loc) && has_conquered_marker(loc))
			return true
	}
	if (has_friendly_castle(loc))
		return true
	return false
}

function is_unbesieged_enemy_stronghold(loc) {
	return is_enemy_stronghold(loc) && !has_siege_marker(loc)
}

function is_unbesieged_friendly_stronghold(loc) {
	return is_friendly_stronghold(loc) && !has_siege_marker(loc)
}

function is_besieged_enemy_stronghold(loc) {
	return is_enemy_stronghold(loc) && has_siege_marker(loc)
}

function is_besieged_friendly_stronghold(loc) {
	return is_friendly_stronghold(loc) && has_siege_marker(loc)
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


function count_lord_transport(lord, type) {
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
	return get_lord_locale(lord) === game.nevsky.legate
}

function group_has_capability(c) {
	for (let lord of game.group)
		if (lord_has_capability(lord, c))
			return true
	return false
}

// === SETUP ===

function setup_lord_on_calendar(lord, turn) {
	set_lord_locale(lord, CALENDAR + turn)
}

function muster_lord_forces(lord) {
	let info = data.lords[lord]
	set_lord_forces(lord, KNIGHTS, info.forces.knights | 0)
	set_lord_forces(lord, SERGEANTS, info.forces.sergeants | 0)
	set_lord_forces(lord, LIGHT_HORSE, info.forces.light_horse | 0)
	set_lord_forces(lord, ASIATIC_HORSE, info.forces.asiatic_horse | 0)
	set_lord_forces(lord, MEN_AT_ARMS, info.forces.men_at_arms | 0)
	set_lord_forces(lord, MILITIA, info.forces.militia | 0)
	set_lord_forces(lord, SERFS, info.forces.serfs | 0)
}

function muster_vassal_forces(lord, vassal) {
	let info = data.vassals[vassal]
	add_lord_forces(lord, KNIGHTS, info.forces.knights | 0)
	add_lord_forces(lord, SERGEANTS, info.forces.sergeants | 0)
	add_lord_forces(lord, LIGHT_HORSE, info.forces.light_horse | 0)
	add_lord_forces(lord, ASIATIC_HORSE, info.forces.asiatic_horse | 0)
	add_lord_forces(lord, MEN_AT_ARMS, info.forces.men_at_arms | 0)
	add_lord_forces(lord, MILITIA, info.forces.militia | 0)
	add_lord_forces(lord, SERFS, info.forces.serfs | 0)
}

function restore_lord_forces(lord, type, count) {
	if (get_lord_forces(lord, type) < count) {
		set_lord_forces(lord, type, count)
		return 1
	}
	return 0
}

function restore_vassal_forces(lord, vassal) {
	let info = data.vassals[vassal]
	let restored = 0
	restored |= restore_lord_forces(lord, KNIGHTS, info.forces.knights | 0)
	restored |= restore_lord_forces(lord, SERGEANTS, info.forces.sergeants | 0)
	restored |= restore_lord_forces(lord, LIGHT_HORSE, info.forces.light_horse | 0)
	restored |= restore_lord_forces(lord, ASIATIC_HORSE, info.forces.asiatic_horse | 0)
	restored |= restore_lord_forces(lord, MEN_AT_ARMS, info.forces.men_at_arms | 0)
	restored |= restore_lord_forces(lord, MILITIA, info.forces.militia | 0)
	restored |= restore_lord_forces(lord, SERFS, info.forces.serfs | 0)
	return restored > 0
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

	muster_lord_forces(lord)

	for (let v of info.vassals) {
		if (is_special_vassal_available(v))
			game.lords.vassals[v] = VASSAL_READY
		else
			game.lords.vassals[v] = VASSAL_UNAVAILABLE
	}
}

function disband_vassal(vassal) {
	let info = data.vassals[vassal]
	let lord = data.vassals[vassal].lord

	logi(`Disbanded ${info.name}.`)

	add_lord_forces(lord, KNIGHTS, -(info.forces.knights | 0))
	add_lord_forces(lord, SERGEANTS, -(info.forces.sergeants | 0))
	add_lord_forces(lord, LIGHT_HORSE, -(info.forces.light_horse | 0))
	add_lord_forces(lord, ASIATIC_HORSE, -(info.forces.asiatic_horse | 0))
	add_lord_forces(lord, MEN_AT_ARMS, -(info.forces.men_at_arms | 0))
	add_lord_forces(lord, MILITIA, -(info.forces.militia | 0))
	add_lord_forces(lord, SERFS, -(info.forces.serfs | 0))

	game.lords.vassals[v] = VASSAL_READY
}

function muster_vassal(lord, vassal) {
	game.lords.vassals[vassal] = VASSAL_MUSTERED
	muster_vassal_forces(lord, vassal)
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

		nevsky: {
			legate: LEGATE_INDISPOSED,
			legate_selected: 0,
			veche_vp: 0,
			veche_coin: 0,
			smerdi: 0,
		},

		flags: 0,
		command: NOBODY,
		actions: 0,
		group: 0,
		who: NOBODY,
		where: NOWHERE,
		what: NOTHING,
		count: 0,

		approach: 0,
		avoid: 0,
		spoils: 0,
		supply: 0,
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

	game.nevsky.veche_vp = 1

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

	game.nevsky.veche_vp = 1
	game.nevsky.veche_coin = 1

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

	game.nevsky.veche_vp = 4
	game.nevsky.veche_coin = 3

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

	game.nevsky.veche_vp = 3
	game.nevsky.veche_coin = 2

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

	game.nevsky.veche_vp = 3
	game.nevsky.veche_coin = 2

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

	game.nevsky.veche_vp = 1
	game.nevsky.veche_coin = 0

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
	game.nevsky.legate = LOC_DORPAT

	set_add(game.capabilities, R8)
	muster_lord(LORD_DOMASH, LOC_NOVGOROD)
	add_lord_assets(LORD_DOMASH, BOAT, 2)
	add_lord_assets(LORD_DOMASH, CART, 2)

	muster_vassal(LORD_GAVRILO, data.lords[LORD_GAVRILO].vassals[0])
	set_lord_capability(LORD_GAVRILO, 0, R2)
	set_lord_capability(LORD_GAVRILO, 1, R6)

	game.nevsky.veche_coin += 1

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

		// TODO: clean up these transitions
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

// === EVENTS ===

function is_event_in_play(c) {
	return set_has(game.events, c)
}

// === CAPABILITIES ===

function can_deploy_global_capability(c) {
	if (c === AOW_TEUTONIC_WILLIAM_OF_MODENA) {
		return !is_event_in_play(R15) // Death of the Pope
	}
	return true
}

function has_global_capability(cap) {
	return set_has(game.capabilities, cap)
}

function deploy_global_capability(c) {
	set_add(game.capabilities, c)

	if (c === AOW_TEUTONIC_WILLIAM_OF_MODENA) {
		game.nevsky.legate = LEGATE_ARRIVED
	}

	if (c === AOW_TEUTONIC_CRUSADE) {
		for (let v of data.summer_crusaders)
			game.lords.vassals[v] = VASSAL_READY
		muster_summer_crusaders()
	}

	if (c === AOW_RUSSIAN_SMERDI) {
		game.nevsky.smerdi = 6
	}

	if (c === AOW_RUSSIAN_STEPPE_WARRIORS) {
		for (let v of data.steppe_warriors)
			game.lords.vassals[v] = VASSAL_READY
	}
}

function discard_global_capability(c) {
	set_delete(game.capabilities, c)

	if (c === AOW_TEUTONIC_WILLIAM_OF_MODENA) {
		game.nevsky.legate = LEGATE_INDISPOSED
	}

	if (c === AOW_TEUTONIC_CRUSADE) {
		for (let v of data.summer_crusaders) {
			if (is_vassal_mustered(v))
				disband_vassal(v)
			game.lords.vassals[v] = VASSAL_UNAVAILABLE
		}
	}

	if (c === AOW_RUSSIAN_SMERDI) {
		game.nevsky.smerdi = 0
	}

	if (c === AOW_RUSSIAN_STEPPE_WARRIORS) {
		for (let v of data.steppe_warriors) {
			if (is_vassal_mustered(v))
				disband_vassal(v)
			game.lords.vassals[v] = VASSAL_UNAVAILABLE
		}
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

states.levy_arts_of_war_first = {
	prompt() {
		let c = game.what[0]
		view.show_arts_of_war = game.what
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
		push_undo()
		let c = game.what.shift()
		logi(`C${c} - L${lord}`)
		add_lord_capability(lord, c)
		resume_levy_arts_of_war_first()
	},
	deploy() {
		push_undo()
		let c = game.what.shift()
		logi(`C${c}`)
		deploy_global_capability(c)
		resume_levy_arts_of_war_first()
	},
	discard() {
		push_undo()
		let c = game.what.shift()
		logi(`C${c} - discarded`)
		resume_levy_arts_of_war_first()
	},
}

function end_levy_arts_of_war_first() {
	clear_undo()
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

	restore_summer_crusaders()
	muster_summer_crusaders()
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
			let season = current_season()
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
				// NOTE: Summer Crusaders muster specially
				if (game.active === TEUTONS && set_has(data.summer_crusaders, vassal))
					continue
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
			if (is_friendly_locale(seat))
				gen_action_locale(seat)
		})
	},
	locale(loc) {
		push_undo()
		logii(`at %${loc}`)

		// TODO: clean up these transitions
		set_lord_moved(game.who, 1)
		muster_lord(game.who, loc)
		muster_summer_crusaders()
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
						if (can_deploy_global_capability(c))
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
			deploy_global_capability(c)
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
	if (game.active === TEUTONS)
		goto_teutonic_call_to_arms()
	else
		goto_russian_call_to_arms()
}

function end_levy_call_to_arms() {
	set_active_enemy()
	if (game.active === P2)
		goto_levy_call_to_arms()
	else
		goto_levy_discard_events()
}

function goto_levy_discard_events() {

	// Discard "This Levy" events from play.
	if (game.events.length > 0)
		game.events = game.events.filter((c) => data.cards[c].when !== "this_levy")

	set_active(P1)
	goto_capability_discard()
}

// === LEVY: CALL TO ARMS - PAPAL LEGATE ===

function goto_teutonic_call_to_arms() {
	log_h2("Call to Arms - Papal Legate")
	if (has_global_capability(AOW_TEUTONIC_WILLIAM_OF_MODENA)) {
		if (game.nevsky.legate === LEGATE_ARRIVED)
			game.state = "papal_legate_arrives"
		else
			game.state = "papal_legate_active"
	} else {
		log("Skipped.")
		end_levy_call_to_arms()
	}
}

states.papal_legate_arrives = {
	prompt() {
		view.prompt = "Papal Legate Arrives: Place the Legate at any Bishopric."
		for (let loc of data.bishoprics)
			// NOTE: Legate would immediately be removed here per the ENDANGERED rule, so don't allow placing?
			if (!has_enemy_lord(loc) || has_friendly_lord(loc))
				gen_action_locale(loc)
	},
	locale(loc) {
		push_undo()
		log(`Legate arrived at %${loc}.`)
		game.nevsky.legate = loc
		game.state = "papal_legate_active"
	},
}

states.papal_legate_active = {
	prompt() {
		view.prompt = "Papal Legate: You may move or use the Legate."

		view.actions.end_call_to_arms = 1

		let here = game.nevsky.legate

		// Move to friendly locale
		for (let loc = first_locale; loc <= last_locale; ++loc)
			if (loc !== here && is_friendly_locale(loc))
				gen_action_locale(loc)

		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
			// Seat of a Ready Lord without rolling
			if (is_lord_ready(lord)) {
				gen_action_lord(lord)
			}

			// Seat of a Lord on the Calendar
			else if (is_lord_on_calendar(lord)) {
				if (is_lord_seat(lord, here))
					gen_action_lord(lord)
			}

			// At a Friendly Locale with a Lord
			else if (is_lord_on_map(lord)) {
				if (get_lord_locale(lord) === here && is_friendly_locale(here))
					gen_action_lord(lord)
			}
		}
	},
	locale(loc) {
		push_undo()
		log(`Legate moved to %${loc}.`)
		game.nevsky.legate = loc
		game.state = "papal_legate_done"
	},
	lord(lord) {
		push_undo()

		game.nevsky.legate = LEGATE_ARRIVED
		game.state = "papal_legate_done"

		let here = game.nevsky.legate

		if (is_lord_ready(lord)) {
			log(`Mustered L${lord}`)
			logii(`at %${here}`)

			// TODO: clean up these transitions
			muster_lord(lord, here)
			muster_summer_crusaders()
			push_state("muster_lord_transport")
			game.who = lord
			game.count = data.lords[lord].assets.transport | 0
			resume_muster_lord_transport()
		}

		else if (is_lord_on_calendar(lord)) {
			log(`Slid L${lord} one box left.`)
			slide_lord_cylinder(lord, -1)
		}

		else {
			log_h3(`L${lord} at %${get_lord_locale(lord)}`)
			push_state("levy_muster_lord")
			game.who = lord
			game.count = data.lords[lord].lordship
		}
	},
	end_call_to_arms() {
		clear_undo()
		end_levy_call_to_arms()
	},
}

states.papal_legate_done = {
	prompt() {
		view.prompt = "Papal Legate: All done."
		view.actions.end_call_to_arms = 1
	},
	end_call_to_arms() {
		clear_undo()
		end_levy_call_to_arms()
	},
}

// === LEVY: CALL TO ARMS - NOVGOROD VECHE  ===

function count_all_teutonic_ships() {
	let n = 0
	for (let lord = first_p1_lord; lord <= last_p1_lord; ++lord)
		if (is_lord_on_map())
			n += count_lord_ships(lord)
	return n
}

function count_all_russian_ships() {
	let n = 0
	for (let lord = first_p2_lord; lord <= last_p2_lord; ++lord)
		if (is_lord_on_map())
			n += count_lord_ships(lord)
	return n
}

function goto_russian_call_to_arms() {
	log_h2("Call to Arms - Novgorod Veche")
	goto_black_sea_trade()
}

function goto_black_sea_trade() {
	if (has_global_capability(AOW_RUSSIAN_BLACK_SEA_TRADE)) {
		if (!has_conquered_marker(LOC_NOVGOROD) && !has_conquered_marker(LOC_LOVAT)) {
			if (game.nevsky.veche_coin < 8) {
				game.state = "black_sea_trade"
				return
			}
		}
	}
	goto_baltic_sea_trade()
}

states.black_sea_trade = {
	prompt() {
		view.prompt = "Call to Arms: Black Sea Trade"
		view.actions.veche = 1
	},
	veche() {
		log("Black Sea Trade added 1 coin to Veche.")
		game.nevsky.veche_coin += 1
		goto_baltic_sea_trade()
	},
}

function goto_baltic_sea_trade() {
	if (has_global_capability(AOW_RUSSIAN_BALTIC_SEA_TRADE)) {
		if (!has_conquered_marker(LOC_NOVGOROD) && !has_conquered_marker(LOC_NEVA)) {
			if (count_all_teutonic_ships() <= count_all_russian_ships()) {
				if (game.nevsky.veche_coin < 8) {
					game.state = "baltic_sea_trade"
					return
				}
			}
		}
	}
	goto_novgorod_veche()
}

states.baltic_sea_trade = {
	prompt() {
		view.prompt = "Call to Arms: Baltic Sea Trade"
		view.actions.veche = 1
	},
	veche() {
		if (game.nevsky.veche_coin === 7) {
			log("Baltic Sea Trade added 1 coin to Veche.")
			game.nevsky.veche_coin += 1
		} else {
			log("Baltic Sea Trade added 2 coins to Veche.")
			game.nevsky.veche_coin += 2
		}
		goto_novgorod_veche()
	},
}

function goto_novgorod_veche() {
	if (game.nevsky.veche_vp > 0 || is_lord_ready(LORD_ALEKSANDR) || is_lord_ready(LORD_ANDREY)) {
		game.state = "novgorod_veche"
	} else {
		end_levy_call_to_arms()
	}
}

states.novgorod_veche = {
	prompt() {
		view.prompt = "Novgorod Veche: Take one action with the Veche."
		view.actions.end_call_to_arms = 1

		if (is_lord_ready(LORD_ALEKSANDR) || is_lord_ready(LORD_ANDREY)) {
			if (game.nevsky.veche_vp < 8)
				view.actions.delay = 1
		}

		if (game.nevsky.veche_vp > 0) {
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
				if (is_lord_on_calendar(lord) || is_lord_at_friendly_locale(lord))
					gen_action_lord(lord)
		}
	},
	delay() {
		push_undo()
		log("Added 1VP to Veche.")
		game.state = "novgorod_veche_done"

		view.actions.veche_vp += 1
		if (is_lord_ready(LORD_ALEKSANDR)) {
			log(`Delayed L${LORD_ALEKSANDR}.`)
			slide_lord_cylinder(LORD_ALEKSANDR, 1)
		}
		if (is_lord_ready(LORD_ANDREY)) {
			log(`Delayed L${LORD_ANDREY}.`)
			slide_lord_cylinder(LORD_ANDREY, 1)
		}
	},
	lord(lord) {
		push_undo()
		log("Removed 1VP from Veche.")
		game.nevsky.veche_vp -= 1
		game.state = "novgorod_veche_done"

		if (is_lord_ready(lord)) {
			log(`Mustered L${lord}`)
			push_state("muster_lord_at_seat")
			game.who = lord
		}

		else if (is_lord_on_calendar(lord)) {
			log(`Slid L${lord} one box left.`)
			slide_lord_cylinder(lord, -1)
		}

		else {
			log_h3(`L${lord} at %${get_lord_locale(lord)}`)
			push_state("levy_muster_lord")
			game.who = lord
			game.count = data.lords[lord].lordship
		}
	},
	end_call_to_arms() {
		clear_undo()
		end_levy_call_to_arms()
	},
}

states.novgorod_veche_done = {
	prompt() {
		view.prompt = "Novgorod Veche: All done."
		view.actions.end_call_to_arms = 1
	},
	end_call_to_arms() {
		clear_undo()
		end_levy_call_to_arms()
	},
}

// === CAMPAIGN: CAPABILITY DISCARD ===

function count_mustered_lords() {
	let n = 0
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (is_lord_on_map(lord))
			++n
	return n
}

function count_global_capabilities() {
	let n = 0
	for (let c of game.capabilities) {
		if (game.active === P1 && c >= first_p1_card && c <= last_p1_card)
			++n
		if (game.active === P2 && c >= first_p2_card && c <= last_p2_card)
			++n
	}
	return n
}

function goto_capability_discard() {
	if (count_global_capabilities() > count_mustered_lords())
		game.state = "capability_discard"
	else
		end_capability_discard()
}

states.capability_discard = {
	prompt() {
		if (count_global_capabilities() > count_mustered_lords()) {
			view.prompt = "Discard Capabilities in excess of Mustered Lords."
			for (let c of game.capabilities) {
				if (game.active === P1 && c >= first_p1_card && c <= last_p1_card)
					gen_action_card(c)
				if (game.active === P2 && c >= first_p2_card && c <= last_p2_card)
					gen_action_card(c)
			}
		} else {
			view.prompt = "Discard Capabilities: All done."
			view.actions.end_discard = 1
		}
	},
	card(c) {
		push_undo()
		discard_global_capability(c)
	},
	end_discard() {
		clear_undo()
		end_capability_discard()
	},
}

function end_capability_discard() {
	set_active_enemy()
	if (game.active === P2)
		goto_campaign_plan()
	else
		goto_capability_discard()
}

// === CAMPAIGN: PLAN ===

function goto_campaign_plan() {
	game.turn++

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

// === CAMPAIGN: ACTIONS ===

function is_first_action() {
	return has_flag(FLAG_FIRST_ACTION)
}

function is_first_march() {
	return has_flag(FLAG_FIRST_MARCH)
}

function goto_actions() {
	log_h2(`L${game.command}`)

	game.actions = data.lords[game.command].command

	set_flag(FLAG_FIRST_ACTION)
	set_flag(FLAG_FIRST_MARCH)

	// 4.1.3 Lieutenants MUST take lower lord
	game.group = [ game.command ]
	let lower = get_lower_lord(game.command)
	if (lower !== NOBODY)
		set_add(game.group, lower)

	if (game.active === TEUTONS) {
		if (has_global_capability(AOW_TEUTONIC_ORDENSBURGEN))
			if (is_commandery(get_lord_locale(game.command)))
				++game.actions
		if (game.command === LORD_HEINRICH || game.command === LORD_KNUD_ABEL)
			if (has_global_capability(AOW_TEUTONIC_TREATY_OF_STENSBY))
				++game.actions
	}

	if (game.active === RUSSIANS) {
		if (has_global_capability(AOW_RUSSIAN_ARCHBISHOPRIC))
			if (get_lord_locale(game.command) === LOC_NOVGOROD)
				++game.actions
		if (this_lord_has_russian_druzhina())
			++game.actions
		if (this_lord_has_house_of_suzdal())
			++game.actions
	}

	resume_actions()
	update_supply()
}

function resume_actions() {
	game.state = "actions"
	game.who = game.command
	game.where = NOWHERE
}

function spend_action(cost) {
	clear_flag(FLAG_FIRST_ACTION)
	game.actions -= cost
}

function spend_march_action(cost) {
	clear_flag(FLAG_FIRST_ACTION)
	clear_flag(FLAG_FIRST_MARCH)
	game.actions -= cost
}

function spend_all_actions() {
	clear_flag(FLAG_FIRST_ACTION)
	clear_flag(FLAG_FIRST_MARCH)
	game.actions = 0
}

function end_actions() {
	log_br()

	set_active(P1)
	game.command = NOBODY
	game.who = NOBODY
	game.group = 0
	game.nevsky.legate_selected = 0

	clear_flag(FLAG_FIRST_ACTION)
	clear_flag(FLAG_FIRST_MARCH)
	clear_flag(FLAG_TEUTONIC_RAIDERS)

	goto_feed()
}

function this_lord_has_russian_druzhina() {
	if (game.active === RUSSIANS)
		if (lord_has_capability(game.command, AOW_RUSSIAN_DRUZHINA))
			return count_lord_forces(game.command, KNIGHTS) > 0
	return false
}

function this_lord_has_house_of_suzdal() {
	if (game.active === RUSSIANS)
		if (lord_has_capability(game.command, AOW_RUSSIAN_HOUSE_OF_SUZDAL))
			return is_lord_on_map(LORD_ALEKSANDR) || is_lord_on_map(LORD_ANDREY)
	return false
}

states.actions = {
	prompt() {
		view.prompt = `${lord_name[game.command]} has ${game.actions}x actions.`

		view.group = game.group

		let here = get_lord_locale(game.command)

		// 4.3.2 Marshals MAY take other lords
		if (is_marshal(game.command)) {
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
				if (lord !== game.command && !is_lower_lord(lord))
					if (get_lord_locale(lord) === here)
						gen_action_lord(lord)
		}

		// 1.4.1 Teutonic lords MAY take the Legate
		if (game.active === TEUTONS && is_located_with_legate(game.command)) {
			view.actions.legate = 1
		}

		if (game.actions > 0)
			view.actions.pass = 1
		else
			view.actions.end_actions = 1

		if (is_lord_besieged(game.command)) {
			if (can_action_sally())
				view.actions.sally = 1
		}

		else {
			if (game.active === TEUTONS) {
				if (is_first_action() && is_located_with_legate(game.command))
					view.actions.use_legate = 1
				if (can_action_stonemasons())
					view.actions.stonemasons = 1
			}

			if (game.active === RUSSIANS) {
				if (can_action_smerdi())
					view.actions.smerdi = 1
				if (can_action_stone_kremlin())
					view.actions.stone_kremlin = 1
			}

			prompt_march()

			if (can_action_supply())
				view.actions.supply = 1

			if (can_action_siege())
				view.actions.siege = 1
			if (can_action_storm())
				view.actions.storm = 1
			if (can_action_forage())
				view.actions.forage = 1
			if (can_action_ravage())
				view.actions.ravage = 1
			if (can_action_tax())
				view.actions.tax = 1
			if (can_action_sail())
				view.actions.sail = 1
		}
	},

	use_legate() {
		push_undo()
		log(`Used Legate for +1 Command.`)
		game.nevsky.legate = LEGATE_ARRIVED
		game.nevsky.legate_selected = 0
		++game.actions
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

	stonemasons: goto_stonemasons,
	stone_kremlin: goto_stone_kremlin,
	smerdi: goto_smerdi,

	forage: goto_forage,
	ravage: goto_ravage,
	supply: goto_supply,
	tax: goto_tax,
	siege: goto_siege,
	storm: goto_storm,
	sally: goto_sally,
	sail: goto_sail,

	locale: goto_march,

	legate() {
		toggle_legate_selected()
	},

	lord(lord) {
		set_toggle(game.group, lord)
		if (is_upper_lord(lord))
			set_toggle(game.group, get_lower_lord(lord))
	},
}

// === ACTION: MARCH ===

function toggle_legate_selected() {
	if (game.nevsky.legate_selected)
		game.nevsky.legate_selected = 0
	else
		game.nevsky.legate_selected = 1
}

function lift_siege(from) {
	if (has_siege_marker(from)) {
		log(`Lifted siege at %${from}.`)
		remove_all_siege_markers(from)
		for (let lord = first_lord; lord <= last_lord; ++lord)
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

function prompt_march() {
	if (game.actions > 0 || group_has_teutonic_converts()) {
		let here = get_lord_locale(game.command)
		for (let to of data.locales[here].adjacent)
			gen_action_locale(to)
	}
}

function goto_march(to) {
	push_undo()
	let from = get_lord_locale(game.command)
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

states.march_way = {
	prompt() {
		view.prompt = `March: Select way.`
		view.group = game.group
		let from = get_lord_locale(game.command)
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
	let transport = count_group_transport(data.ways[way].type)
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
		let transport = count_group_transport(data.ways[way].type)
		let prov = count_group_assets(PROV)
		let loot = count_group_assets(LOOT)

		view.prompt = `March with ${loot} loot, ${prov} provender, and ${transport} transport.`
		view.group = game.group

		if (prov <= transport * 2) {
			if (loot > 0 || prov > transport) {
				if (game.actions >= 2) {
					view.prompt += " Laden!"
					view.actions.march = 1 // other button?
					gen_action_laden_march(to)
				} else {
					view.prompt += " Laden with 1 action left."
				}
			} else {
				view.actions.march = 1
				gen_action_locale(to)
			}
		} else {
			view.prompt += " Too much provender."
		}

		if (loot > 0 || prov > transport) {
			for (let lord of game.group) {
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
			}
		}
	},
	prov: drop_prov,
	loot: drop_loot,
	march: march_with_group_2,
	locale: march_with_group_2,
	laden_march: march_with_group_2,
}

function march_with_group_2() {
	let from = get_lord_locale(game.command)
	let way = game.approach
	let to = game.where
	let transport = count_group_transport(data.ways[way].type)
	let prov = count_group_assets(PROV)
	let loot = count_group_assets(LOOT)
	let laden = loot > 0 || prov > transport

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

	for (let lord of game.group) {
		set_lord_locale(lord, to)
		set_lord_moved(lord, 1)
	}
	if (game.nevsky.legate_selected)
		game.nevsky.legate = to

	if (is_besieged_enemy_stronghold(from) && !has_friendly_lord(from))
		lift_siege(from)

	remove_legate_if_endangered(from)

	if (has_unbesieged_enemy_lord(to)) {
		goto_avoid_battle()
	} else {
		march_with_group_3()
	}
}

function remove_legate_if_endangered(here) {
	if (game.nevsky.legate === here && has_enemy_lord(here) && !has_friendly_lord(here)) {
		log("Legate removed.")
		discard_global_capability(AOW_TEUTONIC_WILLIAM_OF_MODENA)
	}
}

function march_with_group_3() {
	let to = game.where

	remove_legate_if_endangered(to)

	if (is_besieged_friendly_stronghold(to)) {
		lift_siege(to)
	}

	if (is_unbesieged_enemy_stronghold(to)) {
		add_siege_marker(to)
		log(`Encamped.`)
		spend_all_actions() // ENCAMP
	}

	if (is_trade_route(to)) {
		conquer_trade_route(to)
	}

	resume_actions()
	update_supply()
}

// === ACTION: MARCH - AVOID BATTLE ===

function count_besieged_lords(loc) {
	let n = 0
	for (let lord = first_lord; lord <= last_lord; ++lord)
		if (get_lord_locale(lord) === loc && is_lord_besieged(lord))
			++n
	return n
}

function stronghold_strength(loc) {
	if (has_castle(loc))
		return 2
	return data.locales[loc].stronghold
}

function stronghold_capacity(loc) {
	return stronghold_strength(loc) - count_besieged_lords(loc)
}

function spoil_prov(lord) {
	log("Discarded Provender.")
	add_lord_assets(lord, PROV, -1)
	add_spoils(PROV, 1)
}

function spoil_loot(lord) {
	log("Discarded Loot.")
	add_lord_assets(lord, LOOT, -1)
	add_spoils(LOOT, 1)
}

function can_avoid_battle(to, way) {
	if (way === game.approach)
		return false
	if (has_unbesieged_enemy_lord(to))
		return false
	if (is_unbesieged_enemy_stronghold(to))
		return false
	return true
}

function select_all_lords() {
	game.group = []
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (get_lord_locale(lord) === game.where)
			game.group.push(lord)
}

function goto_avoid_battle() {
	clear_undo()
	set_active_enemy()
	game.stack = game.group
	game.who = NOBODY
	game.state = "avoid_battle"
	game.spoils = 0
	resume_avoid_battle()
}

function resume_avoid_battle() {
	if (has_unbesieged_friendly_lord(game.where)) {
		// TODO: select all or no lords?
		select_all_lords()
		// game.group = []
		game.state = "avoid_battle"
	} else {
		goto_withdraw()
	}
}

states.avoid_battle = {
	prompt() {
		view.prompt = `Avoid Battle`
		view.group = game.group

		let here = get_lord_locale(game.command)

		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (get_lord_locale(lord) === here && !is_lower_lord(lord))
				gen_action_lord(lord)

		if (game.group.length > 0) {
			for (let [to, way] of data.locales[here].ways) {
				if (can_avoid_battle(to, way))
					gen_action_locale(to)
			}
		}

		view.actions.end_avoid_battle = 1
	},
	lord(lord) {
		set_toggle(game.group, lord)
		if (is_upper_lord(lord))
			set_toggle(game.group, get_lower_lord(lord))
	},
	locale(to) {
		push_undo()
		let from = get_lord_locale(game.command)
		let ways = list_ways(from, to)
		if (ways.length > 2) {
			game.where = to
			game.state = "avoid_battle_way"
		} else {
			game.where = to
			game.avoid = ways[1]
			avoid_battle_1()
		}
	},
	end_avoid_battle() {
		push_undo()
		goto_withdraw()
	},
}

states.avoid_battle_way = {
	prompt() {
		view.prompt = `Avoid Battle: Select way.`
		view.group = game.group
		let from = get_lord_locale(game.command)
		let to = game.where
		let ways = list_ways(from, to)
		for (let i = 1; i < ways.length; ++i)
			gen_action_way(ways[i])
	},
	way(way) {
		game.avoid = way
		avoid_battle_1()
	},
}

function avoid_battle_1() {
	let way = game.avoid
	let transport = count_group_transport(data.ways[way].type)
	let prov = count_group_assets(PROV)
	let loot = count_group_assets(LOOT)
	if (prov > transport || loot > 0)
		game.state = 'avoid_battle_laden'
	else
		avoid_battle_2()
}

states.avoid_battle_laden = {
	prompt() {
		let to = game.where
		let way = game.avoid
		let transport = count_group_transport(data.ways[way].type)
		let prov = count_group_assets(PROV)
		let loot = count_group_assets(LOOT)

		view.prompt = `Avoid Battle with ${prov} provender and ${transport} transport.`
		view.group = game.group

		if (loot > 0) {
			view.prompt += " Discard Loot."
			for (let lord of game.group) {
				if (get_lord_assets(lord, LOOT) > 0)
					gen_action_loot(lord)
			}
		} else if (prov > transport) {
			view.prompt += " Discard Provender."
			for (let lord of game.group) {
				if (get_lord_assets(lord, PROV) > 0)
					gen_action_prov(lord)
			}
		} else {
			gen_action_locale(to)
		}
	},
	prov(lord) {
		spoil_prov(lord)
	},
	loot(lord) {
		spoil_loot(lord)
	},
	locale(to) {
		avoid_battle_2(false)
	},
}

function avoid_battle_2() {
	let from = get_lord_locale(game.command)
	let way = game.avoid
	let to = game.where

	if (data.ways[way].name)
		log(`Avoided Battle via ${data.ways[way].name} to %${to}.`)
	else
		log(`Avoided Battle to %${to}.`)

	for (let lord of game.group) {
		set_lord_locale(lord, to)
		set_lord_moved(lord, 1)
	}

	game.where = get_lord_locale(game.command)
	game.avoid = 0
	resume_avoid_battle()
}

// === ACTION: MARCH - AMBUSH ===

// TODO - ambush cancels avoid battle

// === ACTION: MARCH - WITHDRAW ===

function can_withdraw() {
	if (is_unbesieged_friendly_stronghold(game.where))
		if (stronghold_capacity(game.where) > 0)
			return true
	return false
}

function goto_withdraw() {
	if (has_unbesieged_friendly_lord(game.where) && can_withdraw()) {
		if (count_friendly_lords_at(game.where) <= stronghold_capacity(game.where))
			select_all_lords()
		else
			game.group = []
		game.state = "withdraw"
	} else {
		end_withdraw()
	}
}

states.withdraw = {
	prompt() {
		view.prompt = `Withdraw`
		view.group = game.group

		let here = get_lord_locale(game.command)
		let capacity = stronghold_capacity(here)

		if (game.group.length < capacity) {
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
				if (get_lord_locale(lord) === here && !is_lower_lord(lord)) {
					if (is_upper_lord(lord)) {
						if (game.group.length + 2 <= capacity)
							gen_action_lord(lord)
					} else {
						gen_action_lord(lord)
					}
				}
			}
		}

		if (game.group.length > 0)
			view.actions.withdraw = 1
		else
			view.actions.withdraw = 0

		view.actions.end_withdraw = 1
	},
	lord(lord) {
		set_toggle(game.group, lord)
		if (is_upper_lord(lord))
			set_toggle(game.group, get_lower_lord(lord))
	},
	withdraw() {
		push_undo()
		for (let lord of game.group) {
			log(`Withdrew with L${lord}`)
			set_lord_besieged(lord, 1)
		}
		end_withdraw()
	},
	end_withdraw() {
		end_withdraw()
	},
}

function end_withdraw() {
	clear_undo()
	set_active_enemy()
	game.where = get_lord_locale(game.command)
	game.who = game.command
	game.group = game.stack
	game.stack = []
	goto_divide_spoils_after_avoid_battle()
}

// === ACTION: MARCH - DIVIDE SPOILS AFTER AVOID BATTLE ===

function goto_divide_spoils_after_avoid_battle() {
	if (game.spoils > 0)
		game.state = "divide_spoils_after_avoid_battle"
	else
		march_with_group_3()
}

states.divide_spoils_after_avoid_battle = {
	prompt() {
		view.actions.end_spoils = 1
	},
	end_spoils() {
		game.spoils = 0
		march_with_group_3()
	},
}

// === ACTION: SIEGE ===

function count_friendly_lords_at(loc) {
	let n = 0
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (get_lord_locale(lord) === loc)
			++n
	return n
}

function count_besieging_lords(loc) {
	return count_friendly_lords_at(loc)
}

function can_siegeworks() {
	let here = get_lord_locale(game.command)
	if (count_besieging_lords(here) >= stronghold_strength(here))
		if (count_siege_markers(here) < 4)
			return true
	return false
}

function can_action_siege() {
	let here = get_lord_locale(game.command)
	if (!is_first_action())
		return false
	if (is_enemy_stronghold(here))
		return true
	return false
}

function goto_siege() {
	push_undo()
	let here = get_lord_locale(game.command)
	log(`Sieged at %${here}.`)
	goto_surrender()
}

function goto_surrender() {
	let here = get_lord_locale(game.command)
	if (count_besieged_lords(here) === 0)
		game.state = "surrender"
	else 
		goto_siegeworks()
}

states.surrender = {
	prompt() {
		view.prompt = "Siege: You may roll for Surrender."
		view.actions.surrender = 1
		if (can_siegeworks())
			view.actions.siegeworks = 1
		else
			view.actions.pass = 1
	},
	surrender() {
		log("TODO: Surrender roll!")
		goto_siegeworks()
	},
	siegeworks() {
		log("Declined Surrender.")
		goto_siegeworks()
	},
	pass() {
		log("Declined Surrender.")
		goto_siegeworks()
	},
}

function goto_siegeworks() {
	if (can_siegeworks())
		game.state = "siegeworks"
	else
		end_siege()
}

states.siegeworks = {
	prompt() {
		view.prompt = "Siege: Siegeworks - add one siege marker."
		let here = get_lord_locale(game.command)
		gen_action_locale(here)
	},
	locale(here) {
		log("Added Siege marker.")
		add_siege_marker(here)
		end_siege()
	},
}

function end_siege() {
	let here = get_lord_locale(game.command)

	// All Lords of both sides moved/fought
	for (let lord = first_lord; lord <= last_lord; ++lord)
		if (get_lord_locale(lord) === here)
			set_lord_moved(lord, 1)

	spend_all_actions()
	resume_actions()
}

// === ACTION: STORM ===

function can_action_storm() {
	if (game.actions < 1)
		return false
	return false
}

function goto_storm() {
	log("TODO: Storm")
	spend_action(1)
}

// === ACTION: SALLY ===

function can_action_sally() {
	if (game.actions < 1)
		return false
	return true
}

function goto_sally() {
	log("TODO: Sally")
	spend_action(1)
	resume_actions()
}

// === ACTION: SUPPLY ===

function update_supply() {
	// TODO: Lodya - select boat OR ship (we count both here...)

	if (game.actions < 1) {
		game.supply = 0
		return
	}

	let season = current_season()
	let here = get_lord_locale(game.command)
	let boats = 0
	let carts = 0
	let sleds = 0
	let ships = 0

	if (season === SUMMER) {
		carts = get_shared_assets(here, CART)
	}
	if (season === SUMMER || season === RASPUTITSA) {
		boats = count_shared_boats()
		ships = count_shared_ships() + count_shared_cogs_not_in_locale(here)
	}
	if (season === EARLY_WINTER || season === LATE_WINTER) {
		sleds = get_shared_assets(here, SLED)
	}

	if (ships > 2)
		ships = 2

	let sources = list_supply_sources(ships)
	let reachable = filter_reachable_supply_sources(sources, boats, carts, sleds)
	let supply_seats = filter_usable_supply_seats(reachable)
	let supply_seaports = filter_usable_supply_seaports(reachable, ships)

	game.supply = { supply_seats, supply_seaports, seats: 2, boats, carts, sleds, ships }
}

function list_supply_sources(ships) {
	let sources = []

	for_each_seat(game.command, seat => { set_add(sources, seat) }, false)

	if (ships > 0) {
		if (game.active === TEUTONS)
			for (let port of data.seaports)
				set_add(sources, port)
		if (game.active === RUSSIANS)
			set_add(sources, LOC_NOVGOROD)
	}

	return sources
}

function filter_reachable_supply_sources(sources, boats, carts, sleds) {
	let result = []
	search_supply_reachable(result, [], sources, get_lord_locale(game.command), boats, carts, sleds)
	return result
}

function search_supply_reachable(result, seen, sources, here, boats, carts, sleds) {
	if (set_has(seen, here))
		return

	if (has_unbesieged_enemy_lord(here))
		return
	if (is_unbesieged_enemy_stronghold(here))
		return
	if (is_friendly_territory(here) && has_conquered_marker(here))
		if (!has_siege_marker(here))
			return

	set_add(seen, here)

	if (set_has(sources, here))
		set_add(result, here)

	if (boats > 0)
		for (let next of data.locales[here].adjacent_by_waterway)
			search_supply_reachable(result, seen, sources, next, boats - 1, carts, sleds)
	if (carts > 0)
		for (let next of data.locales[here].adjacent_by_trackway)
			search_supply_reachable(result, seen, sources, next, boats, carts - 1, sleds)
	if (sleds > 0)
		for (let next of data.locales[here].adjacent)
			search_supply_reachable(result, seen, sources, next, boats, carts, sleds - 1)

	set_delete(seen, here)
}

function filter_usable_supply_seats(reachable) {
	let sources = []
	for_each_seat(
		game.command,
		(seat) => {
			if (set_has(reachable, seat))
				sources.push(seat)
		},
		true
	)
	return sources
}

function filter_usable_supply_seaports(reachable, ships) {
	if (ships > 0) {
		let sources = []
		if (game.active === TEUTONS) {
			for (let port of data.seaports) {
				if (set_has(reachable, port)) {
					set_add(sources, port)
				}
			}
		}
		if (game.active === RUSSIANS) {
			if (set_has(reachable, LOC_NOVGOROD)) {
				set_add(sources, LOC_NOVGOROD)
			}
		}
		return sources
	}
	return null
}

function can_action_supply() {
	if (game.actions < 1)
		return false
	return can_supply()
}

function can_supply() {
	if (game.supply.seats > 0 && game.supply.supply_seats.length > 0)
		return true
	if (game.supply.ships > 0 && game.supply.supply_seaports.length > 0)
		return true
	return false
}

function goto_supply() {
	push_undo()
	game.state = "supply_source"
}

states.supply_source = {
	prompt() {
		if (!can_supply()) {
			view.prompt = "Supply: No valid supply sources."
			return
		}

		view.prompt = "Supply: Select supply source and route -"

		if (game.supply.boats > 0)
			view.prompt += ` ${game.supply.boats} boat`
		if (game.supply.carts > 0)
			view.prompt += ` ${game.supply.carts} cart`
		if (game.supply.sleds > 0)
			view.prompt += ` ${game.supply.sleds} sled`
		if (game.supply.ships > 0)
			view.prompt += ` ${game.supply.ships} ship`

		if (game.supply.seats > 0)
			for (let source of game.supply.supply_seats)
				gen_action_locale(source)
		if (game.supply.ships > 0)
			for (let source of game.supply.supply_seaports)
				gen_action_locale(source)
		view.actions.end_supply = 1
	},
	locale(source) {
		// TODO: 2nd ed - no reusing of transports!

		if (game.supply.supply_seats.includes(source)) {
			log(`Supplied from seat at %${source}.`)
			array_remove_item(game.supply.supply_seats, source)
			game.supply.seats--
		} else {
			log(`Supplied from seaport at %${source}.`)
			game.supply.ships--
		}

		add_lord_assets(game.command, PROV, 1)

		if (!can_supply())
			end_supply()
	},
	end_supply: end_supply,
}

function end_supply() {
	game.supply = 0
	spend_action(1)
	resume_actions()
	update_supply()
}

// === ACTION: FORAGE ===

function can_action_forage() {
	if (game.actions < 1)
		return false
	let here = get_lord_locale(game.command)
	if (has_ravaged_marker(here))
		return false
	if (current_season() === SUMMER)
		return true
	if (is_friendly_stronghold_locale(here)) // TODO: simpler check?
		return true
	return false
}

function goto_forage() {
	push_undo()
	let here = get_lord_locale(game.command)
	log(`Foraged at %${here}`)
	add_lord_assets(game.command, PROV, 1)
	spend_action(1)
	resume_actions()
}

// === ACTION: RAVAGE ===

function has_not_used_teutonic_raiders() {
	return !has_flag(FLAG_TEUTONIC_RAIDERS)
}

function this_lord_has_teutonic_raiders() {
	if (game.active === TEUTONS)
		if (has_not_used_teutonic_raiders())
			if (lord_has_capability(game.command, AOW_TEUTONIC_RAIDERS))
				return count_lord_horses(game.command) > 0
	return false
}

function this_lord_has_russian_raiders() {
	if (game.active === RUSSIANS)
		if (lord_has_capability(game.command, AOW_RUSSIAN_RAIDERS))
			return get_lord_forces(game.command, LIGHT_HORSE) + get_lord_forces(game.command, ASIATIC_HORSE) > 0
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

function can_action_ravage() {
	// TODO: cost 2 if enemy lord is adjacent (2nd ed)
	if (game.actions < 1)
		return false

	let here = get_lord_locale(game.command)

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

function goto_ravage() {
	push_undo()
	if (this_lord_has_teutonic_raiders() || this_lord_has_russian_raiders()) {
		game.state = "ravage"
	} else {
		let here = get_lord_locale(game.command)
		ravage_location(here, here)
	}
}

states.ravage = {
	prompt() {
		view.prompt = `Ravage: Choose enemy territory to ravage!`

		let here = get_lord_locale(game.command)

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
		let here = get_lord_locale(game.command)
		ravage_location(here, there)
	},
}

function ravage_location(here, there) {
	log(`Ravaged at %${there}.`)

	add_ravaged_marker(there)
	add_lord_assets(game.command, PROV, 1)

	if (here !== there && game.active === TEUTONS)
		set_flag(FLAG_TEUTONIC_RAIDERS)

	if (!is_region(there)) {
		// R12 Raiders - take no loot from adjacent
		if (here === there || game.active !== RUSSIANS)
			add_lord_assets(game.command, LOOT, 1)
	}

	spend_action(1)
	resume_actions()
}

// === ACTION: TAX ===

function restore_mustered_forces(lord) {
	muster_lord_forces(lord)
	for (let v of data.lords[lord].vassals)
		if (is_vassal_mustered(v))
			muster_vassal_forces(lord, v)
}

function can_action_tax() {
	// Must use whole action
	if (!is_first_action())
		return false

	// Must have space left to hold Coin
	if (get_lord_assets(game.command, COIN) >= 8)
		return false

	// Must be at own seat
	return is_lord_at_seat(game.command);
}

function goto_tax()  {
	push_undo()

	let here = get_lord_locale(game.command)
	log(`Taxed %${here}.`)

	add_lord_assets(game.command, COIN, 1)

	spend_all_actions()
	resume_actions()

	if (lord_has_capability(game.command, AOW_RUSSIAN_VELIKY_KNYAZ)) {
		logi("Veliky Knyaz")
		logii("Restored mustered forces.")
		restore_mustered_forces(game.command)
		push_state("veliky_knyaz")
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

function has_enough_available_ships_for_horses() {
	let ships = count_group_ships() + count_shared_cogs_not_in_group()
	let horses = count_group_horses()

	let needed_ships = horses
	if (game.active === RUSSIANS)
		needed_ships = horses * 2

	return needed_ships <= ships
}

function can_action_sail() {
	// Must use whole action
	if (!is_first_action())
		return false

	// at a seaport
	let here = get_lord_locale(game.command)
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

function goto_sail() {
	push_undo()
	game.state = 'sail'
}

states.sail = {
	prompt() {
		view.group = game.group

		let here = get_lord_locale(game.command)
		let ships = count_group_ships() + count_shared_cogs_not_in_group()
		let horses = count_group_horses()
		let prov = count_group_assets(PROV)
		let loot = count_group_assets(LOOT)

		let overflow = 0
		if (game.active === TEUTONS)
			overflow = (horses + loot * 2 + prov) - ships
		if (game.active === RUSSIANS)
			overflow = (horses * 2 + loot * 2 + prov) - ships

		if (overflow > 0) {
			view.prompt = `Sailing with ${ships} ships and ${horses} horses. Discard loot or provender.`
			// TODO: stricter greed!
			// TODO: if 1 ship, 1 loot, 1 prov - cannot discard prov then loot!
			if (loot > 0 || prov > 0) {
				for (let lord of game.group) {
					if (loot > 0)
						if (get_lord_assets(lord, LOOT) > 0)
							gen_action_loot(lord)
					if (prov > 0)
						if (get_lord_assets(lord, PROV) > 0)
							gen_action_prov(lord)
				}
			}
		} else {
			view.prompt = `Sail: Choose a destination Seaport.`
			for (let to of data.seaports) {
				if (to === here)
					continue
				if (!has_enemy_lord(to))
					gen_action_locale(to)
			}
		}
	},
	prov: drop_prov,
	loot: drop_loot,
	locale(to) {
		push_undo()
		log(`Sailed to %${to}.`)

		let from = get_lord_locale(game.command)

		for (let lord of game.group) {
			set_lord_locale(lord, to)
			set_lord_moved(lord, 1)
		}
		if (game.nevsky.legate_selected)
			game.nevsky.legate = to

		if (is_enemy_stronghold(from))
			lift_siege(from)

		remove_legate_if_endangered(from)

		if (is_unbesieged_enemy_stronghold(to))
			add_siege_marker(to)

		if (is_trade_route(to))
			conquer_trade_route(to)

		spend_all_actions()
		resume_actions()
		update_supply()
	},
}

// === ACTION: STONEMASONS (CAPABILITY) ===

function can_action_stonemasons() {
	if (!is_first_action())
		return false

	if (!lord_has_capability(game.command, AOW_TEUTONIC_STONEMASONS))
		return false

	let here = get_lord_locale(game.command)
	if (is_in_rus(here) && (is_fort(here) || is_town(here))) {
		if (get_shared_assets(here, PROV) < 6)
			return false
		if (count_castles() >= 2)
			return false
		if (has_castle(here))
			return false
		if (has_siege_marker(here))
			return false
		return true
	}

	return false
}

function goto_stonemasons() {
	push_undo()

	log("Stonemasons.")

	game.count = 6
	game.state = "stonemasons"
}

states.stonemasons = {
	prompt() {
		view.prompt = `Stonemasons: Pay ${game.count} provender.`
		let here = get_lord_locale(game.command)
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (get_lord_locale(lord) === here)
				if (get_lord_assets(lord, PROV) > 0)
					gen_action_prov(lord)
	},
	prov(lord) {
		add_lord_assets(lord, PROV, -1)
		game.count--
		if (game.count === 0)
			end_stonemasons()
	},
}

function end_stonemasons() {
	let here = get_lord_locale(game.command)
	log(`Built Castle at %${here}.`)
	add_friendly_castle(here)
	remove_walls(here)
	spend_all_actions()
	resume_actions()
}

// === ACTION: STONE KREMLIN (CAPABILITY) ===

function count_walls() {
	return game.locales.walls.length
}

function has_walls(loc) {
	return set_has(game.locales.walls, loc)
}

function add_walls(loc) {
	return set_add(game.locales.walls, loc)
}

function remove_walls(loc) {
	return set_delete(game.locales.walls, loc)
}

function can_action_stone_kremlin() {
	if (!is_first_action())
		return false

	if (!lord_has_capability(game.command, AOW_RUSSIAN_STONE_KREMLIN))
		return false

	let here = get_lord_locale(game.command)

	if (is_fort(here) || is_city(here) || here === LOC_NOVGOROD) {
		if (has_walls(here))
			return false
		return true
	}

	return false
}

function goto_stone_kremlin() {
	push_undo()

	log("Stone Kremlin.")

	if (count_walls() > 0) {
		game.state = "stone_kremlin"
		game.count = 1
	} else {
		end_stone_kremlin()
	}
}

states.stone_kremlin = {
	prompt() {
		let here = get_lord_locale(game.command)
		if (game.count > 0) {
			if (count_walls() === 4) {
				view.prompt = `Stone Kremlin: Move one Walls marker.`
			} else {
				view.prompt = `Stone Kremlin: Place or move Walls.`
				gen_action_locale(here)
			}
			for (let loc of game.locales.walls)
				gen_action_locale(loc)
		} else {
			view.prompt = `Stone Kremlin: Place Walls.`
			gen_action_locale(here)
		}
	},
	locale(loc) {
		let here = get_lord_locale(game.command)
		if (loc !== here) {
			log(`Removed Walls at %${loc}.`)
			remove_walls(loc)
			game.count = 0
		} else {
			end_stone_kremlin()
		}
	},
	pass() {
		end_stone_kremlin()
	},
}

function end_stone_kremlin() {
	let here = get_lord_locale(game.command)
	log(`Built Walls at %${here}.`)
	add_walls(here)
	spend_all_actions()
	resume_actions()
}

// === ACTION: SMERDI (CAPABILITY) ===

function can_action_smerdi() {
	if (game.actions < 1)
		return false
	if (game.nevsky.smerdi > 0) {
		if (is_in_rus(get_lord_locale(game.command)))
			return true
	}
	return false
}

function goto_smerdi() {
	push_undo()
	log("Mustered Serfs.")
	game.nevsky.smerdi --
	add_lord_forces(game.command, SERFS, 1)
	spend_action(1)
	resume_actions()
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

// === LEVY: SUMMER CRUSADERS ===

function muster_summer_crusaders() {
	// TODO: muster as separate state
	if (game.active === TEUTONS && current_season() === SUMMER && has_global_capability(AOW_TEUTONIC_CRUSADE)) {
		for (let v of data.summer_crusaders) {
			let lord = data.vassals[v].lord
			if (is_lord_on_map(lord) && is_lord_unbesieged(lord) && is_vassal_ready(v)) {
				log(`Mustered L${lord}'s Summer Crusaders.`)
				muster_vassal(lord, v)
			}
		}
	}
}

function restore_summer_crusaders() {
	// TODO: restore as separate state
	if (game.active === TEUTONS && current_season() === SUMMER && has_global_capability(AOW_TEUTONIC_CRUSADE)) {
		for (let v of data.summer_crusaders) {
			let lord = data.vassals[v].lord
			if (is_lord_on_map(lord) && is_lord_unbesieged(lord) && is_vassal_ready(v)) {
				if (restore_vassal_forces(lord, v)) {
					log(`Restored L${lord}'s Summer Crusaders.`)
				}
			}
		}
	}
}

// === LEVY & CAMPAIGN: PAY ===

function can_pay_lord(lord) {
	if (game.active === RUSSIANS) {
		if (game.nevsky.veche_coin > 0 && !is_lord_besieged(lord))
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
			if (game.nevsky.veche_coin > 0 && !is_lord_besieged(game.who))
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
		game.nevsky.veche_coin--
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
	let here = get_lord_locale(lord)

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

	// Smerdi - serfs go back to card
	game.nevsky.smerdi += get_lord_forces(lord, SERFS)

	set_lord_capability(lord, 0, NOTHING)
	set_lord_capability(lord, 1, NOTHING)
	game.lords.assets[lord] = 0
	game.lords.forces[lord] = 0
	game.lords.routed[lord] = 0

	set_lord_besieged(lord, 0)
	set_lord_moved(lord, 0)

	for (let v of data.lords[lord].vassals)
		game.lords.vassals[v] = VASSAL_UNAVAILABLE

	if (is_besieged_enemy_stronghold(here) && !has_friendly_lord(here))
		lift_siege(here)
}

states.disband = {
	prompt() {
		view.prompt = "Disband: You must Disband Lords at their Service limit."
		let done = true
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
			if (is_lord_on_map(lord) && get_lord_service(lord) <= current_turn()) {
				gen_action_lord(lord)
				gen_action_service(lord)
				done = false
			}
		}
		if (done)
			view.actions.end_disband = 1
	},
	service(lord) {
		disband_lord(lord)
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
	clear_lords_moved()
	goto_command_activation()
}

// === END CAMPAIGN: RESET ===

function goto_end_campaign() {

	log("TODO: Game End")
	log("TODO: Grow (2nd ed)")
	log("TODO: Plow & Reap")
	log("TODO: Wastage")

	goto_reset()
}

function goto_reset() {
	// Unstack Lieutenants and Lower Lords
	game.lords.lieutenants = []

	// Remove all Serfs to the Smerdi card
	if (has_global_capability(AOW_RUSSIAN_SMERDI)) {
		for (let lord = first_p2_lord; lord <= last_p2_lord; ++lord)
			set_lord_forces(lord, SERFS, 0)
		game.nevsky.smerdi = 6
	}

	// Discard "This Campaign" events from play.
	if (game.events.length > 0)
		game.events = game.events.filter((c) => data.cards[c].when !== "this_campaign")

	log("TODO: Discard Arts of War cards")

	goto_advance_campaign()
}

function goto_advance_campaign() {
	game.turn++

	log_h1("Levy " + current_turn_name())

	if (current_season() === LATE_WINTER)
		discard_global_capability(AOW_TEUTONIC_CRUSADE)

	log_h2("Arts of War")
	goto_levy_arts_of_war()
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
		nevsky: game.nevsky,

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

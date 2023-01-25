"use strict"


// FIXME: lift_sieges / besieged needs checking! (automatic after disband_lord, manual after move/sail, extra careful manual after battle)
// FIXME: remove_legate_if_endangered needs checking! (automatic after disband_lord, manual after move/sail, manual after battle)

// WONTFIX: choose crossbow/normal hit application order

// Check all push/clear_undo
// Remove push_state/pop_state stuff - use explicit substates with common functions instead
// Optimize lift_sieges (only check specific locales based on where the check is)
// Use game.levy or game.command instead of game.who for levy (like game.command for campaign)
// Clean up game.who (use only in muster / events, not for command)
// drop game.who from push_state

const data = require("./data.js")

const AUTOWALK = true

const BOTH = "Both"
const TEUTONS = "Teutons"
const RUSSIANS = "Russians"

const P1 = TEUTONS
const P2 = RUSSIANS

const HIT = [ "0", '\u2776', '\u2777', '\u2778', '\u2779', '\u277A', '\u277B' ]
const MISS = [ "0", '\u2460', '\u2461', '\u2462', '\u2463', '\u2464', '\u2465' ]

function frac(x) {
	if (x === 1)
		return "\xbd"
	if (x & 1)
		return (x >> 1) + "\xbd"
	return x >> 1
}

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
	"Test",
]

const scenario_last_turn = {
	"Pleskau": 2,
	"Watland": 8,
	"Peipus": 16,
	"Return of the Prince": 16,
	"Return of the Prince (Nicolle)": 16,
	"Crusade on Novgorod": 16,
	"Pleskau (Quickstart)": 2,
	"Test": 2,
}

function should_remove_no_event_card() {
	return game.scenario !== "Crusade on Novgorod"
}

// unit types
const KNIGHTS = 0
const SERGEANTS = 1
const LIGHT_HORSE = 2
const ASIATIC_HORSE = 3
const MEN_AT_ARMS = 4
const MILITIA = 5
const SERFS = 6

const FORCE_TYPE_NAME = [ "Knights", "Sergeants", "Light Horse", "Asiatic Horse", "Men-at-Arms", "Militia", "Serfs" ]
const FORCE_PROTECTION = [ 4, 3, 1, 1, 3, 1, 0 ]
const FORCE_EVADE = [ 0, 0, 0, 3, 0, 0, 0 ]

// asset types
const PROV = 0
const COIN = 1
const LOOT = 2
const CART = 3
const SLED = 4
const BOAT = 5
const SHIP = 6

const ASSET_TYPE_NAME = [ "Provender", "Coin", "Loot", "Cart", "Sled", "Boat", "Ship" ]

// battle array
const A1 = 0 // attackers
const A2 = 1
const A3 = 2
const D1 = 3 // defenders
const D2 = 4
const D3 = 5
const SA1 = 6 // relief sally: attackers
const SA2 = 7
const SA3 = 8
const RG1 = 9 // relief sally: rearguard
const RG2 = 10
const RG3 = 11

const ARRAY_FLANKS = [
	[ A2, A3 ], [ A1, A3 ], [ A1, A2 ],
	[ D2, D3 ], [ D1, D3 ], [ D1, D2 ],
	[ SA2, SA3 ], [ SA1, SA3 ], [ SA1, SA2 ],
	[ RG2, RG3 ], [ RG1, RG3 ], [ RG1, RG2 ],
]

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

const GARRISON = 100

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

const LOC_ADSEL = find_locale("Adsel")
const LOC_DORPAT = find_locale("Dorpat")
const LOC_DUBROVNO = find_locale("Dubrovno")
const LOC_FELLIN = find_locale("Fellin")
const LOC_IZBORSK = find_locale("Izborsk")
const LOC_KAIBOLOVO = find_locale("Kaibolovo")
const LOC_KOPORYE = find_locale("Koporye")
const LOC_LADOGA = find_locale("Ladoga")
const LOC_LEAL = find_locale("Leal")
const LOC_LETTGALLIA = find_locale("Lettgallia")
const LOC_LOVAT = find_locale("Lovat")
const LOC_LUGA = find_locale("Luga")
const LOC_NEVA = find_locale("Neva")
const LOC_NOVGOROD = find_locale("Novgorod")
const LOC_ODENPAH = find_locale("Odenpäh")
const LOC_OSTROV = find_locale("Ostrov")
const LOC_PORKHOV = find_locale("Porkhov")
const LOC_PSKOV = find_locale("Pskov")
const LOC_REVAL = find_locale("Reval")
const LOC_RIGA = find_locale("Riga")
const LOC_ROSITTEN = find_locale("Rositten")
const LOC_RUSA = find_locale("Rusa")
const LOC_SABLIA = find_locale("Sablia")
const LOC_SOROT_RIVER = find_locale("Sorot River")
const LOC_TESOVO = find_locale("Tesovo")
const LOC_TOLOWA = find_locale("Tolowa")
const LOC_UZMEN = find_locale("Uzmen")
const LOC_VELIKAYA_RIVER = find_locale("Velikaya River")
const LOC_VELIKIYE_LUKI = find_locale("Velikiye Luki")
const LOC_VOD = find_locale("Vod")
const LOC_VOLKHOV = find_locale("Volkhov")
const LOC_WENDEN = find_locale("Wenden")
const LOC_WESENBERG = find_locale("Wesenberg")
const LOC_ZHELCHA_RIVER = find_locale("Zhelcha River")
const LOC_ZHELTSY = find_locale("Zheltsy")

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

const EVENT_TEUTONIC_GRAND_PRINCE = T1
const EVENT_TEUTONIC_TORZHOK = T2
const EVENT_TEUTONIC_VODIAN_TREACHERY = T3
const EVENT_TEUTONIC_BRIDGE = T4
const EVENT_TEUTONIC_MARSH = T5
const EVENT_TEUTONIC_AMBUSH = T6
const EVENT_TEUTONIC_TVERDILO = T7
const EVENT_TEUTONIC_TEUTONIC_FERVOR = T8
const EVENT_TEUTONIC_HILL = T9
const EVENT_TEUTONIC_FIELD_ORGAN = T10
const EVENT_TEUTONIC_POPE_GREGORY = T11
const EVENT_TEUTONIC_KHAN_BATY = T12
const EVENT_TEUTONIC_HEINRICH_SEES_THE_CURIA = T13
const EVENT_TEUTONIC_BOUNTIFUL_HARVEST = T14
const EVENT_TEUTONIC_MINDAUGAS = T15
const EVENT_TEUTONIC_FAMINE = T16
const EVENT_TEUTONIC_DIETRICH_VON_GRUNINGEN = T17
const EVENT_TEUTONIC_SWEDISH_CRUSADE = T18

const EVENT_RUSSIAN_BRIDGE = R1
const EVENT_RUSSIAN_MARSH = R2
const EVENT_RUSSIAN_POGOST = R3
const EVENT_RUSSIAN_RAVENS_ROCK = R4
const EVENT_RUSSIAN_HILL = R5
const EVENT_RUSSIAN_AMBUSH = R6
const EVENT_RUSSIAN_FAMINE = R7
const EVENT_RUSSIAN_PRINCE_OF_POLOTSK = R8
const EVENT_RUSSIAN_OSILIAN_REVOLT = R9
const EVENT_RUSSIAN_BATU_KHAN = R10
const EVENT_RUSSIAN_VALDEMAR = R11
const EVENT_RUSSIAN_MINDAUGAS = R12
const EVENT_RUSSIAN_PELGUI = R13
const EVENT_RUSSIAN_PRUSSIAN_REVOLT = R14
const EVENT_RUSSIAN_DEATH_OF_THE_POPE = R15
const EVENT_RUSSIAN_TEMPEST = R16
const EVENT_RUSSIAN_DIETRICH_VON_GRUNINGEN = R17
const EVENT_RUSSIAN_BOUNTIFUL_HARVEST = R18

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

const COMMANDERIES = [
	LOC_ADSEL,
	LOC_FELLIN,
	LOC_LEAL,
	LOC_WENDEN
]

function is_in_rus(loc) {
	return loc >= first_p2_locale && loc <= last_p2_locale
}

function is_in_livonia(loc) {
	// FIXME actual numbers
	return loc >= 0 && loc <= last_locale && data.locales[loc].region === "Crusader Livonia"
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

function is_winter() {
	let season = current_season()
	return season === EARLY_WINTER || season === LATE_WINTER
}

function is_summer() {
	return current_season() === SUMMER
}

function current_turn_name() {
	return TURN_NAME[game.turn >> 1]
}

function current_hand() {
	if (game.active === P1)
		return game.hand1
	return game.hand2
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

function has_any_spoils() {
	return (
		game.spoils &&
		game.spoils[PROV] +
			game.spoils[COIN] +
			game.spoils[LOOT] +
			game.spoils[CART] +
			game.spoils[SLED] +
			game.spoils[BOAT] +
			game.spoils[SHIP] >
			0
	)
}

function get_spoils(type) {
	if (game.spoils)
		return game.spoils[type]
	return 0
}

function add_spoils(type, n) {
	if (!game.spoils)
		game.spoils = [ 0, 0, 0, 0, 0, 0, 0 ]
	game.spoils[type] += n
}

function get_lord_calendar(lord) {
	if (is_lord_on_calendar(lord))
		return get_lord_locale(lord) - CALENDAR
	else
		return get_lord_service(lord)
}

function set_lord_cylinder_on_calendar(lord, turn) {
	if (turn < 0) turn = 0
	if (turn > 17) turn = 17
	set_lord_locale(lord, CALENDAR + turn)
}

function set_lord_calendar(lord, turn) {
	if (is_lord_on_calendar(lord))
		set_lord_cylinder_on_calendar(lord, turn)
	else
		set_lord_service(lord, turn)
}

function get_lord_locale(lord) {
	return game.pieces.locale[lord]
}

function get_lord_service(lord) {
	return game.pieces.service[lord]
}

function get_lord_capability(lord, n) {
	return game.pieces.capabilities[(lord << 1) + n]
}

function set_lord_capability(lord, n, x) {
	game.pieces.capabilities[(lord << 1) + n] = x
}

function get_lord_assets(lord, n) {
	return pack4_get(game.pieces.assets[lord], n)
}

function get_lord_forces(lord, n) {
	return pack4_get(game.pieces.forces[lord], n)
}

function get_lord_routed_forces(lord, n) {
	return pack4_get(game.pieces.routed[lord], n)
}

function lord_has_unrouted_units(lord) {
	return game.pieces.forces[lord] !== 0
}

function lord_has_routed_units(lord) {
	return game.pieces.routed[lord] !== 0
}

function set_lord_locale(lord, locale) {
	game.pieces.locale[lord] = locale
}

function shift_lord_cylinder(lord, dir) {
	set_lord_calendar(lord, get_lord_calendar(lord) + dir)
}

function set_lord_service(lord, service) {
	if (service < 0)
		service = 0
	if (service > 17)
		service = 17
	game.pieces.service[lord] = service
}

function add_lord_service(lord, n) {
	set_lord_service(lord, get_lord_service(lord) + n)
}

function set_lord_assets(lord, n, x) {
	if (x < 0)
		x = 0
	if (x > 8)
		x = 8
	game.pieces.assets[lord] = pack4_set(game.pieces.assets[lord], n, x)
}

function add_lord_assets(lord, n, x) {
	set_lord_assets(lord, n, get_lord_assets(lord, n) + x)
}

function set_lord_forces(lord, n, x) {
	if (x < 0)
		x = 0
	if (x > 15)
		x = 15
	game.pieces.forces[lord] = pack4_set(game.pieces.forces[lord], n, x)
}

function add_lord_forces(lord, n, x) {
	set_lord_forces(lord, n, get_lord_forces(lord, n) + x)
}

function set_lord_routed_forces(lord, n, x) {
	if (x < 0)
		x = 0
	if (x > 15)
		x = 15
	game.pieces.routed[lord] = pack4_set(game.pieces.routed[lord], n, x)
}

function add_lord_routed_forces(lord, n, x) {
	set_lord_routed_forces(lord, n, get_lord_routed_forces(lord, n) + x)
}

function clear_lords_moved() {
	game.pieces.moved = 0
}

function get_lord_moved(lord) {
	return pack2_get(game.pieces.moved, lord)
}

function set_lord_moved(lord, x) {
	game.pieces.moved = pack2_set(game.pieces.moved, lord, x)
}

function set_lord_unfed(lord, n) {
	// reuse "moved" flag for hunger
	set_lord_moved(lord, n)
}

function is_lord_unfed(lord) {
	// reuse "moved" flag for hunger
	return get_lord_moved(lord)
}

function feed_lord_skip(lord) {
	// reuse "moved" flag for hunger
	set_lord_moved(lord, 0)
}

function feed_lord(lord) {
	// reuse "moved" flag for hunger
	set_lord_moved(lord, get_lord_moved(lord) - 1)
}

function get_lord_array_position(lord) {
	for (let p = 0; p < 12; ++p)
		if (game.battle.array[p] === lord)
			return p
	return -1
}

function add_veche_vp(amount) {
	game.pieces.veche_vp += amount
	if (game.pieces.veche_vp < 0)
		game.pieces.veche_vp = 0
	if (game.pieces.veche_vp > 8)
		game.pieces.veche_vp = 8
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
		if (game.flags.lodya === 0)
			boats *= 2
		else
			boats += game.flags.lodya
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
		ships -= game.flags.lodya
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

function count_group_assets(type) {
	let n = 0
	for (let lord of game.group)
		n += get_lord_assets(lord, type)
	return n
}

function count_group_forces(type) {
	let n = 0
	for (let lord of game.group)
		n += get_lord_forces(lord, type)
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

function is_armored_force(type) {
	return type === KNIGHTS || type === SERGEANTS || type === MEN_AT_ARMS
}

function is_no_event_card(c) {
	if (c === 18 || c === 19 || c === 20)
		return true
	if (c === 39 || c === 40 || c === 41)
		return true
	return false
}

function is_p1_card(c) {
	return c >= first_p1_card && c <= last_p1_card_no_event
}

function is_p2_card(c) {
	return c >= first_p2_card && c <= last_p2_card_no_event
}

function is_card_in_use(c) {
	if (set_has(game.hand1, c))
		return true
	if (set_has(game.hand2, c))
		return true
	if (set_has(game.events, c))
		return true
	if (set_has(game.capabilities, c))
		return true
	if (game.pieces.capabilities.includes(c))
		return true
	return false
}

function list_deck() {
	let deck = []
	let first_card = (game.active === P1) ? first_p1_card : first_p2_card
	let last_card = (game.active === P1) ? last_p1_card : last_p2_card
	let no = (game.active === P1) ? game.no1 : game.no2
	for (let c = first_card; c <= last_card; ++c)
		if (!is_card_in_use(c))
			deck.push(c)
	for (let c = last_card + 1; c <= last_card + no; ++c)
		deck.push(c)
	return deck
}

function is_friendly_card(c) {
	if (game.active === P1)
		return is_p1_card(c)
	return is_p2_card(c)
}

function has_card_in_hand(c) {
	if (game.active === P1)
		return set_has(game.hand1, c)
	return set_has(game.hand2, c)
}

function can_discard_card(c) {
	if (set_has(game.hand1, c))
		return true
	if (set_has(game.hand2, c))
		return true
	if (set_has(game.capabilities, c))
		return true
	if (game.pieces.capabilities.includes(c))
		return true
}

function is_lord_on_map(lord) {
	let loc = get_lord_locale(lord)
	return loc !== NOWHERE && loc < CALENDAR
}

function is_lord_in_play(lord) {
	return get_lord_locale(lord) !== NOWHERE
}

function is_lord_besieged(lord) {
	return pack1_get(game.pieces.besieged, lord)
}

function is_lord_unbesieged(lord) {
	return !pack1_get(game.pieces.besieged, lord)
}

function set_lord_besieged(lord, x) {
	game.pieces.besieged = pack1_set(game.pieces.besieged, lord, x)
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

function is_vassal_ready(vassal) {
	return game.pieces.vassals[vassal] === VASSAL_READY
}

function is_vassal_mustered(vassal) {
	return game.pieces.vassals[vassal] === VASSAL_MUSTERED
}

function is_teutonic_lord(lord) {
	return lord >= first_p1_lord && lord <= last_p1_lord
}

function is_russian_lord(lord) {
	return lord >= first_p2_lord && lord <= last_p2_lord
}

function is_p1_lord(lord) {
	return lord >= first_p1_lord && lord <= last_p1_lord
}

function is_p2_lord(lord) {
	return lord >= first_p2_lord && lord <= last_p2_lord
}

function is_friendly_lord(lord) {
	return lord >= first_friendly_lord && lord <= last_friendly_lord
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

function has_teutonic_lord(here) {
	for (let lord = first_p1_lord; lord <= last_p1_lord; ++lord)
		if (get_lord_locale(lord) === here)
			return true
}

function has_russian_lord(here) {
	for (let lord = first_p2_lord; lord <= last_p2_lord; ++lord)
		if (get_lord_locale(lord) === here)
			return true
}

function has_friendly_lord(loc) {
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (get_lord_locale(lord) === loc)
			return true
	return false
}

function has_besieged_friendly_lord(loc) {
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (get_lord_locale(lord) === loc && is_lord_besieged(lord))
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

function is_p1_locale(loc) {
	return loc >= first_p1_locale && loc <= last_p1_locale
}

function is_p2_locale(loc) {
	return loc >= first_p2_locale && loc <= last_p2_locale
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
	return data.locales[loc].type === "fort" && !has_castle_marker(loc)
}

function is_town(loc) {
	return data.locales[loc].type === "town" && !has_castle_marker(loc)
}

function is_castle(loc) {
	return data.locales[loc].type === "castle" || has_castle_marker(loc)
}

function is_bishopric(loc) {
	return data.locales[loc].type === "bishopric"
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
	return set_has(game.pieces.conquered, loc)
}

function add_conquered_marker(loc) {
	set_add(game.pieces.conquered, loc)
}

function remove_conquered_marker(loc) {
	set_delete(game.pieces.conquered, loc)
}

function has_ravaged_marker(loc) {
	return set_has(game.pieces.ravaged, loc)
}

function add_ravaged_marker(loc) {
	set_add(game.pieces.ravaged, loc)
}

function remove_ravaged_marker(loc) {
	set_delete(game.pieces.ravaged, loc)
}

function count_siege_markers(loc) {
	return map_get(game.pieces.sieges, loc, 0)
}

function has_siege_marker(loc) {
	return map_get(game.pieces.sieges, loc, 0) > 0
}

function add_siege_marker(loc) {
	map_set(game.pieces.sieges, loc, map_get(game.pieces.sieges, loc, 0) + 1)
}

function remove_all_but_one_siege_markers(loc) {
	map_set(game.pieces.sieges, loc, 1)
}

function remove_all_siege_markers(loc) {
	map_delete(game.pieces.sieges, loc)
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

function conquer_stronghold(loc) {
	if (has_castle_marker(loc))
		flip_castle(loc)

	remove_all_siege_markers(loc)

	if (is_enemy_territory(loc))
		add_conquered_marker(loc)
	else
		remove_conquered_marker(loc)
}

function count_castles() {
	return game.pieces.castles1.length + game.pieces.castles2.length
}

function add_friendly_castle(loc) {
	// only P1 can add
	set_add(game.pieces.castles1, loc)
}

function has_enemy_castle(loc) {
	if (game.active === P1)
		return set_has(game.pieces.castles2, loc)
	return set_has(game.pieces.castles1, loc)
}

function has_friendly_castle(loc) {
	if (game.active === P1)
		return set_has(game.pieces.castles1, loc)
	return set_has(game.pieces.castles2, loc)
}

function has_castle_marker(loc) {
	return (
		set_has(game.pieces.castles1, loc) ||
		set_has(game.pieces.castles2, loc)
	)
}

function flip_castle(loc) {
	if (game.active === P1) {
		set_delete(game.pieces.castles2, loc)
		set_add(game.pieces.castles1, loc)
	} else {
		set_delete(game.pieces.castles1, loc)
		set_add(game.pieces.castles2, loc)
	}
}

function is_friendly_stronghold_locale(loc) {
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

function is_upper_lord(lord) {
	return map_has(game.pieces.lieutenants, lord)
}

function is_lower_lord(lord) {
	for (let i = 1; i < game.pieces.lieutenants.length; i += 2)
		if (game.pieces.lieutenants[i] === lord)
			return true
	return false
}

function get_lower_lord(upper) {
	return map_get(game.pieces.lieutenants, upper, NOBODY)
}

function set_lower_lord(upper, lower) {
	map_set(game.pieces.lieutenants, upper, lower)
}

function add_lieutenant(upper) {
	map_set(game.pieces.lieutenants, upper, NOBODY)
}

function remove_lieutenant(lord) {
	for (let i = 0; i < game.pieces.lieutenants.length; i += 2) {
		if (game.pieces.lieutenants[i] === lord || game.pieces.lieutenants[i + 1] === lord) {
			array_remove_pair(game.pieces.lieutenants, i)
			return
		}
	}
}

function is_located_with_legate(lord) {
	return get_lord_locale(lord) === game.pieces.legate
}

function group_has_capability(c) {
	for (let lord of game.group)
		if (lord_has_capability(lord, c))
			return true
	return false
}

function count_unbesieged_friendly_lords(loc) {
	let n = 0
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (get_lord_locale(lord) === loc && is_lord_unbesieged(lord))
			++n
	return n
}

// === MAP ===

function calculate_distance(start, adjacent) {
	let queue = []
	queue.push([start, 0])

	let distance = new Array(last_locale+1).fill(-1)
	distance[start] = 0

	while (queue.length > 0) {
		let [ here, d ] = queue.shift()
		for (let next of data.locales[here][adjacent]) {
			if (distance[next] < 0) {
				distance[next] = d+1
				queue.push([next, d+1])
			}
		}
	}

	return distance
}

for (let loc = 0; loc <= last_locale; ++loc) {
	data.locales[loc].distance = calculate_distance(loc, "adjacent")
	data.locales[loc].distance_by_waterway = calculate_distance(loc, "adjacent_by_waterway")
}

function locale_distance(from, to) {
	return data.locales[from].distance[to]
}

function locale_distance_by_waterway(from, to) {
	return data.locales[from].distance_by_waterway[to]
}

// === SETUP ===

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
			game.pieces.vassals[v] = VASSAL_READY
		else
			game.pieces.vassals[v] = VASSAL_UNAVAILABLE
	}
}

function disband_vassal(vassal) {
	let info = data.vassals[vassal]
	let lord = data.vassals[vassal].lord

	add_lord_forces(lord, KNIGHTS, -(info.forces.knights | 0))
	add_lord_forces(lord, SERGEANTS, -(info.forces.sergeants | 0))
	add_lord_forces(lord, LIGHT_HORSE, -(info.forces.light_horse | 0))
	add_lord_forces(lord, ASIATIC_HORSE, -(info.forces.asiatic_horse | 0))
	add_lord_forces(lord, MEN_AT_ARMS, -(info.forces.men_at_arms | 0))
	add_lord_forces(lord, MILITIA, -(info.forces.militia | 0))
	add_lord_forces(lord, SERFS, -(info.forces.serfs | 0))

	game.pieces.vassals[vassal] = VASSAL_READY

	if (!lord_has_unrouted_units(lord)) {
		disband_lord(lord)
		lift_sieges()
	}
}

function muster_vassal(lord, vassal) {
	game.pieces.vassals[vassal] = VASSAL_MUSTERED
	muster_vassal_forces(lord, vassal)
}

function draw_card(deck) {
	let i = random(deck.length)
	let c = deck[i]
	set_delete(deck, c)
	return c
}

function discard_events(when) {
	for (let i = 0; i < game.events.length; ) {
		let c = game.events[i]
		if (data.cards[c].when === when)
			array_remove(game.events, i)
		else
			++i
	}
}

function discard_friendly_events(when) {
	for (let i = 0; i < game.events.length; ) {
		let c = game.events[i]
		if (is_friendly_card(c) && data.cards[c].when === when)
			array_remove(game.events, i)
		else
			++i
	}
}

exports.setup = function (seed, scenario, options) {
	game = {
		seed,
		scenario,
		hidden: options.hidden ? 1 : 0,

		log: [],
		undo: [],

		active: P1,
		state: "setup_lords",
		stack: [],

		hand1: [],
		hand2: [],
		plan1: [],
		plan2: [],
		no1: 3,
		no2: 3,

		turn: 0,
		events: [], // this levy/this campaign cards
		capabilities: [], // global capabilities

		pieces: {
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

			conquered: [],
			ravaged: [],
			sieges: [],

			castles1: [],
			castles2: [],
			walls: [],

			legate: LEGATE_INDISPOSED,
			legate_selected: 0,
			veche_vp: 0,
			veche_coin: 0,
			smerdi: 0,
		},

		flags: {
			first_action: 0,
			first_march: 0,
			teutonic_raiders: 0,
			famine: 0,
			lodya: 0,
		},

		command: NOBODY,
		actions: 0,
		group: 0,
		who: NOBODY,
		where: NOWHERE,
		what: NOTHING,
		count: 0,

		supply: 0,
		march: 0,
		battle: 0,
		spoils: 0,
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
		case "Test":
			setup_test()
			break
	}

	return game
}

function setup_pleskau() {
	game.turn = 1 << 1

	// Count Enemy Lords Removed in this scenario
	game.pieces.elr1 = 0
	game.pieces.elr2 = 0

	// Remove all No Event cards in this scenario
	game.no1 = 0
	game.no2 = 0

	game.pieces.veche_vp = 1

	muster_lord(LORD_HERMANN, LOC_DORPAT, 4)
	muster_lord(LORD_KNUD_ABEL, LOC_REVAL, 3)
	muster_lord(LORD_YAROSLAV, LOC_ODENPAH, 2)
	muster_lord(LORD_GAVRILO, LOC_PSKOV, 4)
	muster_lord(LORD_VLADISLAV, LOC_NEVA, 3)

	set_lord_cylinder_on_calendar(LORD_RUDOLF, 1)
	set_lord_cylinder_on_calendar(LORD_DOMASH, 1)
}

function setup_watland() {
	game.turn = 4 << 1

	game.pieces.veche_vp = 1
	game.pieces.veche_coin = 1

	set_add(game.pieces.conquered, LOC_IZBORSK)
	set_add(game.pieces.conquered, LOC_PSKOV)
	set_add(game.pieces.ravaged, LOC_PSKOV)
	set_add(game.pieces.ravaged, LOC_DUBROVNO)

	muster_lord(LORD_ANDREAS, LOC_FELLIN, 7)
	muster_lord(LORD_KNUD_ABEL, LOC_WESENBERG, 6)
	muster_lord(LORD_DOMASH, LOC_NOVGOROD, 7)
	muster_lord(LORD_VLADISLAV, LOC_LADOGA, 6)

	set_lord_cylinder_on_calendar(LORD_RUDOLF, 4)
	set_lord_cylinder_on_calendar(LORD_KARELIANS, 4)
	set_lord_cylinder_on_calendar(LORD_YAROSLAV, 5)
	set_lord_cylinder_on_calendar(LORD_ANDREY, 5)
	set_lord_cylinder_on_calendar(LORD_HEINRICH, 7)
	set_lord_cylinder_on_calendar(LORD_ALEKSANDR, 7)
	set_lord_cylinder_on_calendar(LORD_HERMANN, 8)
}

function setup_peipus() {
	game.turn = 13 << 1

	game.pieces.veche_vp = 4
	game.pieces.veche_coin = 3

	set_add(game.pieces.castles2, LOC_KOPORYE)
	set_add(game.pieces.conquered, LOC_IZBORSK)
	set_add(game.pieces.conquered, LOC_PSKOV)
	set_add(game.pieces.ravaged, LOC_VOD)
	set_add(game.pieces.ravaged, LOC_ZHELTSY)
	set_add(game.pieces.ravaged, LOC_TESOVO)
	set_add(game.pieces.ravaged, LOC_SABLIA)
	set_add(game.pieces.ravaged, LOC_PSKOV)
	set_add(game.pieces.ravaged, LOC_DUBROVNO)

	muster_lord(LORD_HERMANN, LOC_DORPAT, 16)
	muster_lord(LORD_YAROSLAV, LOC_PSKOV, 14)
	muster_lord(LORD_ALEKSANDR, LOC_NOVGOROD, 16)
	muster_lord(LORD_ANDREY, LOC_NOVGOROD, 16)
	muster_lord(LORD_DOMASH, LOC_NOVGOROD, 16)
	muster_lord(LORD_KARELIANS, LOC_NOVGOROD, 14)

	set_lord_cylinder_on_calendar(LORD_HEINRICH, 13)
	set_lord_cylinder_on_calendar(LORD_KNUD_ABEL, 13)
	set_lord_cylinder_on_calendar(LORD_RUDOLF, 13)
	set_lord_cylinder_on_calendar(LORD_GAVRILO, 13)
	set_lord_cylinder_on_calendar(LORD_VLADISLAV, 15)
}

function setup_return_of_the_prince() {
	game.turn = 9 << 1

	game.pieces.veche_vp = 3
	game.pieces.veche_coin = 2

	set_add(game.pieces.castles1, LOC_KOPORYE)
	set_add(game.pieces.conquered, LOC_KAIBOLOVO)
	set_add(game.pieces.conquered, LOC_KOPORYE)
	set_add(game.pieces.conquered, LOC_IZBORSK)
	set_add(game.pieces.conquered, LOC_PSKOV)
	set_add(game.pieces.ravaged, LOC_VOD)
	set_add(game.pieces.ravaged, LOC_ZHELTSY)
	set_add(game.pieces.ravaged, LOC_TESOVO)
	set_add(game.pieces.ravaged, LOC_SABLIA)
	set_add(game.pieces.ravaged, LOC_PSKOV)
	set_add(game.pieces.ravaged, LOC_DUBROVNO)

	muster_lord(LORD_ANDREAS, LOC_KOPORYE, 12)
	muster_lord(LORD_ALEKSANDR, LOC_NOVGOROD, 14)

	set_lord_cylinder_on_calendar(LORD_HERMANN, 9)
	set_lord_cylinder_on_calendar(LORD_RUDOLF, 9)
	set_lord_cylinder_on_calendar(LORD_YAROSLAV, 9)
	set_lord_cylinder_on_calendar(LORD_ANDREY, 9)
	set_lord_cylinder_on_calendar(LORD_KARELIANS, 9)
	set_lord_cylinder_on_calendar(LORD_GAVRILO, 9)
	set_lord_cylinder_on_calendar(LORD_VLADISLAV, 10)
	set_lord_cylinder_on_calendar(LORD_HEINRICH, 11)
	set_lord_cylinder_on_calendar(LORD_KNUD_ABEL, 11)
	set_lord_cylinder_on_calendar(LORD_DOMASH, 11)
}

function setup_return_of_the_prince_nicolle() {
	game.turn = 9 << 1

	game.pieces.veche_vp = 3
	game.pieces.veche_coin = 2

	set_add(game.pieces.castles1, LOC_KOPORYE)
	set_add(game.pieces.conquered, LOC_KAIBOLOVO)
	set_add(game.pieces.conquered, LOC_KOPORYE)
	set_add(game.pieces.ravaged, LOC_VOD)
	set_add(game.pieces.ravaged, LOC_ZHELTSY)
	set_add(game.pieces.ravaged, LOC_TESOVO)
	set_add(game.pieces.ravaged, LOC_SABLIA)

	muster_lord(LORD_ANDREAS, LOC_RIGA, 12)
	muster_lord(LORD_HERMANN, LOC_DORPAT, 12)
	muster_lord(LORD_KNUD_ABEL, LOC_KOPORYE, 11)
	muster_lord(LORD_ALEKSANDR, LOC_NOVGOROD, 14)
	muster_lord(LORD_GAVRILO, LOC_PSKOV, 12)

	set_lord_cylinder_on_calendar(LORD_RUDOLF, 9)
	set_lord_cylinder_on_calendar(LORD_YAROSLAV, 9)
	set_lord_cylinder_on_calendar(LORD_ANDREY, 9)
	set_lord_cylinder_on_calendar(LORD_KARELIANS, 9)
	set_lord_cylinder_on_calendar(LORD_VLADISLAV, 10)
	set_lord_cylinder_on_calendar(LORD_HEINRICH, 11)
	set_lord_cylinder_on_calendar(LORD_DOMASH, 11)
}

function setup_crusade_on_novgorod() {
	game.turn = 1 << 1

	game.pieces.veche_vp = 1
	game.pieces.veche_coin = 0

	muster_lord(LORD_HERMANN, LOC_DORPAT, 4)
	muster_lord(LORD_KNUD_ABEL, LOC_REVAL, 3)
	muster_lord(LORD_YAROSLAV, LOC_ODENPAH, 2)
	muster_lord(LORD_GAVRILO, LOC_PSKOV, 4)
	muster_lord(LORD_VLADISLAV, LOC_NEVA, 3)

	set_lord_cylinder_on_calendar(LORD_ANDREAS, 3)
	set_lord_cylinder_on_calendar(LORD_HEINRICH, 1)
	set_lord_cylinder_on_calendar(LORD_RUDOLF, 1)
	set_lord_cylinder_on_calendar(LORD_DOMASH, 1)
	set_lord_cylinder_on_calendar(LORD_KARELIANS, 3)
	set_lord_cylinder_on_calendar(LORD_ALEKSANDR, 5)
	set_lord_cylinder_on_calendar(LORD_ANDREY, 5)
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
	game.pieces.legate = LOC_DORPAT

	set_add(game.capabilities, R8)
	muster_lord(LORD_DOMASH, LOC_NOVGOROD)
	add_lord_assets(LORD_DOMASH, BOAT, 2)
	add_lord_assets(LORD_DOMASH, CART, 2)

	muster_vassal(LORD_GAVRILO, data.lords[LORD_GAVRILO].vassals[0])
	set_lord_capability(LORD_GAVRILO, 0, R2)
	set_lord_capability(LORD_GAVRILO, 1, R6)

	game.pieces.veche_coin += 1

	goto_campaign_plan()

	game.plan1 = [ LORD_YAROSLAV, LORD_RUDOLF, LORD_HERMANN, LORD_HERMANN, LORD_RUDOLF, LORD_HERMANN ]
	game.plan2 = [ LORD_GAVRILO, LORD_VLADISLAV, LORD_DOMASH, LORD_GAVRILO, LORD_DOMASH, LORD_DOMASH ]

	// goto_command_activation()
}

function setup_test() {
	setup_pleskau_quickstart()
	set_add(game.capabilities, AOW_TEUTONIC_RANSOM)
	set_add(game.capabilities, AOW_RUSSIAN_RANSOM)

	set_lord_locale(LORD_KNUD_ABEL, LOC_ODENPAH)
	set_lord_locale(LORD_HERMANN, LOC_ODENPAH)
	set_lord_locale(LORD_RUDOLF, LOC_ODENPAH)

	set_lord_locale(LORD_DOMASH, LOC_PSKOV)
	set_lord_locale(LORD_VLADISLAV, LOC_IZBORSK)

	for (let c = first_p1_card; c <= last_p1_card; ++c)
		if (data.cards[c].when === "hold")
			game.hand1.push(c)
	for (let c = first_p2_card; c <= last_p2_card; ++c)
		if (data.cards[c].when === "hold")
			game.hand2.push(c)
}

states.setup_lords = {
	inactive: "Set up Lords",
	prompt() {
		view.prompt = "Set up your Lords."
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

		// FIXME: clean up these transitions
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

function is_ravens_rock_in_play() {
	if (game.battle.round <= 1 && is_melee_step()) {
		if (game.active === RUSSIANS)
			return is_event_in_play(EVENT_RUSSIAN_RAVENS_ROCK)
	}
	return false
}

function is_marsh_in_play() {
	if (game.battle.round <= 2) {
		if (game.active === TEUTONS && is_event_in_play(EVENT_RUSSIAN_MARSH))
			return true
		if (game.active === RUSSIANS && is_event_in_play(EVENT_TEUTONIC_MARSH))
			return true
	}
	return false
}

function is_hill_in_play() {
	if (game.battle.round <= 2) {
		if (game.active === TEUTONS && is_event_in_play(EVENT_TEUTONIC_HILL))
			return true
		if (game.active === RUSSIANS && is_event_in_play(EVENT_RUSSIAN_HILL))
			return true
	}
	return false
}

function is_famine_in_play() {
	if (game.active === TEUTONS)
		if (is_event_in_play(EVENT_RUSSIAN_FAMINE))
			return true
	if (game.active === RUSSIANS)
		if (is_event_in_play(EVENT_TEUTONIC_FAMINE))
			return true
	return false
}

function no_muster_of_or_by_lord(lord) {
	if (lord === LORD_KNUD_ABEL)
		return is_event_in_play(EVENT_RUSSIAN_VALDEMAR)
	if (lord === LORD_ANDREAS || lord === LORD_RUDOLF)
		return is_event_in_play(EVENT_RUSSIAN_DIETRICH_VON_GRUNINGEN)
	return false
}

function goto_immediate_event(c) {
	switch (c) {
		// This Levy / Campaign
		case EVENT_TEUTONIC_FAMINE:
		case EVENT_RUSSIAN_FAMINE:
			set_add(game.events, c)
			// No immediate effects
			return end_immediate_event()
		case EVENT_RUSSIAN_DEATH_OF_THE_POPE:
			set_add(game.events, c)
			return goto_russian_event_death_of_the_pope()
		case EVENT_RUSSIAN_VALDEMAR:
			set_add(game.events, c)
			return goto_russian_event_valdemar()
		case EVENT_RUSSIAN_DIETRICH_VON_GRUNINGEN:
			set_add(game.events, c)
			return goto_russian_event_dietrich()

		// Add to capabilities...
		case EVENT_TEUTONIC_POPE_GREGORY:
			deploy_global_capability(c)
			return goto_teutonic_event_pope_gregory()

		// Discard
		case EVENT_TEUTONIC_GRAND_PRINCE:
			return goto_teutonic_event_grand_prince()
		case EVENT_TEUTONIC_KHAN_BATY:
			return goto_teutonic_event_khan_baty()
		case EVENT_TEUTONIC_SWEDISH_CRUSADE:
			return goto_teutonic_event_swedish_crusade()
		case EVENT_RUSSIAN_OSILIAN_REVOLT:
			return goto_russian_event_osilian_revolt()
		case EVENT_RUSSIAN_BATU_KHAN:
			return goto_russian_event_batu_khan()
		case EVENT_RUSSIAN_PRUSSIAN_REVOLT:
			return goto_russian_event_prussian_revolt()
		case EVENT_TEUTONIC_BOUNTIFUL_HARVEST:
			return goto_event_bountiful_harvest()
		case EVENT_RUSSIAN_BOUNTIFUL_HARVEST:
			return goto_event_bountiful_harvest()
		case EVENT_TEUTONIC_MINDAUGAS:
			return goto_teutonic_event_mindaugas()
		case EVENT_RUSSIAN_MINDAUGAS:
			return goto_russian_event_mindaugas()
		case EVENT_TEUTONIC_TORZHOK:
			return goto_teutonic_event_torzhok()
		case EVENT_RUSSIAN_TEMPEST:
			return goto_russian_event_tempest()

		default:
			log("TODO")
			return end_immediate_event()
	}
}

function end_immediate_event() {
	clear_undo()
	resume_levy_arts_of_war()
}

// === EVENTS: UNIQUE IMMEDIATE EVENTS ===

function goto_russian_event_death_of_the_pope() {
	if (has_global_capability(AOW_TEUTONIC_WILLIAM_OF_MODENA))
		game.state = "death_of_the_pope"
	else
		end_immediate_event()
}

states.death_of_the_pope = {
	inactive: "Death of the Pope",
	prompt() {
		view.prompt = "Death of the Pope: Discard William of Modena."
		gen_action_card(AOW_TEUTONIC_WILLIAM_OF_MODENA)
	},
	card(_) {
		discard_global_capability(AOW_TEUTONIC_WILLIAM_OF_MODENA)
		end_immediate_event()
	},
}

function goto_teutonic_event_torzhok() {
	if (is_lord_on_map(LORD_DOMASH)) {
		game.who = LORD_DOMASH
		game.count = 3
		game.state = "torzhok"
	} else if (game.pieces.veche_coin > 0) {
		game.who = NOBODY
		game.count = 3
		game.state = "torzhok"
	} else {
		end_immediate_event()
	}
}

function action_torzhok(lord, asset) {
	push_undo()
	log(`Removed ${ASSET_TYPE_NAME[asset]} from L${lord}.`)
	add_lord_assets(lord, asset, -1)
	game.count--
}

states.torzhok = {
	inactive: "Torzhok",
	prompt() {
		view.reveal |= (1 << LORD_DOMASH) // Reveal Domash if hidden mats
		if (game.count > 0) {
			if (game.count === 3)
				view.prompt = "Torzhok: Remove up to 3 Assets from Domash or up to 3 Coin from Veche."
			if (game.count === 3 || game.who === NOBODY) {
				if (game.count < 3)
					view.prompt = `Torzhok: Remove up to ${game.count} Coin from Veche.`
				if (game.pieces.veche_coin > 0)
					view.actions.veche_coin = 1
			}
			if (game.count === 3 || game.who === LORD_DOMASH) {
				if (game.count < 3)
					view.prompt = `Torzhok: Remove up to ${game.count} Assets from Domash.`
				if (get_lord_assets(LORD_DOMASH, PROV) > 0)
					gen_action_prov(LORD_DOMASH)
				if (get_lord_assets(LORD_DOMASH, COIN) > 0)
					gen_action_coin(LORD_DOMASH)
				if (get_lord_assets(LORD_DOMASH, LOOT) > 0)
					gen_action_loot(LORD_DOMASH)
				if (get_lord_assets(LORD_DOMASH, CART) > 0)
					gen_action_cart(LORD_DOMASH)
				if (get_lord_assets(LORD_DOMASH, SLED) > 0)
					gen_action_sled(LORD_DOMASH)
				if (get_lord_assets(LORD_DOMASH, BOAT) > 0)
					gen_action_boat(LORD_DOMASH)
				if (get_lord_assets(LORD_DOMASH, SHIP) > 0)
					gen_action_ship(LORD_DOMASH)
			}
		} else {
			view.prompt = "Torzhok: All done."
		}
		view.actions.done = 1
	},
	prov(lord) { action_torzhok(lord, PROV) },
	coin(lord) { action_torzhok(lord, COIN) },
	loot(lord) { action_torzhok(lord, LOOT) },
	cart(lord) { action_torzhok(lord, CART) },
	sled(lord) { action_torzhok(lord, SLED) },
	boat(lord) { action_torzhok(lord, BOAT) },
	ship(lord) { action_torzhok(lord, SHIP) },
	veche_coin() {
		push_undo()
		log(`Removed Coin from Veche.`)
		game.pieces.veche_coin -= 1
		game.who = NOBODY
		game.count--
	},
	done() {
		clear_undo()
		game.who = NOBODY
		game.count = 0
		end_immediate_event()
	},
}

function goto_russian_event_tempest() {
	game.state = "tempest"
	for (let lord = first_enemy_lord; lord <= last_enemy_lord; ++lord)
		if (get_lord_assets(lord, SHIP) > 0)
			return
	end_immediate_event()
}

states.tempest = {
	inactive: "Tempest",
	prompt() {
		view.prompt = "Tempest: Remove all Ships from a Teutonic Lord (half if he has Cogs)."
		for (let lord = first_enemy_lord; lord <= last_enemy_lord; ++lord)
			if (get_lord_assets(lord, SHIP) > 0)
				gen_action_ship(lord)
	},
	ship(lord) {
		log(`Removed Ships from L${lord}.`)
		let n = 0
		if (lord_has_capability(lord, AOW_TEUTONIC_COGS))
			n = get_lord_assets(lord, SHIP) >> 1
		set_lord_assets(lord, SHIP, n)
		end_immediate_event()
	},
}

function goto_event_bountiful_harvest() {
	game.state = "bountiful_harvest"
	for (let loc of game.pieces.ravaged)
		if (is_friendly_territory(loc))
			return
	end_immediate_event()
}

states.bountiful_harvest = {
	inactive: "Bountiful Harvest",
	prompt() {
		if (game.active === TEUTONS)
			view.prompt = "Bountiful Harvest: Remove 1 Ravaged marker from Livonia or Estonia."
		else
			view.prompt = "Bountiful Harvest: Remove 1 Ravaged marker from Rus."
		for (let loc of game.pieces.ravaged)
			if (is_friendly_territory(loc))
				gen_action_locale(loc)
	},
	locale(loc) {
		log(`Removed Ravaged from %${loc}.`)
		remove_ravaged_marker(loc)
		end_immediate_event()
	},
}

const TEUTONIC_MINDAUGAS = [
	LOC_OSTROV,
	LOC_DUBROVNO,
	LOC_UZMEN,
	LOC_SOROT_RIVER,
	LOC_VELIKAYA_RIVER,
	LOC_ZHELCHA_RIVER,
]

const RUSSIAN_MINDAUGAS = [
	LOC_ROSITTEN,
	LOC_LETTGALLIA,
	LOC_TOLOWA,
]

function goto_teutonic_event_mindaugas() {
	game.state = "teutonic_mindaugas"
	for (let loc of TEUTONIC_MINDAUGAS)
		if (!has_enemy_lord(loc) && !is_enemy_stronghold(loc) && !has_ravaged_marker(loc))
			return
	end_immediate_event()
}

function goto_russian_event_mindaugas() {
	game.state = "russian_mindaugas"
	for (let loc of RUSSIAN_MINDAUGAS)
		if (!has_enemy_lord(loc) && !is_enemy_stronghold(loc) && !has_ravaged_marker(loc))
			return
	end_immediate_event()
}

states.teutonic_mindaugas = {
	inactive: "Mindaugas",
	prompt() {
		view.prompt = "Mindaugas: Place Ravaged near Ostrov."
		for (let loc of TEUTONIC_MINDAUGAS)
			if (!has_enemy_lord(loc) && !is_enemy_stronghold(loc) && !has_ravaged_marker(loc))
				gen_action_locale(loc)
	},
	locale(loc) {
		log(`Ravaged %${loc}.`)
		add_ravaged_marker(loc)
		end_immediate_event()
	},
}

states.russian_mindaugas = {
	inactive: "Mindaugas",
	prompt() {
		view.prompt = "Mindaugas: Place Ravaged near Rositten."
		for (let loc of RUSSIAN_MINDAUGAS)
			if (!has_enemy_lord(loc) && !is_enemy_stronghold(loc) && !has_ravaged_marker(loc))
				gen_action_locale(loc)
	},
	locale(loc) {
		log(`Ravaged %${loc}.`)
		add_ravaged_marker(loc)
		end_immediate_event()
	},
}

function goto_teutonic_event_pope_gregory() {
	game.state = "pope_gregory"
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (is_lord_on_calendar(lord))
			return
	end_immediate_event()
}

states.pope_gregory = {
	inactive: "Pope Gregory",
	prompt() {
		view.prompt = "Pope Gregory: On Calendar, slide 1 Teuton cylinder 1 box left."
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (is_lord_on_calendar(lord))
				prompt_select_lord(lord)
		if (game.who !== NOBODY)
			gen_action_calendar(get_lord_calendar(game.who) - 1)
	},
	lord: action_select_lord,
	calendar(turn) {
		log(`Shifted L${game.who} to ${turn}.`)
		set_lord_calendar(game.who, turn)
		game.who = NOBODY
		end_immediate_event()
	},
}

function is_nothing_at_riga() {
	// No pieces or markers
	return !(
		has_friendly_lord(LOC_RIGA) ||
		has_enemy_lord(LOC_RIGA) ||
		game.pieces.legate === LOC_RIGA ||
		has_conquered_marker(LOC_RIGA) ||
		has_ravaged_marker(LOC_RIGA)
	)
}

function goto_russian_event_prussian_revolt() {
	if (is_lord_on_map(LORD_ANDREAS) && is_lord_unbesieged(LORD_ANDREAS) && is_nothing_at_riga()) {
		game.who = LORD_ANDREAS
		game.state = "prussian_revolt"
	} else if (is_lord_on_calendar(LORD_ANDREAS)) {
		game.who = LORD_ANDREAS
		game.state = "prussian_revolt"
	} else {
		end_immediate_event()
	}
}

states.prussian_revolt = {
	inactive: "Prussian Revolt",
	prompt() {
		if (is_lord_on_calendar(game.who)) {
			view.prompt = "Prussian Revolt: Shift Andreas 2 boxes right."
			gen_action_calendar(get_lord_calendar(game.who) + 2)
		} else {
			view.prompt = "Prussian Revolt: Place Andreas at Riga."
			gen_action_locale(LOC_RIGA)
		}
	},
	locale(_) {
		log(`Placed L${game.who} at %${LOC_RIGA}.`)
		set_lord_locale(game.who, LOC_RIGA)
		game.who = NOBODY
		end_immediate_event()
	},
	calendar(turn) {
		log(`Shifted L${game.who} to Calendar ${turn}.`)
		set_lord_calendar(game.who, turn)
		game.who = NOBODY
		end_immediate_event()
	},
}

// === EVENTS: SHIFT LORD OR SERVICE (IMMEDIATE) ===

function prompt_shift_lord_on_calendar(boxes) {
	if (game.who !== NOBODY) {
		// Shift in direction beneficial to active player.
		if (is_friendly_lord(game.who)) {
			if (is_lord_on_calendar(game.who))
				gen_action_calendar(get_lord_calendar(game.who) - boxes)
			else
				gen_action_calendar(get_lord_calendar(game.who) + boxes)
		} else {
			if (is_lord_on_calendar(game.who))
				gen_action_calendar(get_lord_calendar(game.who) + boxes)
			else
				gen_action_calendar(get_lord_calendar(game.who) - boxes)
		}
	}
}

function goto_teutonic_event_grand_prince() {
	if (is_lord_in_play(LORD_ALEKSANDR) || is_lord_in_play(LORD_ANDREY))
		game.state = "grand_prince"
	else
		end_immediate_event()
}

states.grand_prince = {
	inactive: "Grand Prince",
	prompt() {
		view.prompt = "Grand Prince: On Calendar, shift Aleksandr or Andrey or furthest right Service of either 2 boxes."

		if (is_lord_on_calendar(LORD_ALEKSANDR) && game.who !== LORD_ALEKSANDR)
			gen_action_lord(LORD_ALEKSANDR)

		if (is_lord_on_calendar(LORD_ANDREY) && game.who !== LORD_ANDREY)
			gen_action_lord(LORD_ANDREY)

		if (is_lord_on_map(LORD_ALEKSANDR) && is_lord_on_map(LORD_ANDREY)) {
			let aleksandr = get_lord_service(LORD_ALEKSANDR)
			let andrey = get_lord_service(LORD_ANDREY)
			if (aleksandr >= andrey)
				gen_action_service(LORD_ALEKSANDR)
			if (andrey >= aleksandr)
				gen_action_service(LORD_ANDREY)
		} else if (is_lord_on_map(LORD_ALEKSANDR)) {
			gen_action_service(LORD_ALEKSANDR)
		} else if (is_lord_on_map(LORD_ANDREY)) {
			gen_action_service(LORD_ANDREY)
		}

		prompt_shift_lord_on_calendar(2)
	},
	lord: action_select_lord,
	service: action_select_lord,
	calendar(turn) {
		log(`Shifted L${game.who} to ${turn}.`)
		set_lord_calendar(game.who, turn)
		game.who = NOBODY
		end_immediate_event()
	},
}

function goto_teutonic_event_khan_baty() {
	if (is_lord_in_play(LORD_ALEKSANDR) || is_lord_in_play(LORD_ANDREY))
		game.state = "khan_baty"
	else
		end_immediate_event()
}

states.khan_baty = {
	inactive: "Khan Baty",
	prompt() {
		view.prompt = "Khan Baty: On Calendar, shift Aleksandr or Andrey or Service of either 2 boxes."
		if (is_lord_in_play(LORD_ALEKSANDR))
			prompt_select_lord_on_calendar(LORD_ALEKSANDR)
		if (is_lord_in_play(LORD_ANDREY))
			prompt_select_lord_on_calendar(LORD_ANDREY)
		prompt_shift_lord_on_calendar(2)
	},
	lord: action_select_lord,
	service: action_select_lord,
	calendar(turn) {
		log(`Shifted L${game.who} to ${turn}.`)
		set_lord_calendar(game.who, turn)
		game.who = NOBODY
		end_immediate_event()
	},
}

function goto_teutonic_event_swedish_crusade() {
	if (is_lord_in_play(LORD_VLADISLAV) || is_lord_in_play(LORD_KARELIANS)) {
		game.state = "swedish_crusade"
		game.count = 0
		if (is_lord_in_play(LORD_VLADISLAV))
			game.count |= (1 << LORD_VLADISLAV)
		if (is_lord_in_play(LORD_KARELIANS))
			game.count |= (1 << LORD_KARELIANS)
	} else {
		end_immediate_event()
	}
}

states.swedish_crusade = {
	inactive: "Swedish Crusade",
	prompt() {
		view.prompt = "Swedish Crusade: On Calendar, shift Vladislav and Karelians each 1 box."
		if (game.count & (1 << LORD_VLADISLAV))
			prompt_select_lord_on_calendar(LORD_VLADISLAV)
		if (game.count & (1 << LORD_KARELIANS))
			prompt_select_lord_on_calendar(LORD_KARELIANS)
		prompt_shift_lord_on_calendar(1)
	},
	lord: action_select_lord,
	service: action_select_lord,
	calendar(turn) {
		game.count ^= (1 << game.who)
		log(`Shifted L${game.who} to ${turn}.`)
		set_lord_calendar(game.who, turn)
		game.who = NOBODY
		if (game.count === 0)
			end_immediate_event()
	},
}

function goto_russian_event_valdemar() {
	if (is_lord_in_play(LORD_KNUD_ABEL)) {
		game.who = LORD_KNUD_ABEL
		game.state = "valdemar"
	} else {
		end_immediate_event()
	}
}

states.valdemar = {
	inactive: "Valdemar",
	prompt() {
		view.prompt = "Valdemar: On Calendar, shift Knud & Abel up to 1 box."
		prompt_shift_lord_on_calendar(1)
	},
	lord: action_select_lord,
	service: action_select_lord,
	calendar(turn) {
		log(`Shifted L${game.who} to ${turn}.`)
		set_lord_calendar(game.who, turn)
		game.who = NOBODY
		end_immediate_event()
	},
}

function goto_russian_event_osilian_revolt() {
	if (is_lord_on_map(LORD_ANDREAS) || is_lord_on_map(LORD_HEINRICH)) {
		set_active_enemy()
		game.state = "osilian_revolt"
		game.count = 2
	} else {
		end_immediate_event()
	}
}

states.osilian_revolt = {
	inactive: "Osilian Revolt",
	prompt() {
		view.prompt = "Osilian Revolt: On Calendar, shift Service of Andreas or Heinrich 2 boxes left."
		// NOTE: Service only!
		if (is_lord_on_map(LORD_ANDREAS) && game.who !== LORD_ANDREAS)
			gen_action_service(LORD_ANDREAS)
		if (is_lord_on_map(LORD_HEINRICH) && game.who !== LORD_HEINRICH)
			gen_action_service(LORD_HEINRICH)
		if (game.who !== NOBODY)
			gen_action_calendar(get_lord_calendar(game.who) - 2)
	},
	service: action_select_lord,
	calendar(turn) {
		set_active_enemy()
		log(`Shifted L${game.who} to ${turn}.`)
		set_lord_calendar(game.who, turn)
		game.who = NOBODY
		end_immediate_event()
	},
}

function goto_russian_event_batu_khan() {
	if (is_lord_in_play(LORD_ANDREAS)) {
		game.who = LORD_ANDREAS
		game.state = "batu_khan"
	} else {
		end_immediate_event()
	}
}

states.batu_khan = {
	inactive: "Batu Khan",
	prompt() {
		view.prompt = "Batu Khan: On Calendar, shift Andreas up to 2 boxes."
		prompt_shift_lord_on_calendar(2)
	},
	lord: action_select_lord,
	service: action_select_lord,
	calendar(turn) {
		log(`Shifted L${game.who} to ${turn}.`)
		set_lord_calendar(game.who, turn)
		game.who = NOBODY
		end_immediate_event()
	},
}

function goto_russian_event_dietrich() {
	if (is_lord_in_play(LORD_ANDREAS) || is_lord_in_play(LORD_RUDOLF))
		game.state = "russian_dietrich_von_gruningen"
	else
		end_immediate_event()
}

states.russian_dietrich_von_gruningen = {
	inactive: "Dietrich von Grüningen",
	prompt() {
		view.prompt = "Dietrich von Grüningen: On Calendar, shift Andreas or Rudolf 1 box."
		if (is_lord_in_play(LORD_ANDREAS))
			prompt_select_lord_on_calendar(LORD_ANDREAS)
		if (is_lord_in_play(LORD_RUDOLF))
			prompt_select_lord_on_calendar(LORD_RUDOLF)
		prompt_shift_lord_on_calendar(1)
	},
	lord: action_select_lord,
	service: action_select_lord,
	calendar(turn) {
		log(`Shifted L${game.who} to ${turn}.`)
		set_lord_calendar(game.who, turn)
		game.who = NOBODY
		end_immediate_event()
	},
}

// === EVENTS: HOLD ===

function play_held_event(c) {
	log(`Played E${c}.`)
	if (c >= first_p1_card && c <= last_p1_card_no_event)
		set_delete(game.hand1, c)
	else
		set_delete(game.hand2, c)
}

function end_held_event() {
	pop_state()
	game.what = NOTHING
}

function prompt_held_event() {
	for (let c of current_hand())
		if (can_play_held_event(c))
			gen_action_card(c)
}

function prompt_held_event_lordship() {
	for (let c of current_hand())
		if (can_play_held_event(c) || can_play_held_event_lordship(c))
			gen_action_card(c)
}

function can_play_held_event(c) {
	switch (c) {
		case EVENT_TEUTONIC_HEINRICH_SEES_THE_CURIA:
			return can_play_heinrich_sees_the_curia()
		case EVENT_TEUTONIC_VODIAN_TREACHERY:
			return can_play_vodian_treachery()
		case EVENT_RUSSIAN_POGOST:
			return can_play_pogost()
		case EVENT_TEUTONIC_TVERDILO:
			return is_lord_on_calendar(LORD_HERMANN) || is_lord_on_calendar(LORD_YAROSLAV)
		case EVENT_TEUTONIC_TEUTONIC_FERVOR:
			return is_lord_on_calendar(LORD_RUDOLF)
		case EVENT_TEUTONIC_DIETRICH_VON_GRUNINGEN:
			return is_lord_on_calendar(LORD_ANDREAS) || is_lord_on_calendar(LORD_RUDOLF)
		case EVENT_RUSSIAN_PRINCE_OF_POLOTSK:
			return (
				is_lord_on_calendar(LORD_ALEKSANDR) ||
				is_lord_on_calendar(LORD_ANDREY) ||
				is_lord_on_calendar(LORD_DOMASH) ||
				is_lord_on_calendar(LORD_GAVRILO) ||
				is_lord_on_calendar(LORD_KARELIANS) ||
				is_lord_on_calendar(LORD_VLADISLAV)
			)
		case EVENT_RUSSIAN_PELGUI:
			return is_lord_on_calendar(LORD_VLADISLAV) || is_lord_on_calendar(LORD_KARELIANS)
	}
	return false
}

function can_play_held_event_lordship(c) {
	switch (c) {
		case EVENT_TEUTONIC_TVERDILO:
			return game.who === LORD_HERMANN || game.who === LORD_YAROSLAV
		case EVENT_TEUTONIC_TEUTONIC_FERVOR:
			return game.who === LORD_RUDOLF
		case EVENT_TEUTONIC_DIETRICH_VON_GRUNINGEN:
			return game.who === LORD_ANDREAS || game.who === LORD_RUDOLF
		case EVENT_RUSSIAN_PRINCE_OF_POLOTSK:
			return (
				game.who === LORD_ALEKSANDR ||
				game.who === LORD_ANDREY ||
				game.who === LORD_DOMASH ||
				game.who === LORD_GAVRILO ||
				game.who === LORD_KARELIANS ||
				game.who === LORD_VLADISLAV
			)
		case EVENT_RUSSIAN_PELGUI:
			return game.who === LORD_VLADISLAV || game.who === LORD_KARELIANS
	}
	return false
}

function action_held_event(c) {
	push_undo()
	play_held_event(c)
	game.what = c
	goto_held_event(c)
}

function goto_held_event(c) {
	switch (c) {
		case EVENT_TEUTONIC_HEINRICH_SEES_THE_CURIA:
			push_state("heinrich_sees_the_curia")
			break
		case EVENT_TEUTONIC_VODIAN_TREACHERY:
			push_state("vodian_treachery")
			break
		case EVENT_RUSSIAN_POGOST:
			push_state("pogost")
			break
		case EVENT_TEUTONIC_TVERDILO:
			goto_held_event_tverdilo()
			break
		case EVENT_TEUTONIC_TEUTONIC_FERVOR:
			goto_held_event_teutonic_fervor()
			break
		case EVENT_TEUTONIC_DIETRICH_VON_GRUNINGEN:
			goto_held_event_dietrich_von_gruningen()
			break
		case EVENT_RUSSIAN_PRINCE_OF_POLOTSK:
			goto_held_event_prince_of_polotsk()
			break
		case EVENT_RUSSIAN_PELGUI:
			goto_held_event_pelgui()
			break
	}
}

// === EVENTS: HOLD - UNIQUE ===

function can_play_pogost() {
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (is_in_rus(get_lord_locale(lord)))
			return true
	return false
}

states.pogost = {
	inactive: "Pogost",
	prompt() {
		view.prompt = "Pogost: Add 4 Provender to a Lord in Rus."
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (is_in_rus(get_lord_locale(lord)))
				gen_action_lord(lord)
	},
	lord(lord) {
		add_lord_assets(lord, PROV, 4)
		end_held_event()
	},
}

function can_play_vodian_treachery() {
	if (is_fort(LOC_KAIBOLOVO) && is_teuton_closer_than_russian(LOC_KAIBOLOVO))
		return true
	if (is_fort(LOC_KOPORYE) && is_teuton_closer_than_russian(LOC_KOPORYE))
		return true
	return false
}

function is_teuton_closer_than_russian(where) {
	return closest_to_locale(where, first_p1_lord, last_p1_lord) < closest_to_locale(where, first_p2_lord, last_p2_lord)
}

function closest_to_locale(where, first, last) {
	let min = 100
	for (let lord = first; lord <= last; ++lord) {
		if (is_lord_on_map(lord)) {
			let d = locale_distance(where, get_lord_locale(lord))
			if (d < min)
				min = d
		}
	}
	return min
}

states.vodian_treachery = {
	inactive: "Vodian Treachery",
	prompt() {
		view.prompt = "Vodian Treachery: Conquer Kaibolovo or Koporye Fort."
		if (is_fort(LOC_KAIBOLOVO) && is_teuton_closer_than_russian(LOC_KAIBOLOVO))
			gen_action_locale(LOC_KAIBOLOVO)
		if (is_fort(LOC_KOPORYE) && is_teuton_closer_than_russian(LOC_KOPORYE))
			gen_action_locale(LOC_KOPORYE)
	},
	locale(loc) {
		log(`Conquered %${loc}.`)
		conquer_stronghold(loc)
		end_held_event()
	},
}

// === EVENTS: HEINRICH SEES THE CURIA ===

function count_set_bits(x) {
	let n = 0
	for (let i = 0; i < lord_count; ++i)
		if (x & (1 << i))
			++n
	return n
}

function can_play_heinrich_sees_the_curia() {
	return is_lord_on_map(LORD_HEINRICH)
}

states.heinrich_sees_the_curia = {
	inactive: "Heinrich Sees the Curia",
	prompt() {
		view.prompt = "Heinrich Sees the Curia: Disband Heinrich to add 4 Assets each to 2 Lords."
		gen_action_lord(LORD_HEINRICH)
	},
	lord(_) {
		disband_lord(LORD_HEINRICH)
		lift_sieges()
		game.state = "heinrich_sees_the_curia_1"
		game.who = NOBODY
		game.count = 0
	},
}

states.heinrich_sees_the_curia_1 = {
	inactive: "Heinrich Sees the Curia",
	prompt() {
		let n = 2 - count_set_bits(game.count)
		view.prompt = `Heinrich Sees the Curia: Add 4 Assets each to ${n} Lords.`
		if (n > 0) {
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
				if (is_lord_on_map(lord))
					if ((game.count & (1 << lord)) === 0)
						gen_action_lord(lord)
		}
		view.actions.done = 1
	},
	lord(lord) {
		push_undo()
		game.count |= (1 << lord)
		push_state("heinrich_sees_the_curia_2")
		game.count = 4
		game.who = lord
	},
	done: end_heinrich_sees_the_curia,
}

function resume_heinrich_sees_the_curia() {
	pop_state()
	if (count_set_bits(game.count) === 2)
		end_heinrich_sees_the_curia()
}

states.heinrich_sees_the_curia_2 = {
	inactive: "Heinrich Sees the Curia",
	prompt() {
		view.prompt = `Heinrich Sees the Curia: Add ${game.count} Assets.`
		if (game.count > 0) {
			view.actions.take_prov = 1
			view.actions.take_coin = 1
			view.actions.take_ship = 1
			view.actions.take_boat = 1
			view.actions.take_cart = 1
			view.actions.take_sled = 1
		}
		view.actions.done = 1
	},
	take_prov() { take_asset(PROV) },
	take_coin() { take_asset(COIN) },
	take_ship() { take_asset(SHIP) },
	take_boat() { take_asset(BOAT) },
	take_cart() { take_asset(CART) },
	take_sled() { take_asset(SLED) },
	done: resume_heinrich_sees_the_curia,
}

function take_asset(type) {
	add_lord_assets(game.who, type, 1)
	if (--game.count === 0)
		resume_heinrich_sees_the_curia()
}

function end_heinrich_sees_the_curia() {
	end_held_event()

	// No more actions if Heinrich is current command card
	if (game.state === "command" && game.command === LORD_HEINRICH) {
		spend_all_actions()
		resume_command()
		update_supply_possible()
	}

	// No more muster of Heinrich
	if (game.state === "levy_muster_lord" && game.who === LORD_HEINRICH) {
		game.count = 0
	}
}

// === EVENTS: HOLD - SHIFT CYLINDER ===

function action_held_event_lordship(c) {
	push_undo()
	play_held_event(c)
	if (can_play_held_event(c)) {
		goto_held_event(c)
		game.what = c
	} else {
		push_state("lordship")
		game.what = c
	}
}

states.lordship = {
	get inactive() {
		return data.cards[game.what].event
	},
	prompt() {
		view.prompt = `${data.cards[game.what].event}: Play for +2 Lordship.`
		view.actions.lordship = 1
	},
	lordship() {
		end_held_event()
		log("+2 Lordship")
		game.count += 2
	}
}

function goto_held_event_tverdilo() {
	push_state("tverdilo")
	game.who = NOBODY
}

function goto_held_event_teutonic_fervor() {
	push_state("teutonic_fervor")
	game.who = NOBODY
}

function goto_held_event_dietrich_von_gruningen() {
	push_state("teutonic_dietrich_von_gruningen")
	game.who = NOBODY
}

function goto_held_event_prince_of_polotsk() {
	push_state("prince_of_polotsk")
	game.who = NOBODY
}

function goto_held_event_pelgui() {
	push_state("pelgui")
	game.who = NOBODY
}

function prompt_shift_cylinder(list, boxes) {

	// HACK: look at parent state to see if this can be used as a +2 Lordship event
	let lordship = NOBODY
	let parent = game.stack[game.stack.length-1]
	if (parent[0] === "levy_muster_lord")
		lordship = parent[1]

	let names
	if (game.what === EVENT_RUSSIAN_PRINCE_OF_POLOTSK)
		names = "a Russian Lord"
	else
		names = list.filter(lord => is_lord_on_calendar(lord)).map(lord => lord_name[lord]).join(" or ")

	if (boxes === 1)
		view.prompt = `${data.cards[game.what].event}: Shift ${names} 1 Calendar box`
	else
		view.prompt = `${data.cards[game.what].event}: Shift ${names} 2 Calendar boxes`

	for (let lord of list) {
		if (lord === lordship) {
			view.prompt += " or +2 Lordship"
			view.actions.lordship = 1
		}
		if (is_lord_on_calendar(lord))
			prompt_select_lord(lord)
	}

	view.prompt += "."

	prompt_shift_lord_on_calendar(boxes)
}

function action_shift_cylinder_calendar(turn) {
	log(`Shifted L${game.who} to ${turn}.`)
	set_lord_calendar(game.who, turn)
	game.who = NOBODY
	end_held_event()
}

function action_shift_cylinder_lordship() {
	end_held_event()
	log("+2 Lordship")
	game.count += 2
}

states.tverdilo = {
	inactive: "Tverdilo",
	prompt() { prompt_shift_cylinder([ LORD_HERMANN, LORD_YAROSLAV ], 2) },
	lord: action_select_lord,
	calendar: action_shift_cylinder_calendar,
	lordship: action_shift_cylinder_lordship,
}

states.teutonic_fervor = {
	inactive: "Teutonic Fervor",
	prompt() { prompt_shift_cylinder([ LORD_RUDOLF ], 2) },
	lord: action_select_lord,
	calendar: action_shift_cylinder_calendar,
	lordship: action_shift_cylinder_lordship,
}

states.teutonic_dietrich_von_gruningen = {
	inactive: "Deitrich von Grüningen",
	prompt() { prompt_shift_cylinder([ LORD_ANDREAS, LORD_RUDOLF ], 2) },
	lord: action_select_lord,
	calendar: action_shift_cylinder_calendar,
	lordship: action_shift_cylinder_lordship,
}

states.prince_of_polotsk = {
	inactive: "Prince of Polotsk",
	prompt() {
		prompt_shift_cylinder([
			LORD_ALEKSANDR, LORD_ANDREY, LORD_DOMASH, LORD_GAVRILO, LORD_KARELIANS, LORD_VLADISLAV
		], 1)
	},
	lord: action_select_lord,
	calendar: action_shift_cylinder_calendar,
	lordship: action_shift_cylinder_lordship,
}

states.pelgui = {
	inactive: "Pelgui",
	prompt() { prompt_shift_cylinder([ LORD_VLADISLAV, LORD_KARELIANS ], 2) },
	lord: action_select_lord,
	calendar: action_shift_cylinder_calendar,
	lordship: action_shift_cylinder_lordship,
}

// === CAPABILITIES ===

function can_deploy_global_capability(c) {
	if (c === AOW_TEUTONIC_WILLIAM_OF_MODENA) {
		return !is_event_in_play(EVENT_RUSSIAN_DEATH_OF_THE_POPE)
	}
	return true
}

function has_global_capability(cap) {
	return set_has(game.capabilities, cap)
}

function deploy_global_capability(c) {
	set_add(game.capabilities, c)

	if (c === AOW_TEUTONIC_WILLIAM_OF_MODENA) {
		game.pieces.legate = LEGATE_ARRIVED
	}

	if (c === AOW_TEUTONIC_CRUSADE) {
		for (let v of data.summer_crusaders)
			game.pieces.vassals[v] = VASSAL_READY
	}

	if (c === AOW_RUSSIAN_SMERDI) {
		game.pieces.smerdi = 6
	}

	if (c === AOW_RUSSIAN_STEPPE_WARRIORS) {
		for (let v of data.steppe_warriors)
			game.pieces.vassals[v] = VASSAL_READY
	}
}

function discard_global_capability(c) {
	set_delete(game.capabilities, c)

	if (c === AOW_TEUTONIC_WILLIAM_OF_MODENA) {
		game.pieces.legate = LEGATE_INDISPOSED
	}

	if (c === AOW_TEUTONIC_CRUSADE) {
		for (let v of data.summer_crusaders)
			if (is_vassal_ready(v))
				game.pieces.vassals[v] = VASSAL_UNAVAILABLE
		if (has_summer_crusaders())
			push_state("disband_summer_crusaders")
	}

	if (c === AOW_RUSSIAN_SMERDI) {
		game.pieces.smerdi = 0
	}

	if (c === AOW_RUSSIAN_STEPPE_WARRIORS) {
		for (let v of data.steppe_warriors)
			if (is_vassal_ready(v))
				game.pieces.vassals[v] = VASSAL_UNAVAILABLE
		if (has_steppe_warriors())
			push_state("disband_steppe_warriors")
	}
}

function has_summer_crusaders() {
	for (let v of data.summer_crusaders)
		if (is_vassal_mustered(v))
			return true
	return false
}

function has_steppe_warriors() {
	for (let v of data.steppe_warriors)
		if (is_vassal_mustered(v))
			return true
	return false
}

function goto_discard_crusade_late_winter() {
	if (has_global_capability(AOW_TEUTONIC_CRUSADE))
		game.state = "discard_crusade_late_winter"
	else
		goto_levy_arts_of_war()
}

states.discard_crusade_late_winter = {
	inactive: "Discard Crusade",
	prompt() {
		view.prompt = "Discard Summer Crusaders."
		gen_action_card(AOW_TEUTONIC_CRUSADE)
	},
	card(c) {
		log(`Discarded C${AOW_TEUTONIC_CRUSADE}.`)
		set_delete(game.capabilities, c) // don't trigger disbanding here
		for (let v of data.summer_crusaders)
			if (is_vassal_ready(v))
				game.pieces.vassals[v] = VASSAL_UNAVAILABLE
		if (has_summer_crusaders())
			game.state = "disband_summer_crusaders_late_winter"
		else
			goto_levy_arts_of_war()
	},
}

states.disband_summer_crusaders_late_winter = {
	inactive: "Disband Summer Crusaders",
	prompt() {
		view.prompt = "Disband Summer Crusaders."
		for (let v of data.summer_crusaders)
			if (is_vassal_mustered(v))
				gen_action_vassal(v)
	},
	vassal(v) {
		disband_vassal(v)
		game.pieces.vassals[v] = VASSAL_UNAVAILABLE
		if (!has_summer_crusaders())
			goto_levy_arts_of_war()
	},
}

states.disband_summer_crusaders = {
	inactive: "Disband Summer Crusaders",
	prompt() {
		view.prompt = "Disband Summer Crusaders."
		for (let v of data.summer_crusaders)
			if (is_vassal_mustered(v))
				gen_action_vassal(v)
	},
	vassal(v) {
		disband_vassal(v)
		game.pieces.vassals[v] = VASSAL_UNAVAILABLE
		if (!has_summer_crusaders())
			pop_state()
	},
}

states.disband_steppe_warriors = {
	inactive: "Disband Steppe Warriors",
	prompt() {
		view.prompt = "Disband Steppe Warriors."
		for (let v of data.steppe_warriors)
			if (is_vassal_mustered(v))
				gen_action_vassal(v)
	},
	vassal(v) {
		disband_vassal(v)
		game.pieces.vassals[v] = VASSAL_UNAVAILABLE
		if (!has_steppe_warriors())
			pop_state()
	},
}

// === LEVY: ARTS OF WAR (FIRST TURN) ===

function draw_two_cards() {
	let deck = list_deck()
	return [ draw_card(deck), draw_card(deck) ]
}

function discard_card_capability(c) {
	if (is_no_event_card(c) && should_remove_no_event_card()) {
		log(`${game.active} removed C${c}.`)
		if (game.active === P1)
			game.no1--
		else
			game.no2--
	} else {
		log(`${game.active} discarded C${c}.`)
	}
}

function discard_card_event(c) {
	if (is_no_event_card(c) && should_remove_no_event_card()) {
		log(`${game.active} removed E${c}.`)
		if (game.active === P1)
			game.no1--
		else
			game.no2--
	} else {
		log(`${game.active} discarded E${c}.`)
	}
}

function goto_levy_arts_of_war_first() {
	log_br()
	game.state = "levy_arts_of_war_first"
	game.what = draw_two_cards()
}

function resume_levy_arts_of_war_first() {
	if (game.what.length === 0)
		end_levy_arts_of_war_first()
}

states.levy_arts_of_war_first = {
	inactive: "Arts of War",
	prompt() {
		let c = game.what[0]
		view.arts_of_war = game.what
		view.what = c
		if (is_no_event_card(c)) {
			view.prompt = `Arts of War: No Capability.`
			view.actions.discard = 1
		} else if (data.cards[c].this_lord) {
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
		} else {
			view.prompt = `Arts of War: Deploy ${data.cards[c].capability}.`
			view.actions.deploy = 1
		}
	},
	lord(lord) {
		push_undo()
		let c = game.what.shift()
		log(`${game.active} deployed Capability.`)
		add_lord_capability(lord, c)
		resume_levy_arts_of_war_first()
	},
	deploy() {
		push_undo()
		let c = game.what.shift()
		log(`${game.active} deployed C${c}.`)
		deploy_global_capability(c)
		resume_levy_arts_of_war_first()
	},
	discard() {
		push_undo()
		let c = game.what.shift()
		discard_card_capability(c)
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
	if (game.active === P1)
		log_h2("Arts of War")
	else
		log_br()
	game.what = draw_two_cards()
	resume_levy_arts_of_war()
}

function resume_levy_arts_of_war() {
	game.state = "levy_arts_of_war"
	if (game.what.length === 0)
		end_levy_arts_of_war()
}

states.levy_arts_of_war = {
	inactive: "Arts of War",
	prompt() {
		let c = game.what[0]
		view.arts_of_war = [ c ]
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
		log(`${game.active} played E${c}.`)
		goto_immediate_event(c)
	},
	hold() {
		let c = game.what.shift()
		log(`${game.active} Held Event.`)
		if (game.active === P1)
			set_add(game.hand1, c)
		else
			set_add(game.hand2, c)
		resume_levy_arts_of_war()
	},
	discard() {
		let c = game.what.shift()
		discard_card_event(c)
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
	if (game.active === TEUTONS)
		log_h2("Teutonic Muster")
	else
		log_h2("Russian Muster")
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
	inactive: "Muster",
	prompt() {
		view.prompt = "Levy: Muster with your Lords."

		prompt_held_event()

		let done = true
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
			if (is_lord_at_friendly_locale(lord) && !get_lord_moved(lord)) {
				if (!no_muster_of_or_by_lord(lord)) {
					gen_action_lord(lord)
					done = false
				}
			}
		}
		if (done) {
			view.prompt += " All done."
			view.actions.end_muster = 1
		}
	},
	lord(lord) {
		push_undo()
		log(`Mustered with L${lord}.`)
		push_state("levy_muster_lord")
		game.who = lord
		game.count = data.lords[lord].lordship
	},
	end_muster() {
		clear_undo()
		end_levy_muster()
	},
	card: action_held_event,
}

function resume_levy_muster_lord() {
	--game.count
	if (game.count === 0) {
		set_lord_moved(game.who, 1)
		pop_state()
	}
}

states.levy_muster_lord = {
	inactive: "Muster",
	prompt() {
		if (game.count === 1)
			view.prompt = `Levy: ${lord_name[game.who]} has ${game.count} action.`
		else
			view.prompt = `Levy: ${lord_name[game.who]} has ${game.count} actions.`

		prompt_held_event_lordship()

		if (game.count > 0) {
			// Roll to muster Ready Lord at Seat
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
				if (lord === LORD_ALEKSANDR)
					continue

				// NOTE: ANDREY may be mustered normally in 2nd edition
				// if (lord === LORD_ANDREY && game.who !== LORD_ALEKSANDR) continue

				if (no_muster_of_or_by_lord(lord))
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
					view.actions.take_ship = 1
			}
			if (can_add_transport(game.who, BOAT))
				view.actions.take_boat = 1
			if (can_add_transport(game.who, CART))
				view.actions.take_cart = 1
			if (can_add_transport(game.who, SLED))
				view.actions.take_sled = 1

			// Add Capability
			if (can_muster_capability())
				view.actions.capability = 1
		}

		view.actions.done = 1
	},

	card: action_held_event_lordship,

	lord(other) {
		clear_undo()
		let die = roll_die()
		let fealty = data.lords[other].fealty
		if (die <= fealty) {
			log(`L${other} 1-${fealty}: ${HIT[die]}`)
			push_state("muster_lord_at_seat")
			game.who = other
		} else {
			log(`L${other} 1-${fealty}: ${MISS[die]}`)
			resume_levy_muster_lord()
		}
	},

	vassal(vassal) {
		push_undo()
		muster_vassal(game.who, vassal)
		resume_levy_muster_lord()
	},

	take_ship() {
		push_undo()
		add_lord_assets(game.who, SHIP, 1)
		resume_levy_muster_lord()
	},
	take_boat() {
		push_undo()
		add_lord_assets(game.who, BOAT, 1)
		resume_levy_muster_lord()
	},
	take_cart() {
		push_undo()
		add_lord_assets(game.who, CART, 1)
		resume_levy_muster_lord()
	},
	take_sled() {
		push_undo()
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
	inactive: "Muster",
	prompt() {
		view.prompt = `Muster: Select Seat for ${lord_name[game.who]}.`
		for_each_seat(game.who, seat => {
			if (is_friendly_locale(seat))
				gen_action_locale(seat)
		})
	},
	locale(loc) {
		push_undo()

		log(`Mustered L${game.who} at %${loc}.`)

		// FIXME: clean up these transitions
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
	inactive: "Muster",
	prompt() {
		if (game.state === "veliky_knyaz")
			view.prompt = `Veliky Knyaz: Select Transport for ${lord_name[game.who]}.`
		else
			view.prompt = `Muster: Select Transport for ${lord_name[game.who]}.`
		view.prompt += ` ${game.count} left.`
		if (data.lords[game.who].ships) {
			if (can_add_transport(game.who, SHIP))
				view.actions.take_ship = 1
		}
		if (can_add_transport(game.who, BOAT))
			view.actions.take_boat = 1
		if (can_add_transport(game.who, CART))
			view.actions.take_cart = 1
		if (can_add_transport(game.who, SLED))
			view.actions.take_sled = 1
	},
	take_ship() {
		push_undo()
		add_lord_assets(game.who, SHIP, 1)
		--game.count
		resume_muster_lord_transport()
	},
	take_boat() {
		push_undo()
		add_lord_assets(game.who, BOAT, 1)
		--game.count
		resume_muster_lord_transport()
	},
	take_cart() {
		push_undo()
		add_lord_assets(game.who, CART, 1)
		--game.count
		resume_muster_lord_transport()
	},
	take_sled() {
		push_undo()
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

function lord_already_has_capability(lord, c) {
	// compare capabilities by name...
	let name = data.cards[c].capability
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

function discard_lord_capability_n(lord, n) {
	set_lord_capability(lord, n, NOTHING)
}

function discard_lord_capability(lord, c) {
	if (get_lord_capability(lord, 0) === c)
		return set_lord_capability(lord, 0, NOTHING)
	if (get_lord_capability(lord, 1) === c)
		return set_lord_capability(lord, 1, NOTHING)
	throw new Error("capability not found")
}

function can_muster_capability() {
	let deck = list_deck()
	for (let c of deck) {
		if (is_no_event_card(c))
			continue
		if (!data.cards[c].lords || set_has(data.cards[c].lords, game.who)) {
			if (data.cards[c].this_lord) {
				if (!lord_already_has_capability(game.who, c))
					return true
			} else {
				if (can_deploy_global_capability(c))
					return true
			}
		}
	}
	return false
}

states.muster_capability = {
	inactive: "Muster",
	prompt() {
		let deck = list_deck()
		view.prompt = `Muster: Select a new Capability for ${lord_name[game.who]}.`
		view.arts_of_war = deck
		for (let c of deck) {
			if (is_no_event_card(c))
				continue
			if (!data.cards[c].lords || set_has(data.cards[c].lords, game.who)) {
				if (data.cards[c].this_lord) {
					if (!lord_already_has_capability(game.who, c))
						gen_action_card(c)
				} else {
					if (can_deploy_global_capability(c))
						gen_action_card(c)
				}
			}
		}
	},
	card(c) {
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
	inactive: "Muster",
	prompt() {
		view.prompt = `Muster: Remove a Capability from ${lord_name[game.who]}.`
		gen_action_card(get_lord_capability(game.who, 0))
		gen_action_card(get_lord_capability(game.who, 1))
	},
	card(c) {
		push_undo()
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
	clear_lords_moved()
	set_active_enemy()
	if (game.active === P2)
		goto_levy_call_to_arms()
	else
		goto_levy_discard_events()
}

function goto_levy_discard_events() {

	// Discard "This Levy" events from play.
	discard_events("this_levy")

	set_active(P1)
	goto_capability_discard()
}

// === LEVY: CALL TO ARMS - PAPAL LEGATE ===

function goto_teutonic_call_to_arms() {
	log_h2("Call to Arms - Papal Legate")
	if (has_global_capability(AOW_TEUTONIC_WILLIAM_OF_MODENA)) {
		if (game.pieces.legate === LEGATE_ARRIVED)
			game.state = "papal_legate_arrives"
		else
			game.state = "papal_legate_active"
	} else {
		end_papal_legate()
	}
}

states.papal_legate_arrives = {
	inactive: "Papal Legate",
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
		game.pieces.legate = loc
		game.state = "papal_legate_active"
	},
}

states.papal_legate_active = {
	inactive: "Papal Legate",
	prompt() {
		view.prompt = "Papal Legate: You may move or use the Legate."

		view.actions.end_call_to_arms = 1

		let here = game.pieces.legate

		prompt_held_event()

		// Move to friendly locale
		for (let loc = first_locale; loc <= last_locale; ++loc)
			if (loc !== here && is_friendly_locale(loc))
				gen_action_locale(loc)

		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
			if (no_muster_of_or_by_lord(lord))
				continue

			// Seat of a Ready Lord without rolling
			if (is_lord_ready(lord)) {
				if (is_lord_seat(lord, here))
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
		game.pieces.legate = loc
		game.state = "papal_legate_done"
	},
	lord(lord) {
		push_undo()

		let here = game.pieces.legate

		game.pieces.legate = LEGATE_ARRIVED
		game.state = "papal_legate_done"

		if (is_lord_ready(lord)) {
			log(`Mustered L${lord} at %${here}.`)

			// FIXME: clean up these transitions
			muster_lord(lord, here)
			push_state("muster_lord_transport")
			game.who = lord
			game.count = data.lords[lord].assets.transport | 0
			resume_muster_lord_transport()
		}

		else if (is_lord_on_calendar(lord)) {
			shift_lord_cylinder(lord, -1)
			log(`Shifted L${lord} to ${get_lord_calendar(lord)}.`)
		}

		else {
			log(`Mustered with L${lord}.`)
			push_state("levy_muster_lord")
			game.who = lord
			game.count = data.lords[lord].lordship
		}
	},
	end_call_to_arms() {
		clear_undo()
		end_papal_legate()
	},
	card: action_held_event,
}

states.papal_legate_done = {
	inactive: "Papal Legate",
	prompt() {
		view.prompt = "Papal Legate: All done."
		view.actions.end_call_to_arms = 1
	},
	end_call_to_arms() {
		clear_undo()
		end_papal_legate()
	},
}

function end_papal_legate() {
	goto_summer_crusaders()
}

// === LEVY: SUMMER CRUSADERS (CAPABILITY) ===

function goto_summer_crusaders() {
	if (is_summer() && has_global_capability(AOW_TEUTONIC_CRUSADE)) {
		for (let v of data.summer_crusaders) {
			if (can_muster_summer_crusader(v)) {
				game.state = "summer_crusaders"
				return
			}
		}
	}
	end_levy_call_to_arms()
}

function can_muster_summer_crusader(v) {
	let lord = data.vassals[v].lord
	if (is_lord_on_map(lord) && is_lord_unbesieged(lord)) {
		if (is_vassal_ready(v))
			return true
		if (get_lord_forces(lord, KNIGHTS) < data.vassals[v].forces.knights)
			return true
	}
}

function muster_summer_crusaders(v) {
	let lord = data.vassals[v].lord
	if (is_vassal_ready(v)) {
		log(`Mustered Summer Crusaders.`)
		muster_vassal(lord, v)
	} else {
		log(`Restored Summer Crusaders.`)
		restore_lord_forces(lord, KNIGHTS, data.vassals[v].forces.knights | 0)
	}
}

states.summer_crusaders = {
	inactive: "Summer Crusaders",
	prompt() {
		view.prompt = "Levy: Summer Crusaders."
		for (let v of data.summer_crusaders)
			if (can_muster_summer_crusader(v))
				gen_action_vassal(v)
	},
	vassal(v) {
		muster_summer_crusaders(v)
		goto_summer_crusaders()
	},
}

// === LEVY: CALL TO ARMS - NOVGOROD VECHE ===

function count_all_teutonic_ships() {
	let n = 0
	for (let lord = first_p1_lord; lord <= last_p1_lord; ++lord)
		if (is_lord_on_map(lord))
			n += count_lord_ships(lord)
	return n
}

function count_all_russian_ships() {
	let n = 0
	for (let lord = first_p2_lord; lord <= last_p2_lord; ++lord)
		if (is_lord_on_map(lord))
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
			logcap(AOW_RUSSIAN_BLACK_SEA_TRADE)
			if (game.pieces.veche_coin < 8) {
				game.state = "black_sea_trade"
				return
			}
		}
	}
	goto_baltic_sea_trade()
}

states.black_sea_trade = {
	inactive: "Black Sea Trade",
	prompt() {
		view.prompt = "Call to Arms: Black Sea Trade."
		view.actions.veche = 1
	},
	veche() {
		log("Added 1 Coin to Veche.")
		game.pieces.veche_coin += 1
		goto_baltic_sea_trade()
	},
}

function goto_baltic_sea_trade() {
	if (!is_winter() && has_global_capability(AOW_RUSSIAN_BALTIC_SEA_TRADE)) {
		if (!has_conquered_marker(LOC_NOVGOROD) && !has_conquered_marker(LOC_NEVA)) {
			init_lodya_baltic_sea_trade()
			let t = count_all_teutonic_ships()
			let r = count_all_russian_ships()
			log(`C${AOW_RUSSIAN_BALTIC_SEA_TRADE}:`)
			logi(`${t} Teutonic Ships`)
			logi(`${r} Russian Ships`)
			if (t <= r) {
				if (game.pieces.veche_coin < 8) {
					game.state = "baltic_sea_trade"
					return
				}
			}
		} else {
			log(`C${AOW_RUSSIAN_BALTIC_SEA_TRADE}:`)
			if (has_conquered_marker(LOC_NOVGOROD))
				logi(`%${LOC_NOVGOROD} Conquered`)
			if (has_conquered_marker(LOC_NEVA))
				logi(`%${LOC_NEVA} Conquered`)
		}
	}
	goto_novgorod_veche()
}

states.baltic_sea_trade = {
	inactive: "Baltic Sea Trade",
	prompt() {
		view.prompt = "Call to Arms: Baltic Sea Trade."
		view.actions.veche = 1
	},
	veche() {
		if (game.pieces.veche_coin === 7) {
			log("Added 1 Coin to Veche.")
			game.pieces.veche_coin += 1
		} else {
			log("Added 2 Coin to Veche.")
			game.pieces.veche_coin += 2
		}
		goto_novgorod_veche()
	},
}

function goto_novgorod_veche() {
	if (game.pieces.veche_vp > 0 || is_lord_ready(LORD_ALEKSANDR) || is_lord_ready(LORD_ANDREY)) {
		game.state = "novgorod_veche"
	} else {
		end_levy_call_to_arms()
	}
}

states.novgorod_veche = {
	inactive: "Novgorod Veche",
	prompt() {
		view.prompt = "Novgorod Veche: You may take one action with the Veche."
		view.actions.end_call_to_arms = 1

		prompt_held_event()

		if (is_lord_ready(LORD_ALEKSANDR) || is_lord_ready(LORD_ANDREY)) {
			if (game.pieces.veche_vp < 8)
				view.actions.decline = 1
		}

		if (game.pieces.veche_vp > 0) {
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
				if (no_muster_of_or_by_lord(lord))
					continue
				if (is_lord_on_calendar(lord) || is_lord_at_friendly_locale(lord))
					gen_action_lord(lord)
			}
		}
	},
	decline() {
		push_undo()
		game.state = "novgorod_veche_done"

		if (is_lord_ready(LORD_ALEKSANDR)) {
			let turn = current_turn() + 1
			log(`Declined L${LORD_ALEKSANDR} to ${turn}.`)
			set_lord_calendar(LORD_ALEKSANDR, turn)
		}

		if (is_lord_ready(LORD_ANDREY)) {
			let turn = current_turn() + 1
			log(`Declined L${LORD_ANDREY} to ${turn}.`)
			set_lord_calendar(LORD_ANDREY, turn)
		}

		log("Added 1 VP to Veche.")
		add_veche_vp(1)
	},
	lord(lord) {
		push_undo()
		log("Removed 1 VP from Veche.")
		add_veche_vp(-1)
		game.state = "novgorod_veche_done"

		if (is_lord_ready(lord)) {
			push_state("muster_lord_at_seat")
			game.who = lord
		}

		else if (is_lord_on_calendar(lord)) {
			// NOTE: 2E 3.5.2 Shift one Russian cylinder two boxes (from one in 1E).
			shift_lord_cylinder(lord, -2)
			log(`Shifted L${lord} to ${get_lord_calendar(lord)}.`)
		}

		else {
			log(`Mustered with L${lord}.`)
			push_state("levy_muster_lord")
			game.who = lord
			game.count = data.lords[lord].lordship
		}
	},
	end_call_to_arms() {
		clear_undo()
		end_levy_call_to_arms()
	},
	card: action_held_event,
}

states.novgorod_veche_done = {
	inactive: "Novgorod Veche",
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

	// Start of Campaign phase
	if (check_campaign_victory())
		return

	if (count_global_capabilities() > count_mustered_lords())
		game.state = "capability_discard"
	else
		end_capability_discard()
}

states.capability_discard = {
	inactive: "Discard Capabilities",
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
		goto_capability_discard()
	else
		goto_campaign_plan()
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
	inactive: "Plan",
	prompt(current) {
		let plan = current === P1 ? game.plan1 : game.plan2
		let first = current === P1 ? first_p1_lord : first_p2_lord
		let last = current === P1 ? last_p1_lord : last_p2_lord
		let upper = plan_selected_lieutenant(first, last)

		view.prompt = "Plan: Designate Lieutenants and build a Plan."
		view.plan = plan
		view.who = upper
		view.actions.plan = []

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
	if (game.pieces.lieutenants.length > 0) {
		log("Lieutenants")
		for (let i = 0; i < game.pieces.lieutenants.length; i += 2) {
			let upper = game.pieces.lieutenants[i]
			let lower = game.pieces.lieutenants[i + 1]
			logi(`L${upper} over L${lower}`)
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

	if (check_campaign_victory())
		return

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
		log_h2(`L${game.command} at %${get_lord_locale(game.command)}`)
		goto_command()
	}
}

// === CAMPAIGN: ACTIONS ===

function set_active_command() {
	if (game.command >= first_p1_lord && game.command <= last_p1_lord)
		set_active(P1)
	else
		set_active(P2)
}

function is_active_command() {
	if (game.command >= first_p1_lord && game.command <= last_p1_lord)
		return game.active === P1
	else
		return game.active === P2
}

function is_first_action() {
	return game.flags.first_action
}

function is_first_march() {
	return game.flags.first_march
}

function goto_command() {
	game.actions = data.lords[game.command].command

	game.flags.first_action = 1
	game.flags.first_march = 1

	// 4.1.3 Lieutenants MUST take lower lord
	game.group = [ game.command ]
	let lower = get_lower_lord(game.command)
	if (lower !== NOBODY)
		set_add(game.group, lower)

	if (game.active === TEUTONS) {
		if (has_global_capability(AOW_TEUTONIC_ORDENSBURGEN)) {
			if (is_commandery(get_lord_locale(game.command))) {
				logcap(AOW_TEUTONIC_ORDENSBURGEN)
				++game.actions
			}
		}
		if (game.command === LORD_HEINRICH || game.command === LORD_KNUD_ABEL) {
			if (has_global_capability(AOW_TEUTONIC_TREATY_OF_STENSBY)) {
				logcap(AOW_TEUTONIC_TREATY_OF_STENSBY)
				++game.actions
			}
		}
	}

	if (game.active === RUSSIANS) {
		if (has_global_capability(AOW_RUSSIAN_ARCHBISHOPRIC)) {
			if (get_lord_locale(game.command) === LOC_NOVGOROD) {
				logcap(AOW_RUSSIAN_ARCHBISHOPRIC)
				++game.actions
			}
		}
		if (this_lord_has_russian_druzhina()) {
			logcap(which_lord_capability(game.command, AOW_RUSSIAN_DRUZHINA))
			++game.actions
		}
		if (this_lord_has_house_of_suzdal()) {
			logcap(AOW_RUSSIAN_HOUSE_OF_SUZDAL)
			++game.actions
		}
	}

	resume_command()
	update_supply_possible()
}

function resume_command() {
	game.state = "command"
}

function spend_action(cost) {
	game.flags.first_action = 0
	game.actions -= cost
}

function spend_march_action(cost) {
	game.flags.first_action = 0
	game.flags.first_march = 0
	game.actions -= cost
}

function spend_all_actions() {
	game.flags.first_action = 0
	game.flags.first_march = 0
	game.actions = 0
}

function end_command() {
	log_br()

	game.group = 0
	game.pieces.legate_selected = 0

	game.flags.first_action = 0
	game.flags.first_march = 0
	game.flags.teutonic_raiders = 0
	game.flags.famine = 0

	// NOTE: Feed currently acting side first for expedience.
	set_active_command()
	goto_feed()
}

function this_lord_has_russian_druzhina() {
	if (game.active === RUSSIANS)
		if (lord_has_capability(game.command, AOW_RUSSIAN_DRUZHINA))
			return get_lord_forces(game.command, KNIGHTS) > 0
	return false
}

function this_lord_has_house_of_suzdal() {
	if (game.active === RUSSIANS)
		if (lord_has_capability(game.command, AOW_RUSSIAN_HOUSE_OF_SUZDAL))
			return is_lord_on_map(LORD_ALEKSANDR) && is_lord_on_map(LORD_ANDREY)
	return false
}

states.command = {
	inactive: "Command",
	prompt() {
		if (game.actions === 1)
			view.prompt = `Command: ${lord_name[game.command]} has ${game.actions} action.`
		else
			view.prompt = `Command: ${lord_name[game.command]} has ${game.actions} actions.`

		view.group = game.group

		let here = get_lord_locale(game.command)

		prompt_held_event()

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
			view.actions.end_command = 1

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
		log(`Legate +1 Command.`)
		game.pieces.legate = LEGATE_ARRIVED
		game.pieces.legate_selected = 0
		++game.actions
	},

	pass() {
		push_undo()
		log("Passed.")
		spend_all_actions()
	},

	end_command() {
		clear_undo()
		end_command()
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

	card: action_held_event,
}

// === ACTION: MARCH ===

function toggle_legate_selected() {
	if (game.pieces.legate_selected)
		game.pieces.legate_selected = 0
	else
		game.pieces.legate_selected = 1
}

function release_besieged_lords(loc) {
	for (let lord = 0; lord < lord_count; ++lord)
		if (get_lord_locale(lord) === loc && is_lord_besieged(lord))
			set_lord_besieged(lord, 0)
}

function lift_sieges() {
console.log("LIFT SIEGE CHECK!")
	for (let i = 0; i < game.pieces.sieges.length; i += 2) {
		let loc = game.pieces.sieges[i]
		if (is_enemy_stronghold(loc)) {
			if (!has_friendly_lord(loc)) {
				log(`Lifted Siege at %${loc}.`)
				remove_all_siege_markers(loc)
				release_besieged_lords(loc)
			}
		} else if (is_friendly_stronghold(loc)) {
			if (!has_enemy_lord(loc)) {
				log(`Lifted Siege at %${loc}.`)
				remove_all_siege_markers(loc)
				release_besieged_lords(loc)
			}
		}
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
		game.march = { from, to, approach: -1, avoid: -1 }
		game.state = "march_way"
	} else {
		game.march = { from, to, approach: ways[1], avoid: -1 }
		march_with_group_1()
	}
}

states.march_way = {
	inactive: "March",
	prompt() {
		view.prompt = `March: Select Way.`
		view.group = game.group
		let from = game.march.from
		let to = game.march.to
		let ways = list_ways(from, to)
		for (let i = 1; i < ways.length; ++i)
			gen_action_way(ways[i])
	},
	way(way) {
		game.march.approach = way
		march_with_group_1()
	},
}

function march_with_group_1() {
	let way = game.march.approach
	let type = data.ways[way].type

	init_lodya_march(type)

	let transport = count_group_transport(type)
	let prov = count_group_assets(PROV)
	let loot = count_group_assets(LOOT)

	if (group_has_teutonic_converts() && prov <= transport * 2)
		return march_with_group_2()

	if (prov > transport || loot > 0)
		game.state = "march_laden"
	else
		march_with_group_2()
}

states.march_laden = {
	inactive: "March",
	prompt() {
		let to = game.march.to
		let way = game.march.approach
		let transport = count_group_transport(data.ways[way].type)
		let prov = count_group_assets(PROV)
		let loot = count_group_assets(LOOT)

		view.prompt = `March with ${loot} Loot, ${prov} Provender, and ${transport} Transport.`
		view.group = game.group

		if (prov <= transport * 2) {
			if (loot > 0 || prov > transport) {
				if (game.actions >= 2) {
					view.prompt += " Laden."
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
			view.prompt += " Too much Provender."
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
	let way = game.march.approach
	let to = game.march.to
	let transport = count_group_transport(data.ways[way].type)
	let prov = count_group_assets(PROV)
	let loot = count_group_assets(LOOT)
	let laden = loot > 0 || prov > transport

	if (group_has_teutonic_converts()) {
		logcap(AOW_TEUTONIC_CONVERTS)
		spend_march_action(0)
	}
	else if (laden)
		spend_march_action(2)
	else
		spend_march_action(1)

	if (data.ways[way].name)
		log(`Marched to %${to} via W${way}.`)
	else
		log(`Marched to %${to}.`)

	for (let lord of game.group) {
		set_lord_locale(lord, to)
		set_lord_moved(lord, 1)
	}
	if (game.pieces.legate_selected)
		game.pieces.legate = to

	lift_sieges()

	remove_legate_if_endangered(from)

	if (has_unbesieged_enemy_lord(to)) {
		goto_avoid_battle()
	} else {
		march_with_group_3()
	}
}

function remove_legate_if_endangered(here) {
	if (game.pieces.legate === here && has_russian_lord(here) && !has_teutonic_lord(here)) {
		log("Legate removed.")
		discard_global_capability(AOW_TEUTONIC_WILLIAM_OF_MODENA)
	}
}

function march_with_group_3() {
	let here = get_lord_locale(game.command)

	// Disbanded in battle!
	if (here === NOWHERE) {
		game.march = 0
		spend_all_actions()
		resume_command()
		update_supply_possible()
		return
	}

	remove_legate_if_endangered(here)

	if (is_unbesieged_enemy_stronghold(here)) {
		add_siege_marker(here)
		spend_all_actions() // ENCAMP
	}

	if (is_trade_route(here)) {
		conquer_trade_route(here)
	}

	game.march = 0

	resume_command()
	update_supply_possible()
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
	if (has_castle_marker(loc))
		return 2
	return data.locales[loc].stronghold
}

function stronghold_capacity(loc) {
	return stronghold_strength(loc) - count_besieged_lords(loc)
}

function spoil_prov(lord) {
	add_lord_assets(lord, PROV, -1)
	add_spoils(PROV, 1)
}

function spoil_loot(lord) {
	add_lord_assets(lord, LOOT, -1)
	add_spoils(LOOT, 1)
}

function can_avoid_battle(to, way) {
	if (way === game.march.approach)
		return false
	if (has_unbesieged_enemy_lord(to))
		return false
	if (is_unbesieged_enemy_stronghold(to))
		return false
	return true
}

function goto_avoid_battle() {
	clear_undo()
	set_active_enemy()
	game.march.group = game.group // save group
	game.state = "avoid_battle"
	game.spoils = 0
	resume_avoid_battle()
}

function resume_avoid_battle() {
	let here = game.march.to
	if (has_unbesieged_friendly_lord(here)) {
		game.group = []
		game.state = "avoid_battle"
	} else {
		end_avoid_battle()
	}
}

states.avoid_battle = {
	inactive: "Avoid Battle",
	prompt() {
		view.prompt = `March: You may Avoid Battle.`
		view.group = game.group

		let here = game.march.to

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

		// Save Assets and Lords in case Ambush cancels Avoid Battle.
		if (!game.march.ambush_lords) {
			if (could_enemy_play_ambush()) {
				game.march.ambush_lords = []
				game.march.ambush_assets = game.pieces.assets.slice()
				game.march.ambush_besieged = game.pieces.besieged
			}
		}

		let from = get_lord_locale(game.command)
		let ways = list_ways(from, to)
		if (ways.length > 2) {
			game.march.avoid_to = to
			game.state = "avoid_battle_way"
		} else {
			game.march.avoid_to = to
			game.march.avoid_way = ways[1]
			avoid_battle_1()
		}
	},
	end_avoid_battle() {
		push_undo()
		end_avoid_battle()
	},
}

states.avoid_battle_way = {
	inactive: "Avoid Battle",
	prompt() {
		view.prompt = `Avoid Battle: Select Way.`
		view.group = game.group
		let from = game.march.to
		let to = game.march.avoid_to
		let ways = list_ways(from, to)
		for (let i = 1; i < ways.length; ++i)
			if (can_avoid_battle(to, ways[i]))
				gen_action_way(ways[i])
	},
	way(way) {
		game.march.avoid_way = way
		avoid_battle_1()
	},
}

function avoid_battle_1() {
	let way = game.march.avoid_way
	let transport = count_group_transport(data.ways[way].type)
	let prov = count_group_assets(PROV)
	let loot = count_group_assets(LOOT)
	if (prov > transport || loot > 0)
		game.state = "avoid_battle_laden"
	else
		avoid_battle_2()
}

states.avoid_battle_laden = {
	inactive: "Avoid Battle",
	prompt() {
		let to = game.march.avoid_to
		let way = game.march.avoid_way
		let transport = count_group_transport(data.ways[way].type)
		let prov = count_group_assets(PROV)
		let loot = count_group_assets(LOOT)

		view.prompt = `Avoid Battle with ${prov} Provender and ${transport} Transport.`
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
			view.actions.avoid = 1
		}
	},
	prov(lord) {
		push_undo()
		spoil_prov(lord)
	},
	loot(lord) {
		push_undo()
		spoil_loot(lord)
	},
	locale(_) {
		avoid_battle_2()
	},
	avoid() {
		avoid_battle_2()
	},
}

function avoid_battle_2() {
	let to = game.march.avoid_to

	for (let lord of game.group) {
		log(`L${lord} Avoided Battle to %${to}.`)
		if (game.march.ambush_lords)
			set_add(game.march.ambush_lords, lord)
		set_lord_locale(lord, to)
		set_lord_moved(lord, 1)
	}

	lift_sieges()

	game.march.avoid_to = 0
	game.march.avoid_way = 0
	resume_avoid_battle()
}

function end_avoid_battle() {
	game.group = game.march.group // restore group
	game.march.group = 0
	goto_march_withdraw()
}

// === ACTION: MARCH - WITHDRAW ===

function can_withdraw(here, n) {
	if (is_unbesieged_friendly_stronghold(here))
		if (stronghold_capacity(here) >= n)
			return true
	return false
}

function goto_march_withdraw() {
	let here = game.march.to
	if (has_unbesieged_friendly_lord(here) && can_withdraw(here, 1)) {
		game.state = "march_withdraw"
	} else {
		end_march_withdraw()
	}
}

states.march_withdraw = {
	inactive: "Withdraw",
	prompt() {
		view.prompt = `March: You may Withdraw Lords into Stronghold.`

		let here = get_lord_locale(game.command)
		let capacity = stronghold_capacity(here)

		if (capacity >= 1) {
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
				if (get_lord_locale(lord) === here && !is_lower_lord(lord) && is_lord_unbesieged(lord)) {
					if (is_upper_lord(lord)) {
						if (capacity >= 2)
							gen_action_lord(lord)
					} else {
						gen_action_lord(lord)
					}
				}
			}
		}

		view.actions.end_withdraw = 1
	},
	lord(lord) {
		push_undo()
		let lower = get_lower_lord(lord)

		log(`L${lord} Withdrew.`)
		set_lord_besieged(lord, 1)

		if (lower !== NOBODY) {
			log(`L${lower} Withdrew.`)
			set_lord_besieged(lord, 1)
		}
	},
	end_withdraw() {
		end_march_withdraw()
	},
}

function end_march_withdraw() {
	clear_undo()
	set_active_enemy()
	goto_march_ambush()
}

// === ACTION: MARCH - AMBUSH ===

function could_enemy_play_ambush() {
	if (game.active === TEUTONS)
		return could_play_card(EVENT_RUSSIAN_AMBUSH)
	else
		return could_play_card(EVENT_TEUTONIC_AMBUSH)
}

function goto_march_ambush() {
	if (game.march.ambush_lords && game.march.ambush_lords.length > 0)
		game.state = "march_ambush"
	else
		goto_spoils_after_avoid_battle()
}

states.march_ambush = {
	inactive: "Ambush",
	prompt() {
		view.prompt = "Avoid Battle: You may play Ambush if you have it."
		if (has_card_in_hand(EVENT_TEUTONIC_AMBUSH))
			gen_action_card(EVENT_TEUTONIC_AMBUSH)
		if (has_card_in_hand(EVENT_RUSSIAN_AMBUSH))
			gen_action_card(EVENT_RUSSIAN_AMBUSH)
		view.actions.pass = 1
	},
	card(c) {
		play_held_event(c)

		// Restore assets and spoils and withdrawn lords
		game.pieces.assets = game.march.ambush_assets
		game.pieces.besieged = game.march.besieged
		game.spoils = 0

		// Restore lords who avoided battle
		for (let lord of game.march.ambush_lords) {
			set_lord_locale(lord, game.march.to)
			set_lord_moved(lord, 0)
		}

		set_active_enemy()
		game.march.ambush_lords = 0
		game.march.ambush_assets = 0
		game.march.ambush_besieged = 0
		goto_march_withdraw()
	},
	pass() {
		game.march.ambush_lords = 0
		game.march.ambush_assets = 0
		game.march.ambush_besieged = 0
		goto_spoils_after_avoid_battle()
	},
}

// === ACTION: MARCH - DIVIDE SPOILS AFTER AVOID BATTLE ===

function list_spoils() {
	let list = []
	for (let type = 0; type < 7; ++type) {
		let n = get_spoils(type)
		if (n > 0)
			list.push(`${n} ${ASSET_TYPE_NAME[type]}`)
	}
	if (list.length > 0)
		return list.join(", ")
	return "nothing"
}

function prompt_spoils() {
	if (get_spoils(PROV) > 0)
		view.actions.take_prov = 1
	if (get_spoils(LOOT) > 0)
		view.actions.take_loot = 1
	if (get_spoils(COIN) > 0)
		view.actions.take_coin = 1
	if (get_spoils(SHIP) > 0)
		view.actions.take_ship = 1
	if (get_spoils(BOAT) > 0)
		view.actions.take_boat = 1
	if (get_spoils(CART) > 0)
		view.actions.take_cart = 1
	if (get_spoils(SLED) > 0)
		view.actions.take_sled = 1
}

function take_spoils(type) {
	push_undo_without_who()
	add_lord_assets(game.who, type, 1)
	add_spoils(type, -1)
	if (!has_any_spoils())
		game.who = NOBODY
}

function take_spoils_prov() { take_spoils(PROV) }
function take_spoils_loot() { take_spoils(LOOT) }
function take_spoils_coin() { take_spoils(COIN) }
function take_spoils_boat() { take_spoils(BOAT) }
function take_spoils_cart() { take_spoils(CART) }
function take_spoils_sled() { take_spoils(SLED) }

function goto_spoils_after_avoid_battle() {
	if (has_any_spoils()) {
		game.state = "spoils_after_avoid_battle"
		if (game.group.length === 1)
			game.who = game.group[0]
	} else {
		goto_battle()
	}
}

states.spoils_after_avoid_battle = {
	inactive: "Spoils",
	prompt() {
		if (has_any_spoils()) {
			view.prompt = "Spoils: Divide " + list_spoils() + "."
			// only moving lords get to divide the spoils
			for (let lord of game.group)
				prompt_select_lord(lord)
			if (game.who !== NOBODY)
				prompt_spoils()
		} else {
			view.prompt = "Spoils: All done."
			view.actions.end_spoils = 1
		}
	},
	lord: action_select_lord,
	take_prov: take_spoils_prov,
	take_loot: take_spoils_loot,
	end_spoils() {
		clear_undo()
		game.spoils = 0
		game.who = NOBODY
		goto_battle()
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

function can_build_siegeworks() {
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
		build_siegeworks()
}

function surrender_stronghold(here) {
	log(`%${here} surrendered.`)

	conquer_stronghold(here)

	if (here === LOC_NOVGOROD) {
		if (game.pieces.veche_coin > 0) {
			log(`Removed ${game.pieces.veche_coin} Coin from Veche.`)
			game.pieces.veche_coin = 0
		}
	}
}

states.surrender = {
	inactive: "Surrender",
	prompt() {
		view.prompt = "Siege: You may roll for Surrender."
		view.actions.surrender = 1
		if (can_build_siegeworks())
			view.actions.siegeworks = 1
		else
			view.actions.pass = 1
	},
	surrender() {
		clear_undo()
		let here = get_lord_locale(game.command)
		let die = roll_die()
		let n = count_siege_markers(here)
		if (die <= n) {
			log(`Surrender 1-${n}: ${HIT[die]}`)
			surrender_stronghold(here)
			end_siege()
		} else {
			log(`Surrender 1-${n}: ${MISS[die]}`)
			build_siegeworks()
		}
	},
	siegeworks() {
		build_siegeworks()
	},
	pass() {
		end_siege()
	},
}

function build_siegeworks() {
	if (can_build_siegeworks()) {
		log("Added Siege marker.")
		let here = get_lord_locale(game.command)
		add_siege_marker(here)
	}
	end_siege()
}

function end_siege() {
	let here = get_lord_locale(game.command)

	// All Lords of both sides moved/fought
	for (let lord = first_lord; lord <= last_lord; ++lord)
		if (get_lord_locale(lord) === here)
			set_lord_moved(lord, 1)

	spend_all_actions()
	resume_command()
	update_supply_possible()
}

// === ACTION: STORM ===

function can_action_storm() {
	if (game.actions < 1)
		return false
	return is_besieged_enemy_stronghold(get_lord_locale(game.command))
}

function goto_storm() {
	start_storm()
}

// === ACTION: SALLY ===

function can_action_sally() {
	if (game.actions < 1)
		return false
	return true
}

function goto_sally() {
	start_sally()
}

// === CAPABILITY: LODYA ===

// NOTE: Lodya = 0 is boats as 2x boats
// NOTE: Lodya > 0 is ships as boats
// NOTE: Lodya < 0 is boats as ships

function find_lodya_lord_in_shared() {
	let here = get_lord_locale(game.command)
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (get_lord_locale(lord) === here)
			if (lord_has_capability(lord, AOW_RUSSIAN_LODYA))
				return lord
	return NOBODY
}

function find_lodya_lord_in_group() {
	for (let lord of game.group)
		if (lord_has_capability(lord, AOW_RUSSIAN_LODYA))
			return lord
	return NOBODY
}

function init_lodya_sail() {
	let lord = find_lodya_lord_in_group()
	if (lord !== NOBODY) {
		game.flags.lodya = -Math.min(2, get_lord_assets(lord, BOAT))
		if (game.flags.lodya < 0)
			log_lodya()
	} else {
		game.flags.lodya = 0
	}
}

function init_lodya_march(type) {
	game.flags.lodya = 0
	if (!is_winter() && type === "waterway") {
		let lord = find_lodya_lord_in_group()
		if (lord !== NOBODY) {
			let ships = Math.min(2, get_lord_assets(lord, SHIP))
			let boats = get_lord_assets(lord, BOAT)
			if (boats > ships)
				game.flags.lodya = 0 // 2x boats
			else
				game.flags.lodya = ships
			log_lodya()
		}
	}
}

function init_lodya_baltic_sea_trade() {
	let lord = find_lodya_lord_in_shared()
	if (lord !== NOBODY) {
		game.flags.lodya = -Math.min(2, get_lord_assets(lord, BOAT))
		if (game.flags.lodya < 0)
			log_lodya()
	} else {
		game.flags.lodya = 0
	}
}

function init_lodya_supply() {
	game.flags.lodya = 0
	if (!is_winter()) {
		let lord = find_lodya_lord_in_shared()
		if (lord !== NOBODY) {
			let boats = get_lord_assets(lord, BOAT)
			let ships = get_lord_assets(lord, SHIP)

			// Automatic choice if Novgorod is unavailable for seaport supply.
			if (is_supply_forbidden(LOC_NOVGOROD)) {
				if (boats < ships) {
					game.flags.lodya = -ships
					log_lodya()
					return false
				} else {
					game.flags.lodya = 0
					log_lodya()
					return false
				}
			}

			// Automatic choice if enough ships and 2x boats >= boats + extra ships.
			if (ships >= 2 && boats >= ships - 2) {
				game.flags.lodya = 0
				log_lodya()
				return false
			}

			// Manual choice.
			return true
		}
	}
	// No choice.
	return false
}

states.supply_lodya = {
	inactive: "Supply",
	prompt() {
		view.prompt = "Lodya: Boats as 2 Boats each, or Ships or Boats as the other: "
		let lord = find_lodya_lord_in_shared()
		let boats = get_lord_assets(lord, BOAT) + game.flags.lodya
		let ships = get_lord_assets(lord, SHIP) - game.flags.lodya
		view.prompt += ` ${boats} Boats,`
		view.prompt += ` ${ships} Ships.`
		view.actions.done = 1
		if (game.flags.lodya === 0) {
			view.actions.boats_x2 = 1
			if (get_lord_assets(lord, SHIP) > 0)
				view.actions.take_boat = 1
			if (get_lord_assets(lord, BOAT) > 0)
				view.actions.take_ship = (ships < 2) ? 1 : 0
			view.actions.done = 0
		}
		if (ships < 2 && game.flags.lodya === -1 && get_lord_assets(lord, BOAT) >= 2) {
			view.actions.take_boat = 0
			view.actions.take_ship = (ships < 2) ? 1 : 0
		}
		if (game.flags.lodya === 1 && get_lord_assets(lord, SHIP) >= 2) {
			view.actions.take_boat = 1
			view.actions.take_ship = 0
		}
	},
	take_boat() {
		push_undo()
		game.flags.lodya ++
	},
	take_ship() {
		push_undo()
		game.flags.lodya --
	},
	boats_x2: end_supply_lodya,
	done: end_supply_lodya,
}

function end_supply_lodya() {
	push_undo()
	log_lodya()
	log(`Supplied from`)
	init_supply()
	resume_supply()
	game.state = "supply_source"
}

function log_lodya() {
	if (game.flags.lodya === 0)
		log("C${AOW_RUSSIAN_LODYA}: Boats as 2 Boats each.")
	else if (game.flags.lodya < 0)
		log(`C${AOW_RUSSIAN_LODYA}: ${-game.flags.lodya} Boats as Ships.`)
	else
		log(`C${AOW_RUSSIAN_LODYA}: ${game.flags.lodya} Ships as Boats.`)
}

// === ACTION: SUPPLY (SEARCHING) ===

let _supply_stat = 0
let _supply_stop = new Array(last_locale+1)
let _supply_reached = new Array(last_locale+1)

let _supply_seen = new Array(last_locale+1).fill(0)
let _supply_cost = new Array(last_locale+1)
let _supply_boats = new Array(last_locale+1)
let _supply_carts = new Array(last_locale+1)

function is_supply_forbidden(here) {
	if (has_unbesieged_enemy_lord(here))
		return true
	if (is_unbesieged_enemy_stronghold(here))
		return true
	if (is_friendly_territory(here) && has_conquered_marker(here))
		if (!has_siege_marker(here))
			return true
	return false
}

function init_supply_forbidden() {
	_supply_stat = 0
	for (let here = 0; here <= last_locale; ++here) {
		if (is_supply_forbidden(here))
			_supply_stop[here] = 1
		else
			_supply_stop[here] = 0
	}
}

function init_supply() {
	let season = current_season()
	let here = get_lord_locale(game.command)
	let boats = 0
	let carts = 0
	let sleds = 0
	let ships = 0
	let available = 2

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

	if (is_famine_in_play())
		available = game.flags.famine ? 0 : 1

	let seats = []
	if (available > 0) {
		for_each_seat(game.command, seat => {
			if (!is_supply_forbidden(seat))
				seats.push(seat)
		}, true)
		available = Math.min(seats.length, available)
	}

	let seaports = []
	if (ships > 0) {
		if (game.active === TEUTONS)
			for (let port of data.seaports)
				if (!is_supply_forbidden(port))
					seaports.push(port)
		if (game.active === RUSSIANS)
			if (!is_supply_forbidden(LOC_NOVGOROD))
				seaports.push(LOC_NOVGOROD)
	}
	if (seaports.length === 0)
		ships = 0

	game.supply = { seats, seaports, available, boats, carts, sleds, ships }
}

function search_supply_winter(start, sleds, exit) {
	if (_supply_stop[start])
		return 0
	_supply_reached[start] = 1
	_supply_cost[start] = 0
	if (exit && set_has(exit, start))
		return 1
	if (sleds === 0)
		return 0
	let queue = [ start ]
	while (queue.length > 0) {
		let item = queue.shift()
		let here = item & 63
		let used = item >> 6
		if (used + 1 <= sleds) {
			for (let next of data.locales[here].adjacent) {
				if (!_supply_reached[next] && !_supply_stop[next]) {
					if (exit && set_has(exit, next))
						return 1
					_supply_reached[next] = 1
					_supply_cost[next] = used + 1
					if (used + 1 < sleds)
						queue.push(next | ((used + 1) << 6))
				}
			}
		}
		_supply_stat++
	}
	return 0
}

function search_supply_rasputitsa(start, boats, exit) {
	if (_supply_stop[start])
		return 0
	_supply_reached[start] = 1
	_supply_cost[start] = 0
	if (exit && set_has(exit, start))
		return 1
	if (boats === 0)
		return 0
	let queue = [ start ]
	while (queue.length > 0) {
		let item = queue.shift()
		let here = item & 63
		let used = item >> 6
		if (used + 1 <= boats) {
			for (let next of data.locales[here].adjacent_by_waterway) {
				if (!_supply_reached[next] && !_supply_stop[next]) {
					if (exit && set_has(exit, next))
						return 1
					_supply_reached[next] = 1
					_supply_cost[next] = used + 1
					if (used + 1 < boats)
						queue.push(next | ((used + 1) << 6))
				}
			}
		}
		_supply_stat++
	}
	return 0
}

function search_supply_summer(here, boats, carts, exit) {
	_supply_stat++

	// Been here before with same or more transports remaining
	if (_supply_boats[here] >= boats && _supply_carts[here] >= carts)
		return 0

	// First time here with this many transports remaining
	if (_supply_boats[here] <= boats && _supply_carts[here] <= carts) {
		_supply_boats[here] = boats
		_supply_carts[here] = carts
	}

	_supply_reached[here] = 1
	if (exit && set_has(exit, here))
		return 1

	_supply_seen[here] = 1

	if (boats > 0) {
		for (let next of data.locales[here].adjacent_by_waterway) {
			if (!_supply_seen[next] && !_supply_stop[next]) {
				if (search_supply_summer(next, boats-1, carts, exit)) {
					_supply_seen[here] = 0
					return 1
				}
			}
		}
	}

	if (carts > 0) {
		for (let next of data.locales[here].adjacent_by_trackway) {
			if (!_supply_seen[next] && !_supply_stop[next]) {
				if (search_supply_summer(next, boats, carts-1, exit)) {
					_supply_seen[here] = 0
					return 1
				}
			}
		}
	}

	_supply_seen[here] = 0
	return 0
}

function init_summer_path() {
	init_supply_forbidden()

	// First pass to create best-cost-so-far for each combo of boats to carts
	let gate = {
		boats: new Array(game.supply.boats+1).fill(0),
		carts: new Array(game.supply.carts+1).fill(0),
	}
	_supply_stat = 0
	_supply_boats.fill(-1)
	_supply_carts.fill(-1)
	search_summer_path_pass1(game.supply.here, game.supply.end, game.supply.boats, game.supply.carts, gate)
	console.log("SUMMER GATE", _supply_stat, JSON.stringify(gate))

	// Second pass which lists acceptable paths
	_supply_stat = 0
	_supply_boats.fill(-1)
	_supply_carts.fill(-1)
	game.supply.path = []
	search_summer_path_pass2([], game.supply.here, game.supply.end, game.supply.boats, game.supply.carts, gate)
	console.log("SUMMER PATH", _supply_stat, JSON.stringify(game.supply.path).length)

	// Auto-pick path if only one choice.
	if (AUTOWALK && game.supply.path.length === 2)
		walk_supply_path_way(game.supply.path[0] >> 8, game.supply.path[0] & 255)
}

function search_summer_path_pass1(here, end, boats, carts, gate) {
	_supply_stat++

	if (here === end) {
		for (let c = 0; c <= carts; ++c)
			if (boats > gate.boats[c])
				gate.boats[c] = boats
		for (let b = 0; b <= boats; ++b)
			if (carts > gate.carts[b])
				gate.carts[b] = carts
		return
	}

	// Worse than the best path found
	if (boats < gate.boats[carts] || carts < gate.carts[boats])
		return

	// Been here before with same or more transports remaining
	if (_supply_boats[here] >= boats && _supply_carts[here] >= carts)
		return

	// First time here with this many transports remaining
	if (_supply_boats[here] <= boats && _supply_carts[here] <= carts) {
		_supply_boats[here] = boats
		_supply_carts[here] = carts
	}

	_supply_seen[here] = 1

	if (boats > 0)
		for (let next of data.locales[here].adjacent_by_waterway)
			if (!_supply_stop[next] && !_supply_seen[next])
				search_summer_path_pass1(next, end, boats-1, carts, gate)

	if (carts > 0)
		for (let next of data.locales[here].adjacent_by_trackway)
			if (!_supply_stop[next] && !_supply_seen[next])
				search_summer_path_pass1(next, end, boats, carts-1, gate)

	_supply_seen[here] = 0
}

function search_summer_path_pass2(path, here, end, boats, carts, gate) {
	_supply_stat++

	// Worse than the best path found
	if (boats < gate.boats[carts] || carts < gate.carts[boats])
		return

	if (here === end) {
		console.log("  path", path.map(wl=>data.locales[wl>>8].name).join(","), boats, carts)
		let out1 = game.supply.path
		for (let i = 0; i < path.length; ++i) {
			let wayloc = path[i]
			let out2 = map_get(out1, wayloc, null)
			if (out2 === null) {
				if (i < path.length - 1)
					map_set(out1, wayloc, out2 = [])
				else
					map_set(out1, wayloc, 0)
			}
			out1 = out2
		}
		return
	}

	// Been here before with same or more transports remaining
	if (_supply_boats[here] >= boats && _supply_carts[here] >= carts)
		return

	// First time here with this many transports remaining
	if (_supply_boats[here] <= boats && _supply_carts[here] <= carts) {
		_supply_boats[here] = boats
		_supply_carts[here] = carts
	}

	_supply_seen[here] = 1

	if (boats > 0) {
		for (let [next, way] of data.locales[here].waterways) {
			if (!_supply_stop[next] && !_supply_seen[next]) {
				path.push((next << 8) | way)
				search_summer_path_pass2(path, next, end, boats-1, carts, gate)
				path.pop()
			}
		}
	}

	if (carts > 0) {
		for (let [next, way] of data.locales[here].trackways) {
			if (!_supply_stop[next] && !_supply_seen[next]) {
				path.push((next << 8) | way)
				search_summer_path_pass2(path, next, end, boats, carts-1, gate)
				path.pop()
			}
		}
	}

	_supply_seen[here] = 0
}

// === ACTION: SUPPLY ===

function update_supply_possible() {
	if (game.actions < 1) {
		game.supply = 0
		return
	}

	let lord = find_lodya_lord_in_shared()
	if (lord !== NOBODY) {
		if (!is_winter()) {
			if (!is_supply_forbidden(LOC_NOVGOROD)) {
				if (get_lord_assets(lord, BOAT) >= 2 && update_supply_possible_lodya(-2))
					return
				if (get_lord_assets(lord, BOAT) >= 1 && update_supply_possible_lodya(-1))
					return
			}
			if (get_lord_assets(lord, SHIP) >= 2 && update_supply_possible_lodya(2))
				return
			if (get_lord_assets(lord, SHIP) >= 1 && update_supply_possible_lodya(1))
				return
		}
		update_supply_possible_lodya(0)
	} else {
		update_supply_possible_pass()
		console.log("POSSIBLE SEARCH", _supply_stat, game.supply)
	}
}

function update_supply_possible_lodya(x) {
	game.flags.lodya = x
	update_supply_possible_pass()
	console.log("LODYA POSSIBLE SEARCH", _supply_stat, x, game.supply)
	return game.supply
}

function update_supply_possible_pass() {
	init_supply()
	init_supply_forbidden()
	_supply_reached.fill(0)
	let sources = []
	for (let loc of game.supply.seats)
		set_add(sources, loc)
	for (let loc of game.supply.seaports)
		set_add(sources, loc)
	switch (current_season()) {
		case SUMMER:
			_supply_boats.fill(-1)
			_supply_carts.fill(-1)
			game.supply = search_supply_summer(get_lord_locale(game.command), game.supply.boats, game.supply.carts, sources)
			break
		case EARLY_WINTER:
		case LATE_WINTER:
			game.supply = search_supply_winter(get_lord_locale(game.command), game.supply.sleds, sources)
			break
		case RASPUTITSA:
			game.supply = search_supply_rasputitsa(get_lord_locale(game.command), game.supply.boats, sources)
			break
	}
}

function search_supply_cost() {
	init_supply_forbidden()
	_supply_reached.fill(0)
	switch (current_season()) {
		case SUMMER:
			_supply_boats.fill(-1)
			_supply_carts.fill(-1)
			search_supply_summer(get_lord_locale(game.command), game.supply.boats, game.supply.carts, null)
			break
		case EARLY_WINTER:
		case LATE_WINTER:
			search_supply_winter(get_lord_locale(game.command), game.supply.sleds, null)
			break
		case RASPUTITSA:
			search_supply_rasputitsa(get_lord_locale(game.command), game.supply.boats, null)
			break
	}
	console.log("SUPPLY COST", _supply_stat)
}

function can_action_supply() {
	if (game.actions < 1)
		return false
	return !!game.supply
}

function can_supply() {
	if (game.supply.available > 0 && game.supply.seats.length > 0)
		return true
	if (game.supply.ships > 0 && game.supply.seaports.length > 0)
		return true
	return false
}

function goto_supply() {
	push_undo()

	if (is_famine_in_play() && !game.flags.famine) {
		if (game.active === TEUTONS)
			logevent(EVENT_RUSSIAN_FAMINE)
		else
			logevent(EVENT_TEUTONIC_FAMINE)
	}

	if (init_lodya_supply()) {
		game.state = "supply_lodya"
	} else {
		log(`Supplied from`)
		init_supply()
		resume_supply()
		game.state = "supply_source"
	}
}

function resume_supply() {
	if (game.supply.available + game.supply.ships === 0) {
		game.supply.seats = []
		game.supply.seaports = []
	} else {
		search_supply_cost()
		game.supply.seats = game.supply.seats.filter(loc => _supply_reached[loc])
		game.supply.seaports = game.supply.seaports.filter(loc => _supply_reached[loc])
	}

	if (can_supply())
		game.state = "supply_source"
	else
		end_supply()
}

states.supply_source = {
	inactive: "Supply",
	prompt() {
		if (!can_supply()) {
			view.prompt = "Supply: No valid Supply Sources."
			return
		}

		view.prompt = "Supply: Select Supply Source and Route."

		let list = []
		if (game.supply.boats > 0)
			list.push(`${game.supply.boats} Boat`)
		if (game.supply.carts > 0)
			list.push(`${game.supply.carts} Cart`)
		if (game.supply.sleds > 0)
			list.push(`${game.supply.sleds} Sled`)
		if (game.supply.ships > 0)
			list.push(`${game.supply.ships} Ship`)

		if (list.length > 0)
			view.prompt += " " + list.join(", ") + "."

		if (game.supply.available > 0)
			for (let source of game.supply.seats)
				gen_action_locale(source)
		if (game.supply.ships > 0)
			for (let source of game.supply.seaports)
				gen_action_locale(source)
		view.actions.end_supply = 1
	},
	locale(source) {
		if (game.supply.seats.includes(source)) {
			logi(`Seat at %${source}`)
			game.supply.available--
			array_remove_item(game.supply.seats, source)
			if (is_famine_in_play())
				game.flags.famine = 1
		} else {
			logi(`Seaport at %${source}`)
			game.supply.ships--
		}

		add_lord_assets(game.command, PROV, 1)

		spend_supply_transport(source)
	},
	end_supply: end_supply,
}

function end_supply() {
	spend_action(1)
	resume_command()
	game.supply = 1 // supply is possible!
}

function spend_supply_transport(source) {
	if (source === get_lord_locale(game.command)) {
		resume_supply()
		return
	}

	switch (current_season()) {
		case SUMMER:
			game.supply.here = get_lord_locale(game.command)
			game.supply.end = source
			game.state = "supply_path"
			init_summer_path()
			break
		case EARLY_WINTER:
		case LATE_WINTER:
			search_supply_cost()
			game.supply.sleds -= _supply_cost[source]
			resume_supply()
			break
		case RASPUTITSA:
			search_supply_cost()
			game.supply.boats -= _supply_cost[source]
			resume_supply()
			break
	}
}

states.supply_path = {
	inactive: "Supply",
	prompt() {
		view.prompt = "Supply: Trace Route to Supply Source."
		view.supply = [ game.supply.here, game.supply.end ]
		if (game.supply.boats > 0)
			view.prompt += ` ${game.supply.boats} boat`
		if (game.supply.carts > 0)
			view.prompt += ` ${game.supply.carts} cart`
		for (let i = 0; i < game.supply.path.length; i += 2) {
			let wayloc = game.supply.path[i]
			gen_action_locale(wayloc >> 8)
		}
	},
	locale(next) {
		let useloc = -1
		let useway = -1
		let twoway = false
		for (let i = 0; i < game.supply.path.length; i += 2) {
			let wayloc = game.supply.path[i]
			let way = wayloc & 255
			let loc = wayloc >> 8
			if (loc === next) {
				if (useloc < 0) {
					useloc = loc
					useway = way
				} else {
					twoway = true
				}
			}
		}
		if (twoway) {
			game.state = "supply_path_way"
			game.supply.next = next
		} else {
			walk_supply_path_way(next, useway)
		}
	},
}

function walk_supply_path_way(next, way) {
	let type = data.ways[way].type
	if (type === "waterway")
		game.supply.boats--
	else
		game.supply.carts--
	game.supply.here = next
	game.supply.path = map_get(game.supply.path, (next << 8) | way)
	if (game.supply.path === 0)
		resume_supply()
	else
		// Auto-pick path if only one choice.
		if (AUTOWALK && game.supply.path.length === 2)
			walk_supply_path_way(game.supply.path[0] >> 8, game.supply.path[0] & 255)
}

states.supply_path_way = {
	inactive: "Supply",
	prompt() {
		view.prompt = "Supply: Trace path to supply source."
		view.supply = [ game.supply.here, game.supply.end ]
		if (game.supply.boats > 0)
			view.prompt += ` ${game.supply.boats} boat`
		if (game.supply.carts > 0)
			view.prompt += ` ${game.supply.carts} cart`
		for (let i = 0; i < game.supply.path.length; i += 2) {
			let wayloc = game.supply.path[i]
			let way = wayloc & 255
			let loc = wayloc >> 8
			if (loc === game.supply.next)
				gen_action_way(way)
		}
	},
	way(way) {
		game.state = "supply_path"
		walk_supply_path_way(game.supply.next, way)
	},
}

// === ACTION: FORAGE ===

function can_action_forage() {
	if (game.actions < 1)
		return false

	if (is_famine_in_play())
		return false

	let here = get_lord_locale(game.command)
	if (has_ravaged_marker(here))
		return false
	if (is_summer())
		return true
	if (is_friendly_stronghold_locale(here)) // FIXME: simpler check?
		return true
	return false
}

function goto_forage() {
	push_undo()
	let here = get_lord_locale(game.command)
	log(`Foraged at %${here}`)
	add_lord_assets(game.command, PROV, 1)
	spend_action(1)
	resume_command()
}

// === ACTION: RAVAGE ===

function has_adjacent_unbesieged_enemy_lord(loc) {
	for (let next of data.locales[loc].adjacent)
		if (has_unbesieged_enemy_lord(next))
			return true
	return false
}

function has_not_used_teutonic_raiders() {
	return !game.flags.teutonic_raiders
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
	if (!is_enemy_territory(loc))
		return false
	if (has_conquered_marker(loc))
		return false
	if (has_ravaged_marker(loc))
		return false
	if (is_friendly_locale(loc)) // faster check?
		return false
	if (has_adjacent_unbesieged_enemy_lord(loc))
		return game.actions >= 2
	else
		return game.actions >= 1
}

function can_action_ravage() {
	if (game.actions < 1)
		return false

	let here = get_lord_locale(game.command)

	if (can_ravage_locale(here))
		return true

	if (this_lord_has_teutonic_raiders()) {
		for (let there of data.locales[here].adjacent_by_trackway)
			// XXX has_enemy_lord redundant with is_friendly_locale in can_ravage_locale
			if (can_ravage_locale(there) && !has_enemy_lord(there))
				return true
	}

	if (this_lord_has_russian_raiders()) {
		for (let there of data.locales[here].adjacent)
			// XXX has_enemy_lord redundant with is_friendly_locale in can_ravage_locale
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
	inactive: "Ravage",
	prompt() {
		view.prompt = `Ravage: Select enemy territory to Ravage.`

		let here = get_lord_locale(game.command)

		if (can_ravage_locale(here))
			gen_action_locale(here)

		if (this_lord_has_teutonic_raiders()) {
			for (let there of data.locales[here].adjacent_by_trackway)
				if (can_ravage_locale(there) && !has_enemy_lord(there))
					gen_action_locale(there)
		}

		if (this_lord_has_russian_raiders()) {
			for (let there of data.locales[here].adjacent)
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
	if (here !== there) {
		if (is_teutonic_lord(game.command))
			log(`Ravaged %${there} with C${AOW_TEUTONIC_RAIDERS}.`)
		else
			log(`Ravaged %${there} with C${which_lord_capability(game.command, AOW_RUSSIAN_RAIDERS)}.`)
	} else {
		log(`Ravaged %${there}.`)
	}

	add_ravaged_marker(there)
	add_lord_assets(game.command, PROV, 1)

	if (here !== there && game.active === TEUTONS)
		game.flags.teutonic_raiders = 1

	if (!is_region(there)) {
		// R12 Raiders - take no loot from adjacent
		if (here === there || game.active !== RUSSIANS)
			add_lord_assets(game.command, LOOT, 1)
	}

	if (has_adjacent_unbesieged_enemy_lord(there))
		spend_action(2)
	else
		spend_action(1)
	resume_command()
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
	return is_lord_at_seat(game.command)
}

function goto_tax() {
	push_undo()

	let here = get_lord_locale(game.command)
	log(`Taxed %${here}.`)

	add_lord_assets(game.command, COIN, 1)

	spend_all_actions()
	resume_command()

	if (lord_has_capability(game.command, AOW_RUSSIAN_VELIKY_KNYAZ)) {
		logcap(AOW_RUSSIAN_VELIKY_KNYAZ)
		restore_mustered_forces(game.command)
		push_state("veliky_knyaz")
		game.who = game.command
		game.count = 2
	}
}

states.veliky_knyaz = states.muster_lord_transport

// === ACTION: SAIL ===

function drop_prov(lord) {
	add_lord_assets(lord, PROV, -1)
}

function drop_loot(lord) {
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
	if (is_winter())
		return false

	// with enough ships to carry all the horses
	if (!has_enough_available_ships_for_horses())
		return false

	// and a valid destination
	for (let to of data.seaports)
		if (to !== here && !has_enemy_lord(to))
			return true

	return false
}

function goto_sail() {
	push_undo()
	init_lodya_sail()
	game.state = "sail"
}

states.sail = {
	inactive: "Sail",
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
			view.prompt = `Sailing with ${ships} Ships and ${horses} Horses. Discard Loot or Provender.`
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
			view.prompt = `Sail: Select a destination Seaport.`
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
		if (game.pieces.legate_selected)
			game.pieces.legate = to

		lift_sieges()

		remove_legate_if_endangered(from)

		if (is_unbesieged_enemy_stronghold(to))
			add_siege_marker(to)

		if (is_trade_route(to))
			conquer_trade_route(to)

		spend_all_actions()
		resume_command()
		update_supply_possible()
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
		if (has_castle_marker(here))
			return false
		if (has_siege_marker(here))
			return false
		return true
	}

	return false
}

function goto_stonemasons() {
	push_undo()

	logcap(AOW_TEUTONIC_STONEMASONS)

	game.count = 6
	game.state = "stonemasons"
}

states.stonemasons = {
	inactive: "Stonemasons",
	prompt() {
		view.prompt = `Stonemasons: Pay ${game.count} Provender.`
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
	resume_command()
}

// === ACTION: STONE KREMLIN (CAPABILITY) ===

function count_walls() {
	return game.pieces.walls.length
}

function has_walls(loc) {
	return set_has(game.pieces.walls, loc)
}

function add_walls(loc) {
	return set_add(game.pieces.walls, loc)
}

function remove_walls(loc) {
	return set_delete(game.pieces.walls, loc)
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

	logcap(AOW_RUSSIAN_STONE_KREMLIN)

	if (count_walls() > 0) {
		game.state = "stone_kremlin"
		game.count = 1
	} else {
		end_stone_kremlin()
	}
}

states.stone_kremlin = {
	inactive: "Stone Kremlin",
	prompt() {
		let here = get_lord_locale(game.command)
		if (game.count > 0) {
			if (count_walls() === 4) {
				view.prompt = `Stone Kremlin: Move one Walls marker.`
			} else {
				view.prompt = `Stone Kremlin: Place or move Walls.`
				gen_action_locale(here)
			}
			for (let loc of game.pieces.walls)
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
	resume_command()
}

// === ACTION: SMERDI (CAPABILITY) ===

function can_action_smerdi() {
	if (game.actions < 1)
		return false
	if (game.pieces.smerdi > 0) {
		if (is_in_rus(get_lord_locale(game.command)))
			return true
	}
	return false
}

function goto_smerdi() {
	push_undo()
	logcap(AOW_RUSSIAN_SMERDI)
	game.pieces.smerdi --
	add_lord_forces(game.command, SERFS, 1)
	spend_action(1)
	resume_command()
}

// === BATTLE ===

function set_active_attacker() {
	set_active(game.battle.attacker)
}

function set_active_defender() {
	if (game.battle.attacker === P1)
		set_active(P2)
	else
		set_active(P1)
}

function goto_battle() {
	if (has_unbesieged_enemy_lord(game.march.to))
		start_battle()
	else
		march_with_group_3()
}

function init_battle(here, is_storm, is_sally) {
	game.battle = {
		where: here,
		round: 1,
		step: 0,
		storm: is_storm,
		sally: is_sally,
		relief: 0,
		attacker: game.active,
		ambush: 0,
		conceded: 0,
		loser: 0,
		array: [
			-1, game.command, -1,
			-1, -1, -1,
			-1, -1, -1,
			-1, -1, -1,
		],
		garrison: 0,
		reserves: [],
		retreated: 0,
		rearguard: 0,
		strikers: 0,
		warrior_monks: 0,
		hits: 0,
		xhits: 0,
		fc: -1,
		rc: -1,
	}
}

function start_battle() {
	let here = get_lord_locale(game.command)

	log_h2(`Battle at %${here}`)

	init_battle(here, 0, 0)

	// All attacking lords to reserve
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
		if (get_lord_locale(lord) === here && !is_lord_besieged(lord)) {
			set_lord_moved(lord, 1)
			if (lord !== game.command)
				set_add(game.battle.reserves, lord)
		}
	}

	// Array attacking lords if fewer than 3.
	if (game.battle.reserves.length === 2)
		game.battle.array[A3] = game.battle.reserves.pop()
	if (game.battle.reserves.length === 1)
		game.battle.array[A1] = game.battle.reserves.pop()

	// All defending lords to reserve
	for (let lord = first_enemy_lord; lord <= last_enemy_lord; ++lord) {
		if (get_lord_locale(lord) === here && !is_lord_besieged(lord)) {
			set_lord_moved(lord, 1)
			set_add(game.battle.reserves, lord)
		}
	}

	goto_relief_sally()
}

function start_sally() {
	let here = get_lord_locale(game.command)

	log_h2(`Sally at %${here}`)

	init_battle(here, 0, 1)

	// NOTE: All besieged lords sally in Nevsky
	for (let lord = first_lord; lord <= last_lord; ++lord) {
		if (get_lord_locale(lord) === here) {
			set_lord_moved(lord, 1)
			if (lord !== game.command)
				set_add(game.battle.reserves, lord)
		}
	}

	goto_array_attacker()
}

function init_garrison(knights, men_at_arms) {
	game.battle.garrison = { knights, men_at_arms }
}

function start_storm() {
	let here = get_lord_locale(game.command)

	log_h2(`Storm at %${here}`)

	init_battle(here, 1, 0)

	if (here === LOC_NOVGOROD)
		init_garrison(0, 3)
	else if (is_city(here))
		init_garrison(0, 3)
	else if (is_fort(here))
		init_garrison(0, 1)
	else if (is_bishopric(here))
		init_garrison(1, 2)
	else if (is_castle(here))
		init_garrison(1, 1)

	// All lords must storm
	for (let lord = first_lord; lord <= last_lord; ++lord) {
		if (get_lord_locale(lord) === here) {
			set_lord_moved(lord, 1)
			if (lord !== game.command)
				set_add(game.battle.reserves, lord)
		}
	}

	// NOTE: Only one lord at a time can storm.
	goto_array_defender_storm()
}

// === BATTLE: RELIEF SALLY ===

// NOTE: sallying attackers are flagged as besieged

function goto_relief_sally() {
	set_active_attacker()
	if (has_besieged_friendly_lord(game.battle.where)) {
		game.state = "relief_sally"
		game.who = NOBODY
	} else {
		goto_array_attacker()
	}
}

states.relief_sally = {
	inactive: "Relief Sally",
	prompt() {
		view.prompt = "Battle: Relief Sally."

		// NOTE: max 3 lords stronghold so there's always room for all to sally

		// RULES: can lower lords sally without lieutenant?

		let here = game.battle.where
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (get_lord_locale(lord) === here && is_lord_besieged(lord))
				if (!set_has(game.battle.reserves, lord))
					gen_action_lord(lord)

		view.actions.end_sally = 1
	},
	lord(lord) {
		push_undo()
		log(`L${lord} Sallied.`)
		set_lord_moved(lord, 1)
		set_add(game.battle.reserves, lord)
		game.battle.relief = 1
	},
	end_sally() {
		goto_array_attacker()
	},
}

// === BATTLE: BATTLE ARRAY ===

// 0) Defender decides to stand for Battle, not Avoid.
// 1) Attacker decides which Lords will relief sally, if any.
// 2) Attacker positions front A.
// 3) Defender positions front D.
// 4) Attacker positions SA.
// 5) Defender positions reaguard RG.

function has_friendly_reserves() {
	for (let lord of game.battle.reserves)
		if (is_friendly_lord(lord))
			return true
	return false
}

function has_friendly_attacking_reserves() {
	for (let lord of game.battle.reserves)
		if (is_friendly_lord(lord) && (game.battle.sally || is_lord_unbesieged(lord)))
			return true
	return false
}

function has_friendly_sallying_reserves() {
	for (let lord of game.battle.reserves)
		if (is_friendly_lord(lord) && is_lord_besieged(lord))
			return true
	return false
}

function count_friendly_reserves() {
	let n = 0
	for (let lord of game.battle.reserves)
		if (is_friendly_lord(lord))
			++n
	return n
}

function pop_first_reserve() {
	for (let lord of game.battle.reserves) {
		if (is_friendly_lord(lord)) {
			set_delete(game.battle.reserves, lord)
			return lord
		}
	}
	return NOBODY
}

function prompt_array_place_opposed(X1, X2, X3, Y1, Y3) {
	let array = game.battle.array
	if (array[X2] === NOBODY) {
		gen_action_array(X2)
	} else if (array[Y1] !== NOBODY && array[Y3] === NOBODY && array[X1] === NOBODY) {
		gen_action_array(X1)
	} else if (array[Y1] === NOBODY && array[Y3] !== NOBODY && array[X3] === NOBODY) {
		gen_action_array(X3)
	} else {
		if (array[X1] === NOBODY)
			gen_action_array(X1)
		if (array[X3] === NOBODY)
			gen_action_array(X3)
	}
}

function action_array_place(pos) {
	push_undo_without_who()
	game.battle.array[pos] = game.who
	set_delete(game.battle.reserves, game.who)
	game.who = NOBODY
}

function goto_array_attacker() {
	clear_undo()
	set_active_attacker()
	game.state = "array_attacker"
	game.who = NOBODY
	if (!has_friendly_attacking_reserves())
		end_array_attacker()
}

function goto_array_defender() {
	clear_undo()
	set_active_defender()
	game.state = "array_defender"
	game.who = NOBODY
	let n = count_friendly_reserves()
	if (n === 1) {
		game.battle.array[D2] = pop_first_reserve()
		end_array_defender()
	}
	if (n === 0)
		end_array_defender()
}

function goto_array_sally() {
	clear_undo()
	set_active_attacker()
	game.state = "array_sally"
	game.who = NOBODY
	if (!has_friendly_sallying_reserves())
		end_array_sally()
}

function goto_array_rearguard() {
	clear_undo()
	set_active_defender()
	game.state = "array_rearguard"
	game.who = NOBODY
	if (!has_friendly_reserves() || empty(SA2))
		end_array_rearguard()
}

// NOTE: The order here can be easily change to attacker/sally/defender/rearguard if desired.

function end_array_attacker() {
	goto_array_defender()
}

function end_array_defender() {
	goto_array_sally()
}

function end_array_sally() {
	goto_array_rearguard()
}

function end_array_rearguard() {
	goto_attacker_events()
}

states.array_attacker = {
	inactive: "Array Attacking Lords",
	prompt() {
		view.prompt = "Battle Array: Position your Attacking Lords."
		let array = game.battle.array
		let done = true
		if (array[A1] === NOBODY || array[A2] === NOBODY || array[A3] === NOBODY) {
			for (let lord of game.battle.reserves) {
				if (lord !== game.who && is_friendly_lord(lord)) {
					if (game.battle.sally || is_lord_unbesieged(lord)) {
						gen_action_lord(lord)
						done = false
					}
				}
			}
		}
		if (game.who === NOBODY && done)
			view.actions.end_array = 1
		if (game.who !== NOBODY) {
			// A2 is already filled by command lord!
			if (array[A1] === NOBODY)
				gen_action_array(A1)
			if (array[A3] === NOBODY)
				gen_action_array(A3)
		}
	},
	array: action_array_place,
	lord: action_select_lord,
	end_array: end_array_attacker,
}

states.array_sally = {
	inactive: "Array Sallying Lords",
	prompt() {
		view.prompt = "Battle Array: Position your Sallying Lords."
		let array = game.battle.array
		let done = true
		if (array[SA1] === NOBODY || array[SA2] === NOBODY || array[SA3] === NOBODY) {
			for (let lord of game.battle.reserves) {
				if (lord !== game.who && is_friendly_lord(lord) && is_lord_besieged(lord)) {
					gen_action_lord(lord)
					done = false
				}
			}
		}
		if (game.who === NOBODY && done)
			view.actions.end_array = 1
		if (game.who !== NOBODY) {
			if (array[SA2] === NOBODY) {
				gen_action_array(SA2)
			} else {
				if (array[SA1] === NOBODY)
					gen_action_array(SA1)
				if (array[SA3] === NOBODY)
					gen_action_array(SA3)
			}
		}
	},
	array: action_array_place,
	lord: action_select_lord,
	end_array: end_array_sally,
}

states.array_defender = {
	inactive: "Array Defending Lords",
	prompt() {
		view.prompt = "Battle Array: Position your Defending Lords."
		let array = game.battle.array
		let done = true
		if (array[D1] === NOBODY || array[D2] === NOBODY || array[D3] === NOBODY) {
			for (let lord of game.battle.reserves) {
				if (lord !== game.who && is_friendly_lord(lord)) {
					gen_action_lord(lord)
					done = false
				}
			}
		}
		if (done && game.who === NOBODY)
			view.actions.end_array = 1
		if (game.who !== NOBODY)
			prompt_array_place_opposed(D1, D2, D3, A1, A3)
	},
	array: action_array_place,
	lord: action_select_lord,
	end_array: end_array_defender,
}

states.array_rearguard = {
	inactive: "Array Rearguard",
	prompt() {
		view.prompt = "Battle Array: Position your Rearguard Lords."
		let array = game.battle.array
		let done = true
		if (array[RG1] === NOBODY || array[RG2] === NOBODY || array[RG3] === NOBODY) {
			for (let lord of game.battle.reserves) {
				if (lord !== game.who && is_friendly_lord(lord)) {
					gen_action_lord(lord)
					done = false
				}
			}
		}
		if (done && game.who === NOBODY)
			view.actions.end_array = 1
		if (game.who !== NOBODY)
			prompt_array_place_opposed(RG1, RG2, RG3, SA1, SA3)
	},
	array: action_array_place,
	lord: action_select_lord,
	end_array: end_array_rearguard,
}

// === STORM: ARRAY ===

function goto_array_defender_storm() {
	clear_undo()
	set_active_defender()
	game.state = "array_defender_storm"
	game.who = NOBODY
	let n = count_friendly_reserves()
	if (n === 1) {
		game.battle.array[D2] = pop_first_reserve()
		end_array_defender_storm()
	}
	if (n === 0) {
		end_array_defender_storm()
	}
}

states.array_defender_storm = {
	inactive: "Array Defending Lord",
	prompt() {
		view.prompt = "Storm Array: Select a Defending Lord."

		for (let lord of game.battle.reserves)
			if (is_friendly_lord(lord))
				gen_action_lord(lord)
	},
	lord(lord) {
		set_delete(game.battle.reserves, lord)
		game.battle.array[D2] = lord
		end_array_defender_storm()
	},
}

function end_array_defender_storm() {
	goto_attacker_events()
}

// === BATTLE: EVENTS ===

function goto_attacker_events() {
	clear_undo()
	set_active_attacker()
	log_br()
	if (can_play_battle_events())
		game.state = "attacker_events"
	else
		end_attacker_events()
}

function end_attacker_events() {
	goto_defender_events()
}

function goto_defender_events() {
	set_active_defender()
	log_br()
	if (can_play_battle_events())
		game.state = "defender_events"
	else
		end_defender_events()
}

function end_defender_events() {
	goto_battle_rounds()
}

function resume_battle_events() {
	game.what = -1
	if (is_attacker())
		goto_attacker_events()
	else
		goto_defender_events()
}

function could_play_card(c) {
	if (set_has(game.capabilities, c))
		return false
	if (game.pieces.capabilities.includes(c))
		return false
	if (set_has(game.events, c))
		return false
	if (is_p1_card(c))
		return game.hand1.length > 0
	if (is_p2_card(c))
		return game.hand2.length > 0
	return true
}

function has_lords_in_battle() {
	for (let p = 0; p < 12; ++p)
		if (is_friendly_lord(game.battle.array[p]))
			return true
	return has_friendly_reserves()
}

function can_play_battle_events() {
	if (!game.battle.storm) {
		if (game.active === TEUTONS) {
			if (could_play_card(EVENT_TEUTONIC_AMBUSH))
				return true
			if (is_defender()) {
				if (could_play_card(EVENT_TEUTONIC_HILL))
					return true
				if (!is_winter())
					if (could_play_card(EVENT_TEUTONIC_MARSH))
						return true
			}
			if (!is_winter())
				if (could_play_card(EVENT_TEUTONIC_BRIDGE))
					return true
		}

		if (game.active === RUSSIANS) {
			if (could_play_card(EVENT_RUSSIAN_AMBUSH))
				return true
			if (is_defender()) {
				if (could_play_card(EVENT_RUSSIAN_HILL))
					return true
				if (!is_winter())
					if (could_play_card(EVENT_RUSSIAN_MARSH))
						return true
			}
			if (!is_winter())
				if (could_play_card(EVENT_RUSSIAN_BRIDGE))
					return true
			if (!is_summer())
				if (could_play_card(EVENT_RUSSIAN_RAVENS_ROCK))
					return true
		}
	}

	// Battle or Storm
	if (game.active === TEUTONS) {
		if (could_play_card(EVENT_TEUTONIC_FIELD_ORGAN))
			if (has_lords_in_battle())
				return true
	}

	return false
}

function prompt_battle_events() {
	// both attacker and defender events
	if (game.active === TEUTONS) {
		if (!game.battle.storm) {
			gen_action_card_if_held(EVENT_TEUTONIC_AMBUSH)
			if (!is_winter())
				gen_action_card_if_held(EVENT_TEUTONIC_BRIDGE)
		}
		if (has_lords_in_battle())
			gen_action_card_if_held(EVENT_TEUTONIC_FIELD_ORGAN)
	}

	if (game.active === RUSSIANS) {
		if (!game.battle.storm) {
			gen_action_card_if_held(EVENT_RUSSIAN_AMBUSH)
			if (!is_winter())
				gen_action_card_if_held(EVENT_RUSSIAN_BRIDGE)
			if (!is_summer())
				gen_action_card_if_held(EVENT_RUSSIAN_RAVENS_ROCK)
		}
	}

	view.actions.done = 1
}

states.attacker_events = {
	inactive: "Attacker Events",
	prompt() {
		view.prompt = "Attacker may play Events."
		prompt_battle_events()
	},
	card: action_battle_events,
	done() {
		end_attacker_events()
	},
}

states.defender_events = {
	inactive: "Defender Events",
	prompt() {
		view.prompt = "Defender may play Events."

		prompt_battle_events()

		// defender only events
		if (game.active === TEUTONS) {
			if (!game.battle.storm) {
				if (!is_winter())
					gen_action_card_if_held(EVENT_TEUTONIC_MARSH)
				gen_action_card_if_held(EVENT_TEUTONIC_HILL)
			}
		}

		if (game.active === RUSSIANS) {
			if (!game.battle.storm) {
				if (!is_winter())
					gen_action_card_if_held(EVENT_RUSSIAN_MARSH)
				gen_action_card_if_held(EVENT_RUSSIAN_HILL)
			}
		}
	},
	card: action_battle_events,
	done() {
		end_defender_events()
	},
}

function action_battle_events(c) {
	game.what = c
	set_delete(current_hand(), c)
	set_add(game.events, c)
	switch (c) {
		case EVENT_TEUTONIC_HILL:
		case EVENT_TEUTONIC_MARSH:
		case EVENT_RUSSIAN_HILL:
		case EVENT_RUSSIAN_MARSH:
		case EVENT_RUSSIAN_RAVENS_ROCK:
			// nothing more needs to be done for these
			log(`Played E${c}.`)
			resume_battle_events()
			break
		case EVENT_TEUTONIC_AMBUSH:
		case EVENT_RUSSIAN_AMBUSH:
			log(`Played E${c}.`)
			if (is_attacker())
				game.battle.ambush |= 2
			else
				game.battle.ambush |= 1
			break
		case EVENT_TEUTONIC_BRIDGE:
		case EVENT_RUSSIAN_BRIDGE:
			// must select target lord
			game.state = "bridge"
			break
		case EVENT_TEUTONIC_FIELD_ORGAN:
			// must select target lord
			game.state = "field_organ"
			break
	}
}

states.bridge = {
	inactive: "Bridge",
	prompt() {
		view.prompt = "Bridge: Play on a Center Lord."
		view.what = game.what
		let array = game.battle.array
		if (is_attacker()) {
			if (array[D2] !== NOBODY)
				gen_action_lord(array[D2])
			if (array[RG2] !== NOBODY)
				gen_action_lord(array[RG2])
		} else {
			// Cannot play on Relief Sallying lord
			if (array[A2] !== NOBODY)
				gen_action_lord(array[A2])
		}
	},
	lord(lord) {
		log(`Played E${game.what} on L${lord}.`)
		if (!game.battle.bridge)
			game.battle.bridge = { lord1: NOBODY, lord2: NOBODY, n1: 0, n2: 0 }
		if (is_p1_lord(lord))
			game.battle.bridge.lord1 = lord
		else
			game.battle.bridge.lord2 = lord
		resume_battle_events()
	},
}

states.field_organ = {
	inactive: "Field Organ",
	prompt() {
		view.prompt = "Field Organ: Play on a Lord."
		view.what = game.what
		let array = game.battle.array
		if (is_attacker()) {
			for (let pos of battle_attacking_positions)
				if (array[pos] !== NOBODY)
					gen_action_lord(array[pos])
		} else {
			for (let pos of battle_defending_positions)
				if (array[pos] !== NOBODY)
					gen_action_lord(array[pos])
		}
	},
	lord(lord) {
		log(`Played E${game.what} on L${lord}.`)
		game.battle.field_organ = lord
		resume_battle_events()
	},
}


// === BATTLE: CONCEDE THE FIELD ===

function goto_battle_rounds() {
	set_active_attacker()
	goto_concede()
}

function goto_concede() {
	// No concede during first round of Storm
	if (game.battle.storm) {
		log_h3(`Storm Round ${game.battle.round} / ${count_siege_markers(game.battle.where)}`)
		if (game.battle.round === 1)
			goto_first_strike()
		else
			game.state = "concede_storm"
	} else {
		log_h3(`Battle Round ${game.battle.round}`)
		game.state = "concede_battle"
	}
}

states.concede_battle = {
	inactive: "Concede",
	prompt() {
		view.prompt = "Battle: Concede the Field?"
		view.actions.concede = 1
		view.actions.battle = 1
	},
	concede() {
		log(game.active + " Conceded.")
		game.battle.conceded = game.active
		goto_reposition_battle()
	},
	battle() {
		set_active_enemy()
		if (is_attacker())
			goto_reposition_battle()
	},
}

states.concede_storm = {
	inactive: "Concede",
	prompt() {
		view.prompt = "Storm: Concede?"
		view.actions.concede = 1
		view.actions.battle = 1
	},
	concede() {
		log(game.active + " Conceded.")
		game.battle.conceded = game.active
		end_battle()
	},
	battle() {
		goto_reposition_storm()
	},
}

// === BATTLE: REPOSITION ===

function send_to_reserve(pos) {
	if (game.battle.array[pos] !== NOBODY) {
		set_add(game.battle.reserves, game.battle.array[pos])
		game.battle.array[pos] = NOBODY
	}
}

function slide_array(from, to) {
	game.battle.array[to] = game.battle.array[from]
	game.battle.array[from] = NOBODY
}

function goto_reposition_battle() {
	let array = game.battle.array

	// If all SA routed, send RG to reserve (end relief sally)
	if (array[SA1] === NOBODY && array[SA2] === NOBODY && array[SA3] === NOBODY) {
		if (array[RG1] !== NOBODY || array[RG2] !== NOBODY || array[RG3] !== NOBODY) {
			log("Sallying Routed.")
			log("Rearguard to reserve.")
			send_to_reserve(RG1)
			send_to_reserve(RG2)
			send_to_reserve(RG3)
		}
	}

	// If all D routed, advance RG to front
	if (array[D1] === NOBODY && array[D2] === NOBODY && array[D3] === NOBODY) {
		log("Defenders Routed.")
		if (array[RG1] !== NOBODY || array[RG2] !== NOBODY || array[RG3] !== NOBODY) {
			log("Rearguard to front.")
			slide_array(RG1, D1)
			slide_array(RG2, D2)
			slide_array(RG3, D3)
		}
	}

	// If all A routed, flip the battle field around:
	if (array[A1] === NOBODY && array[A2] === NOBODY && array[A3] === NOBODY) {
		if (array[SA1] !== NOBODY || array[SA2] !== NOBODY || array[SA3] !== NOBODY) {
			log("Attackers Routed.")

			// Become a regular sally situation (siegeworks still count for defender)
			game.battle.sally = 1

			// Advance SA to front (to regular sally)
			log("Sallying to front.")
			slide_array(SA1, A1)
			slide_array(SA2, A2)
			slide_array(SA3, A3)

			// then D back to reserve
			if (array[RG1] !== NOBODY || array[RG2] !== NOBODY || array[RG3] !== NOBODY) {
				log("Rearguard to front.")

				if (array[D1] !== NOBODY || array[D2] !== NOBODY || array[D3] !== NOBODY) {
					log("Defenders to reserve.")
					send_to_reserve(D1)
					send_to_reserve(D2)
					send_to_reserve(D3)
				}

				// then RG to D
				slide_array(RG1, D1)
				slide_array(RG2, D2)
				slide_array(RG3, D3)
			}

			// and during the advance D may come back out from reserve
		}
	}

	set_active_attacker()
	goto_reposition_advance()
}

function goto_reposition_advance() {
	if (can_reposition_advance())
		game.state = "reposition_advance"
	else
		end_reposition_advance()
}

function end_reposition_advance() {
	game.who = NOBODY
	set_active_enemy()
	if (is_attacker())
		goto_reposition_center()
	else
		goto_reposition_advance()
}

function goto_reposition_center() {
	if (can_reposition_center())
		game.state = "reposition_center"
	else
		end_reposition_center()
}

function end_reposition_center() {
	game.who = NOBODY
	set_active_enemy()
	if (is_attacker())
		goto_first_strike()
	else
		goto_reposition_center()
}

function can_reposition_advance() {
	if (has_friendly_reserves()) {
		let array = game.battle.array
		if (is_attacker()) {
			if (array[A1] === NOBODY || array[A2] === NOBODY || array[A3] === NOBODY)
				return true
		} else {
			if (array[D1] === NOBODY || array[D2] === NOBODY || array[D3] === NOBODY)
				return true
			if (array[SA1] !== NOBODY || array[SA2] !== NOBODY || array[SA2] !== NOBODY)
				if (array[RG1] === NOBODY || array[RG2] === NOBODY || array[RG3] === NOBODY)
					return true
		}
	}
	return false
}

states.reposition_advance = {
	inactive: "Reposition",
	prompt() {
		view.prompt = "Reposition: Advance from Reserve."
		let array = game.battle.array

		for (let lord of game.battle.reserves)
			if (is_friendly_lord(lord) && lord !== game.who)
				gen_action_lord(lord)

		if (game.who !== NOBODY) {
			if (is_attacker()) {
				if (array[A1] === NOBODY) gen_action_array(A1)
				if (array[A2] === NOBODY) gen_action_array(A2)
				if (array[A3] === NOBODY) gen_action_array(A3)
			} else {
				if (array[D1] === NOBODY) gen_action_array(D1)
				if (array[D2] === NOBODY) gen_action_array(D2)
				if (array[D3] === NOBODY) gen_action_array(D3)
				if (array[SA1] !== NOBODY || array[SA2] !== NOBODY || array[SA2] !== NOBODY) {
					if (array[RG1] === NOBODY) gen_action_array(RG1)
					if (array[RG2] === NOBODY) gen_action_array(RG2)
					if (array[RG3] === NOBODY) gen_action_array(RG3)
				}
			}
		}
	},
	lord(lord) {
		game.who = lord
	},
	array(pos) {
		set_delete(game.battle.reserves, game.who)
		game.battle.array[pos] = game.who
		game.who = NOBODY
		goto_reposition_advance()
	},
}

function can_reposition_center() {
	let array = game.battle.array
	if (is_attacker()) {
		if (array[A2] === NOBODY && (array[A1] !== NOBODY || array[A3] !== NOBODY))
			return true
		if (array[SA2] === NOBODY && (array[SA1] !== NOBODY || array[SA3] !== NOBODY))
			return true
	} else {
		if (array[D2] === NOBODY && (array[D1] !== NOBODY || array[D3] !== NOBODY))
			return true
		if (array[RG2] === NOBODY && (array[RG1] !== NOBODY || array[RG3] !== NOBODY))
			return true
	}
	return false
}

states.reposition_center = {
	inactive: "Reposition",
	prompt() {
		view.prompt = "Reposition: Slide to Center."
		let array = game.battle.array

		if (is_attacker()) {
			if (array[A2] === NOBODY) {
				if (array[A1] !== NOBODY) gen_action_lord(game.battle.array[A1])
				if (array[A3] !== NOBODY) gen_action_lord(game.battle.array[A3])
			}
			if (array[SA2] === NOBODY) {
				if (array[SA1] !== NOBODY) gen_action_lord(game.battle.array[SA1])
				if (array[SA3] !== NOBODY) gen_action_lord(game.battle.array[SA3])
			}
		} else {
			if (array[D2] === NOBODY) {
				if (array[D1] !== NOBODY) gen_action_lord(game.battle.array[D1])
				if (array[D3] !== NOBODY) gen_action_lord(game.battle.array[D3])
			}
			if (array[RG2] === NOBODY) {
				if (array[RG1] !== NOBODY) gen_action_lord(game.battle.array[RG1])
				if (array[RG3] !== NOBODY) gen_action_lord(game.battle.array[RG3])
			}
		}

		if (game.who !== NOBODY) {
			let from = get_lord_array_position(game.who)
			if (from === A1 || from === A3) gen_action_array(A2)
			if (from === D1 || from === D3) gen_action_array(D2)
			if (from === SA1 || from === SA3) gen_action_array(SA2)
			if (from === RG1 || from === RG3) gen_action_array(RG2)
		}
	},
	lord(lord) {
		game.who = lord
	},
	array(pos) {
		let from = get_lord_array_position(game.who)
		slide_array(from, pos)
		game.who = NOBODY
		goto_reposition_center()
	},
}

// === STORM: REPOSITION ===

function can_reposition_storm() {
	return has_friendly_reserves()
}

function goto_reposition_storm() {
	if (can_reposition_storm())
		game.state = "reposition_storm"
	else
		end_reposition_storm()
}

function end_reposition_storm() {
	game.who = NOBODY
	set_active_enemy()
	if (is_attacker())
		goto_first_strike()
	else
		goto_reposition_storm()
}

states.reposition_storm = {
	inactive: "Reposition",
	prompt() {
		view.prompt = "Reposition: You may switch positions between Front and any Reserve Lord."
		for (let lord of game.battle.reserves)
			if (is_friendly_lord(lord) && lord !== game.who)
				gen_action_lord(lord)
		view.actions.end_reposition = 1
	},
	lord(lord) {
		log(`Swapped in L${lord}.`)
		set_delete(game.battle.reserves, lord)
		if (is_attacker()) {
			if (game.battle.array[A2] !== NOBODY)
				set_add(game.battle.reserves, game.battle.array[A2])
			game.battle.array[A2] = lord
		} else {
			if (game.battle.array[D2] !== NOBODY)
				set_add(game.battle.reserves, game.battle.array[D2])
			game.battle.array[D2] = lord
		}
		end_reposition_storm()
	},
	end_reposition() {
		end_reposition_storm()
	},
}

// === BATTLE: STRIKE ===

/*

Strike groups:
	Strike opposing lord
	Strike closest flanked lord (choice left/right) if not directly opposed
	Combine strikes with lords targeting same position

Target groups:
	If any striker is flanking target, single target.
	If any other lords flank all strikers, add them to target group.

*/

function get_battle_array(pos) {
	if (game.battle.ambush & 1)
		if (pos === A1 || pos === A3 || pos === SA1 || pos === SA3)
			return NOBODY
	if (game.battle.ambush & 2)
		if (pos === D1 || pos === D3 || pos === RG1 || pos === RG3)
			return NOBODY
	return game.battle.array[pos]
}

function filled(pos) {
	return get_battle_array(pos) !== NOBODY
}

function empty(pos) {
	return get_battle_array(pos) === NOBODY
}

const battle_defending_positions = [ D1, D2, D3, RG1, RG2, RG3 ]
const battle_attacking_positions = [ A1, A2, A3, SA1, SA2, SA3 ]

const battle_steps = [
	{ name: "Defending Archery", hits: count_archery_hits, xhits: count_archery_xhits },
	{ name: "Attacking Archery", hits: count_archery_hits, xhits: count_archery_xhits },
	{ name: "Defending Horse", hits: count_horse_hits, xhits: count_zero_hits },
	{ name: "Attacking Horse", hits: count_horse_hits, xhits: count_zero_hits },
	{ name: "Defending Foot", hits: count_foot_hits, xhits: count_zero_hits },
	{ name: "Attacking Foot", hits: count_foot_hits, xhits: count_zero_hits },
]

const storm_steps = [
	{ name: "Defending Archery", hits: count_archery_hits, xhits: count_archery_xhits },
	{ name: "Attacking Archery", hits: count_archery_hits, xhits: count_archery_xhits },
	{ name: "Defending Melee", hits: count_melee_hits, xhits: count_zero_hits },
	{ name: "Attacking Melee", hits: count_melee_hits, xhits: count_zero_hits },
]

function count_zero_hits(_) {
	return 0
}

function count_archery_xhits(lord) {
	let xhits = 0
	if (lord_has_capability(lord, AOW_TEUTONIC_BALISTARII) || lord_has_capability(lord, AOW_RUSSIAN_STRELTSY))
		xhits += get_lord_forces(lord, MEN_AT_ARMS)
	if (is_hill_in_play())
		return xhits << 1
	return xhits
}

function count_archery_hits(lord) {
	let hits = 0
	if (!is_marsh_in_play()) {
		if (lord_has_capability(lord, AOW_RUSSIAN_LUCHNIKI)) {
			hits += get_lord_forces(lord, LIGHT_HORSE)
			hits += get_lord_forces(lord, MILITIA)
		}
		hits += get_lord_forces(lord, ASIATIC_HORSE)
	} else {
		if (lord_has_capability(lord, AOW_RUSSIAN_LUCHNIKI)) {
			hits += get_lord_forces(lord, MILITIA)
		}
	}
	if (is_hill_in_play())
		return hits << 1
	return hits
}

function count_melee_hits(lord) {
	return count_horse_hits(lord) + count_foot_hits(lord)
}

function assemble_melee_forces(lord) {
	let forces = {
		knights: get_lord_forces(lord, KNIGHTS),
		sergeants: get_lord_forces(lord, SERGEANTS),
		light_horse: get_lord_forces(lord, LIGHT_HORSE),
		men_at_arms: get_lord_forces(lord, MEN_AT_ARMS),
		militia: get_lord_forces(lord, MILITIA),
		serfs: get_lord_forces(lord, SERFS),
	}

	if (is_marsh_in_play()) {
		forces.knights = 0
		forces.sergeants = 0
		forces.light_horse = 0
	}

	if (game.battle.bridge && (game.battle.bridge.lord1 === lord || game.battle.bridge.lord12 === lord)) {
		let n = is_p1_lord(lord) ? game.battle.bridge.n1 : game.battle.bridge.n2

		log(`Bridge L${lord}`)

		if (is_horse_step()) {
			// Pick at most 1 LH if there are any Foot (for +1/2 rounding benefit)
			if (forces.men_at_arms + forces.militia + forces.serfs > 0 && forces.light_horse > 1)
				forces.light_horse = 1

			if (forces.knights >= n)
				forces.knights = n
			n -= forces.knights
			if (forces.sergeants >= n)
				forces.sergeants = n
			n -= forces.sergeants
			if (forces.light_horse >= n)
				forces.light_horse = n
			n -= forces.light_horse

			if (forces.knights > 0) logi(`${forces.knights} Knights`)
			if (forces.sergeants > 0) logi(`${forces.sergeants} Sergeants`)
			if (forces.light_horse > 0) logi(`${forces.light_horse} Light Horse`)
			if (forces.knights + forces.sergeants + forces.light_horse === 0) logi(`None`)
		}

		if (is_foot_step()) {
			if (forces.men_at_arms >= n)
				forces.men_at_arms = n
			n -= forces.men_at_arms
			if (forces.militia >= n)
				forces.militia = n
			n -= forces.militia
			if (forces.serfs >= n)
				forces.serfs = n
			n -= forces.serfs

			if (forces.men_at_arms > 0) logi(`${forces.men_at_arms} Men-at-Arms`)
			if (forces.militia > 0) logi(`${forces.militia} Militia`)
			if (forces.serfs > 0) logi(`${forces.serfs} Serfs`)
			if (forces.men_at_arms + forces.militia + forces.serfs === 0) logi(`None`)
		}

		if (is_p1_lord(lord))
			game.battle.bridge.n1 = n
		else
			game.battle.bridge.n2 = n
	}

	return forces
}

function count_horse_hits(lord) {
	let hits = 0
	if (!is_marsh_in_play()) {
		let forces = assemble_melee_forces(lord)

		if (game.battle.storm)
			hits += forces.knights << 1
		else
			hits += forces.knights << 2
		hits += forces.sergeants << 1
		hits += forces.light_horse

		if (game.battle.field_organ === lord && game.battle.round === 1) {
			log(`E${EVENT_TEUTONIC_FIELD_ORGAN} L${lord}.`)
			hits += forces.knights << 1
			hits += forces.sergeants << 1
		}
	}
	return hits
}

function count_foot_hits(lord) {
	let forces = assemble_melee_forces(lord)
	let hits = 0
	hits += forces.men_at_arms << 1
	hits += forces.militia
	hits += forces.serfs
	return hits
}

function count_garrison_xhits() {
	if (is_archery_step())
		return game.battle.garrison.men_at_arms
	return 0
}

function count_garrison_hits() {
	if (is_melee_step())
		return (game.battle.garrison.knights << 1) + (game.battle.garrison.men_at_arms << 1)
	return 0
}

function count_lord_xhits(lord) {
	if (game.battle.storm)
		return storm_steps[game.battle.step].xhits(lord)
	return battle_steps[game.battle.step].xhits(lord)
}

function count_lord_hits(lord) {
	if (game.battle.storm)
		return storm_steps[game.battle.step].hits(lord)
	return battle_steps[game.battle.step].hits(lord)
}

function is_battle_over() {
	set_active_attacker()
	if (has_no_unrouted_forces())
		return true
	set_active_defender()
	if (has_no_unrouted_forces())
		return true
	return false
}

function has_no_unrouted_forces() {
	// All unrouted lords are either in battle array or in reserves
	for (let p = 0; p < 12; ++p)
		if (is_friendly_lord(game.battle.array[p]))
			return false
	for (let lord of game.battle.reserves)
		if (is_friendly_lord(lord))
			return false
	if (game.battle.storm && is_defender())
		if (game.battle.garrison)
			return false
	return true
}

function is_attacker() {
	return game.active === game.battle.attacker
}

function is_defender() {
	return game.active !== game.battle.attacker
}

function is_attacker_step() {
	return (game.battle.step & 1) === 1
}

function is_defender_step() {
	return (game.battle.step & 1) === 0
}

function is_archery_step() {
	return game.battle.step < 2
}

function is_melee_step() {
	return game.battle.step >= 2
}

function is_horse_step() {
	return game.battle.step === 2 || game.battle.step === 3
}

function is_foot_step() {
	return game.battle.step === 4 || game.battle.step === 5
}

function did_concede() {
	return game.active === game.battle.conceded
}

function did_not_concede() {
	return game.active !== game.battle.conceded
}

function has_strike(pos) {
	return game.battle.ah[pos] + game.battle.ahx[pos] > 0
}

function current_strike_positions() {
	if (game.battle.storm)
		return is_attacker_step() ? [ A2 ] : [ D2 ]
	else
		return is_attacker_step() ? battle_attacking_positions : battle_defending_positions
}

function find_closest_target(A, B, C) {
	if (filled(A)) return A
	if (filled(B)) return B
	if (filled(C)) return C
	return -1
}

function find_closest_target_center(T2) {
	if (game.battle.fc < 0) throw Error("unset front l/r choice")
	if (game.battle.rc < 0) throw Error("unset rear l/r choice")
	if (filled(T2))
		return T2
	if (T2 >= A1 && T2 <= D3)
		return game.battle.fc
	return game.battle.rc
}

function find_strike_target(S) {
	switch (S) {
	case A1: return find_closest_target(D1, D2, D3)
	case A2: return find_closest_target_center(D2)
	case A3: return find_closest_target(D3, D2, D1)
	case D1: return find_closest_target(A1, A2, A3)
	case D2: return find_closest_target_center(A2)
	case D3: return find_closest_target(A3, A2, A1)
	case SA1: return find_closest_target(RG1, RG2, RG3)
	case SA2: return find_closest_target_center(RG2)
	case SA3: return find_closest_target(RG3, RG2, RG1)
	case RG1: return find_closest_target(SA1, SA2, SA3)
	case RG2: return find_closest_target_center(SA2)
	case RG3: return find_closest_target(SA3, SA2, SA1)
	}
}

function has_garrison() {
	return game.battle.storm && game.battle.garrison
}

function has_strike_target(S) {
	if (is_attacker_step() && has_garrison())
		return true
	if (S === A1 || S === A2 || S === A3)
		return filled(D1) || filled(D2) || filled(D3)
	if (S === D1 || S === D2 || S === D3)
		return filled(A1) || filled(A2) || filled(A3)
	if (S === SA1 || S === SA2 || S === SA3)
		return filled(RG1) || filled(RG2) || filled(RG3) || (!game.battle.rearguard && (filled(D1) || filled(D2) || filled(D3)))
	if (S === RG1 || S === RG2 || S === RG3)
		return filled(SA1) || filled(SA2) || filled(SA3)
}

function has_no_strike_targets() {
	if (is_defender_step() && has_garrison())
		if (has_strike_target(D2))
			return false
	for (let striker of game.battle.strikers)
		if (has_strike_target(striker))
			return false
	return true
}

function has_no_strikers_and_strike_targets() {
	if (is_defender_step() && has_garrison()) {
		if (is_archery_step() && game.battle.garrison.men_at_arms > 0)
			if (has_strike_target(D2))
				return false
		if (is_melee_step() && game.battle.garrison.men_at_arms + game.battle.garrison.knights > 0)
			if (has_strike_target(D2))
				return false
	}
	for (let pos of current_strike_positions())
		if (has_strike(pos) && has_strike_target(pos))
			return false
	return true
}

function create_strike_group(start) {
	let strikers = [ start ]
	let target = find_strike_target(start)
	for (let pos of current_strike_positions())
		if (pos !== start && filled(pos) && find_strike_target(pos) === target)
			set_add(strikers, pos)
	return strikers
}

function flanks_position_row(S, T, S1, S2, S3, T1, T2, T3) {
	// S and T are not empty
	switch (S) {
		case S1:
			switch (T) {
				case T1: return false
				case T2: return empty(T1)
				case T3: return empty(T1) && empty(T2)
			}
			break
		case S2:
			return empty(T2)
		case S3:
			switch (T) {
				case T1: return empty(T3) && empty(T2)
				case T2: return empty(T3)
				case T3: return false
			}
			break
	}
	return false
}

function flanks_position(S, T) {
	if (S === A1 || S === A2 || S === A3)
		return flanks_position_row(S, T, A1, A2, A3, D1, D2, D3)
	if (S === D1 || S === D2 || S === D3)
		return flanks_position_row(S, T, D1, D2, D3, A1, A2, A3)
	if (S === SA1 || S === SA2 || S === SA3)
		return flanks_position_row(S, T, SA1, SA2, SA3, RG1, RG2, RG3)
	if (S === RG1 || S === RG2 || S === RG3)
		return flanks_position_row(S, T, RG1, RG2, RG3, SA1, SA2, SA3)
}

function flanks_all_positions(S, TT) {
	for (let T of TT)
		if (!flanks_position(S, T))
			return false
	return true
}

function strike_left_or_right(S2, T1, T2, T3) {
	if (has_strike(S2)) {
		if (filled(T2))
			return T2
		let has_t1 = filled(T1)
		let has_t3 = filled(T3)
		if (has_t1 && has_t3)
			return -1
		if (has_t1)
			return T1
		if (has_t3)
			return T3
	}
	return 1000 // No target!
}

function strike_defender_row() {
	let has_d1 = filled(D1)
	let has_d2 = filled(D2)
	let has_d3 = filled(D3)
	if (has_d1 && !has_d2 && !has_d3) return D1
	if (!has_d1 && has_d2 && !has_d3) return D2
	if (!has_d1 && !has_d2 && has_d3) return D3
	return -1
}

// === BATTLE: STRIKE ===

/*

for each battle step:
	generate strikes for each lord
	while strikes remain:
		create list of strike groups (choose left/right both rows)
		select strike group
		create target group (choose if sally)
		total strikes and roll for walls
		while hits remain:
			assign hit to unit in target group
			if lord routs:
				forget choice of left/right strike group in current row
				create new target group (choose if left/right/sally)

*/

function format_strike_step() {
	if (game.battle.storm)
		return storm_steps[game.battle.step].name
	return battle_steps[game.battle.step].name
}

function format_hits() {
	if (game.battle.xhits > 0 && game.battle.hits > 0) {
		if (game.battle.xhits > 1 && game.battle.hits > 1)
			return `${game.battle.xhits} Crossbow Hits and ${game.battle.hits} Hits`
		else if (game.battle.xhits > 1)
			return `${game.battle.xhits} Crossbow Hits and ${game.battle.hits} Hit`
		else if (game.battle.hits > 1)
			return `${game.battle.xhits} Crossbow Hit and ${game.battle.hits} Hits`
		else
			return `${game.battle.xhits} Crossbow Hit and ${game.battle.hits} Hit`
	} else if (game.battle.xhits > 0) {
		if (game.battle.xhits > 1)
			return `${game.battle.xhits} Crossbow Hits`
		else
			return `${game.battle.xhits} Crossbow Hit`
	} else {
		if (game.battle.hits > 1)
			return `${game.battle.hits} Hits`
		else
			return `${game.battle.hits} Hit`
	}
}

function goto_first_strike() {
	game.battle.step = 0

	if (game.battle.bridge) {
		game.battle.bridge.n1 = game.battle.round * 2
		game.battle.bridge.n2 = game.battle.round * 2
	}

	if (filled(RG1) || filled(RG2) || filled(RG3))
		game.battle.rearguard = 1
	else
		game.battle.rearguard = 0

	goto_strike()
}

function goto_next_strike() {
	let end = game.battle.storm ? 4 : 6
	game.battle.step++
	if (game.battle.step >= end)
		end_battle_round()
	else
		goto_strike()
}

function goto_strike() {
	// Exit early if one side is completely routed
	if (is_battle_over()) {
		end_battle_round()
		return
	}

	if (is_attacker_step())
		set_active_attacker()
	else
		set_active_defender()

	if (game.battle.storm)
		log_h4(storm_steps[game.battle.step].name)
	else
		log_h4(battle_steps[game.battle.step].name)

	// Once per Archery and once per Melee.
	if (game.battle.step === 0 || game.battle.step === 2) {
		game.battle.warrior_monks = 0
		for (let p = 0; p < 12; ++p) {
			let lord = game.battle.array[p]
			if (lord !== NOBODY && lord_has_capability(lord, AOW_TEUTONIC_WARRIOR_MONKS))
				game.battle.warrior_monks |= 1 << lord
		}
	}

	if (is_marsh_in_play()) {
		if (game.active === TEUTONS)
			logevent(EVENT_RUSSIAN_MARSH)
		else
			logevent(EVENT_TEUTONIC_MARSH)
	}

	if (is_archery_step() && is_hill_in_play()) {
		if (game.active === TEUTONS)
			logevent(EVENT_TEUTONIC_HILL)
		else
			logevent(EVENT_RUSSIAN_HILL)
	}

	// Generate hits
	if (!game.battle.storm) {
		game.battle.ah = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
		game.battle.ahx = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
	} else {
		game.battle.ah = [ 0, 0, 0, 0, 0, 0 ]
		game.battle.ahx = [ 0, 0, 0, 0, 0, 0 ]
	}

	for (let pos of current_strike_positions()) {
		let lord = get_battle_array(pos)
		if (lord !== NOBODY) {
			let hits = count_lord_hits(lord)
			let xhits = count_lord_xhits(lord)

			// STORM: Max 6 hits per lord in melee (12 since we count half-hits).
			if (game.battle.storm) {
				if (is_melee_step() && hits > 12)
					hits = 12
			}

			game.battle.ah[pos] = hits
			game.battle.ahx[pos] = xhits

			if (xhits > 2)
				log(`L${lord} ${frac(xhits)} Crossbow Hits.`)
			else if (xhits > 0)
				log(`L${lord} ${frac(xhits)} Crossbow Hit.`)
			if (hits > 2)
				log(`L${lord} ${frac(hits)} Hits.`)
			else if (hits > 0)
				log(`L${lord} ${frac(hits)} Hit.`)
		}
	}

	if (did_concede())
		log("Pursuit.")

	// Strike left or right or defender
	if (is_attacker_step())
		game.battle.fc = strike_left_or_right(A2, D1, D2, D3)
	else
		game.battle.fc = strike_left_or_right(D2, A1, A2, A3)

	if (is_sa_without_rg()) {
		// NOTE: striking rearguard is handled in strike_group and assign_hits
		game.battle.rc = RG2
	} else {
		if (is_attacker_step())
			game.battle.rc = strike_left_or_right(SA2, RG1, RG2, RG3)
		else
			game.battle.rc = strike_left_or_right(RG2, SA1, SA2, SA3)
	}

	if (has_no_strikers_and_strike_targets())
		log("None.")

	resume_strike()
}

function resume_strike() {
	if (has_no_strikers_and_strike_targets())
		goto_next_strike()
	else if (game.battle.fc < 0 || game.battle.rc < 0)
		game.state = "strike_left_right"
	else
		goto_strike_group()
}

function prompt_target_2(S1, T1, T3) {
	view.who = game.battle.array[S1]
	gen_action_lord(game.battle.array[T1])
	gen_action_lord(game.battle.array[T3])
}

function is_sa_without_rg() {
	return !game.battle.rearguard && (filled(SA1) || filled(SA2) || filled(SA3))
}

function prompt_left_right() {
	if (game.battle.fc < 0) {
		view.prompt = `${format_strike_step()}: Strike left or right?`
		if (is_attacker_step())
			prompt_target_2(A2, D1, D3)
		else
			prompt_target_2(D2, A1, A3)
	} else {
		if (is_sa_without_rg()) {
			view.prompt = `${format_strike_step()}: Strike which defender?`
			view.group = []
			if (filled(SA1)) view.group.push(SA1)
			if (filled(SA2)) view.group.push(SA2)
			if (filled(SA3)) view.group.push(SA3)
			if (filled(D1)) gen_action_lord(game.battle.array[D1])
			if (filled(D2)) gen_action_lord(game.battle.array[D2])
			if (filled(D3)) gen_action_lord(game.battle.array[D3])
		} else {
			view.prompt = `${format_strike_step()}: Strike left or right?`
			if (is_attacker_step())
				prompt_target_2(SA2, RG1, RG3)
			else
				prompt_target_2(RG2, SA1, SA3)
		}
	}
}

function action_left_right(lord) {
	log(`Targeted L${lord}.`)
	let pos = get_lord_array_position(lord)
	if (game.battle.fc < 0)
		game.battle.fc = pos
	else
		game.battle.rc = pos
}

states.strike_left_right = {
	prompt: prompt_left_right,
	lord(lord) {
		action_left_right(lord)
		resume_strike()
	},
}

states.assign_left_right = {
	prompt: prompt_left_right,
	lord(lord) {
		action_left_right(lord)
		set_active_enemy()
		goto_assign_hits()
	},
}

function goto_strike_group() {
	game.state = "strike_group"

	// Auto-strike if only one group
	let first_striker = -1
	let first_target = -1
	let target
	for (let pos of current_strike_positions()) {
		if (has_strike(pos)) {
			if ((pos === SA1 || pos === SA2 || pos === SA3) && is_sa_without_rg())
				target = 100 // just a unique target id
			else
				target = find_strike_target(pos)
			if (first_target < 0) {
				first_striker = pos
				first_target = target
			} else if (first_target !== target) {
				return // more than one target!
			}
		}
	}

	select_strike_group(first_striker)
}

function select_strike_group(pos) {
	if (pos < 0) {
		// Garrison striking alone!
		game.battle.strikers = []
	} else if ((pos === SA1 || pos === SA2 || pos === SA3) && is_sa_without_rg()) {
		game.battle.strikers = [ SA1, SA2, SA3 ]
		game.battle.rc = strike_defender_row()
	} else {
		game.battle.strikers = create_strike_group(pos)
	}
	goto_strike_total_hits()
}

states.strike_group = {
	get inactive() {
		return format_strike_step() + " \u2014 Strike"
	},
	prompt() {
		view.prompt = `${format_strike_step()}: Strike with a Lord.`
		for (let pos of current_strike_positions())
			if (has_strike(pos))
				gen_action_lord(game.battle.array[pos])
	},
	lord(lord) {
		select_strike_group(get_lord_array_position(lord))
	},
}

// === BATTLE: TOTAL HITS (ROUND UP) ===

function goto_strike_total_hits() {
	let hits = 0
	let xhits = 0

	let slist = []

	// STORM: Garrison strikes
	if (is_defender_step() && has_garrison()) {
		let garr_hits = count_garrison_hits()
		let garr_xhits = count_garrison_xhits()
		if (garr_hits + garr_xhits > 0)
			slist.push("Garrison")
		if (garr_xhits > 2)
			log(`Garrison ${frac(garr_xhits)} Crossbow Hits.`)
		else if (garr_xhits > 0)
			log(`Garrison ${frac(garr_xhits)} Crossbow Hit.`)
		if (garr_hits > 2)
			log(`Garrison ${frac(garr_hits)} Hits.`)
		else if (garr_hits > 0)
			log(`Garrison ${frac(garr_hits)} Hit.`)
		hits += garr_hits
		xhits += garr_xhits
	}

	// Total hits
	for (let pos of game.battle.strikers) {
		if (game.battle.ah[pos] + game.battle.ahx[pos] > 0) {
			slist.push(lord_name[game.battle.array[pos]])
			hits += game.battle.ah[pos]
			xhits += game.battle.ahx[pos]
		}
	}

	// Round in favor of crossbow hits.
	if (xhits & 1) {
		hits = (hits >> 1)
		xhits = (xhits >> 1) + 1
	} else {
		if (hits & 1)
			hits = (hits >> 1) + 1
		else
			hits = (hits >> 1)
		xhits = (xhits >> 1)
	}

	// Conceding side halves its total Hits, rounded up.
	if (did_concede()) {
		hits = (hits + 1) >> 1
		xhits = (xhits + 1) >> 1
	}

	game.battle.hits = hits
	game.battle.xhits = xhits

	log_br()
	log(slist.join(", "))

	goto_strike_roll_walls()
}

// === BATTLE: ROLL WALLS ===

function goto_strike_roll_walls() {
	set_active_enemy()

	if (game.battle.storm) {
		if (is_attacker_step())
			roll_for_walls()
		else
			roll_for_siegeworks()
	} else if (game.battle.sally) {
		if (is_attacker_step()) {
			if (is_ravens_rock_in_play() && count_siege_markers(game.battle.where) < 2)
				roll_for_ravens_rock()
			else
				roll_for_siegeworks()
		} else {
			if (is_ravens_rock_in_play())
				roll_for_ravens_rock()
		}
	} else {
		let s = game.battle.strikers[0]
		if (s === SA1 || s === SA2 || s === SA3) {
			if (is_ravens_rock_in_play() && count_siege_markers(game.battle.where) < 2)
				roll_for_ravens_rock()
			else
				roll_for_siegeworks()
		} else {
			if (is_ravens_rock_in_play())
				roll_for_ravens_rock()
		}
	}

	if (game.battle.xhits > 0)
		log_hits(game.battle.xhits, "Crossbow Hit")
	if (game.battle.hits > 0)
		log_hits(game.battle.hits, "Hit")

	game.who = -2
	goto_assign_hits()
}

function enemy_has_trebuchets() {
	if (game.active === RUSSIANS) {
		for (let lord = first_enemy_lord; lord <= last_enemy_lord; ++lord)
			if (get_lord_locale(lord) === game.battle.where && lord_has_unrouted_units(lord))
				if (lord_has_capability(lord, AOW_TEUTONIC_TREBUCHETS))
					return true
	}
}

function roll_for_walls() {
	let here = game.battle.where
	let prot = 0
	if (is_bishopric(here) || is_castle(here) || has_walls(here))
		prot = 4
	else if (is_city(here) || is_fort(here) || here === LOC_NOVGOROD)
		prot = 3
	if (enemy_has_trebuchets()) {
		logi(`C${AOW_TEUTONIC_TREBUCHETS}.`)
		prot--
	}
	if (prot > 0) {
		game.battle.xhits = roll_for_protection(`Walls 1-${prot}`, true, prot, game.battle.xhits)
		game.battle.hits = roll_for_protection(`Walls 1-${prot}`, false, prot, game.battle.hits)
	} else {
		logi("No walls.")
	}
}

function roll_for_siegeworks() {
	let prot = count_siege_markers(game.battle.where)
	if (enemy_has_trebuchets()) {
		logi("C${AOW_TEUTONIC_TREBUCHETS}.")
		prot--
	}
	if (prot > 0) {
		game.battle.xhits = roll_for_protection(`Siegeworks 1-${prot}`, true, prot, game.battle.xhits)
		game.battle.hits = roll_for_protection(`Siegeworks 1-${prot}`, false, prot, game.battle.hits)
	} else {
		logi("No siegeworks.")
	}
}

function roll_for_ravens_rock() {
	let prot = 2
	if (enemy_has_trebuchets()) {
		logi("C${AOW_TEUTONIC_TREBUCHETS}.")
		prot--
	}
	if (prot > 0) {
		game.battle.xhits = roll_for_protection(`C${EVENT_RUSSIAN_RAVENS_ROCK} 1-${prot}`, true, prot, game.battle.xhits)
		game.battle.hits = roll_for_protection(`C${EVENT_RUSSIAN_RAVENS_ROCK} 1-${prot}`, false, prot, game.battle.hits)
	} else {
		logi(`No C${EVENT_RUSSIAN_RAVENS_ROCK}.`)
	}
}

function roll_for_protection(name, crossbow, prot, n) {
	let total = 0
	if (n > 0) {
		let rolls = []
		for (let i = 0; i < n; ++i) {
			let die = roll_die()
			if (die <= prot) {
				rolls.push(MISS[die])
			} else {
				rolls.push(HIT[die])
				total++
			}
		}
		if (crossbow)
			logi(name + " vs crossbow:")
		else
			logi(name + ":")
		logii(rolls.join(""))
	}
	return total
}

function log_hits(total, name) {
	if (total === 1)
		logi(`${total} ${name}`)
	else if (total > 1)
		logi(`${total} ${name}s`)
	else
		logi(`No ${name}s`)
}

// === BATTLE: ASSIGN HITS TO UNITS / ROLL BY HIT / ROUT ===

function goto_assign_hits() {
	if (game.battle.hits + game.battle.xhits === 0)
		return end_assign_hits()

	if (has_no_strike_targets()) {
		log("Lost " + format_hits() + ".")
		return end_assign_hits()
	}

	if (is_attacker_step()) {
		if (game.battle.fc < 0 && set_has(game.battle.strikers, A2))
			return goto_assign_left_right()
		if (game.battle.rc < 0 && set_has(game.battle.strikers, SA2))
			return goto_assign_left_right()
	} else {
		if (game.battle.fc < 0 && set_has(game.battle.strikers, D2))
			return goto_assign_left_right()
		if (game.battle.rc < 0 && set_has(game.battle.strikers, RG2))
			return goto_assign_left_right()
	}

	game.state = "assign_hits"
}

function goto_assign_left_right() {
	set_active_enemy()
	game.state = "assign_left_right"
}

function end_assign_hits() {
	for (let pos of game.battle.strikers) {
		game.battle.ah[pos] = 0
		game.battle.ahx[pos] = 0
	}
	game.who = NOBODY
	game.battle.strikers = 0
	game.battle.hits = 0
	game.battle.xhits = 0
	set_active_enemy()
	if (game.battle.storm)
		goto_next_strike()
	else
		resume_strike()
}

function for_each_target(fn) {
	if (is_defender_step() && has_garrison()) {
		if (filled(A2))
			fn(game.battle.array[A2])
		return
	}

	let start = game.battle.strikers[0]

	// SA without RG striking D, target is always flanked
	if ((start === SA1 || start === SA2 || start === SA3) && is_sa_without_rg()) {
		fn(game.battle.array[game.battle.rc])
		return
	}

	let target = find_strike_target(start)

	fn(game.battle.array[target])

	// If any striker flanks target, target must take all hits
	for (let striker of game.battle.strikers)
		if (flanks_position(striker, target))
			return

	// SA without RG flank all D (target must take all hits)
	if ((target === D1 || target === D2 || target === D3) && is_sa_without_rg())
		return

	// If other lord flanks all strikers, he may take hits instead
	for (let flanker of ARRAY_FLANKS[target])
		if (filled(flanker) && flanks_all_positions(flanker, game.battle.strikers))
			fn(game.battle.array[flanker])

	// SA without RG flank all D (and can thus take hits from A)
	if ((target === A1 || target === A2 || target === A3) && is_sa_without_rg()) {
		if (filled(SA1)) fn(game.battle.array[SA1])
		if (filled(SA2)) fn(game.battle.array[SA2])
		if (filled(SA3)) fn(game.battle.array[SA3])
	}
}

function prompt_hit_armored_forces() {
	let has_armored = false
	for_each_target(lord => {
		if (get_lord_forces(lord, KNIGHTS) > 0) {
			gen_action_knights(lord)
			has_armored = true
		}
		if (get_lord_forces(lord, SERGEANTS) > 0) {
			gen_action_sergeants(lord)
			has_armored = true
		}
		if (get_lord_forces(lord, MEN_AT_ARMS) > 0) {
			gen_action_men_at_arms(lord)
			has_armored = true
		}
	})
	return has_armored
}

function prompt_hit_unarmored_forces() {
	for_each_target(lord => {
		if (get_lord_forces(lord, LIGHT_HORSE) > 0)
			gen_action_light_horse(lord)
		if (get_lord_forces(lord, ASIATIC_HORSE) > 0)
			gen_action_asiatic_horse(lord)
		if (get_lord_forces(lord, MILITIA) > 0)
			gen_action_militia(lord)
		if (get_lord_forces(lord, SERFS) > 0)
			gen_action_serfs(lord)
	})
}

function prompt_hit_forces() {
	for_each_target(lord => {
		if (get_lord_forces(lord, KNIGHTS) > 0)
			gen_action_knights(lord)
		if (get_lord_forces(lord, SERGEANTS) > 0)
			gen_action_sergeants(lord)
		if (get_lord_forces(lord, LIGHT_HORSE) > 0)
			gen_action_light_horse(lord)
		if (get_lord_forces(lord, ASIATIC_HORSE) > 0)
			gen_action_asiatic_horse(lord)
		if (get_lord_forces(lord, MEN_AT_ARMS) > 0)
			gen_action_men_at_arms(lord)
		if (get_lord_forces(lord, MILITIA) > 0)
			gen_action_militia(lord)
		if (get_lord_forces(lord, SERFS) > 0)
			gen_action_serfs(lord)
	})
}

states.assign_hits = {
	get inactive() {
		return format_strike_step() + " \u2014 Assign Hits"
	},
	prompt() {
		view.prompt = `${format_strike_step()}: Assign ${format_hits()} to units.`

		view.group = game.battle.strikers.map(p => game.battle.array[p])

		if (game.battle.storm) {
			if (is_attacker()) {
				// Storm - attacker must apply hits to armored first
				let has_armored = prompt_hit_armored_forces()
				if (!has_armored)
					prompt_hit_unarmored_forces()
			} else {
				// Storm - defender must apply hits to garrison first
				if (game.battle.garrison) {
					if (game.battle.garrison.knights > 0)
						gen_action_knights(GARRISON)
					if (game.battle.garrison.men_at_arms > 0)
						gen_action_men_at_arms(GARRISON)
				} else {
					prompt_hit_forces()
				}
			}
		} else {
			prompt_hit_forces()
		}
	},
	knights(lord) {
		action_assign_hits(lord, KNIGHTS)
	},
	sergeants(lord) {
		action_assign_hits(lord, SERGEANTS)
	},
	light_horse(lord) {
		action_assign_hits(lord, LIGHT_HORSE)
	},
	asiatic_horse(lord) {
		action_assign_hits(lord, ASIATIC_HORSE)
	},
	men_at_arms(lord) {
		action_assign_hits(lord, MEN_AT_ARMS)
	},
	militia(lord) {
		action_assign_hits(lord, MILITIA)
	},
	serfs(lord) {
		action_assign_hits(lord, SERFS)
	},
}

function rout_lord(lord) {
	log(`L${lord} Routed.`)

	let pos = get_lord_array_position(lord)

	// Remove from battle array
	game.battle.array[pos] = NOBODY

	// Strike left or right or defender

console.log("ROUT LORD", pos)

	if (pos >= A1 && pos <= A3) {
		game.battle.fc = strike_left_or_right(D2, A1, A2, A3)
	}

	else if (pos >= D1 && pos <= D3) {
		game.battle.fc = strike_left_or_right(A2, D1, D2, D3)
		if (is_sa_without_rg())
			game.battle.rc = strike_defender_row()
	}

	else if (pos >= SA1 && pos <= SA3) {
		game.battle.rc = strike_left_or_right(RG2, SA1, SA2, SA3)
	}

	else if (pos >= RG1 && pos <= RG3) {
		game.battle.rc = strike_left_or_right(SA2, RG1, RG2, RG3)
	}
}

function rout_unit(lord, type) {
	if (lord === GARRISON) {
		if (type === KNIGHTS)
			game.battle.garrison.knights--
		if (type === MEN_AT_ARMS)
			game.battle.garrison.men_at_arms--
		if (game.battle.garrison.knights + game.battle.garrison.men_at_arms === 0) {
			log("Garrison Routed.")
			game.battle.garrison = 0
		}
	} else {
		add_lord_forces(lord, type, -1)
		add_lord_routed_forces(lord, type, 1)
	}
}

function use_warrior_monks(lord, type) {
	if (type === KNIGHTS) {
		let bit = 1 << lord
		if (game.battle.warrior_monks & bit) {
			game.battle.warrior_monks ^= bit
			return true
		}
	}
	return false
}

function which_lord_capability(lord, list) {
	for (let c of list)
		if (lord_has_capability_card(lord, c))
			return c
	return -1
}

function action_assign_hits(lord, type) {
	let protection = FORCE_PROTECTION[type]
	let evade = FORCE_EVADE[type]

	// TODO: hits or xhits choice

	if (game.who !== lord) {
		game.who = lord
		if (lord === GARRISON)
			log("Garrison")
		else
			log(`L${lord}`)
	}

	let ap = (is_armored_force(type) && game.battle.xhits > 0) ? 2 : 0

	if (type === SERGEANTS || type === MEN_AT_ARMS)
		if (lord_has_capability(lord, AOW_TEUTONIC_HALBBRUDER))
			protection += 1

	// Evade only in Battle Melee steps
	if (evade > 0 && !game.battle.storm && is_melee_step()) {
		let die = roll_die()
		if (die <= evade) {
			logi(`${FORCE_TYPE_NAME[type]} 1-${evade}: ${MISS[die]}`)
		} else {
			logi(`${FORCE_TYPE_NAME[type]} 1-${evade}: ${HIT[die]}`)
			rout_unit(lord, type)
		}
	} else if (protection > 0) {
		let die = roll_die()
		if (die <= protection - ap) {
			logi(`${FORCE_TYPE_NAME[type]} 1-${protection-ap}: ${MISS[die]}`)
		} else {
			logi(`${FORCE_TYPE_NAME[type]} 1-${protection-ap}: ${HIT[die]}`)
			if (use_warrior_monks(lord, type)) {
				let card = which_lord_capability(lord, AOW_TEUTONIC_WARRIOR_MONKS)
				die = roll_die()
				if (die <= protection - ap) {
					logi(`C${card} 1-${protection-ap}: ${MISS[die]}`)
				} else {
					logi(`C${card} 1-${protection-ap}: ${HIT[die]}`)
					rout_unit(lord, type)
				}
			} else {
				rout_unit(lord, type)
			}
		}
	} else {
		logi(`${FORCE_TYPE_NAME[type]} unprotected`)
		rout_unit(lord, type)
	}

	if (game.battle.xhits)
		game.battle.xhits--
	else
		game.battle.hits--

	if (!lord_has_unrouted_units(lord))
		// TODO: log list of new targets... after assign left/right
		rout_lord(lord)

	goto_assign_hits()
}

// === BATTLE: NEW ROUND ===

function end_battle_round() {
	if (game.battle.conceded) {
		game.battle.loser = game.battle.conceded
		end_battle()
		return
	}

	set_active_attacker()
	if (has_no_unrouted_forces()) {
		game.battle.loser = game.active
		end_battle()
		return
	}

	set_active_defender()
	if (has_no_unrouted_forces()) {
		game.battle.loser = game.active
		end_battle()
		return
	}

	game.battle.round ++

	game.battle.ambush = 0

	if (game.battle.storm) {
		if (game.battle.round > count_siege_markers(game.battle.where)) {
			game.battle.loser = game.battle.attacker
			end_battle()
			return
		}
	}

	set_active_attacker()
	goto_concede()
}

// === ENDING THE BATTLE ===

// Ending the Battle - optimized from rules as written
//   Loser retreat / withdraw / remove
//   Loser losses
//   Loser service
//   Victor losses
//   Victor spoils

// Ending the Storm
//   Sack (loser removes lords)
//   Victor losses
//   Victor spoils

function set_active_loser() {
	set_active(game.battle.loser)
}

function set_active_victor() {
	if (game.battle.loser === P1)
		set_active(P2)
	else
		set_active(P1)
}

function end_battle() {
	log_h3(`${game.battle.loser} Lost`)

	if ((game.battle.sally || game.battle.relief) && game.battle.attacker === game.battle.loser) {
		log("Raid removed Siege markers.")
		remove_all_but_one_siege_markers(game.battle.where)
	}

	game.battle.array = 0

	if (game.battle.storm) {
		if (game.battle.attacker !== game.battle.loser)
			goto_sack()
		else
			goto_battle_losses_loser()
	} else {
		goto_battle_withdraw()
	}
}

// === ENDING THE STORM: SACK ===

function award_spoils(n) {
	add_spoils(LOOT, n)
	add_spoils(PROV, n)
	add_spoils(COIN, n)
}

function goto_sack() {
	let here = game.battle.where

	set_active_victor()

	log(`${game.active} Sacked %${here}.`)

	conquer_stronghold(game.battle.where)

	remove_walls(game.battle.where)

	if (here === LOC_NOVGOROD) {
		if (game.pieces.veche_coin > 0) {
			add_spoils(COIN, game.pieces.veche_coin)
			log(`Awarded ${game.pieces.veche_coin} Coin from Veche.`)
			game.pieces.veche_coin = 0
		}
		award_spoils(3)
	}
	else if (is_city(here))
		award_spoils(2)
	else if (is_fort(here))
		award_spoils(1)
	else if (is_bishopric(here))
		award_spoils(2)
	else if (is_castle(here))
		award_spoils(1)

	set_active_loser()
	resume_sack()
}

function resume_sack() {
	if (has_friendly_lord(game.battle.where))
		game.state = "sack"
	else
		goto_battle_losses_loser()
}

states.sack = {
	inactive: "Remove Lords",
	prompt() {
		let here = game.battle.where
		view.prompt = `Sack: Remove all Lords at ${data.locales[here].name}.`
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (get_lord_locale(lord) === here)
				gen_action_lord(lord)
	},
	lord(lord) {
		transfer_assets_except_ships(lord)
		if (can_ransom_lord_battle(lord)) {
			goto_ransom(lord)
		} else {
			disband_lord(lord, true)
			resume_sack()
		}
	},
}

function end_ransom_sack() {
	resume_sack()
}

// === ENDING THE BATTLE: WITHDRAW ===

function withdrawal_capacity_needed(here) {
	let has_upper = 0
	let has_other = 0
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
		if (get_lord_locale(lord) === here && is_lord_unbesieged(lord) && !is_lower_lord(lord)) {
			if (is_upper_lord(lord))
				has_upper++
			else
				has_other++
		}
	}
	if (has_upper)
		return 2
	if (has_other)
		return 1
	return 0
}

function goto_battle_withdraw() {
	set_active_loser()
	game.spoils = 0
	let here = game.battle.where
	let wn = withdrawal_capacity_needed(here)
	if (wn > 0 && can_withdraw(here, wn)) {
		game.state = "battle_withdraw"
	} else {
		end_battle_withdraw()
	}
}

function end_battle_withdraw() {
	goto_retreat()
}

states.battle_withdraw = {
	inactive: "Withdraw",
	prompt() {
		let here = game.battle.where
		let capacity = stronghold_capacity(here)

		view.prompt = "Battle: You may Withdraw losing Lords into Stronghold."

		// NOTE: Sallying lords are still flagged "besieged" and are thus already withdrawn!

		if (capacity >= 1) {
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
				if (get_lord_locale(lord) === here && !is_lower_lord(lord) && is_lord_unbesieged(lord)) {
					if (is_upper_lord(lord)) {
						if (capacity >= 2)
							gen_action_lord(lord)
					} else {
						gen_action_lord(lord)
					}
				}
			}
		}

		view.actions.end_withdraw = 1
	},
	lord(lord) {
		push_undo()
		let lower = get_lower_lord(lord)

		log(`L${lord} Withdrew.`)
		set_lord_besieged(lord, 1)

		if (lower !== NOBODY) {
			log(`L${lower} Withdrew.`)
			set_lord_besieged(lord, 1)
		}
	},
	end_withdraw() {
		clear_undo()
		end_battle_withdraw()
	},
}

// === ENDING THE BATTLE: RETREAT ===

function count_retreat_transport(type) {
	let n = 0
	for (let lord of game.battle.retreated)
		n += count_lord_transport(lord, type)
	return n
}

function count_retreat_assets(type) {
	let n = 0
	for (let lord of game.battle.retreated)
		n += get_lord_assets(lord, type)
	return n
}

// TODO: manually lose all assets!?
function transfer_assets_except_ships(lord) {
	add_spoils(PROV, get_lord_assets(lord, PROV))
	add_spoils(COIN, get_lord_assets(lord, COIN))
	add_spoils(LOOT, get_lord_assets(lord, LOOT))
	add_spoils(CART, get_lord_assets(lord, CART))
	add_spoils(SLED, get_lord_assets(lord, SLED))
	add_spoils(BOAT, get_lord_assets(lord, BOAT))
	set_lord_assets(lord, PROV, 0)
	set_lord_assets(lord, COIN, 0)
	set_lord_assets(lord, LOOT, 0)
	set_lord_assets(lord, CART, 0)
	set_lord_assets(lord, SLED, 0)
	set_lord_assets(lord, BOAT, 0)
}

function can_retreat_to(to) {
	return !has_unbesieged_enemy_lord(to) && !is_unbesieged_enemy_stronghold(to)
}

function can_retreat() {
	if (game.march) {
		// Battle after March
		if (is_attacker())
			return can_retreat_to(game.march.from)
		for (let [to, way] of data.locales[game.battle.where].ways)
			if (way !== game.march.approach && can_retreat_to(to))
				return true
	} else {
		// Battle after Sally
		for (let to of data.locales[game.battle.where].adjacent)
			if (can_retreat_to(to))
				return true
	}
	return false
}

function goto_retreat() {
	let here = game.battle.where
	if (count_unbesieged_friendly_lords(here) > 0 && can_retreat()) {
		game.battle.retreated = []
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (get_lord_locale(lord) === here && is_lord_unbesieged(lord))
				set_add(game.battle.retreated, lord)
		game.state = "retreat"
	} else {
		end_retreat()
	}
}

function end_retreat() {
	lift_sieges()
	goto_battle_remove()
}

states.retreat = {
	inactive: "Retreat",
	prompt() {
		view.prompt = "Battle: Retreat losing Lords."
		view.group = game.battle.retreated
		if (game.march) {
			// after March
			if (is_attacker()) {
				gen_action_locale(game.march.from)
			} else {
				for (let [to, way] of data.locales[game.battle.where].ways)
				if (way !== game.march.approach && can_retreat_to(to))
					gen_action_locale(to)
			}
		} else {
			// after Sally
			for (let to of data.locales[game.battle.where].adjacent)
				if (can_retreat_to(to))
					gen_action_locale(to)
		}
	},
	locale(to) {
		push_undo()
		if (game.march) {
			if (is_attacker()) {
				game.battle.retreat_to = to
				game.battle.retreat_way = game.march.approach
				retreat_1()
			} else {
				let ways = list_ways(game.battle.where, to)
				if (ways.length > 2) {
					game.battle.retreat_to = to
					game.state = "retreat_way"
				} else {
					game.battle.retreat_to = to
					game.battle.retreat_way = ways[1]
					retreat_1()
				}
			}
		} else {
			let ways = list_ways(game.battle.where, to)
			if (ways.length > 2) {
				game.battle.retreat_to = to
				game.state = "retreat_way"
			} else {
				game.battle.retreat_to = to
				game.battle.retreat_way = ways[1]
				retreat_1()
			}
		}
	},
}

states.retreat_way = {
	inactive: "Retreat",
	prompt() {
		view.prompt = `Retreat: Select Way.`
		view.group = game.battle.retreated
		let from = game.battle.where
		let to = game.battle.retreat_to
		let ways = list_ways(from, to)
		for (let i = 1; i < ways.length; ++i)
			gen_action_way(ways[i])
	},
	way(way) {
		game.battle.retreat_way = way
		retreat_1()
	},
}

function retreat_1() {
	// Retreated without having conceded the Field
	if (did_not_concede()) {
		for (let lord of game.battle.retreated)
			transfer_assets_except_ships(lord)
		retreat_2()
	} else {
		let way = game.battle.retreat_way
		let transport = count_retreat_transport(data.ways[way].type)
		let prov = count_retreat_assets(PROV)
		let loot = count_retreat_assets(LOOT)
		if (prov > transport || loot > 0)
			game.state = "retreat_laden"
		else
			retreat_2()
	}
}

states.retreat_laden = {
	inactive: "Retreat",
	prompt() {
		let to = game.battle.retreat_to
		let way = game.battle.retreat_way
		let transport = count_retreat_transport(data.ways[way].type)
		let prov = count_retreat_assets(PROV)
		let loot = count_retreat_assets(LOOT)

		view.prompt = `Retreat with ${prov} Provender and ${transport} Transport.`
		view.group = game.battle.retreated

		if (loot > 0) {
			view.prompt += " Discard Loot."
			for (let lord of game.battle.retreated) {
				if (get_lord_assets(lord, LOOT) > 0)
					gen_action_loot(lord)
			}
		} else if (prov > transport) {
			view.prompt += " Discard Provender."
			for (let lord of game.battle.retreated) {
				if (get_lord_assets(lord, PROV) > 0)
					gen_action_prov(lord)
			}
		} else {
			gen_action_locale(to)
			view.actions.retreat = 1
		}
	},
	prov(lord) {
		spoil_prov(lord)
	},
	loot(lord) {
		spoil_loot(lord)
	},
	locale(_) {
		retreat_2()
	},
	retreat() {
		retreat_2()
	},
}

function retreat_2() {
	let to = game.battle.retreat_to
	let way = game.battle.retreat_way

	if (data.ways[way].name)
		log(`Retreated via W${way} to %${to}.`)
	else
		log(`Retreated to %${to}.`)

	for (let lord of game.battle.retreated) {
		set_lord_locale(lord, to)
		set_lord_moved(lord, 1)
	}

	lift_sieges()
	remove_legate_if_endangered(game.battle.where)

	game.battle.retreat_to = 0
	game.battle.retreat_way = 0
	end_retreat()
}

// === ENDING THE BATTLE: REMOVE ===

function goto_battle_remove() {
	if (count_unbesieged_friendly_lords(game.battle.where) > 0)
		game.state = "battle_remove"
	else
		goto_battle_losses_loser()
}

states.battle_remove = {
	inactive: "Remove Lords",
	prompt() {
		view.prompt = "Battle: Remove losing Lords who cannot Retreat or Withdraw."
		let here = game.battle.where
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (get_lord_locale(lord) === here && is_lord_unbesieged(lord))
				gen_action_lord(lord)
	},
	lord(lord) {
		transfer_assets_except_ships(lord)
		if (can_ransom_lord_battle(lord)) {
			goto_ransom(lord)
		} else {
			disband_lord(lord, true)
			remove_legate_if_endangered(game.battle.where)
			lift_sieges()
		}
		goto_battle_remove()
	},
}

function end_ransom_battle_remove() {
	goto_battle_remove()
}

// === ENDING THE BATTLE: LOSSES ===

function has_battle_losses() {
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (lord_has_routed_units(lord))
			return true
	return false
}

function goto_battle_losses_loser() {
	clear_undo()
	set_active_loser()
	game.who = NOBODY
	if (has_battle_losses())
		if (game.active === P1)
			log_h3("Teutonic Losses")
		else
			log_h3("Russian Losses")
	resume_battle_losses()
}

function goto_battle_losses_victor() {
	clear_undo()
	set_active_victor()
	game.who = NOBODY
	if (has_battle_losses())
		if (game.active === P1)
			log_h3("Teutonic Losses")
		else
			log_h3("Russian Losses")
	resume_battle_losses()
}

function resume_battle_losses() {
	game.state = "battle_losses"
	if (!has_battle_losses())
		goto_battle_losses_remove()
}

function action_losses(lord, type) {
	let protection = FORCE_PROTECTION[type]
	let evade = FORCE_EVADE[type]
	let target = Math.max(protection, evade)

	if (game.battle.storm) {
		// Attackers in a Storm always roll vs 1
		if (is_attacker())
			target = 1
	} else {
		// Losers in a Battle roll vs 1 if they did not concede
		if (game.active === game.battle.loser && did_not_concede())
			// unless they withdrow
			if (is_lord_unbesieged(lord))
				target = 1
	}

	if (game.who !== lord) {
		log(`L${lord}`)
		game.who = lord
	}

	let die = roll_die()
	if (die <= target) {
		logi(`${FORCE_TYPE_NAME[type]} 1-${target}: ${MISS[die]}`)
		add_lord_routed_forces(lord, type, -1)
		add_lord_forces(lord, type, 1)
	} else {
		logi(`${FORCE_TYPE_NAME[type]} 1-${target}: ${HIT[die]}`)
		add_lord_routed_forces(lord, type, -1)
		if (type === SERFS)
			game.pieces.smerdi++
	}

	resume_battle_losses()
}

states.battle_losses = {
	inactive: "Losses",
	prompt() {
		view.prompt = "Losses: Determine the fate of your Routed units."
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
			if (is_lord_on_map(lord) && lord_has_routed_units(lord)) {
				if (get_lord_routed_forces(lord, KNIGHTS) > 0)
					gen_action_routed_knights(lord)
				if (get_lord_routed_forces(lord, SERGEANTS) > 0)
					gen_action_routed_sergeants(lord)
				if (get_lord_routed_forces(lord, LIGHT_HORSE) > 0)
					gen_action_routed_light_horse(lord)
				if (get_lord_routed_forces(lord, ASIATIC_HORSE) > 0)
					gen_action_routed_asiatic_horse(lord)
				if (get_lord_routed_forces(lord, MEN_AT_ARMS) > 0)
					gen_action_routed_men_at_arms(lord)
				if (get_lord_routed_forces(lord, MILITIA) > 0)
					gen_action_routed_militia(lord)
				if (get_lord_routed_forces(lord, SERFS) > 0)
					gen_action_routed_serfs(lord)
			}
		}
	},
	routed_knights(lord) {
		action_losses(lord, KNIGHTS)
	},
	routed_sergeants(lord) {
		action_losses(lord, SERGEANTS)
	},
	routed_light_horse(lord) {
		action_losses(lord, LIGHT_HORSE)
	},
	routed_asiatic_horse(lord) {
		action_losses(lord, ASIATIC_HORSE)
	},
	routed_men_at_arms(lord) {
		action_losses(lord, MEN_AT_ARMS)
	},
	routed_militia(lord) {
		action_losses(lord, MILITIA)
	},
	routed_serfs(lord) {
		action_losses(lord, SERFS)
	},
}

// === ENDING THE BATTLE: LOSSES (REMOVE LORDS) ===

function goto_battle_losses_remove() {
	game.state = "battle_losses_remove"
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (is_lord_on_map(lord) && !lord_has_unrouted_units(lord))
			return
	end_battle_losses_remove()
}

function end_battle_losses_remove() {
	game.who = NOBODY
	if (game.active === game.battle.loser)
		goto_battle_service()
	else
		goto_battle_spoils()
}

states.battle_losses_remove = {
	inactive: "Remove Lords",
	prompt() {
		view.prompt = "Losses: Remove Lords who lost all their Forces."
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (is_lord_on_map(lord) && !lord_has_unrouted_units(lord))
				gen_action_lord(lord)
	},
	lord(lord) {
		set_delete(game.battle.retreated, lord)
		if (game.active === game.battle.loser)
			transfer_assets_except_ships(lord)
		if (can_ransom_lord_battle(lord)) {
			goto_ransom(lord)
		} else {
			disband_lord(lord, true)
			lift_sieges()
			goto_battle_losses_remove()
		}
	},
}

function end_ransom_battle_losses_remove() {
	goto_battle_losses_remove()
}

// === ENDING THE BATTLE: SPOILS (VICTOR) ===

function log_spoils() {
	if (game.spoils[PROV] > 0)
		logi(game.spoils[PROV] + " Provender")
	if (game.spoils[COIN] > 0)
		logi(game.spoils[COIN] + " Coin")
	if (game.spoils[LOOT] > 0)
		logi(game.spoils[LOOT] + " Loot")
	if (game.spoils[CART] > 0)
		logi(game.spoils[CART] + " Cart")
	if (game.spoils[SLED] > 0)
		logi(game.spoils[SLED] + " Sled")
	if (game.spoils[BOAT] > 0)
		logi(game.spoils[BOAT] + " Boat")
	if (game.spoils[SHIP] > 0)
		logi(game.spoils[SHIP] + " Ship")
}

function find_lone_friendly_lord_at(loc) {
	let who = NOBODY
	let n = 0
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
		if (get_lord_locale(lord) === loc) {
			who = lord
			++n
		}
	}
	if (n === 1)
		return who
	return NOBODY
}

function goto_battle_spoils() {
	if (has_any_spoils() && has_friendly_lord(game.battle.where)) {
		log_h3("Spoils")
		log_spoils()
		game.state = "battle_spoils"
		game.who = find_lone_friendly_lord_at(game.battle.where)
	} else {
		end_battle_spoils()
	}
}

function end_battle_spoils() {
	game.who = NOBODY
	game.spoils = 0
	goto_battle_aftermath()
}

states.battle_spoils = {
	inactive: "Spoils",
	prompt() {
		if (has_any_spoils()) {
			view.prompt = "Spoils: Divide " + list_spoils() + "."
			let here = game.battle.where
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
				if (get_lord_locale(lord) === here)
					prompt_select_lord(lord)
			if (game.who !== NOBODY)
				prompt_spoils()
		} else {
			view.prompt = "Spoils: All done."
			view.actions.end_spoils = 1
		}
	},
	lord: action_select_lord,
	take_prov: take_spoils_prov,
	take_loot: take_spoils_loot,
	take_coin: take_spoils_coin,
	take_boat: take_spoils_boat,
	take_cart: take_spoils_cart,
	take_sled: take_spoils_sled,
	end_spoils() {
		clear_undo()
		end_battle_spoils()
	},
}

// === ENDING THE BATTLE: SERVICE (LOSER) ===

function goto_battle_service() {
	if (game.battle.retreated) {
		log_h3("Service")
		resume_battle_service()
	} else {
		end_battle_service()
	}
}

function resume_battle_service() {
	if (game.battle.retreated.length > 0)
		game.state = "battle_service"
	else
		end_battle_service()
}

states.battle_service = {
	inactive: "Service",
	prompt() {
		view.prompt = "Battle: Roll to shift Service of each Retreated Lord."
		for (let lord of game.battle.retreated)
			gen_action_service_bad(lord)
	},
	service_bad(lord) {
		let die = roll_die()
		if (die <= 2)
			add_lord_service(lord, -1)
		else if (die <= 4)
			add_lord_service(lord, -2)
		else if (die <= 6)
			add_lord_service(lord, -3)
		log(`L${lord} ${HIT[die]}, shifted to ${get_lord_service(lord)}.`)
		set_delete(game.battle.retreated, lord)
		set_lord_moved(lord, 1)
		resume_battle_service()
	},
}

function end_battle_service() {
	goto_battle_losses_victor()
}

// === ENDING THE BATTLE: AFTERMATH ===

function goto_battle_aftermath() {
	set_active(game.battle.attacker)

	// Events
	discard_events("hold")

	// Recovery
	spend_all_actions()

	if (check_campaign_victory())
		return

	// Siege/Conquest
	if (game.march) {
		game.battle = 0
		march_with_group_3()
	} else if (game.battle.storm) {
		game.battle = 0
		resume_command()
	} else {
		remove_legate_if_endangered(game.battle.where)
		game.battle = 0
		resume_command()
	}
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

function can_lord_use_hillforts(lord) {
	return is_lord_unfed(lord) && is_lord_unbesieged(lord) && is_in_livonia(get_lord_locale(lord))
}

function can_use_hillforts() {
	if (game.active === TEUTONS) {
		if (has_global_capability(AOW_TEUTONIC_HILLFORTS)) {
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
				if (can_lord_use_hillforts(lord))
					return true
		}
	}
	return false
}

function goto_feed() {
	log_br()

	// Count how much food each lord needs
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
		if (get_lord_moved(lord)) {
			if (count_lord_all_forces(lord) >= 7)
				set_lord_unfed(lord, 2)
			else
				set_lord_unfed(lord, 1)
		} else {
			set_lord_unfed(lord, 0)
		}
	}

	if (has_friendly_lord_who_must_feed()) {
		if (can_use_hillforts())
			game.state = "hillforts"
		else
			game.state = "feed"
	} else {
		end_feed()
	}
}

states.hillforts = {
	inactive: "Hillforts",
	prompt() {
		view.prompt = "Hillforts: Skip Feed of one Unbesieged Lord in Livonia."
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (can_lord_use_hillforts(lord))
				gen_action_lord(lord)
	},
	lord(lord) {
		push_undo()
		logcap(AOW_TEUTONIC_HILLFORTS)
		feed_lord_skip(lord)
		if (has_friendly_lord_who_must_feed())
			game.state = "feed"
		else
			end_feed()
	},
}

states.feed = {
	inactive: "Feed",
	prompt() {
		view.prompt = "Feed: You must Feed Lords who Moved or Fought."

		let done = true

		prompt_held_event()

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
			view.prompt = "Feed: You must Feed Lords with Shared Loot or Provender."
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
				if (is_lord_unfed(lord) && can_feed_from_shared(lord)) {
					gen_action_lord(lord)
					done = false
				}
			}
		}

		// Unfed
		if (done) {
			view.prompt = "Feed: You must shift the Service of any Unfed Lords."
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
				if (is_lord_unfed(lord)) {
					gen_action_service_bad(lord)
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
		log(`Fed L${lord}.`)
		add_lord_assets(lord, LOOT, -1)
		feed_lord(lord)
	},
	lord(lord) {
		push_undo()
		game.who = lord
		game.state = "feed_lord_shared"
	},
	service_bad(lord) {
		push_undo()
		add_lord_service(lord, -1)
		log(`Unfed L${lord} to ${get_lord_service(lord)}.`)
		set_lord_unfed(lord, 0)
	},
	end_feed() {
		end_feed()
	},
	card: action_held_event,
}

function resume_feed_lord_shared() {
	if (!is_lord_unfed(game.who) || !can_feed_from_shared(game.who)) {
		game.who = NOBODY
		game.state = "feed"
	}
}

states.feed_lord_shared = {
	inactive: "Feed",
	prompt() {
		view.prompt = `Feed: You must Feed ${lord_name[game.who]} with Shared Loot or Provender.`
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
		log(`Fed L${game.who}.`)
		add_lord_assets(lord, PROV, -1)
		feed_lord(game.who)
		resume_feed_lord_shared()
	},
	loot(lord) {
		push_undo()
		log(`Fed L${game.who}.`)
		add_lord_assets(lord, LOOT, -1)
		feed_lord(game.who)
		resume_feed_lord_shared()
	},
}

function end_feed() {
	clear_undo()
	goto_pay()
}

// === LEVY & CAMPAIGN: PAY ===

function can_pay_lord(lord) {
	if (get_lord_service(lord) > 16)
		return false
	if (game.active === RUSSIANS) {
		if (game.pieces.veche_coin > 0 && is_lord_unbesieged(lord))
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
	game.who = NOBODY
	if (!has_friendly_lord_who_may_be_paid())
		end_pay()
}

function resume_pay() {
	if (!can_pay_lord(game.who))
		game.who = NOBODY
}

states.pay = {
	inactive: "Pay",
	prompt() {
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
			if (is_lord_on_map(lord) && can_pay_lord(lord)) {
				prompt_select_lord(lord)
				prompt_select_service(lord)
			}
		}

		prompt_held_event()

		if (game.who === NOBODY) {
			view.prompt = "Pay: You may Pay your Lords."
		} else {

			let here = get_lord_locale(game.who)
			let pay_with_loot = is_friendly_locale(here)

			if (pay_with_loot)
				view.prompt = `Pay: You may Pay ${lord_name[game.who]} with Coin or Loot.`
			else
				view.prompt = `Pay: You may Pay ${lord_name[game.who]} with Coin.`

			if (game.active === RUSSIANS) {
				if (game.pieces.veche_coin > 0 && is_lord_unbesieged(game.who))
					view.actions.veche_coin = 1
			}

			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
				if (get_lord_locale(lord) === here) {
					if (get_lord_assets(lord, COIN) > 0)
						gen_action_coin(lord)
					if (pay_with_loot && get_lord_assets(lord, LOOT) > 0)
						gen_action_loot(lord)
				}
			}
		}

		view.actions.end_pay = 1
	},
	lord: action_select_lord,
	service: action_select_lord,
	loot(lord) {
		push_undo_without_who()
		log(`Paid L${game.who}.`)
		add_lord_assets(lord, LOOT, -1)
		add_lord_service(game.who, 1)
		resume_pay()
	},
	coin(lord) {
		push_undo_without_who()
		log(`Paid L${game.who}.`)
		add_lord_assets(lord, COIN, -1)
		add_lord_service(game.who, 1)
		resume_pay()
	},
	veche_coin() {
		push_undo_without_who()
		log(`Paid L${game.who} from Veche.`)
		game.pieces.veche_coin--
		add_lord_service(game.who, 1)
		resume_pay()
	},
	end_pay() {
		push_undo_without_who()
		end_pay()
	},
	card: action_held_event,
}

function end_pay() {
	// NOTE: We can combine Pay & Disband steps because disband is mandatory only.
	game.who = NOBODY
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

function disband_lord(lord, permanently = false) {
	let here = get_lord_locale(lord)
	let turn = current_turn()

	if (permanently) {
		log(`Removed L${lord}.`)
		set_lord_locale(lord, NOWHERE)
		set_lord_service(lord, NEVER)
	} else if (get_lord_service(lord) < current_turn()) {
		log(`Disbanded L${lord} beyond Service limit.`)
		set_lord_locale(lord, NOWHERE)
		set_lord_service(lord, NEVER)
	} else {
		if (is_levy_phase())
			set_lord_locale(lord, CALENDAR + turn + data.lords[lord].service)
		else
			set_lord_locale(lord, CALENDAR + turn + data.lords[lord].service + 1)
		set_lord_service(lord, NEVER)
		log(`Disbanded L${lord} to ${get_lord_calendar(lord)}.`)
	}

	if (game.scenario === "Pleskau" || game.scenario === "Pleskau (Quickstart)") {
		if (is_russian_lord(lord))
			game.pieces.elr1 ++
		else
			game.pieces.elr2 ++
	}

	remove_lieutenant(lord)

	// Smerdi - serfs go back to card
	game.pieces.smerdi += get_lord_forces(lord, SERFS)

	discard_lord_capability_n(lord, 0)
	discard_lord_capability_n(lord, 1)
	game.pieces.assets[lord] = 0
	game.pieces.forces[lord] = 0
	game.pieces.routed[lord] = 0

	set_lord_besieged(lord, 0)
	set_lord_moved(lord, 0)

	for (let v of data.lords[lord].vassals)
		game.pieces.vassals[v] = VASSAL_UNAVAILABLE

	remove_legate_if_endangered(here)
	lift_sieges()
}

states.disband = {
	inactive: "Disband",
	prompt() {
		view.prompt = "Disband: You must Disband Lords at their Service limit."
		let done = true
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
			if (is_lord_on_map(lord) && get_lord_service(lord) <= current_turn()) {
				gen_action_lord(lord)
				gen_action_service_bad(lord)
				done = false
			}
		}
		if (done)
			view.actions.end_disband = 1
	},
	service_bad(lord) {
		this.lord(lord)
	},
	lord(lord) {
		if (is_lord_besieged(lord) && can_ransom_lord_siege(lord)) {
			clear_undo()
			goto_ransom(lord)
		} else {
			push_undo()
			disband_lord(lord)
			lift_sieges()
		}
	},
	end_disband() {
		end_disband()
	},
}

function end_ransom_disband() {
	// do nothing
}

function end_disband() {
	clear_undo()

	if (is_campaign_phase()) {
		if (check_campaign_victory())
			return
	}

	set_active_enemy()
	if (is_campaign_phase()) {
		if (is_active_command())
			goto_remove_markers()
		else
			goto_feed()
	} else {
		if (game.active === P1)
			goto_levy_muster()
		else
			goto_feed()
	}
}

// === LEVY & CAMPAIGN: RANSOM ===

function enemy_has_ransom() {
	if (game.active === TEUTONS)
		return has_global_capability(AOW_RUSSIAN_RANSOM)
	else
		return has_global_capability(AOW_TEUTONIC_RANSOM)
}

function can_ransom_lord_siege(lord) {
	return enemy_has_ransom() && has_enemy_lord(get_lord_locale(lord))
}

function has_enemy_lord_in_battle() {
	for (let lord = first_enemy_lord; lord <= last_enemy_lord; ++lord)
		if (get_lord_moved(lord))
			return true
	return false
}

function can_ransom_lord_battle() {
	return enemy_has_ransom() && has_enemy_lord_in_battle()
}

function goto_ransom(lord) {
	clear_undo()
	set_active_enemy()
	push_state("ransom")
	game.who = lord
	game.count = data.lords[lord].service
	log(`Ransomed L${lord}.`)
}

function end_ransom() {
	let here = get_lord_locale(game.who)
	if (game.battle)
		disband_lord(game.who, true)
	else
		disband_lord(game.who, false)
	remove_legate_if_endangered(here)
	lift_sieges()
	pop_state()

	set_active_enemy()
	switch (game.state) {
		case "disband": return end_ransom_disband()
		case "sack": return end_ransom_sack()
		case "battle_remove": return end_ransom_battle_remove()
		case "battle_losses_remove": return end_ransom_battle_losses_remove()
	}
}

states.ransom = {
	inactive: "Ransom",
	prompt() {
		if (game.active === TEUTONS)
			view.prompt = `Ransom ${lord_name[game.who]}: Add ${game.count} Coin to a Teutonic Lord.`
		else
			view.prompt = `Ransom ${lord_name[game.who]}: Add ${game.count} Coin to a Russian Lord.`
		if (game.battle) {
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
				if (get_lord_moved(lord))
					gen_action_lord(lord)
		} else {
			let here = get_lord_locale(game.who)
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
				if (get_lord_locale(lord) === here)
					gen_action_lord(lord)
		}
	},
	lord(lord) {
		add_lord_assets(lord, COIN, game.count)
		end_ransom()
	},
}

// === CAMPAIGN: REMOVE MARKERS ===

function goto_remove_markers() {
	clear_lords_moved()
	goto_command_activation()
}

// === END CAMPAIGN: GROWTH ===

function count_enemy_ravaged() {
	let n = 0
	for (let loc of game.pieces.ravaged)
		if (is_friendly_territory(loc))
			++n
	return n
}

function goto_grow() {
	game.count = count_enemy_ravaged() >> 1
	log_br()
	if (game.active === TEUTONS)
		log("Teutonic Growth")
	else
		log("Russian Growth")
	if (game.count === 0) {
		logi("Nothing")
		end_growth()
	} else {
		game.state = "growth"
	}
}

function end_growth() {
	set_active_enemy()
	if (game.active === P2)
		goto_grow()
	else
		goto_game_end()
}

states.growth = {
	inactive: "Grow",
	prompt() {
		view.prompt = `Grow: Remove ${game.count} enemy Ravaged markers.`
		if (game.count > 0) {
			for (let loc of game.pieces.ravaged)
				if (is_friendly_territory(loc))
					gen_action_locale(loc)
		} else {
			view.actions.end_growth = 1
		}
	},
	locale(loc) {
		push_undo()
		logi(`%${loc}`)
		remove_ravaged_marker(loc)
		game.count--
	},
	end_growth() {
		clear_undo()
		end_growth()
	},
}

// === END CAMPAIGN: GAME END ===

function check_campaign_victory_p1() {
	for (let lord = first_p2_lord; lord <= last_p2_lord; ++lord)
		if (is_lord_on_map(lord))
			return false
	return true
}

function check_campaign_victory_p2() {
	for (let lord = first_p1_lord; lord <= last_p1_lord; ++lord)
		if (is_lord_on_map(lord))
			return false
	return true
}

function check_campaign_victory() {
	if (check_campaign_victory_p1()) {
		goto_game_over(P1, `${P1} won a Campaign Victory!`)
		return true
	}
	if (check_campaign_victory_p2()) {
		goto_game_over(P2, `${P2} won a Campaign Victory!`)
		return true
	}
	return false
}

function goto_end_campaign() {
	log_h1("End Campaign")

	set_active(P1)

	if (current_turn() === 8 || current_turn() === 16) {
		goto_grow()
	} else {
		goto_game_end()
	}
}

function count_vp1() {
	let vp = game.pieces.elr1 << 1
	vp += game.pieces.castles1.length << 1
	for (let loc of game.pieces.conquered)
		if (is_p2_locale(loc))
			vp += data.locales[loc].vp << 1
	for (let loc of game.pieces.ravaged)
		if (is_p2_locale(loc))
			vp += 1
	return vp
}

function count_vp2() {
	let vp = game.pieces.elr2 << 1
	vp += game.pieces.veche_vp << 1
	vp += game.pieces.castles2.length << 1
	for (let loc of game.pieces.conquered)
		if (is_p1_locale(loc))
			vp += data.locales[loc].vp << 1
	for (let loc of game.pieces.ravaged)
		if (is_p1_locale(loc))
			vp += 1
	return vp
}

function goto_game_end() {
	// GAME END
	if (current_turn() === scenario_last_turn[game.scenario]) {
		let vp1 = count_vp1()
		let vp2 = count_vp2()

		if (game.scenario === "Watland") {
			if (vp1 < 20)
				goto_game_over(P1, `Russians won \u2014 Teutons had less than 10 VP.`)
			else if (vp1 < vp2 * 2)
				goto_game_over(P1, `Russians won \u2014 Teutons had less than double Russian VP.`)
			else
				goto_game_over(P2, `Teutons won with ${frac(vp1)} VP vs ${frac(vp2)} VP.`)
			return
		}

		if (vp1 > vp2)
			goto_game_over(P1, `${P1} won with ${frac(vp1)} VP vs ${frac(vp2)} VP.`)
		else if (vp2 > vp1)
			goto_game_over(P2, `${P2} won with ${frac(vp2)} VP vs ${frac(vp1)} VP.`)
		else
			goto_game_over("Draw", "The game ended in a draw.")
	} else {
		goto_plow_and_reap()
	}
}

// === END CAMPAIGN: PLOW AND REAP ===

function goto_plow_and_reap() {
	let turn = current_turn()
	if (turn === 2 || turn === 10 || turn === 6 || turn === 14) {
		game.state = "plow_and_reap"
	} else {
		end_plow_and_reap()
	}
}

function flip_and_discard_half(lord, from_type, to_type) {
	add_lord_assets(lord, to_type, get_lord_assets(lord, from_type))
	set_lord_assets(lord, from_type, 0)
	set_lord_assets(lord, to_type, Math.ceil(get_lord_assets(lord, to_type) / 2))
}

states.plow_and_reap = {
	inactive: "Plow & Reap",
	prompt() {
		let from_type
		let turn = current_turn()
		if (turn === 2 || turn === 10) {
			view.prompt = "Plow and Reap: Flip Carts to Sleds and discard half."
			from_type = CART
		} else {
			view.prompt = "Plow and Reap: Flip Sleds to Carts and discard half."
			from_type = SLED
		}
		let done = true
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
			if (get_lord_assets(lord, from_type) > 0) {
				done = false
				if (from_type === CART)
					gen_action_cart(lord)
				if (from_type === SLED)
					gen_action_sled(lord)
			}
		}
		if (done) {
			view.prompt = "Plow and Reap: All done."
			view.actions.end_plow_and_reap = 1
		}
	},
	cart(lord) {
		flip_and_discard_half(lord, CART, SLED)
	},
	sled(lord) {
		flip_and_discard_half(lord, SLED, CART)
	},
	end_plow_and_reap() {
		end_plow_and_reap()
	},
}

function end_plow_and_reap() {
	goto_wastage()
}

// === END CAMPAIGN: WASTAGE ===

function goto_wastage() {
	clear_lords_moved()

	let done = true
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
		if (check_lord_wastage(lord)) {
			set_lord_moved(lord, 1)
			done = false
		}
	}

	if (done)
		end_wastage()
	else
		game.state = "wastage"
}

function check_lord_wastage(lord) {
	if (get_lord_assets(lord, PROV) > 1)
		return true
	if (get_lord_assets(lord, COIN) > 1)
		return true
	if (get_lord_assets(lord, LOOT) > 1)
		return true
	if (get_lord_assets(lord, CART) > 1)
		return true
	if (get_lord_assets(lord, SLED) > 1)
		return true
	if (get_lord_assets(lord, BOAT) > 1)
		return true
	if (get_lord_assets(lord, SHIP) > 1)
		return true
	if (get_lord_capability(lord, 0) !== NOTHING && get_lord_capability(lord, 1) !== NOTHING)
		return true
	return false
}

function prompt_wastage(lord) {
	if (get_lord_assets(lord, PROV) > 0)
		gen_action_prov(lord)
	if (get_lord_assets(lord, COIN) > 0)
		gen_action_coin(lord)
	if (get_lord_assets(lord, LOOT) > 0)
		gen_action_loot(lord)
	if (get_lord_assets(lord, CART) > 0)
		gen_action_cart(lord)
	if (get_lord_assets(lord, SLED) > 0)
		gen_action_sled(lord)
	if (get_lord_assets(lord, BOAT) > 0)
		gen_action_boat(lord)
	if (get_lord_assets(lord, SHIP) > 0)
		gen_action_ship(lord)
	for (let i = 0; i < 2; ++i) {
		let c = get_lord_capability(lord, i)
		if (c !== NOTHING)
			gen_action_card(c)
	}
}

function action_wastage(lord, type) {
	push_undo()
	set_lord_moved(lord, 0)
	add_lord_assets(lord, type, -1)
}

function find_lord_capability(c) {
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (lord_has_capability(lord, c))
			return lord
	return NOBODY
}

states.wastage = {
	inactive: "Wastage",
	prompt() {
		let done = true
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
			if (get_lord_moved(lord)) {
				prompt_wastage(lord)
				done = false
			}
		}
		if (done) {
			view.prompt = "Wastage: All done."
			view.actions.end_wastage = 1
		} else {
			view.prompt = "Wastage: Discard one Asset or Capability from each affected Lord."
		}
	},
	card(c) {
		push_undo()
		let lord = find_lord_capability(c)
		set_lord_moved(lord, 0)
		discard_lord_capability(lord, c)
	},
	prov(lord) { action_wastage(lord, PROV) },
	coin(lord) { action_wastage(lord, COIN) },
	loot(lord) { action_wastage(lord, LOOT) },
	cart(lord) { action_wastage(lord, CART) },
	sled(lord) { action_wastage(lord, SLED) },
	boat(lord) { action_wastage(lord, BOAT) },
	ship(lord) { action_wastage(lord, SHIP) },
	end_wastage() {
		end_wastage()
	},
}

function end_wastage() {
	push_undo()
	goto_reset()
}

// === END CAMPAIGN: RESET (DISCARD ARTS OF WAR) ===

function goto_reset() {
	game.state = "reset"

	// Unstack Lieutenants and Lower Lords
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		remove_lieutenant(lord)

	// Remove all Serfs to the Smerdi card
	if (game.active === RUSSIANS) {
		for (let lord = first_p2_lord; lord <= last_p2_lord; ++lord)
			set_lord_forces(lord, SERFS, 0)
		if (has_global_capability(AOW_RUSSIAN_SMERDI))
			game.pieces.smerdi = 6
		else
			game.pieces.smerdi = 0
	}

	// Discard "This Campaign" events from play.
	discard_friendly_events("this_campaign")
}

states.reset = {
	inactive: "Reset",
	prompt() {
		view.prompt = "Reset: You may discard any Arts of War cards desired."
		if (game.active === P1) {
			for (let c = first_p1_card; c <= last_p1_card; ++c)
				if (can_discard_card(c))
					gen_action_card(c)
		}
		if (game.active === P2) {
			for (let c = first_p2_card; c <= last_p2_card; ++c)
				if (can_discard_card(c))
					gen_action_card(c)
		}
		view.actions.end_discard = 1
	},
	card(c) {
		push_undo()
		if (has_global_capability(c)) {
			log(`Discarded C${c}.`)
			discard_global_capability(c)
		} else if (set_has(game.hand1, c)) {
			log("Discarded Held card.")
			set_delete(game.hand1, c)
		} else if (set_has(game.hand2, c)) {
			log("Discarded Held card.")
			set_delete(game.hand2, c)
		} else {
			let lord = find_lord_capability(c)
			if (lord !== NOBODY) {
				discard_lord_capability(lord, c)
			}
		}
	},
	end_discard() {
		end_reset()
	},
}

function end_reset() {
	clear_undo()
	set_active_enemy()
	if (game.active === P2)
		goto_plow_and_reap()
	else
		goto_advance_campaign()
}

// === END CAMPAIGN: RESET (ADVANCE CAMPAIGN) ===

function goto_advance_campaign() {
	game.turn++

	log_h1("Levy " + current_turn_name())

	// First turns of late winter
	if (current_turn() === 5 || current_turn() === 13)
		goto_discard_crusade_late_winter()
	else
		goto_levy_arts_of_war()
}

// === GAME OVER ===

function goto_game_over(result, victory) {
	game.state = "game_over"
	game.active = "None"
	game.result = result
	game.victory = victory
	log_h1("Game Over")
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

function logevent(cap) {
	game.log.push(`E${cap}.`)
}

function logcap(cap) {
	game.log.push(`C${cap}.`)
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

function gen_action_card_if_held(c) {
	if (has_card_in_hand(c))
		gen_action_card(c)
}

function prompt_select_lord_on_calendar(lord) {
	if (lord !== game.who) {
		if (is_lord_on_calendar(lord))
			gen_action_lord(lord)
		else
			gen_action_service(lord)
	}
}

function prompt_select_lord(lord) {
	if (lord !== game.who)
		gen_action_lord(lord)
}

function prompt_select_service(lord) {
	if (lord !== game.who)
		gen_action_service(lord)
}

function action_select_lord(lord) {
	if (game.who === lord)
		game.who = NOBODY
	else
		game.who = lord
}

function gen_action_calendar(calendar) {
	if (calendar < 0)
		calendar = 0
	if (calendar > 17)
		calendar = 17
	gen_action("calendar", calendar)
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

function gen_action_array(pos) {
	gen_action("array", pos)
}

function gen_action_service(service) {
	gen_action("service", service)
}

function gen_action_service_bad(service) {
	gen_action("service_bad", service)
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

function gen_action_cart(lord) {
	gen_action("cart", lord)
}

function gen_action_sled(lord) {
	gen_action("sled", lord)
}

function gen_action_boat(lord) {
	gen_action("boat", lord)
}

function gen_action_ship(lord) {
	gen_action("ship", lord)
}

function gen_action_knights(lord) {
	gen_action("knights", lord)
}

function gen_action_sergeants(lord) {
	gen_action("sergeants", lord)
}

function gen_action_light_horse(lord) {
	gen_action("light_horse", lord)
}

function gen_action_asiatic_horse(lord) {
	gen_action("asiatic_horse", lord)
}

function gen_action_men_at_arms(lord) {
	gen_action("men_at_arms", lord)
}

function gen_action_militia(lord) {
	gen_action("militia", lord)
}

function gen_action_serfs(lord) {
	gen_action("serfs", lord)
}

function gen_action_routed_knights(lord) {
	gen_action("routed_knights", lord)
}

function gen_action_routed_sergeants(lord) {
	gen_action("routed_sergeants", lord)
}

function gen_action_routed_light_horse(lord) {
	gen_action("routed_light_horse", lord)
}

function gen_action_routed_asiatic_horse(lord) {
	gen_action("routed_asiatic_horse", lord)
}

function gen_action_routed_men_at_arms(lord) {
	gen_action("routed_men_at_arms", lord)
}

function gen_action_routed_militia(lord) {
	gen_action("routed_militia", lord)
}

function gen_action_routed_serfs(lord) {
	gen_action("routed_serfs", lord)
}

const P1_LORD_MASK = (1|2|4|8|16|32)
const P2_LORD_MASK = (1|2|4|8|16|32) << 6

exports.view = function (state, current) {
	load_state(state)

	view = {
		prompt: null,
		actions: null,
		log: game.log,
		reveal: 0,

		turn: game.turn,
		end: scenario_last_turn[game.scenario],
		events: game.events,
		capabilities: game.capabilities,
		pieces: game.pieces,
		battle: game.battle,

		held1: game.hand1.length,
		held2: game.hand2.length,

		command: game.command,
		hand: null,
		plan: null,
	}

	if (!game.hidden)
		view.reveal = -1

	if (current === P1) {
		view.hand = game.hand1
		view.plan = game.plan1
		if (game.hidden)
			view.reveal |= P1_LORD_MASK
	}
	if (current === P2) {
		view.hand = game.hand2
		view.plan = game.plan2
		if (game.hidden)
			view.reveal |= P2_LORD_MASK
	}

	if (game.battle) {
		if (game.battle.array) {
			for (let lord of game.battle.array)
				if (lord !== NOBODY)
					view.reveal |= (1 << lord)
		}
		for (let lord of game.battle.reserves)
			view.reveal |= (1 << lord)
	}

	if (game.state === "game_over") {
		view.prompt = game.victory
	} else if (current === "Observer" || (game.active !== current && game.active !== BOTH)) {
		let inactive = states[game.state].inactive || game.state
		view.prompt = `Waiting for ${game.active} \u2014 ${inactive}.`
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
	// Object.seal(game) // XXX: don't allow adding properties
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

exports.is_checkpoint = function (a, b) {
	return a.turn !== b.turn
}

// === COMMON TEMPLATE ===

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

function push_undo_without_who() {
	let save_who = game.who
	game.who = NOBODY
	push_undo()
	game.who = save_who
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

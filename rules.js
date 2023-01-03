"use strict"

// TODO: hit remainders
// TODO: choose crossbow/normal hit application order
// TODO: Ambush
// TODO: Bridge - kn, sgt, 1x lh, maa, militia, serf, lh, ah
// TODO: Lodya capability during supply!
// TODO: 2nd edition supply rule - no reuse of transports

// TODO: battle mat - optional - either mat in middle, or garrison + siegeworks display
// TODO: array position - click on mat grid as well
// TODO: battle event on lord mat (at top) - in client for Bridge and Field Organs

// TODO: lift_siege / besieged needs checking!
// TODO: remove_legate_if_endangered needs checking!
// TODO: precompute distance to supply lines for faster supply path rejection
// TODO - precompute possible supply lines for faster rejections
// Use BFS for winter/rasputitsa supply

// TODO: show command lord different from selected lord (inactive player)
// TODO: show siegeworks + walls on battle mat for protection indication
// TODO: show feed x2 on lord mats with > 6 units

// Check all push/clear_undo
// Remove push_state/pop_state stuff - use explicit substates with common functions instead
// Optimize lift_sieges (only check specific locales based on where the check is)
// Use game.levy or game.command instead of game.who for levy (like game.command for campaign)
// Clean up game.who (use only in muster / events, not for command)

const data = require("./data.js")

// Packed strike and hit group lookup table.
const GROUPS = [[[0,0,0,0,0,0,0,0,0,[[8,1]],[[8,2]],[[8,3]],[[8,4]],[[8,5]],[[8,2]],[[8,7]],0,[[16,1]],[[16,2]],[[16,3]],[[16,4]],[[16,1]],[[16,6]],[[16,7]],0,[[24,1]],[[24,2]],[[8,1],[16,2]],[[24,4]],[[24,1]],[[24,2]],[[8,1],[16,6]],0,[[32,1]],[[32,2]],[[32,2]],[[32,4]],[[32,5]],[[32,6]],[[32,7]],0,[[40,1]],[[40,2]],[[8,3],[32,2]],[[40,4]],[[8,1],[32,4]],[[8,2],[32,6]],[[8,3],[32,6]],0,[[48,1]],[[48,2]],[[48,2]],[[48,4]],[[16,1],[32,4]],[[16,2],[32,4]],[[16,3],[32,4]],0,[[56,1]],[[56,2]],[[8,1],[48,2]],[[56,4]],[[24,1],[32,4]],[[24,2],[32,4]],[[8,1],[16,2],[32,4]]],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,[[16,4]],0,0,0,0,0,0,0,[[8,1],[16,4]],0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,[[48,4]],0,0,0,0,0,0,0,[[8,1],[48,4]],0,0]],[[0,0,0,0,0,0,0,0,0,[[1,8]],[[2,8]],[[3,8]],[[4,8]],[[5,8]],[[6,8]],[[7,8]],0,[[1,16]],[[2,16]],[[3,16]],[[4,16]],[[5,16]],[[6,16]],[[7,16]],0,[[1,24]],[[2,24]],[[1,8],[2,16]],[[4,16]],[[1,24],[4,16]],[[6,16]],[[1,8],[6,16]],0,[[1,32]],[[2,32]],[[3,32]],[[4,32]],[[5,32]],[[6,32]],[[7,32]],0,[[1,40]],[[2,8]],[[3,8]],[[4,40]],[[1,8],[4,32]],[[2,8],[4,32]],[[3,8],[4,32]],0,[[1,16]],[[2,48]],[[3,16]],[[4,48]],[[1,16],[4,48]],[[2,16],[4,32]],[[3,16],[4,32]],0,[[1,56]],[[2,56]],[[1,8],[2,48]],[[4,56]],[[1,24],[4,48]],[[2,24],[4,32]],[[1,8],[2,16],[4,32]]],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,[[2,32]],[[1,8],[2,32]],0,0,[[6,32]],[[1,8],[6,32]],0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]]]

const TODO = false

const BOTH = "Both"
const TEUTONS = "Teutons"
const RUSSIANS = "Russians"

const P1 = TEUTONS
const P2 = RUSSIANS

// NOTE: With Hidden Mats option, the player order of feed/pay may matter.
const FEED_PAY_DISBAND = true // feed, pay, disband in one go
const WASTAGE_DISCARD = true // wastage, discard in one go
// option ACTIVE_FEED_FIRST // active card feeds first (instead of P1 always first)
// option DELAY_PAY_IF_NO_FEED_OR_DISBAND
// TODO service shift before spoils
// option SERVICE_BEFORE_SPOILS
// option AUTO_SELECT_STRIKE_GROUPS

const DIE_HIT = "01234567"
const DIE_MISS = "01234567"

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

// unit types
const KNIGHTS = 0
const SERGEANTS = 1
const LIGHT_HORSE = 2
const ASIATIC_HORSE = 3
const MEN_AT_ARMS = 4
const MILITIA = 5
const SERFS = 6

const FORCE_TYPE_NAME = [ "knights", "sergeants", "light horse", "asiatic horse", "men-at-arms", "militia", "serfs" ]
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

const ASSET_TYPE_NAME = [ "prov", "coin", "loot", "cart", "sled", "boat", "ship" ]

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
const RD1 = 9 // relief sally: reserve defenders
const RD2 = 10
const RD3 = 11

const battle_array_name = [
	"A1", "A2", "A2",
	"D1", "D2", "D3",
	"SA1", "SA2", "SA3",
	"RD1", "RD2", "RD3",
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

const GARRISON = -1

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

const LOC_OSTROV = find_locale("Ostrov")
const LOC_UZMEN = find_locale("Uzmen")
const LOC_SOROT_RIVER = find_locale("Sorot River")
const LOC_VELIKAYA_RIVER = find_locale("Velikaya River")
const LOC_ZHELCHA_RIVER = find_locale("Zhelcha River")

const LOC_ROSITTEN = find_locale("Rositten")
const LOC_LETTGALLIA = find_locale("Lettgallia")
const LOC_TOLOWA = find_locale("Tolowa")


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
	return loc >= 0 && loc < last_locale && data.locales[loc].region === "Novgorodan Rus"
}

function is_in_livonia(loc) {
	return loc >= 0 && loc <= last_locale && data.locales[loc].region === "Crusader Livonia"
}

function is_in_estonia(loc) {
	return loc >= 0 && loc <= last_locale && data.locales[loc].region === "Danish Estonia"
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
	return season !== EARLY_WINTER && season !== LATE_WINTER
}

function is_summer() {
	return current_season() === SUMMER
}

function current_turn_name() {
	return TURN_NAME[game.turn >> 1]
}

function current_deck() {
	if (game.active === P1)
		return game.deck1
	return game.deck2
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

function get_spoils(type, n) {
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

function set_lord_calendar(lord, turn) {
	if (is_lord_on_calendar(lord))
		set_lord_locale(lord, CALENDAR + turn)
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
	set_lord_locale(lord, get_lord_locale(lord) + dir)
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

function count_group_assets(type) {
	let n = 0
	for (let lord of game.group)
		n += get_lord_assets(lord, type)
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
	return c <= last_p1_card_no_event
}

function is_p2_card(c) {
	return c >= first_p2_card
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

function is_vassal_unavailable(vassal) {
	return game.pieces.vassals[vassal] === VASSAL_UNAVAILABLE
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

function remove_siege_marker(loc) {
	let n = map_get(game.pieces.sieges, loc, 0)
	if (n > 1)
		map_set(game.pieces.sieges, loc, n - 1)
	else
		map_delete(game.pieces.sieges, loc)
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

function count_castles(loc) {
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
		set_delete(game.pieces.castle2, loc)
		set_add(game.pieces.castle1, loc)
	} else {
		set_delete(game.pieces.castle1, loc)
		set_add(game.pieces.castle2, loc)
	}
}

function has_conquered_stronghold(loc) {
	return is_stronghold(loc) && has_conquered_marker(loc)
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
	return map_has(game.pieces.lieutenants, lord)
}

function is_lower_lord(lord) {
	for (let i = 1; i < game.pieces.lieutenants.length; i += 2)
		if (game.pieces.lieutenants[i] === lord)
			return true
	return false
}

function get_upper_lord(lower) {
	for (let i = 0; i < game.pieces.lieutenants.length; i += 2)
		if (game.pieces.lieutenants[i+1] === lower)
			return i
	return NOBODY
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
		if(game.pieces.lieutenants[i] === lord || game.pieces.lieutenants[i+1] === lord) {
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
	restore_lord_forces(lord, KNIGHTS, info.forces.knights | 0)
	restore_lord_forces(lord, SERGEANTS, info.forces.sergeants | 0)
	restore_lord_forces(lord, LIGHT_HORSE, info.forces.light_horse | 0)
	restore_lord_forces(lord, ASIATIC_HORSE, info.forces.asiatic_horse | 0)
	restore_lord_forces(lord, MEN_AT_ARMS, info.forces.men_at_arms | 0)
	restore_lord_forces(lord, MILITIA, info.forces.militia | 0)
	restore_lord_forces(lord, SERFS, info.forces.serfs | 0)
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

	logi(`Disbanded ${info.name}.`)

	add_lord_forces(lord, KNIGHTS, -(info.forces.knights | 0))
	add_lord_forces(lord, SERGEANTS, -(info.forces.sergeants | 0))
	add_lord_forces(lord, LIGHT_HORSE, -(info.forces.light_horse | 0))
	add_lord_forces(lord, ASIATIC_HORSE, -(info.forces.asiatic_horse | 0))
	add_lord_forces(lord, MEN_AT_ARMS, -(info.forces.men_at_arms | 0))
	add_lord_forces(lord, MILITIA, -(info.forces.militia | 0))
	add_lord_forces(lord, SERFS, -(info.forces.serfs | 0))

	game.pieces.vassals[v] = VASSAL_READY
}

function muster_vassal(lord, vassal) {
	game.pieces.vassals[vassal] = VASSAL_MUSTERED
	muster_vassal_forces(lord, vassal)
}

function setup_decks() {
	for (let c = first_p1_card; c <= last_p1_card; ++c)
		game.deck1.push(c)
	for (let c = last_p1_card; c <= last_p1_card_no_event; ++c)
		game.deck1.push(c)

	for (let c = first_p2_card; c <= last_p2_card; ++c)
		game.deck2.push(c)
	for (let c = last_p2_card; c <= last_p2_card_no_event; ++c)
		game.deck2.push(c)
}

function draw_card(deck) {
	let i = random(deck.length)
	let c = deck[i]
	set_delete(deck, c)
	return c
}

function discard_card(c) {
	if (c >= first_p1_card && c <= last_p1_card_no_event)
		set_add(game.deck1, c)
	else if (c >= first_p2_card && c <= last_p2_card_no_event)
		set_add(game.deck2, c)
}

function discard_events(when) {
	for (let i = 0; i < game.events.length; ) {
		let c = game.events[i]
		if (data.cards[c].when === when) {
			array_remove(game.events, i)
			discard_card(c)
		} else {
			++i
		}
	}
}

function discard_friendly_events(when) {
	for (let i = 0; i < game.events.length; ) {
		let c = game.events[i]
		if (is_friendly_card(c) && data.cards[c].when === when) {
			array_remove(game.events, i)
			discard_card(c)
		} else {
			++i
		}
	}
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

		deck1: [],
		deck2: [],
		hand1: [],
		hand2: [],
		plan1: [],
		plan2: [],

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

	setup_decks()

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

	game.pieces.veche_vp = 1

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

	game.pieces.veche_vp = 1
	game.pieces.veche_coin = 1

	set_add(game.pieces.conquered, LOC_IZBORSK)
	set_add(game.pieces.conquered, LOC_PSKOV)
	set_add(game.pieces.ravaged, LOC_PSKOV)
	set_add(game.pieces.ravaged, LOC_DUBROVNO)

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

	setup_lord_on_calendar(LORD_HEINRICH, 13)
	setup_lord_on_calendar(LORD_KNUD_ABEL, 13)
	setup_lord_on_calendar(LORD_RUDOLF, 13)
	setup_lord_on_calendar(LORD_GAVRILO, 13)
	setup_lord_on_calendar(LORD_VLADISLAV, 15)
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

	game.pieces.veche_vp = 1
	game.pieces.veche_coin = 0

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
	set_delete(game.deck1, T4)
	set_lord_capability(LORD_HERMANN, 0, T4)
	set_delete(game.deck1, T14)
	set_lord_capability(LORD_HERMANN, 1, T14)

	set_delete(game.deck1, T3)
	set_lord_capability(LORD_YAROSLAV, 0, T3)

	set_delete(game.deck1, T13)
	set_add(game.capabilities, T13)
	game.pieces.legate = LOC_DORPAT

	set_delete(game.deck2, R8)
	set_add(game.capabilities, R8)
	muster_lord(LORD_DOMASH, LOC_NOVGOROD)
	add_lord_assets(LORD_DOMASH, BOAT, 2)
	add_lord_assets(LORD_DOMASH, CART, 2)

	muster_vassal(LORD_GAVRILO, data.lords[LORD_GAVRILO].vassals[0])
	set_delete(game.deck2, R2)
	set_lord_capability(LORD_GAVRILO, 0, R2)
	set_delete(game.deck2, R6)
	set_lord_capability(LORD_GAVRILO, 1, R6)


	game.pieces.veche_coin += 1

	goto_campaign_plan()

	game.plan1 = [ LORD_YAROSLAV, LORD_RUDOLF, LORD_HERMANN, LORD_HERMANN, LORD_RUDOLF, LORD_HERMANN ]
	game.plan2 = [ LORD_GAVRILO, LORD_VLADISLAV, LORD_DOMASH, LORD_GAVRILO, LORD_DOMASH, LORD_DOMASH ]

	// goto_command_activation()
}

function setup_test() {
	setup_crusade_on_novgorod()
	for (let c = first_p1_card; c <= last_p1_card; ++c) {
		if (data.cards[c].when === "hold") {
			game.hand1.push(c)
			set_delete(game.deck1, c)
		}
	}
	for (let c = first_p2_card; c <= last_p2_card; ++c) {
		if (data.cards[c].when === "hold") {
			game.hand2.push(c)
			set_delete(game.deck2, c)
		}
	}
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

function is_ravens_rock_in_play() {
	if (game.active === RUSSIANS)
		return is_event_in_play(EVENT_RUSSIAN_RAVENS_ROCK)
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
		set_add(game.capabilities, c)
		return goto_teutonic_event_pope_gregory()

	// Discard
	case EVENT_TEUTONIC_GRAND_PRINCE:
		discard_card(c)
		return goto_teutonic_event_grand_prince()
	case EVENT_TEUTONIC_KHAN_BATY:
		discard_card(c)
		return goto_teutonic_event_khan_baty()
	case EVENT_TEUTONIC_SWEDISH_CRUSADE:
		discard_card(c)
		return goto_teutonic_event_swedish_crusade()
	case EVENT_RUSSIAN_OSILIAN_REVOLT:
		discard_card(c)
		return goto_russian_event_osilian_revolt()
	case EVENT_RUSSIAN_BATU_KHAN:
		discard_card(c)
		return goto_russian_event_batu_khan()
	case EVENT_RUSSIAN_PRUSSIAN_REVOLT:
		discard_card(c)
		return goto_russian_event_prussian_revolt()
	case EVENT_TEUTONIC_BOUNTIFUL_HARVEST:
		discard_card(c)
		return goto_event_bountiful_harvest()
	case EVENT_RUSSIAN_BOUNTIFUL_HARVEST:
		discard_card(c)
		return goto_event_bountiful_harvest()
	case EVENT_TEUTONIC_MINDAUGAS:
		discard_card(c)
		return goto_teutonic_event_mindaugas()
	case EVENT_RUSSIAN_MINDAUGAS:
		discard_card(c)
		return goto_russian_event_mindaugas()
	case EVENT_TEUTONIC_TORZHOK:
		discard_card()
		return goto_teutonic_event_torzhok()
	case EVENT_RUSSIAN_TEMPEST:
		discard_card()
		return goto_russian_event_tempest()

	default:
		log("TODO")
		discard_card(c)
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
	prompt() {
		view.prompt = "Death of the Pope: Discard William of Modena."
		gen_action_card(AOW_TEUTONIC_WILLIAM_OF_MODENA)
	},
	card(card) {
		logi(`Discarded C${card}.`)
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

function torzhok_action(lord, asset) {
	push_undo()
	logi(`Removed ${ASSET_TYPE_NAME[type]} from L${lord}.`)
	add_lord_assets(lord, type, -1)
	game.count--
}

states.torzhok = {
	prompt() {
		view.prompt = "Torzhok: Remove up to 3 Assets from Domash or up to 3 Coin from Veche."
		if (game.count > 0) {
			if (game.count === 3 || game.who === NOBODY) {
				if (game.pieces.veche_coin > 0)
					view.actions.veche_coin = 1
			}
			if (game.count === 3 || game.who === LORD_DOMASH) {
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
		logi(`Removed Coin from Veche.`)
		view.actions.veche_coin -= 1
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
	prompt() {
		view.prompt = "Remove all Ships from a Teutonic Lord (half if he has Cogs)."
		for (let lord = first_enemy_lord; lord <= last_enemy_lord; ++lord)
			if (get_lord_assets(lord, SHIP) > 0)
				gen_action_ship(lord)
	},
	ship(lord) {
		logi(`Removed ships from L${lord}.`)
		let n = 0
		if (lord_has_capability(AOW_TEUTONIC_COGS))
			n = Math.ceil(get_lord_assets(lord, SHIP) / 2)
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
		logi(`Removed Ravaged from %${loc}.`)
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
		if (!has_enemy_lord(loc) && !is_enemy_stronghold(loc))
			return
	end_immediate_event()
}

function goto_russian_event_mindaugas() {
	game.state = "russian_mindaugas"
	for (let loc of RUSSIAN_MINDAUGAS)
		if (!has_enemy_lord(loc) && !is_enemy_stronghold(loc))
			return
	end_immediate_event()
}

states.teutonic_mindaugas = {
	prompt() {
		view.prompt = "Mindaugas: Place Ravaged..."
		for (let loc of TEUTONIC_MINDAUGAS)
			if (!has_enemy_lord(loc) && !is_enemy_stronghold(loc))
				gen_action_locale(loc)
	},
	locale(loc) {
		logi(`Ravaged %${loc}.`)
		add_ravaged_marker(loc)
		end_immediate_event()
	},
}

states.russian_mindaugas = {
	prompt() {
		view.prompt = "Mindaugas: Place Ravaged..."
		for (let loc of RUSSIAN_MINDAUGAS)
			if (!has_enemy_lord(loc) && !is_enemy_stronghold(loc))
				gen_action_locale(loc)
	},
	locale(loc) {
		logi(`Ravaged %${loc}.`)
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
	prompt() {
		view.prompt = "Pope Gregory: On Calendar, slide 1 Teuton cylinder 1 box left."
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (is_lord_on_calendar(lord))
				gen_action_lord_on_calendar(lord)
		if (game.who !== NOBODY)
			gen_action_calendar(get_lord_calendar(game.who) - 1)
	},
	lord(lord) { game.who = lord },
	calendar(turn) {
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
	prompt() {
		if (is_lord_on_calendar(game.who)) {
			view.prompt = "Prussian Revolt: Shift Andreas 2 right."
			gen_action_calendar(get_lord_calendar(game.who) + 2)
		} else {
			view.prompt = "Prussian Revolt: Place Andreas at Riga."
			gen_action_locale(LOC_RIGA)
		}
	},
	locale(loc) {
		logi(`Placed L${game.who} at %${LOC_RIGA}.`)
		set_lord_locale(game.who, LOC_RIGA)
		game.who = NOBODY
		end_immediate_event()
	},
	calendar(turn) {
		logi(`Shifted L${game.who} to Calendar ${turn}.`)
		set_lord_calendar(game.who, turn)
		game.who = NOBODY
		end_immediate_event()
	},
}

// === EVENTS: SHIFT LORD OR SERVICE (IMMEDIATE) ===

function goto_teutonic_event_grand_prince() {
	if (is_lord_in_play(LORD_ALEKSANDR) || is_lord_in_play(LORD_ANDREY))
		game.state = "grand_prince"
	else
		end_immediate_event()
}

states.grand_prince = {
	prompt() {
		view.prompt = "Grand Prince: On Calendar, shift Aleksandr or Andrey or furthest right service of either 2 boxes."
		if (is_lord_on_calendar(LORD_ALEKSANDR))
			gen_action_lord(LORD_ALEKSANDR)
		if (is_lord_on_calendar(LORD_ANDREY))
			gen_action_lord(LORD_ANDREY)
		if (is_lord_on_map(LORD_ALEKSANDR) && is_lord_on_map(LORD_ANDREY)) {
			let aleksandr = get_lord_service(LORD_ALEKSANDR)
			let andrey = get_lord_service(LORD_ANDREY)
			if (aleksandr >= andrey)
				gen_action_service(LORD_ALEKSANDR)
			if (andrey >= aleksandr)
				gen_action_service(LORD_ANDREY)
		}
		if (game.who !== NOBODY) {
			gen_action_calendar(get_lord_calendar(game.who) - 2)
			gen_action_calendar(get_lord_calendar(game.who) + 2)
		}
	},
	lord(lord) { game.who = lord },
	service(lord) { game.who = lord },
	calendar(turn) {
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
	prompt() {
		view.prompt = "Khan Baty: On Calendar, shift Aleksandr or Andrey or service of either 2 boxes."
		if (is_lord_in_play(LORD_ALEKSANDR))
			gen_action_lord_on_calendar(LORD_ALEKSANDR)
		if (is_lord_in_play(LORD_ANDREY))
			gen_action_lord_on_calendar(LORD_ANDREY)
		if (game.who !== NOBODY) {
			gen_action_calendar(get_lord_calendar(game.who) - 2)
			gen_action_calendar(get_lord_calendar(game.who) + 2)
		}
	},
	lord(lord) { game.who = lord },
	service(lord) { game.who = lord },
	calendar(turn) {
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
	prompt() {
		view.prompt = "Swedish Crusade: On Calendar, shift Vladislav and Karelians each 1 box."
		if (game.count & (1 << LORD_VLADISLAV))
			gen_action_lord_on_calendar(LORD_VLADISLAV)
		if (game.count & (1 << LORD_KARELIANS))
			gen_action_lord_on_calendar(LORD_KARELIANS)
		if (game.who !== NOBODY) {
			gen_action_calendar(get_lord_calendar(game.who) - 1)
			gen_action_calendar(get_lord_calendar(game.who) + 1)
		}
	},
	lord(lord) { game.who = lord },
	service(lord) { game.who = lord },
	calendar(turn) {
		game.count ^= (1 << game.who)
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
	prompt() {
		view.prompt = "Valdemar: On Calendar, shift Knud & Abel up to 1 box."
		gen_action_calendar(get_lord_calendar(game.who) - 1)
		gen_action_calendar(get_lord_calendar(game.who) + 1)
		view.actions.pass = 1 // up to
	},
	lord(lord) { game.who = lord },
	service(lord) { game.who = lord },
	calendar(turn) {
		set_lord_calendar(game.who, turn)
		game.who = NOBODY
		end_immediate_event()
	},
	pass() {
		end_immediate_event()
	},
}

function goto_russian_event_osilian_revolt() {
	if (is_lord_on_map(LORD_ANDREAS) || is_lord_on_map(LORD_HEINRICH)) {
		game.state = "osilian_revolt"
		game.count = 2
	} else {
		end_immediate_event()
	}
}

states.osilian_revolt = {
	prompt() {
		view.prompt = "Osilian Revolt: On Calendar, shift Service of Andreas or Heinrich 2 boxes left."
		// Note: Service only!
		if (is_lord_on_map(LORD_ANDREAS))
			gen_action_service(LORD_ANDREAS)
		if (is_lord_on_map(LORD_RUDOLF))
			gen_action_service(LORD_RUDOLF)
		if (game.who !== NOBODY)
			gen_action_calendar(get_lord_calendar(game.who) - 2)
	},
	service(lord) { game.who = lord },
	calendar(turn) {
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
	prompt() {
		view.prompt = "Batu Khan: On Calendar, shift Andreas up to 2 boxes."
		gen_action_calendar(get_lord_calendar(game.who) - 2)
		gen_action_calendar(get_lord_calendar(game.who) - 1)
		gen_action_calendar(get_lord_calendar(game.who) + 1)
		gen_action_calendar(get_lord_calendar(game.who) + 2)
		view.actions.pass = 1 // up to
	},
	lord(lord) { game.who = lord },
	service(lord) { game.who = lord },
	calendar(turn) {
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
	prompt() {
		view.prompt = "Dietrich von Grüningen: On Calendar, shift Andreas or Rudolf 1 box."
		if (is_lord_in_play(LORD_ANDREAS))
			gen_action_lord_on_calendar(LORD_ANDREAS)
		if (is_lord_in_play(LORD_RUDOLF))
			gen_action_lord_on_calendar(LORD_RUDOLF)
		if (game.who !== NOBODY) {
			gen_action_calendar(get_lord_calendar(game.who) - 1)
			gen_action_calendar(get_lord_calendar(game.who) + 1)
		}
	},
	lord(lord) { game.who = lord },
	service(lord) { game.who = lord },
	calendar(turn) {
		set_lord_calendar(game.who, turn)
		game.who = NOBODY
		end_immediate_event()
	},
}

// === EVENTS: HOLD ===

function play_held_event(c) {
	log(`Played E${c}.`)
	if (c >= first_p1_card && c <= last_p1_card_no_event) {
		set_delete(game.hand1, c)
		set_add(game.deck1, c)
	} else {
		set_delete(game.hand2, c)
		set_add(game.deck2, c)
	}
}

function end_held_event() {
	pop_state()
	game.what = NOTHING
}

function prompt_held_event_lordship() {
	for (let c of current_hand())
		if (can_play_held_event_lordship(c))
			gen_action_card(c)
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

function action_held_event_lordship(c) {
	push_undo()
	play_held_event(c)
	game.count += 2
}

function prompt_held_event_levy() {
	for (let c of current_hand())
		if (can_play_held_event_levy(c))
			gen_action_card(c)
}

function prompt_held_event_campaign() {
	for (let c of current_hand())
		if (can_play_held_event_campaign(c))
			gen_action_card(c)
}

function can_play_held_event_levy(c) {
	switch (c) {
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

function can_play_held_event_campaign(c) {
	switch (c) {
		case EVENT_TEUTONIC_HEINRICH_SEES_THE_CURIA:
			return can_play_heinrich_sees_the_curia()
		case EVENT_TEUTONIC_VODIAN_TREACHERY:
			return can_play_vodian_treachery()
		case EVENT_RUSSIAN_POGOST:
			return can_play_pogost()
	}
	return false
}

function action_held_event_levy(c) {
	push_undo()
	play_held_event(c)
	game.what = c
	switch (c) {
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

function action_held_event_campaign(c) {
	push_undo()
	play_held_event(c)
	game.what = c
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
	prompt() {
		view.prompt = "Vodian Treachery: Conquer Fort."
		if (is_fort(LOC_KAIBOLOVO) && is_teuton_closer_than_russian(LOC_KAIBOLOVO))
			gen_action_locale(LOC_KAIBOLOVO)
		if (is_fort(LOC_KOPORYE) && is_teuton_closer_than_russian(LOC_KOPORYE))
			gen_action_locale(LOC_KOPORYE)
	},
	locale(loc) {
		remove_all_siege_markers(loc)
		add_conquered_marker(loc)
		end_held_event()
	},
}

function can_play_heinrich_sees_the_curia() {
	return is_lord_on_map(LORD_HEINRICH)
}

states.heinrich_sees_the_curia = {
	prompt() {
		view.prompt = "Heinrich Sees the Curia: Disband Heinrich to add 4 Assets each to 2 Lords."
		gen_action_lord(LORD_HEINRICH)
	},
	lord(lord) {
		disband_lord(LORD_HEINRICH)
		game.state = "heinrich_sees_the_curia_1"
		game.who = NOBODY
		game.count = 2
	},
}

states.heinrich_sees_the_curia_1 = {
	prompt() {
		view.prompt = `Heinrich Sees the Curia: Add 4 Assets each to ${game.count} Lords.`
		if (game.count > 0) {
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
				if (is_lord_on_map(lord))
					gen_action_lord(lord)
		}
		view.actions.done = 1
	},
	lord(lord) {
		push_undo()
		push_state("heinrich_sees_the_curia_2")
		game.count = 4
		game.who = lord
	},
	done() {
		end_heinrich_sees_the_curia()
	},
}

states.heinrich_sees_the_curia_2 = {
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
	done() {
		pop_state()
		if (--game.count === 0)
			end_heinrich_sees_the_curia()
	},
}

function take_asset(type) {
	log(`L${game.who} took ${ASSET_TYPE_NAME[type]}.`)
	add_lord_assets(game.who, type, 1)
	if (--game.count === 0) {
		pop_state()
		if (--game.count === 0)
			end_heinrich_sees_the_curia()
	}
}

function end_heinrich_sees_the_curia() {
	end_held_event()
	if (game.command === LORD_HEINRICH) {
		spend_all_actions()
		resume_actions()
	}
}

// === EVENTS: HOLD - SHIFT CYLINDER ===

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
	let names
	if (game.what === EVENT_RUSSIAN_PRINCE_OF_POLOTSK)
		names = "a Russian Lord"
	else
		names = list.filter(lord => is_lord_on_calendar(lord)).map(lord => lord_name[lord]).join(" or ")
	if (boxes === 1)
		view.prompt = `${data.cards[game.what].event}: Shift ${names} 1 Calendar box.`
	else
		view.prompt = `${data.cards[game.what].event}: Shift ${names} 2 Calendar boxes.`
	for (let lord of list) {
		if (is_lord_on_calendar(lord) && lord !== game.who)
			gen_action_lord(lord)
	}
	if (game.who !== NOBODY) {
		gen_action_calendar(get_lord_calendar(game.who) - boxes)
		gen_action_calendar(get_lord_calendar(game.who) + boxes)
	}
}

function action_shift_cylinder_lord(lord) {
	game.who = lord
}

function action_shift_cylinder_calendar(turn) {
	set_lord_calendar(game.who, turn)
	game.who = NOBODY
	end_held_event()
}

states.tverdilo = {
	prompt() { prompt_shift_cylinder([ LORD_HERMANN, LORD_YAROSLAV ], 2) },
	lord: action_shift_cylinder_lord,
	calendar: action_shift_cylinder_calendar,
}

states.teutonic_fervor = {
	prompt() { prompt_shift_cylinder([ LORD_RUDOLF ], 2) },
	lord: action_shift_cylinder_lord,
	calendar: action_shift_cylinder_calendar,
}

states.teutonic_dietrich_von_gruningen = {
	prompt() { prompt_shift_cylinder([ LORD_ANDREAS, LORD_RUDOLF ], 2) },
	lord: action_shift_cylinder_lord,
	calendar: action_shift_cylinder_calendar,
}

states.prince_of_polotsk = {
	prompt() {
		prompt_shift_cylinder([
			LORD_ALEKSANDR, LORD_ANDREY, LORD_DOMASH, LORD_GAVRILO, LORD_KARELIANS, LORD_VLADISLAV
		], 1)
	},
	lord: action_shift_cylinder_lord,
	calendar: action_shift_cylinder_calendar,
}

states.pelgui = {
	prompt() { prompt_shift_cylinder([ LORD_VLADISLAV, LORD_KARELIANS ], 2) },
	lord: action_shift_cylinder_lord,
	calendar: action_shift_cylinder_calendar,
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
	discard_card(c)

	if (c === AOW_TEUTONIC_WILLIAM_OF_MODENA) {
		game.pieces.legate = LEGATE_INDISPOSED
	}

	if (c === AOW_TEUTONIC_CRUSADE) {
		for (let v of data.summer_crusaders) {
			if (is_vassal_mustered(v))
				disband_vassal(v)
			game.pieces.vassals[v] = VASSAL_UNAVAILABLE
		}
	}

	if (c === AOW_RUSSIAN_SMERDI) {
		game.pieces.smerdi = 0
	}

	if (c === AOW_RUSSIAN_STEPPE_WARRIORS) {
		for (let v of data.steppe_warriors) {
			if (is_vassal_mustered(v))
				disband_vassal(v)
			game.pieces.vassals[v] = VASSAL_UNAVAILABLE
		}
	}
}

// === LEVY: ARTS OF WAR (FIRST TURN) ===

function draw_two_cards() {
	let deck = current_deck()
	return [ draw_card(deck), draw_card(deck) ]
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
		discard_card(c)
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
	game.what = draw_two_cards()
	resume_levy_arts_of_war()
}

function resume_levy_arts_of_war() {
	game.state = "levy_arts_of_war"
	if (game.what.length === 0)
		end_levy_arts_of_war()
}

states.levy_arts_of_war = {
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
		log(`Played E${c}`)
		goto_immediate_event(c)
	},
	hold() {
		let c = game.what.shift()
		log(`Held event card.`)
		if (game.active === P1)
			set_add(game.hand1, c)
		else
			set_add(game.hand2, c)
		resume_levy_arts_of_war()
	},
	discard() {
		let c = game.what.shift()
		discard_card(c)
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
	prompt() {
		view.prompt = "Levy: Muster with your Lords."

		prompt_held_event_levy()

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
		log_h3(`L${lord} at %${get_lord_locale(lord)}`)
		push_state("levy_muster_lord")
		game.who = lord
		game.count = data.lords[lord].lordship
	},
	end_muster() {
		clear_undo()
		end_levy_muster()
	},
	card: action_held_event_levy,
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
		view.prompt = `Levy: Muster with ${lord_name[game.who]}.`

		prompt_held_event_lordship()

		if (game.count > 0) {
			let season = current_season()
			view.prompt += ` ${game.count} lordship left.`

			// Roll to muster Ready Lord at Seat
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
				if (lord === LORD_ALEKSANDR)
					continue

				// NOTE: 2E change, ANDREY may be mustered normally
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
			view.actions.capability = 1
		} else {
			view.prompt += " All done."
		}

		view.actions.done = 1
	},

	card(c) {
		push_undo()
		action_held_event_lordship(c)
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

	take_ship() {
		push_undo()
		logi("Ship")
		add_lord_assets(game.who, SHIP, 1)
		resume_levy_muster_lord()
	},
	take_boat() {
		push_undo()
		logi("Boat")
		add_lord_assets(game.who, BOAT, 1)
		resume_levy_muster_lord()
	},
	take_cart() {
		push_undo()
		logi("Cart")
		add_lord_assets(game.who, CART, 1)
		resume_levy_muster_lord()
	},
	take_sled() {
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
		logii("Ship")
		add_lord_assets(game.who, SHIP, 1)
		--game.count
		resume_muster_lord_transport()
	},
	take_boat() {
		push_undo()
		logii("Boat")
		add_lord_assets(game.who, BOAT, 1)
		--game.count
		resume_muster_lord_transport()
	},
	take_cart() {
		push_undo()
		logii("Cart")
		add_lord_assets(game.who, CART, 1)
		--game.count
		resume_muster_lord_transport()
	},
	take_sled() {
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
	let c = get_lord_capability(lord, 0)
	if (c !== NOTHING)
		discard_card(c)
	set_lord_capability(lord, 0, NOTHING)
}

function discard_lord_capability(lord, c) {
	discard_card(c)
	if (get_lord_capability(lord, 0) === c)
		return set_lord_capability(lord, 0, NOTHING)
	if (get_lord_capability(lord, 1) === c)
		return set_lord_capability(lord, 1, NOTHING)
	throw new Error("capability not found")
}

states.muster_capability = {
	prompt() {
		let deck = current_deck()
		view.prompt = `Muster: Select a new capability for ${lord_name[game.who]}.`
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
		log("Skipped.")
		end_papal_legate()
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
		game.pieces.legate = loc
		game.state = "papal_legate_active"
	},
}

states.papal_legate_active = {
	prompt() {
		view.prompt = "Papal Legate: You may move or use the Legate."

		view.actions.end_call_to_arms = 1

		let here = game.pieces.legate

		prompt_held_event_levy()

		// Move to friendly locale
		for (let loc = first_locale; loc <= last_locale; ++loc)
			if (loc !== here && is_friendly_locale(loc))
				gen_action_locale(loc)

		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
			if (no_muster_of_or_by_lord(lord))
				continue

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
		game.pieces.legate = loc
		game.state = "papal_legate_done"
	},
	lord(lord) {
		push_undo()

		let here = game.pieces.legate

		game.pieces.legate = LEGATE_ARRIVED
		game.state = "papal_legate_done"

		if (is_lord_ready(lord)) {
			log(`Mustered L${lord}`)
			logii(`at %${here}`)

			// TODO: clean up these transitions
			muster_lord(lord, here)
			push_state("muster_lord_transport")
			game.who = lord
			game.count = data.lords[lord].assets.transport | 0
			resume_muster_lord_transport()
		}

		else if (is_lord_on_calendar(lord)) {
			log(`Slid L${lord} one box left.`)
			shift_lord_cylinder(lord, -1)
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
		end_papal_legate()
	},
	card: action_held_event_levy,
}

states.papal_legate_done = {
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
		log(`Summer Crusaders mustered.`)
		muster_vassal(lord, v)
	} else {
		log(`Summer Crusaders restored.`)
		restore_lord_forces(lord, KNIGHTS, data.vassals[v].forces.knights | 0)
	}
}

states.summer_crusaders = {
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
			if (game.pieces.veche_coin < 8) {
				game.state = "black_sea_trade"
				return
			}
		}
	}
	goto_baltic_sea_trade()
}

states.black_sea_trade = {
	prompt() {
		view.prompt = "Call to Arms: Black Sea Trade."
		view.actions.veche = 1
	},
	veche() {
		log("Black Sea Trade added 1 coin to Veche.")
		game.pieces.veche_coin += 1
		goto_baltic_sea_trade()
	},
}

function goto_baltic_sea_trade() {
	if (has_global_capability(AOW_RUSSIAN_BALTIC_SEA_TRADE)) {
		if (!has_conquered_marker(LOC_NOVGOROD) && !has_conquered_marker(LOC_NEVA)) {
			if (count_all_teutonic_ships() <= count_all_russian_ships()) {
				if (game.pieces.veche_coin < 8) {
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
		view.prompt = "Call to Arms: Baltic Sea Trade."
		view.actions.veche = 1
	},
	veche() {
		if (game.pieces.veche_coin === 7) {
			log("Baltic Sea Trade added 1 coin to Veche.")
			game.pieces.veche_coin += 1
		} else {
			log("Baltic Sea Trade added 2 coins to Veche.")
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
	prompt() {
		view.prompt = "Novgorod Veche: You may take one action with the Veche."
		view.actions.end_call_to_arms = 1

		prompt_held_event_levy()

		if (is_lord_ready(LORD_ALEKSANDR) || is_lord_ready(LORD_ANDREY)) {
			if (game.pieces.veche_vp < 8)
				view.actions.delay = 1
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
	delay() {
		push_undo()
		log("Added 1VP to Veche.")
		game.state = "novgorod_veche_done"

		view.actions.veche_vp += 1
		if (is_lord_ready(LORD_ALEKSANDR)) {
			log(`Delayed L${LORD_ALEKSANDR}.`)
			shift_lord_cylinder(LORD_ALEKSANDR, 1)
		}
		if (is_lord_ready(LORD_ANDREY)) {
			log(`Delayed L${LORD_ANDREY}.`)
			shift_lord_cylinder(LORD_ANDREY, 1)
		}
	},
	lord(lord) {
		push_undo()
		log("Removed 1VP from Veche.")
		game.pieces.veche_vp -= 1
		game.state = "novgorod_veche_done"

		if (is_lord_ready(lord)) {
			log(`Mustered L${lord}`)
			push_state("muster_lord_at_seat")
			game.who = lord
		}

		else if (is_lord_on_calendar(lord)) {
			log(`Slid L${lord} one box left.`)
			shift_lord_cylinder(lord, -1)
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
	card: action_held_event_levy,
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

	// Start of Campaign phase
	if (check_campaign_victory())
		return

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
		goto_actions()
	}
}

// === CAMPAIGN: ACTIONS ===

function is_first_action() {
	return game.flags.first_action
}

function is_first_march() {
	return game.flags.first_march
}

function goto_actions() {
	game.actions = data.lords[game.command].command

	game.flags.first_action = 1
	game.flags.first_march = 1

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

function end_actions() {
	log_br()

	set_active(P1)
	game.command = NOBODY
	game.group = 0
	game.pieces.legate_selected = 0

	game.flags.first_action = 0
	game.flags.first_march = 0
	game.flags.teutonic_raiders = 0

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
			return is_lord_on_map(LORD_ALEKSANDR) && is_lord_on_map(LORD_ANDREY)
	return false
}

states.actions = {
	prompt() {
		view.prompt = `${lord_name[game.command]} has ${game.actions}x actions.`

		view.group = game.group

		let here = get_lord_locale(game.command)

		prompt_held_event_campaign()

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
		game.pieces.legate = LEGATE_ARRIVED
		game.pieces.legate_selected = 0
		++game.actions
	},

	pass() {
		push_undo()
		log("Passed.")
		spend_all_actions()
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

	card: action_held_event_campaign,
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
		if (get_lord_locale(loc) === loc && is_lord_besieged(lord))
			set_lord_besieged(lord, 0)
}

function lift_sieges() {
console.log("LIFT SIEGE CHECK!")
	for (let i = 0; i < game.pieces.sieges.length; i += 2) {
		let loc = game.pieces.sieges[i]
		if (is_enemy_stronghold(loc)) {
			if (!has_friendly_lord(loc)) {
				log(`Lifted siege at %${loc}.`)
				remove_all_siege_markers(loc)
				release_besieged_lords(loc)
			}
		} else if (is_friendly_stronghold(loc)) {
			if (!has_enemy_lord(loc)) {
				log(`Lifted siege at %${loc}.`)
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
	prompt() {
		view.prompt = `March: Select way.`
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
		let to = game.march.to
		let way = game.march.approach
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
	let way = game.march.approach
	let to = game.march.to
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
		resume_actions()
		update_supply()
		return
	}

	remove_legate_if_endangered(here)

	if (is_unbesieged_enemy_stronghold(here)) {
		add_siege_marker(here)
		log(`Encamped.`)
		spend_all_actions() // ENCAMP
	}

	if (is_trade_route(here)) {
		conquer_trade_route(here)
	}

	game.march = 0

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
	if (has_castle_marker(loc))
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
	if (way === game.march.approach)
		return false
	if (has_unbesieged_enemy_lord(to))
		return false
	if (is_unbesieged_enemy_stronghold(to))
		return false
	return true
}

function select_all_lords(here) {
	game.group = []
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (get_lord_locale(lord) === here)
			game.group.push(lord)
}

function goto_avoid_battle() {
	clear_undo()
	set_active_enemy()
	game.stack = game.group // XXX
	game.state = "avoid_battle"
	game.spoils = 0
	resume_avoid_battle()
}

function resume_avoid_battle() {
	let here = game.march.to
	if (has_unbesieged_friendly_lord(here)) {
		// TODO: select all or no lords?
		select_all_lords(here)
		// game.group = []
		game.state = "avoid_battle"
	} else {
		end_avoid_battle()
	}
}

states.avoid_battle = {
	prompt() {
		view.prompt = `March: You may avoid battle.`
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
	prompt() {
		view.prompt = `Avoid Battle: Select way.`
		view.group = game.group
		let from = game.march.to
		let to = game.march.avoid_to
		let ways = list_ways(from, to)
		for (let i = 1; i < ways.length; ++i)
			gen_action_way(ways[i])
	},
	way(way) {
		game.avoid_way = way
		avoid_battle_1()
	},
}

function avoid_battle_1() {
	let way = game.march.avoid_way
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
		let to = game.march.avoid_to
		let way = game.march.avoid_way
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
	locale(to) {
		avoid_battle_2()
	},
	avoid() {
		avoid_battle_2()
	},
}

function avoid_battle_2() {
	let from = game.march.to
	let to = game.march.avoid_to
	let way = game.march.avoid_way

	if (data.ways[way].name)
		log(`Avoided Battle via ${data.ways[way].name} to %${to}.`)
	else
		log(`Avoided Battle to %${to}.`)

	for (let lord of game.group) {
		set_lord_locale(lord, to)
		set_lord_moved(lord, 1)
	}

	game.march.avoid_to = 0
	game.march.avoid_way = 0
	resume_avoid_battle()
}

function end_avoid_battle() {
	game.group = game.stack // XXX
	goto_march_withdraw()
}

// === ACTION: MARCH - AMBUSH ===

// TODO - ambush cancels avoid battle

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
	prompt() {
		view.prompt = `March: You may withdraw lords into stronghold.`

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

		log(`L${lord} withdrew.`)
		set_lord_besieged(lord, 1)

		if (lower !== NOBODY) {
			log(`L${lower} withdrew.`)
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
	game.stack = [] // XXX ???
	goto_spoils_after_avoid_battle()
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
function take_spoils_ship() { take_spoils(SHIP) }
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
	prompt() {
		if (has_any_spoils()) {
			view.prompt = "Spoils: Divide " + list_spoils() + "."
			// only moving lords get to divide the spoils
			for (let lord of game.group)
				if (lord !== game.who)
					gen_action_lord(lord)
			if (game.who !== NOBODY)
				prompt_spoils()
		} else {
			view.prompt = "Spoils: All done."
			view.actions.end_spoils = 1
		}
	},
	lord(lord) {
		game.who = lord
	},
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

	remove_all_siege_markers(here)

	if (has_conquered_marker(here))
		remove_conquered_marker(here)
	else
		add_conquered_marker(here)

	if (has_enemy_castle(here))
		flip_castle(here)

	if (here === LOC_NOVGOROD) {
		if (game.pieces.veche_coin > 0) {
			log(`Removed ${game.pieces.veche_coin} coin from Veche.`)
			game.pieces.veche_coin = 0
		}
	}
}

states.surrender = {
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
			log(`Surrender ${die} <= ${n}.`)
			surrender_stronghold(here)
			end_siege()
		} else {
			log(`Surrender ${die} > ${n} failed.`)
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
	resume_actions()
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
	let seats = 2

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
		seats = 1

	let sources = list_supply_sources(ships)
	let reachable = filter_reachable_supply_sources(sources, boats, carts, sleds)
	let supply_seats = filter_usable_supply_seats(reachable)
	let supply_seaports = filter_usable_supply_seaports(reachable, ships)

	game.supply = { supply_seats, supply_seaports, seats, boats, carts, sleds, ships }
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

let _supply_stat = 0
let _supply_stop = new Array(last_locale+1)
let _supply_seen = new Array(last_locale+1)
let _supply_reached = new Array(last_locale+1)

function filter_reachable_supply_sources(sources, boats, carts, sleds) {
	_supply_stat = 0
	_supply_stop.fill(0)
	_supply_reached.fill(0)

	for (let here = 0; here <= last_locale; ++here) {
		if (has_unbesieged_enemy_lord(here))
			_supply_stop[here] = 1
		else if (is_unbesieged_enemy_stronghold(here))
			_supply_stop[here] = 1
		else if (is_friendly_territory(here) && has_conquered_marker(here))
			if (!has_siege_marker(here))
				_supply_stop[here] = 1
	}

	switch (current_season()) {
	case SUMMER:
		_supply_seen.fill(0)
		search_supply_reachable_summer(sources, get_lord_locale(game.command), boats, carts)
		break
	case EARLY_WINTER:
	case LATE_WINTER:
		search_supply_reachable_winter(get_lord_locale(game.command), sleds)
		break
	case RASPUTITSA:
		search_supply_reachable_rasputitsa(get_lord_locale(game.command), boats)
		break
	}

	let result = []
	for (let here of sources)
		if (_supply_reached[here])
			set_add(result, here)
	console.log("SUPPLY SEARCH", _supply_stat, sources, result, _supply_reached.join(""))
	return result
}

function has_reached_all_supply_sources(sources) {
	for (let loc of sources)
		if (!_supply_reached[loc])
			return false
	return true
}

function search_supply_reachable_summer(sources, here, boats, carts) {
	if (_supply_seen[here])
		return
	if (_supply_stop[here])
		return

	_supply_stat++

	_supply_reached[here] = 1

	if (has_reached_all_supply_sources(sources))
		return

	_supply_seen[here] = 1

	if (boats > 0)
		for (let next of data.locales[here].adjacent_by_waterway)
			search_supply_reachable_summer(sources, next, boats - 1, carts)
	if (carts > 0)
		for (let next of data.locales[here].adjacent_by_trackway)
			search_supply_reachable_summer(sources, next, boats, carts - 1)

	_supply_seen[here] = 0
}

function search_supply_reachable_winter(start, sleds) {
	if (_supply_stop[start])
		return
	let queue = [[start, 0]]
	_supply_reached[start] = 1
	if (0 < sleds) {
		while (queue.length > 0) {
			let [ here, d ] = queue.shift()
			for (let next of data.locales[here].adjacent) {
				if (!_supply_reached[next] && !_supply_stop[next]) {
					_supply_reached[next] = 1
					if (d + 1 < sleds)
						queue.push([ next, d + 1 ])
				}
			}
		}
	}
}

function search_supply_reachable_rasputitsa(start, boats) {
	if (_supply_stop[start])
		return
	let queue = [[start, 0]]
	_supply_reached[start] = 1
	if (0 < boats) {
		while (queue.length > 0) {
			let [ here, d ] = queue.shift()
			for (let next of data.locales[here].adjacent_by_waterway) {
				if (!_supply_reached[next] && !_supply_stop[next]) {
					_supply_reached[next] = 1
					if (d + 1 < boats)
						queue.push([ next, d + 1 ])
				}
			}
		}
	}
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

	if (is_famine_in_play())
		return false

	let here = get_lord_locale(game.command)
	if (has_ravaged_marker(here))
		return false
	if (is_summer())
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
		for (let there of data.locales[here].adjacent_by_trackway)
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
	log(`Ravaged at %${there}.`)

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

function goto_tax() {
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
		game.who = game.command
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
		if (game.pieces.legate_selected)
			game.pieces.legate = to

		lift_sieges()

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
	resume_actions()
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
	log("Mustered Serfs.")
	game.pieces.smerdi --
	add_lord_forces(game.command, SERFS, 1)
	spend_action(1)
	resume_actions()
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
		strikers: 0,
		targets: 0,
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

	// TODO: array <= 3 attacking lords automatically

	init_battle(here, 0, 0)

	for (let lord = first_lord; lord <= last_lord; ++lord) {
		if (get_lord_locale(lord) === here && !is_lord_besieged(lord)) {
			set_lord_moved(lord, 1)
			if (lord !== game.command)
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

	// TODO: 2nd edition garrison forces
	if (here === LOC_NOVGOROD)
		init_garrison(0, 3)
	else if (is_city(here))
		init_garrison(0, 3)
	else if (is_fort(here))
		init_garrison(0, 1)
	else if (is_bishopric(here))
		init_garrison(1, 3)
	else if (is_castle(here))
		init_garrison(1, 2)

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

function is_lord_arrayed(lord) {
	return game.battle.array.includes(lord)
}

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
		set_add(game.battle.reserves, lord)
		game.battle.relief = 1
	},
	end_sally() {
		goto_array_attacker()
	},
}

// === BATTLE: BATTLE ARRAY ===

function has_reserves() {
	for (let lord of game.battle.reserves)
		if (is_friendly_lord(lord))
			return true
	return false
}

function count_reserves() {
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

function action_array_place(pos) {
	push_undo_without_who()
	game.battle.array[pos] = game.who
	set_delete(game.battle.reserves, game.who)
	game.who = NOBODY
}

function goto_array_attacker() {
	set_active_attacker()
	game.state = "array_attacker"
	game.who = NOBODY
	if (!has_reserves())
		goto_array_defender()
}

states.array_attacker = {
	prompt() {
		view.prompt = "Battle Array: Position your attacking lords."
		let array = game.battle.array

		let done = true

		if (game.battle.sally) {
			if (array[A1] === NOBODY || array[A2] === NOBODY || array[A3] === NOBODY) {
				for (let lord of game.battle.reserves) {
					if (lord !== game.who && is_friendly_lord(lord)) {
						gen_action_lord(lord)
						done = false
					}
				}
			}
		} else {
			// Select front Lord
			if (array[A1] === NOBODY || array[A2] === NOBODY || array[A3] === NOBODY) {
				for (let lord of game.battle.reserves) {
					if (lord !== game.who && is_friendly_lord(lord) && is_lord_unbesieged(lord)) {
						gen_action_lord(lord)
						done = false
					}
				}
			}

			// Select sallying Lord
			if (array[SA1] === NOBODY || array[SA2] === NOBODY || array[SA3] === NOBODY) {
				for (let lord of game.battle.reserves) {
					if (lord !== game.who && is_friendly_lord(lord) && is_lord_besieged(lord)) {
						gen_action_lord(lord)
						done = false
					}
				}
			}
		}

		if (game.who === NOBODY && done)
			view.actions.end_array = 1

		if (game.who !== NOBODY) {
			// Place front Lord
			if (game.battle.sally || is_lord_unbesieged(game.who)) {
				// A2 is already filled by command lord!
				if (array[A1] === NOBODY)
					gen_action_array(A1)
				if (array[A3] === NOBODY)
					gen_action_array(A3)
			} else {
				// Place rear Lord
				if (array[SA2] === NOBODY) {
					gen_action_array(SA2)
				} else {
					if (array[SA1] === NOBODY)
						gen_action_array(SA1)
					if (array[SA3] === NOBODY)
						gen_action_array(SA3)
				}
			}
		}
	},
	array: action_array_place,
	lord(lord) {
		game.who = lord
	},
	end_array() {
		goto_array_defender()
	},
}

function goto_array_defender() {
	clear_undo()
	set_active_defender()
	game.state = "array_defender"
	game.who = NOBODY
	let n = count_reserves()
	if (n === 1) {
		game.battle.array[D2] = pop_first_reserve()
		end_array_defender()
	}
	if (n === 0) {
		end_array_defender()
	}
}

function prompt_array_place_defender(X1, X2, X3, Y1, Y3) {
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

states.array_defender = {
	prompt() {
		view.prompt = "Battle Array: Position your defending lords."
		let array = game.battle.array

		let done = true

		let empty_front = array[D1] === NOBODY || array[D2] === NOBODY || array[D3] === NOBODY
		let empty_rear = array[SA1] !== NOBODY && (array[RD1] === NOBODY || array[RD2] === NOBODY || array[RD3] === NOBODY)

		if (empty_front || empty_rear) {
			for (let lord of game.battle.reserves) {
				if (lord !== game.who && is_friendly_lord(lord)) {
					gen_action_lord(lord)
					done = false
				}
			}
		}

		if (done && game.who === NOBODY)
			view.actions.end_array = 1

		if (game.who !== NOBODY) {
			if (empty_front)
				prompt_array_place_defender(D1, D2, D3, A1, A3)
			else if (empty_rear)
				prompt_array_place_defender(RD1, RD2, RD3, SA1, SA3)
		}
	},
	array: action_array_place,
	lord(lord) {
		game.who = lord
	},
	end_array() {
		end_array_defender()
	},
}

function end_array_defender() {
	clear_undo()
	goto_attacker_events()
}

// === STORM: ARRAY ===

function goto_array_defender_storm() {
	clear_undo()
	set_active_defender()
	game.state = "array_defender_storm"
	game.who = NOBODY
	let n = count_reserves()
	if (n === 1) {
		game.battle.array[D2] = pop_first_reserve()
		end_array_defender()
	}
	if (n === 0) {
		end_array_defender()
	}
}

states.array_defender_storm = {
	prompt() {
		view.prompt = "Storm Array: Choose a defending lord."

		for (let lord of game.battle.reserves)
			if (is_friendly_lord(lord))
				gen_action_lord(lord)
	},
	lord(lord) {
		set_delete(game.battle.reserves, lord)
		game.battle.array[D2] = lord
		end_array_defender()
	},
}

// === BATTLE: EVENTS ===

function goto_attacker_events() {
	set_active_attacker()
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
	if (game.active === game.battle.attacker)
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

function can_play_battle_events() {
	if (!game.battle.storm) {
		if (game.active === TEUTONS) {
			if (game.active !== game.battle.attacker) {
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
			if (game.active !== game.battle.attacker) {
				if (could_play_card(EVENT_RUSSIAN_HILL))
					return true
				if (!is_winter())
					if (could_play_card(EVENT_RUSSIAN_MARSH))
						return true
			}
			if (!is_winter())
				if (could_play_card(EVENT_RUSSIAN_BRIDGE))
					return true
			if (is_summer())
				if (could_play_card(EVENT_RUSSIAN_RAVENS_ROCK))
					return true
		}
	}

	// Battle or Storm
	if (game.active === TEUTONS) {
		if (could_play_card(EVENT_TEUTONIC_FIELD_ORGAN))
			return true
	}

	return false
}

function prompt_battle_events() {
	// both attacker and defender events
	if (game.active === TEUTONS) {
		if (!game.battle.storm) {
			if (!is_winter())
				gen_action_card_if_held(EVENT_TEUTONIC_BRIDGE)
		}
		gen_action_card_if_held(EVENT_TEUTONIC_FIELD_ORGAN)
	}

	if (game.active === RUSSIANS) {
		if (!game.battle.storm) {
			if (!is_winter())
				gen_action_card_if_held(EVENT_RUSSIAN_BRIDGE)
			if (is_summer())
				gen_action_card_if_held(EVENT_RUSSIAN_RAVENS_ROCK)
		}
	}

	view.actions.done = 1
}

states.attacker_events = {
	prompt() {
		view.prompt = "Attacker may play events."
		prompt_battle_events()
	},
	card: action_battle_events,
	done() {
		end_attacker_events()
	},
}

states.defender_events = {
	prompt() {
		view.prompt = "Defender may play events."

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
	prompt() {
		view.prompt = "Bridge: Play on a Center Lord."
		let array = game.battle.array
		if (game.active === game.battle.attacker) {
			if (array[D2] !== NOBODY)
				gen_action_lord(array[D2])
			if (array[RD2] !== NOBODY)
				gen_action_lord(array[RD2])
		} else {
			// Cannot play on Relief Sallying lord
			if (array[A2] !== NOBODY)
				gen_action_lord(array[A2])
		}
	},
	lord(lord) {
		log(`Played E${game.what} on L${lord}.`)
		if (!game.battle.bridge)
			game.battle.bridge = []
		set_add(game.battle.bridge, lord)
		resume_battle_events()
	},
}

states.field_organ = {
	prompt() {
		view.prompt = "Field Organ: Play on a Lord."
		let array = game.battle.array
		if (game.active === game.battle.attacker) {
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
			goto_start_strike()
		else
			game.state = "concede_storm"
	} else {
		log_h3(`Battle Round ${game.battle.round}`)
		game.state = "concede_battle"
	}
}

states.concede_battle = {
	prompt() {
		view.prompt = "Battle: Concede the Field?"
		view.actions.concede = 1
		view.actions.battle = 1
	},
	concede() {
		log(game.active + " concede.")
		game.battle.conceded = game.active
		goto_reposition_battle()
	},
	battle() {
		set_active_enemy()
		if (game.active === game.battle.attacker)
			goto_reposition_battle()
	},
}

states.concede_storm = {
	prompt() {
		view.prompt = "Storm: Concede?"
		view.actions.concede = 1
		view.actions.battle = 1
	},
	concede() {
		log(game.active + " concede.")
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

	// If all SA routed, send RD to reserve (end relief sally)
	if (array[SA1] === NOBODY && array[SA2] === NOBODY && array[SA3] === NOBODY) {
		send_to_reserve(RD1)
		send_to_reserve(RD2)
		send_to_reserve(RD3)
	}

	// If all D routed, advance RD to front
	if (array[D1] === NOBODY && array[D2] === NOBODY && array[D3] === NOBODY) {
		slide_array(RD1, D1)
		slide_array(RD2, D2)
		slide_array(RD3, D3)
	}

	// If all A routed, flip the battle field around:
	if (array[A1] === NOBODY && array[A2] === NOBODY && array[A3] === NOBODY) {
		// Become a regular sally situation (siegeworks still count for defender)
		game.battle.sally = 1
		// Advance SA to front (to regular sally)
		slide_array(SA1, A1)
		slide_array(SA2, A2)
		slide_array(SA3, A3)
		// then D back to reserve
		send_to_reserv(D1)
		send_to_reserv(D2)
		send_to_reserv(D3)
		// then RD to D
		slide_array(RD1, D1)
		slide_array(RD2, D2)
		slide_array(RD3, D3)
		// and during the advance D may come back out from reserve
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
	if (game.active === game.battle.attacker)
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
	if (game.active === game.battle.attacker)
		goto_start_strike()
	else
		goto_reposition_center()
}

function can_reposition_advance() {
	if (has_reserves()) {
		let array = game.battle.array
		if (game.active === game.battle.attacker) {
			if (array[A1] === NOBODY || array[A2] === NOBODY || array[A3] === NOBODY)
				return true
			// TODO: sally more lords from castle?
		} else {
			if (array[D1] === NOBODY || array[D2] === NOBODY || array[D3] === NOBODY)
				return true
			if (array[SA1] !== NOBODY || array[SA2] !== NOBODY || array[SA2] !== NOBODY)
				if (array[RD1] === NOBODY || array[RD2] === NOBODY || array[RD3] === NOBODY)
					return true
		}
	}
	return false
}

states.reposition_advance = {
	prompt() {
		view.prompt = "Reposition: Advance from Reserve."
		let array = game.battle.array

		for (let lord of game.battle.reserves)
			if (is_friendly_lord(lord) && lord !== game.who)
				gen_action_lord(lord)

		if (game.who !== NOBODY) {
			if (game.active === game.battle.attacker) {
				if (array[A1] === NOBODY) gen_action_array(A1)
				if (array[A2] === NOBODY) gen_action_array(A2)
				if (array[A3] === NOBODY) gen_action_array(A3)
			} else {
				if (array[D1] === NOBODY) gen_action_array(D1)
				if (array[D2] === NOBODY) gen_action_array(D2)
				if (array[D3] === NOBODY) gen_action_array(D3)
				if (array[SA1] !== NOBODY || array[SA2] !== NOBODY || array[SA2] !== NOBODY) {
					if (array[RD1] === NOBODY) gen_action_array(RD1)
					if (array[RD2] === NOBODY) gen_action_array(RD2)
					if (array[RD3] === NOBODY) gen_action_array(RD3)
				}
			}
		}
	},
	lord(lord) {
		game.who = lord
	},
	array(pos) {
		game.battle.array[pos] = game.who
		game.who = NOBODY
		goto_reposition_advance()
	},
}

function can_reposition_center() {
	let array = game.battle.array
	if (game.active === game.battle.attacker) {
		if (array[A2] === NOBODY && (array[A1] !== NOBODY || array[A3] !== NOBODY))
			return true
		if (array[SA2] === NOBODY && (array[SA1] !== NOBODY || array[SA3] !== NOBODY))
			return true
	} else {
		if (array[D2] === NOBODY && (array[D1] !== NOBODY || array[D3] !== NOBODY))
			return true
		if (array[RD2] === NOBODY && (array[RD1] !== NOBODY || array[RD3] !== NOBODY))
			return true
	}
	return false
}

states.reposition_center = {
	prompt() {
		view.prompt = "Reposition: Slide to Center."
		let array = game.battle.array

		if (game.active === game.battle.attacker) {
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
			if (array[RD2] === NOBODY) {
				if (array[RD1] !== NOBODY) gen_action_lord(game.battle.array[RD1])
				if (array[RD3] !== NOBODY) gen_action_lord(game.battle.array[RD3])
			}
		}

		if (game.who !== NOBODY) {
			let from = get_lord_array_position(game.who)
			if (from === A1 || from === A3) gen_action_array(A2)
			if (from === D1 || from === D3) gen_action_array(D2)
			if (from === SA1 || from === SA3) gen_action_array(SA2)
			if (from === RD1 || from === RD3) gen_action_array(RD2)
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
	return has_reserves()
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
	if (game.active === game.battle.attacker)
		goto_start_strike()
	else
		goto_reposition_storm()
}

states.reposition_storm = {
	prompt() {
		view.prompt = "Reposition: You may switch positions between Front and any Reserve Lord."
		for (let lord of game.battle.reserves)
			if (is_friendly_lord(lord) && lord !== game.who)
				gen_action_lord(lord)
		view.action.end_reposition = 1
	},
	lord(lord) {
		log(`Swapped in L${lord}.`)
		set_delete(game.battle.reserves, lord)
		if (game.active === game.battle.attacker) {
			set_add(game.battle.reserves, game.battle.array[A2])
			game.battle.array[A2] = lord
		} else {
			set_add(game.battle.reserves, game.battle.array[D2])
			game.battle.array[A2] = lord
		}
		end_reposition_storm()
	},
	end_reposition() {
		end_reposition_storm()
	},
}

// === BATTLE: TOTAL HITS ===

const battle_defending_positions = [ D1, D2, D3, RD1, RD2, RD3 ]
const battle_attacking_positions = [ A1, A2, A3, SA1, SA2, SA3 ]

const storm_defending_positions = [ D2 ]
const storm_attacking_positions = [ A2 ]

const battle_steps = [
	{ name: "Defending Archery", hits: count_archery_hits, xhits: count_archery_xhits, archery: 1 },
	{ name: "Attacking Archery", hits: count_archery_hits, xhits: count_archery_xhits, archery: 1 },
	{ name: "Defending Horse", hits: count_horse_hits, xhits: count_zero_hits, archery: 0 },
	{ name: "Attacking Horse", hits: count_horse_hits, xhits: count_zero_hits, archery: 0 },
	{ name: "Defending Foot", hits: count_foot_hits, xhits: count_zero_hits, archery: 0 },
	{ name: "Attacking Foot", hits: count_foot_hits, xhits: count_zero_hits, archery: 0 },
]

const storm_steps = [
	{ name: "Defending Archery", hits: count_archery_hits, xhits: count_archery_xhits, archery: 1 },
	{ name: "Attacking Archery", hits: count_archery_hits, xhits: count_archery_xhits, archery: 1 },
	{ name: "Defending Melee", hits: count_melee_hits, xhits: count_zero_hits, archery: 0 },
	{ name: "Attacking Melee", hits: count_melee_hits, xhits: count_zero_hits, archery: 0 },
]

function count_zero_hits(lord) {
	return 0
}

function count_archery_xhits(lord) {
	let xhits = 0
	if (lord_has_capability(lord, AOW_TEUTONIC_BALISTARII))
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

function count_horse_hits(lord) {
	let hits = 0
	if (!is_marsh_in_play()) {
		if (game.battle.field_organ === lord && game.battle.round === 1) {
			log(`Field Organ L${lord}.`)
			hits += get_lord_forces(lord, KNIGHTS) << 1
			hits += get_lord_forces(lord, SERGEANTS) << 1
		}
		if (game.battle.storm)
			hits += get_lord_forces(lord, KNIGHTS) << 1
		else
			hits += get_lord_forces(lord, KNIGHTS) << 2
		hits += get_lord_forces(lord, SERGEANTS) << 1
		hits += get_lord_forces(lord, LIGHT_HORSE)
	}
	return hits
}

function count_foot_hits(lord) {
	let hits = 0
	hits += get_lord_forces(lord, MEN_AT_ARMS) << 1
	hits += get_lord_forces(lord, MILITIA)
	hits += get_lord_forces(lord, SERFS)
	return hits
}

function count_garrison_xhits() {
	if (storm_steps[game.battle.step].archery)
		return game.battle.garrison.men_at_arms
	return 0
}

function count_garrison_hits() {
	if (!storm_steps[game.battle.step].archery)
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

function has_lord_strike(lord) {
	if (lord !== NOBODY)
		return count_lord_hits(lord) + count_lord_xhits(lord) > 0
	return false
}

function has_center_strike(X2, Y2) {
	return (
		has_lord_strike(game.battle.array[X2]) ||
		has_lord_strike(game.battle.array[Y2])
	)
}

function has_sa_strike() {
	return (
		has_lord_strike(game.battle.array[SA1]) ||
		has_lord_strike(game.battle.array[SA2]) ||
		has_lord_strike(game.battle.array[SA3])
	)
}

// === BATTLE: STRIKE ===

// Segment strikers and targets into groups according to flanking situation (front/rear choice).
// S picks group to strike.
// Roll for walls or siegeworks.
// T applies hits.
// Rolls for armor.
// If any routed, recalculate target group for current strike group (front/rear choice again).

function format_strike_step() {
	// TODO: format strike group and target groups too?
	if (game.battle.storm)
		return storm_steps[game.battle.step].name
	return battle_steps[game.battle.step].name
}

function goto_start_strike() {
	game.battle.step = 0
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
		goto_next_strike()
		return
	}

	if (game.battle.step & 1)
		set_active_attacker()
	else
		set_active_defender()

	// Once per Archery and once per Melee.
	if (game.battle.step === 0 || game.battle.step === 2) {
		game.battle.warrior_monks = 0
		for (let p = 0; p < 12; ++p) {
			let lord = game.battle.array[p]
			if (lord !== NOBODY && lord_has_capability(lord, AOW_TEUTONIC_WARRIOR_MONKS))
				game.battle.warrior_monks |= (1 << lord)
		}
	}

	if (game.battle.storm)
		goto_strike_storm()
	else
		goto_strike_battle()
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
		if (is_friendly_locale(lord))
			return false
	if (game.battle.storm && game.active !== game.battle.attacker)
		if (game.battle.garrison)
			return false
	return true
}

function has_sa_without_rd() {
	if (game.active === game.battle.attacker) {
		let array = game.battle.array
		if (array[SA1] !== NOBODY || array[SA2] !== NOBODY || array[SA3] !== NOBODY)
			if (array[RD1] === NOBODY && array[RD2] === NOBODY && array[RD3] === NOBODY)
				return true
	}
	return false
}

function select_lone_defender() {
	let array = game.battle.array
	if (array[D1] !== NOBODY && array[D2] === NOBODY && array[D3] === NOBODY)
		return D1
	if (array[D1] === NOBODY && array[D2] !== NOBODY && array[D3] === NOBODY)
		return D2
	if (array[D1] === NOBODY && array[D2] === NOBODY && array[D3] !== NOBODY)
		return D3
	return -1
}

function pack_battle_array_front() {
	let x = 0
	for (let i = 0; i < 6; ++i)
		if (game.battle.array[i] >= 0)
			x |= (1 << i)
	return x
}

function pack_battle_array_rear() {
	let x = 0
	for (let i = 0; i < 6; ++i)
		if (game.battle.array[i+6] >= 0)
			x |= (1 << i)
	return x
}

function front_strike_choice() {
	let s = game.battle.step & 1
	let f = pack_battle_array_front()
	if (GROUPS[s][1][f] !== 0) {
		// Choice only matters if the center Lord has strikes this step
		if (has_center_strike(A2, D2))
			game.battle.fc = -1
		else
			game.battle.fc = 0
	} else {
		game.battle.fc = 0
	}
}

function rear_strike_choice() {
	if (has_sa_without_rd()) {
		if (has_sa_strike())
			game.battle.rc = select_lone_defender()
		else
			game.battle.rc = 0
	} else {
		let s = game.battle.step & 1
		let r = pack_battle_array_rear()
		if (GROUPS[s][1][r] !== 0) {
			// Choice only matters if the center Lord has strikes this step
			if (has_center_strike(SA2, RD2))
				game.battle.fc = -1
			else
				game.battle.rc = 0
		} else {
			game.battle.rc = 0
		}
	}
}

function unpack_group(g, offset) {
	let list = []
	for (let i = 0; i < 6; ++i)
		if ((g >> i) & 1)
			list.push(i + offset)
	return list
}

function round_hits(hits, xhits) {
}

function create_battle_group(list, targets) {
	let strikers = []
	let hits = 0
	let xhits = 0

	for (let pos of list) {
		let lord = game.battle.array[pos]
		let lord_hits = count_lord_hits(lord)
		let lord_xhits = count_lord_xhits(lord)
		if (lord_hits + lord_xhits > 0) {
			strikers.push(pos)
			if (lord_xhits > 0)
				log(`L${lord} ${lord_xhits/2} crossbow hits`)
			if (lord_hits > 0)
				log(`L${lord} ${lord_hits/2} hits`)
			hits += lord_hits
			xhits += lord_xhits
		}
	}

	if (strikers.length > 0) {
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
		if (game.active === game.battle.conceded) {
			hits = (hits + 1) >> 1
			xhits = (xhits + 1) >> 1
		}

		game.battle.groups.push([ strikers, targets, hits, xhits ])
	}
}

function create_battle_groups_from_array(list, offset) {
	if (list)
		for (let [ s, t ] of list)
			create_battle_group(unpack_group(s, offset), unpack_group(t, offset))
}

function format_group(g) {
	return g.map(p=>lord_name[game.battle.array[p]]).join(", ")
}

function debug_group(g) {
	return g.map(p=>battle_array_name[p]).join("+")
}

function debug_group_list(list) {
	for (let [strikers,targets,hits,xhits] of list)
		console.log(debug_group(strikers), "strike", debug_group(targets), "for", hits, "+", xhits)
}

function debug_battle_array(f, r) {
	for (let row = 0; row < 6; row += 3) {
		let x = ""
		for (let col = 0; col < 3; ++col) {
			let b = row + col
			if ((f >> b) & 1)
				x += battle_array_name[b] + "  "
			else
				x += "--- "
		}
		console.log(x)
	}
	for (let row = 3; row >= 0; row -= 3) {
		let x = ""
		for (let col = 0; col < 3; ++col) {
			let b = row + col
			if ((r >> b) & 1)
				x += battle_array_name[b+6] + " "
			else
				x += "--- "
		}
		console.log(x)
	}
}

function goto_strike_storm() {
	log_h4(storm_steps[game.battle.step].name)

	let strikers = []
	let targets = []
	let hits = 0
	let xhits = 0

	function add_lord_strike(pos) {
		let lord = game.battle.array[pos]
		let lord_hits = count_lord_hits(lord)
		let lord_xhits = count_lord_xhits(lord)

		// Max 6 hits per lord in melee (12 since we count half-hits).
		if (game.battle.step >= 2)
			if (lord_hits > 12)
				lord_hits = 12

		if (lord_hits + lord_xhits > 0) {
			strikers.push(pos)
			if (lord_xhits > 0)
				log(`L${lord} ${lord_xhits/2} crossbow hits`)
			if (lord_hits > 0)
				log(`L${lord} ${lord_hits/2} hits`)
			hits += lord_hits
			xhits += lord_xhits
		}
	}

	if (game.active === game.battle.attacker) {
		add_lord_strike(A2)
		if (game.battle.array[D2] !== NOBODY)
			targets.push(D2)
	} else {
		if (game.battle.garrison) {
			let garr_hits = count_garrison_hits()
			let garr_xhits = count_garrison_xhits()
			if (garr_xhits > 0)
				log(`Garrison ${garr_xhits/2} crossbow hits`)
			if (garr_hits > 0)
				log(`Garrison ${garr_hits/2} hits`)
			hits += garr_hits
			xhits += garr_xhits
		}
		add_lord_strike(D2)
		targets.push(A2)
	}

	if (hits + xhits === 0) {
		log("No hits.")
		goto_next_strike()
		return
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

	game.battle.groups = []
	game.battle.strikers = strikers
	game.battle.targets = targets
	game.battle.hits = hits
	game.battle.xhits = xhits

	// TODO: "select_strike_group" w/ garrison?

	goto_assign_hits()
}

function goto_strike_battle() {
	log_h4(battle_steps[game.battle.step].name)

	if (is_marsh_in_play())
		log("Marsh")

	if (is_hill_in_play() && game.battle.step < 2)
		log("Hill")

	if (game.battle.step >= 2) // Melee Step
		if (game.battle.bridge)
			log("TODO: Bridge")

	front_strike_choice()
	rear_strike_choice()

	goto_strike_choice()
}

function goto_strike_choice() {
	if (game.battle.fc === -1)
		game.state = "front_strike_choice"
	else if (game.battle.rc === -1)
		game.state = "rear_strike_choice"
	else
		end_strike_choice()
}

function prompt_strike_choice(X1, X2, X3, Y2) {
	if (game.battle.array[X2] === NOBODY && game.battle.array[Y2] !== NOBODY) {
		view.who = game.battle.array[Y2]
		if (game.battle.array[X1] !== NOBODY)
			gen_action_lord(game.battle.array[X1])
		if (game.battle.array[X3] !== NOBODY)
			gen_action_lord(game.battle.array[X3])
	}
}

states.front_strike_choice = {
	prompt() {
		view.prompt = `${format_strike_step()}: Strike who?`
		if (game.active === game.battle.attacker)
			prompt_strike_choice(D1, D2, D3, A2)
		else
			prompt_strike_choice(A1, A2, A3, D2)
	},
	lord(lord) {
		let pos = get_lord_array_position(lord)
		if (pos === A1 || pos === D1)
			game.battle.fc = 0
		if (pos === A3 || pos === D3)
			game.battle.fc = 1
		goto_strike_choice()
	},
}

states.rear_strike_choice = {
	prompt() {
		view.prompt = `${format_strike_step()}: Strike who?`
		if (has_sa_without_rd()) {
			if (has_sa_strike()) {
				let array = game.battle.array
				view.group = [ array[SA1], array[SA2], array[SA3] ]
				if (array[D1] !== NOBODY)
					gen_action_lord(array[D1])
				if (array[D2] !== NOBODY)
					gen_action_lord(array[D2])
				if (array[D3] !== NOBODY)
					gen_action_lord(array[D3])
			}
		} else {
			if (game.active === game.battle.attacker)
				prompt_strike_choice(RD1, RD2, RD3, SA2)
			else
				prompt_strike_choice(SA1, SA2, SA3, RD2)
		}
	},
	lord(lord) {
		let pos = get_lord_array_position(lord)
		if (has_sa_without_rd()) {
			game.battle.rc = pos
		} else {
			if (pos === SA1 || pos === RD1)
				game.battle.rc = 0
			if (pos === SA3 || pos === RD3)
				game.battle.rc = 1
		}
		goto_strike_choice()
	},
}

function end_strike_choice() {
	let s = game.battle.step & 1
	let front = pack_battle_array_front()
	let rear = pack_battle_array_rear()

	console.log("STRIKE")

	debug_battle_array(front, rear)

	game.battle.groups = []

	create_battle_groups_from_array(GROUPS[s][game.battle.fc][front], 0)
	if (has_sa_without_rd())
		create_battle_group([ SA1, SA2, SA3 ], [ game.battle.rc ])
	else
		create_battle_groups_from_array(GROUPS[s][game.battle.rc][rear], 6)

	if (game.active === game.battle.conceded)
		log("Pursuit halved hits")

	debug_group_list(game.battle.groups)

	goto_select_strike_group()
}


function goto_select_strike_group() {
	if (game.battle.groups.length === 0)
		goto_next_strike()
	/* TODO auto select is too abrupt, maybe option?
	else if (game.battle.groups.length === 1)
		select_strike_group(0)
	*/
	else
		game.state = "select_strike_group"
}

states.select_strike_group = {
	prompt() {
		view.prompt = `${format_strike_step()}: Select Striking Lord or Group.`
		for (let [strikers, targets] of game.battle.groups) {
			for (let p of strikers)
				gen_action_lord(game.battle.array[p])
		}
	},
	lord(lord) {
		for (let i = 0; i < game.battle.groups.length; ++i) {
			for (let p of game.battle.groups[i][0])
				if (game.battle.array[p] === lord)
					select_strike_group(i)
		}
	},
}

function select_strike_group(i) {
	;[ game.battle.strikers, game.battle.targets, game.battle.hits, game.battle.xhits ] = game.battle.groups[i]
	array_remove(game.battle.groups, i)
	goto_assign_hits()
}

// === BATTLE: APPLY HITS / PROTECTION / ROLL WALLS ===

function format_hits() {
	if (game.battle.xhits > 0 && game.battle.hits > 0)
		return `${game.battle.xhits} crossbow hits and ${game.battle.hits} hits`
	else if (game.battle.xhits > 0)
		return `${game.battle.xhits} crossbow hits`
	else
		return `${game.battle.hits} hits`
}

function has_unrouted_forces_in_target() {
	if (game.battle.storm && game.active !== game.battle.attacker)
		if (game.battle.garrison)
			return true
	for (let p of game.battle.targets) {
		let lord = game.battle.array[p]
		if (lord_has_unrouted_units(lord))
			return true
	}
	return false
}

function is_flanked_target() {
	if (game.battle.targets.length === 1) {
		let pos = game.battle.targets[0]
		let has_d1 = game.battle.array[D1] !== NOBODY && game.battle.array[A1] === NOBODY
		let has_d2 = game.battle.array[D2] !== NOBODY && game.battle.array[A2] === NOBODY
		let has_d3 = game.battle.array[D3] !== NOBODY && game.battle.array[A3] === NOBODY
		let has_a2 = game.battle.array[A2] !== NOBODY
		switch (pos) {
		case A1:
			return has_d2 || (has_d3 && !has_a2)
		case A2:
			return has_d1 || has_d3
		case A3:
			return has_d2 || (has_d1 && !has_a2)
		}
	}
	return false
}

function has_valid_target() {
	if (game.battle.storm && game.active !== game.battle.attacker && game.battle.garrison)
		return true
	return game.battle.targets.length > 0
}

function goto_assign_hits() {
	set_active_enemy()

	if (!has_valid_target()) {
		end_assign_hits()
		return
	}

	if (game.battle.storm && game.active !== game.battle.attacker && game.battle.garrison)
		log("Garrison")
	else
		log(`${format_group(game.battle.targets)}`)

	if (has_sa_without_rd()) {
		console.log("SA without RD (getting hit)")
		if (!is_flanked_target()) {
			console.log("  unflanked, SA added to hit group")
			if (game.battle.array[SA1] !== NOBODY)
				game.battle.targets.push(SA1)
			if (game.battle.array[SA2] !== NOBODY)
				game.battle.targets.push(SA2)
			if (game.battle.array[SA3] !== NOBODY)
				game.battle.targets.push(SA3)
		}
	}

	if (game.battle.storm) {
		if (game.active === game.battle.attacker)
			roll_for_siegeworks()
		else
			roll_for_walls()
	} else if (game.battle.sally) {
		if (game.active !== game.battle.attacker) {
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
		logi(`Took ${game.battle.xhits} crossbow hits`)
	if (game.battle.hits > 0)
		logi(`Took ${game.battle.hits} hits`)
	if (game.battle.hits + game.battle.xhits === 0)
		logi(`Took no hits`)

	resume_assign_hits()
}

function resume_assign_hits() {
	if (game.battle.hits + game.battle.xhits === 0) {
		end_assign_hits()
	} else if (!has_unrouted_forces_in_target()) {
		log("TODO: remaining hits!")
		// TODO: calculate new hit group for the current striking group, and resume or end if no valid targets
		end_assign_hits()
	} else {
		game.state = "assign_hits"
	}
}

function end_assign_hits() {
	game.battle.strikers = 0
	game.battle.targets = 0

	set_active_enemy()
	if (game.battle.storm)
		goto_next_strike()
	else
		goto_select_strike_group()
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
		logi("Trebuchets.")
		prot--
	}
	if (prot > 0) {
		game.battle.xhits = roll_for_protection(`Walls 1-${prot} vs crossbow`, prot, game.battle.xhits)
		game.battle.hits = roll_for_protection(`Walls 1-${prot}`, prot, game.battle.hits)
	} else {
		logi("No walls.")
	}
}

function roll_for_siegeworks() {
	let prot = count_siege_markers(game.battle.where)
	if (enemy_has_trebuchets()) {
		logi("Trebuchets.")
		prot--
	}
	if (prot > 0) {
		game.battle.xhits = roll_for_protection(`Siegeworks 1-${prot} vs crossbow`, prot, game.battle.xhits)
		game.battle.hits = roll_for_protection(`Siegeworks 1-${prot}`, prot, game.battle.hits)
	} else {
		logi("No siegeworks.")
	}
}

function roll_for_ravens_rock() {
	let prot = 2
	if (enemy_has_trebuchets()) {
		logi("Trebuchets.")
		prot--
	}
	if (prot > 0) {
		game.battle.xhits = roll_for_protection(`Raven's Rock 1-${prot} vs crossbow`, prot, game.battle.xhits)
		game.battle.hits = roll_for_protection(`Raven's Rock 1-${prot}`, prot, game.battle.hits)
	} else {
		logi("No Raven's Rock.")
	}
}

function roll_for_protection(name, prot, n) {
	let total = 0
	if (n > 0) {
		let rolls = []
		for (let i = 0; i < n; ++i) {
			let die = roll_die()
			if (die <= prot) {
				rolls.push(DIE_HIT[die])
			} else {
				rolls.push(DIE_MISS[die])
				total++
			}
		}
		logi(name + ": " + rolls.join(", "))
	}
	return total
}

// === BATTLE: ASSIGN HITS TO UNITS / ROLL BY HIT / ROUT ===

function rout_lord(lord) {
	log(`L${lord} routed!`)

	let p = get_lord_array_position(lord)

	// remove from battle array
	game.battle.array[p] = NOBODY

	// FIXME cleanup TODO, removing from which groups

	// remove from current hit group
	array_remove_item(game.battle.targets, p)

	for (let i = 0; i < game.battle.groups;) {
		let targets = game.battle.groups[i][1]

		// remove from other hit groups
		array_remove_item(targets, p)

		// remove strike groups with no remaining targets
		if (targets.length === 0)
			array_remove(game.battle.groups, i)
		else
			++i
	}
}

function rout_unit(lord, type) {
	if (lord === GARRISON) {
		if (type === KNIGHTS)
			game.battle.garrison.knights--
		if (type === MEN_AT_ARMS)
			game.battle.garrison.men_at_arms--
		if (game.battle.garrison.knights + game.battle.garrison.men_at_arms === 0) {
			log("Garrison routed.")
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

function action_assign_hits(lord, type) {
	let protection = FORCE_PROTECTION[type]
	let evade = FORCE_EVADE[type]

	// TODO: manual choice of hit type
	let ap = (is_armored_force(type) && game.battle.xhits > 0) ? 2 : 0

	// TODO: which lord? summarize?

	if (type === SERGEANTS || type === MEN_AT_ARMS)
		if (lord_has_capability(lord, AOW_TEUTONIC_HALBBRUDER))
			protection += 1

	if (evade > 0 && !game.battle.storm) {
		let die = roll_die()
		if (die <= evade) {
			logi(`${FORCE_TYPE_NAME[type]} ${die} <= ${evade}`)
		} else {
			logi(`${FORCE_TYPE_NAME[type]} ${die} > ${evade}`)
			rout_unit(lord, type)
		}
	} else if (protection > 0) {
		let die = roll_die()
		if (die <= protection - ap) {
			logi(`${FORCE_TYPE_NAME[type]} ${die} <= ${protection - ap}`)
		} else {
			logi(`${FORCE_TYPE_NAME[type]} ${die} > ${protection - ap}`)
			if (use_warrior_monks(lord, type)) {
				die = roll_die()
				if (die <= protection - ap) {
					logi(`Warrior Monks ${die} <= ${protection - ap}`)
				} else {
					logi(`Warrior Monks ${die} > ${protection - ap}`)
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
		rout_lord(lord)

	resume_assign_hits()
}

function prompt_hit_armored_forces() {
	let has_armored = false
	for (let p of game.battle.targets) {
		let lord = game.battle.array[p]
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
	}
	return has_armored
}

function prompt_hit_unarmored_forces() {
	for (let p of game.battle.targets) {
		let lord = game.battle.array[p]
		if (get_lord_forces(lord, LIGHT_HORSE) > 0)
			gen_action_light_horse(lord)
		if (get_lord_forces(lord, ASIATIC_HORSE) > 0)
			gen_action_asiatic_horse(lord)
		if (get_lord_forces(lord, MILITIA) > 0)
			gen_action_militia(lord)
		if (get_lord_forces(lord, SERFS) > 0)
			gen_action_serfs(lord)
	}
}

function prompt_hit_forces() {
	for (let p of game.battle.targets) {
		let lord = game.battle.array[p]
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
	}
}

states.assign_hits = {
	prompt() {
		view.prompt = `${format_strike_step()}: Assign ${format_hits()} to units.`

		view.group = game.battle.strikers.map(p => game.battle.array[p])

		// TODO: hits or xhits choice

		if (game.battle.storm) {
			if (game.active === game.battle.attacker) {
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
	// Ending the Battle
	//	retreat, withdrawal, or removal
	//		withdraw
	//		retreat
	//		remove
	//	losses
	//	spoils
	//	service

	// Ending the Storm
	//	sack
	//	losses
	//	spoils

	log_br()
	log(`${game.battle.loser} lost battle.`)

	if ((game.battle.sally || game.battle.relief) && game.battle.attacker === game.battle.loser) {
		log("Raid removed siege markers.")
		remove_all_but_one_siege_markers(game.battle.where)
	}

	game.battle.array = 0

	set_active_loser()
	if (game.battle.storm) {
		if (game.battle.attacker !== game.battle.loser)
			goto_sack()
		else
			goto_battle_losses()
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

	log(`Sacked %${here}.`)

	remove_all_siege_markers(game.battle.where)
	add_conquered_marker(game.battle.where)

	if (here === LOC_NOVGOROD)
		award_spoils(3)
	else if (is_city(here))
		award_spoils(2)
	else if (is_fort(here))
		award_spoils(1)
	else if (is_bishopric(here))
		award_spoils(2)
	else if (is_castle(here))
		award_spoils(1)

	game.state = "sack"
	resume_sack()
}

function resume_sack() {
	let here = game.battle.where
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (get_lord_locale(lord) === here)
			return
	goto_battle_losses()
}

states.sack = {
	prompt() {
		let here = game.battle.where
		view.prompt = `Sack: Remove all Lords at ${data.locales[here].name}.`
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (get_lord_locale(lord) === here)
				gen_action_lord(lord)
	},
	lord(lord) {
		log(`Disbanded L${lord}.`)
		transfer_assets_except_ships(lord)
		disband_lord(lord, true)
		resume_sack()
	},
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
	prompt() {
		let here = game.battle.where
		let capacity = stronghold_capacity(here)

		view.prompt = "Battle: You may withdraw losing lords into stronghold."

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

		log(`L${lord} withdrew.`)
		set_lord_besieged(lord, 1)

		if (lower !== NOBODY) {
			log(`L${lower} withdrew.`)
			set_lord_besieged(lord, 1)
		}
	},
	end_withdraw() {
		push_undo()
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
		if (game.active === game.battle.attacker)
			return can_retreat_to(game.march.from)
		for (let [to, way] of data.locales[game.battle.where].ways)
			if (way !== game.march.approach && can_retreat_to(to))
				return true
	} else {
		// Battle after Sally
		for (let [to, way] of data.locales[game.battle.where].ways)
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
	prompt() {
		view.prompt = "Battle: Retreat losing lords."
		view.group = game.battle.retreated
		if (game.march) {
			// after March
			if (game.active === game.battle.attacker) {
				gen_action_locale(game.march.from)
			} else {
				for (let [to, way] of data.locales[game.battle.where].ways)
				if (way !== game.march.approach && can_retreat_to(to))
					gen_action_locale(to)
			}
		} else {
			// after Sally
			for (let [to, way] of data.locales[game.battle.where].ways)
			if (can_retreat_to(to))
				gen_action_locale(to)
		}
	},
	locale(to) {
		push_undo()
		if (game.march) {
			if (game.active === game.battle.attacker) {
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
	prompt() {
		view.prompt = `Retreat: Select way.`
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
	if (game.battle.conceded !== game.active) {
		for (let lord of game.battle.retreated)
			transfer_assets_except_ships(lord)
		retreat_2()
	} else {
		let way = game.battle.retreat_way
		let transport = count_retreat_transport(data.ways[way].type)
		let prov = count_retreat_assets(PROV)
		let loot = count_retreat_assets(LOOT)
		if (prov > transport || loot > 0)
			game.state = 'retreat_laden'
		else
			retreat_2()
	}
}

states.retreat_laden = {
	prompt() {
		let to = game.battle.retreat_to
		let way = game.battle.retreat_way
		let transport = count_retreat_transport(data.ways[way].type)
		let prov = count_retreat_assets(PROV)
		let loot = count_retreat_assets(LOOT)

		view.prompt = `Retreat with ${prov} provender and ${transport} transport.`
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
	locale(to) {
		retreat_2()
	},
	retreat() {
		retreat_2()
	},
}

function retreat_2() {
	let from = game.battle.where
	let to = game.battle.retreat_to
	let way = game.battle.retreat_way

	if (data.ways[way].name)
		log(`Retreated via ${data.ways[way].name} to %${to}.`)
	else
		log(`Retreated to %${to}.`)

	for (let lord of game.battle.retreated) {
		set_lord_locale(lord, to)
		set_lord_moved(lord, 1)
	}

	game.battle.retreat_to = 0
	game.battle.retreat_way = 0
	end_retreat()
}

// === ENDING THE BATTLE: REMOVE ===

function goto_battle_remove() {
	if (count_unbesieged_friendly_lords(game.battle.where) > 0)
		game.state = "battle_remove"
	else
		end_battle_remove()
}

function end_battle_remove() {
	clear_undo()
	goto_battle_losses()
}

states.battle_remove = {
	prompt() {
		view.prompt = "Battle: Remove losing lords who cannot Retreat or Withdraw."
		let here = game.battle.where
		let done = true
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
			if (get_lord_locale(lord) === here && is_lord_unbesieged(lord)) {
				gen_action_lord(lord)
				done = false
			}
		}
		if (done)
			view.actions.end_remove = 1
	},
	lord(lord) {
		push_undo()
		transfer_assets_except_ships(lord)
		disband_lord(lord, true)
		remove_legate_if_endangered(game.battle.where)
		lift_sieges()
	},
	end_remove() {
		push_undo()
		end_battle_remove()
	},
}

// === ENDING THE BATTLE: LOSSES ===

// TODO: disband vassal service markers once enough forces are lost?

function goto_battle_losses() {
	set_active_loser() // loser first, to save time
	resume_battle_losses()
}

function resume_battle_losses() {
	game.state = "battle_losses"
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (lord_has_routed_units(lord))
			return
	resume_battle_losses_remove()
}

function resume_battle_losses_remove() {
	game.state = "battle_losses_remove"
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		if (is_lord_on_map(lord) && !lord_has_unrouted_units(lord))
			return
	end_battle_losses()
}

function end_battle_losses() {
	if (game.active === game.battle.loser) {
		set_active_victor()
		resume_battle_losses()
	} else {
		goto_battle_spoils()
	}
}

function action_losses(lord, type) {
	let protection = FORCE_PROTECTION[type]
	let evade = FORCE_EVADE[type]
	let target = Math.max(protection, evade)

	if (game.battle.storm) {
		// Attackers in a Storm always roll vs 1
		if (game.active === game.battle.attacker)
			target = 1
	} else {
		// Losers in a Battle roll vs 1 if they did not concede (unless they Withdrew)
		if (game.active === game.battle.loser && game.active !== game.battle.conceded)
			if (is_lord_unbesieged(lord))
				target = 1
	}

	let die = roll_die()
	if (die <= target) {
		log(`L${lord} ${FORCE_TYPE_NAME[type]} ${die} <= ${target}`)
		add_lord_routed_forces(lord, type, -1)
		add_lord_forces(lord, type, 1)
	} else {
		log(`L${lord} ${FORCE_TYPE_NAME[type]} ${die} > ${target}`)
		add_lord_routed_forces(lord, type, -1)
		if (type === SERFS)
			game.pieces.smerdi++
	}

	resume_battle_losses()
}

states.battle_losses = {
	prompt() {
		view.prompt = "Losses: Determine the fate of your routed units."
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

states.battle_losses_remove = {
	prompt() {
		view.prompt = "Losses: Remove lords who lost all their forces."
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (is_lord_on_map(lord) && !lord_has_unrouted_units(lord))
				gen_action_lord(lord)
	},
	lord(lord) {
		set_delete(game.battle.retreated, lord)
		disband_lord(lord, true)
		resume_battle_losses_remove()
		lift_sieges()
	},
}

// === ENDING THE BATTLE: SPOILS ===

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
	set_active_victor()
	if (has_any_spoils()) {
		game.state = "battle_spoils"
		game.who = find_lone_friendly_lord_at(game.battle.where)
	} else {
		end_battle_spoils()
	}
}

function end_battle_spoils() {
	game.who = NOBODY
	game.spoils = 0
	goto_battle_service()
}

states.battle_spoils = {
	prompt() {
		if (has_any_spoils()) {
			view.prompt = "Spoils: Divide " + list_spoils() + "."
			let here = game.battle.where
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
				if (get_lord_locale(lord) === here)
					if (lord !== game.who)
						gen_action_lord(lord)
			if (game.who !== NOBODY)
				prompt_spoils()
		} else {
			view.prompt = "Spoils: All done."
			view.actions.end_spoils = 1
		}
	},
	lord(lord) {
		game.who = lord
	},
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

// === ENDING THE BATTLE: SERVICE ===

function goto_battle_service() {
	set_active_loser()
	if (game.battle.retreated)
		resume_battle_service()
	else
		goto_battle_aftermath()
}

function resume_battle_service() {
	if (game.battle.retreated.length > 0)
		game.state = "battle_service"
	else
		goto_battle_aftermath()
}

states.battle_service = {
	prompt() {
		view.prompt = "Battle: Roll to shift service of each retreated lord."
		for (let lord of game.battle.retreated)
			gen_action_service(lord)
	},
	service(lord) {
		let die = roll_die()
		log(`L${lord} rolled ${die}.`)
		if (die <= 2)
			add_lord_service(lord, -1)
		else if (die <= 4)
			add_lord_service(lord, -2)
		else if (die <= 6)
			add_lord_service(lord, -3)
		set_delete(game.battle.retreated, lord)
		set_lord_moved(lord, 1)
		resume_battle_service()
	},
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
		resume_actions()
	} else {
		remove_legate_if_endangered(game.battle.where)
		game.battle = 0
		resume_actions()
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
	prompt() {
		view.prompt = "Hillforts: Skip feeding one unbesieged lord in Livonia."
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (can_lord_use_hillforts(lord))
				gen_action_lord(lord)
	},
	lord(lord) {
		push_undo()
		log(`Hillforts fed L${lord}.`)
		feed_lord_skip(lord)
		if (has_friendly_lord_who_must_feed())
			game.state = "feed"
		else
			end_feed()
	},
}

states.feed = {
	prompt() {
		view.prompt = "Feed: You must Feed lords who Moved or Fought."

		let done = true

		if (is_campaign_phase())
			prompt_held_event_campaign()

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
		end_feed()
	},
	card: action_held_event_campaign,
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

		if (is_campaign_phase())
			prompt_held_event_campaign()

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
	card: action_held_event_campaign,
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
	prompt() {
		for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
			if (is_lord_on_map(lord) && can_pay_lord(lord))
				if (lord !== game.who)
					gen_action_lord(lord)

		if (is_campaign_phase())
			prompt_held_event_campaign()

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
	lord(lord) {
		game.who = lord
	},
	loot(lord) {
		push_undo_without_who()
		if (game.who === lord)
			log(`Paid L${game.who} with Loot.`)
		else
			log(`Paid L${game.who} with Loot from L${lord}.`)
		add_lord_assets(lord, LOOT, -1)
		add_lord_service(game.who, 1)
		resume_pay()
	},
	coin(lord) {
		push_undo_without_who()
		if (game.who === lord)
			log(`Paid L${game.who} with Coin.`)
		else
			log(`Paid L${game.who} with Coin from L${lord}.`)
		add_lord_assets(lord, COIN, -1)
		add_lord_service(game.who, 1)
		resume_pay()
	},
	veche_coin() {
		push_undo_without_who()
		log(`Paid L${game.who} with Coin from Veche.`)
		game.pieces.veche_coin--
		add_lord_service(game.who, 1)
		resume_pay()
	},
	end_pay() {
		push_undo_without_who()
		end_pay()
	},
	card: action_held_event_campaign,
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
		log(`Disbanded L${lord} permanently.`)
		set_lord_locale(lord, NOWHERE)
		set_lord_service(lord, NEVER)
	} else if (get_lord_service(lord) < current_turn()) {
		log(`Disbanded L${lord} beyond service limit.`)
		set_lord_locale(lord, NOWHERE)
		set_lord_service(lord, NEVER)
	} else {
		log(`Disbanded L${lord}.`)
		if (is_levy_phase())
			set_lord_locale(lord, CALENDAR + turn + data.lords[lord].service)
		else
			set_lord_locale(lord, CALENDAR + turn + data.lords[lord].service + 1)
		set_lord_service(lord, NEVER)
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
		this.lord(lord)
	},
	lord(lord) {
		push_undo()
		if (can_ransom_besieged_lord(lord))
			goto_ransom_besieged_lord(lord)
		else
			disband_lord(lord)
	},
	end_disband() {
		end_disband()
	},
}

function end_disband() {
	clear_undo()

	if (check_campaign_victory())
		return

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

// === LEVY & CAMPAIGN: RANSOM BESIEGED LORD WHO DISBANDS (CAPABILITY)

function can_ransom_besieged_lord(lord) {
	if (is_lord_besieged(lord)) {
		if (game.active === TEUTONS && has_global_capability(AOW_RUSSIAN_RANSOM))
			return true
		if (game.active === RUSSIANS && has_global_capability(AOW_TEUTONIC_RANSOM))
			return true
	}
	return false
}

function goto_ransom_besieged_lord(lord) {
	clear_undo()
	set_active_enemy()
	game.state = "ransom_besieged_lord"
	game.count = data.lords[lord].service
	game.who = lord
	log(`Ransom L${lord}`)
}

function end_ransom_besieged_lord() {
	set_active_enemy()
	disband_lord(game.who)
	game.state = "disband"
	game.who = NOBODY
}

states.ransom_besieged_lord = {
	prompt() {
		if (game.count > 0) {
			view.prompt = `Ransom ${lord_name[game.who]}: Add ${game.count} Coin to a friendly Lord.`
			let here = get_lord_locale(game.who)
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
				if (get_lord_locale(lord) === here)
					gen_action_lord(lord)
		} else {
			view.prompt = `Ransom ${lord_name[game.who]}: All done.`
			view.actions.end_ransom = 1
		}
	},
	lord(lord) {
		push_undo()
		logi(`Coin to L${lord}.`)
		add_lord_assets(lord, COIN, 1)
		game.count--
	},
	end_ransom() {
		clear_undo()
		end_ransom_besieged_lord()
	}
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

function goto_growth() {
	game.count = count_enemy_ravaged() >> 1
	if (game.active === TEUTONS)
		log_h3("Teutonic Growth")
	else
		log_h3("Russian Growth")
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
		goto_growth()
	else
		goto_game_end()
}

states.growth = {
	prompt() {
		view.prompt = `Growth: Remove ${game.count} enemy ravaged markers.`
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

	if (game.scenario === "Crusade on Novgorod") {
		if (game.turn === 8 || game.turn === 16) {
			set_active(P1)
			log_h2("Growth")
			goto_growth()
			return
		}
	}

	goto_game_end()
}

function count_vp1() {
	let vp = 0
	for (let loc of game.pieces.castles1)
		vp += 2
	for (let loc of game.pieces.conquered)
		if (is_p2_locale(loc))
			vp += data.locales[loc].vp << 1
	for (let loc of game.pieces.ravaged)
		if (is_p2_locale(loc))
			vp += 1
	return vp
}

function count_vp2() {
	let vp = game.pieces.veche_vp * 2
	for (let loc of game.pieces.castles2)
		vp += 2
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
		if (vp1 > vp2)
			goto_game_over(P1, `${P1} won with ${vp1} VP.`)
		else if (vp2 > vp1)
			goto_game_over(P2, `${P2} won with ${vp2} VP.`)
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
		if (game.active === TEUTONS)
			log_h2("Teutonic Plow, Reap, and Wastage")
		else
			log_h2("Russian Plow, Reap, and Wastage")
		game.state = "plow_and_reap"
	} else {
		if (game.active === TEUTONS)
			log_h2("Teutonic Wastage")
		else
			log_h2("Russian Wastage")
		end_plow_and_reap()
	}
}

function flip_and_discard_half(lord, from_type, to_type) {
	add_lord_assets(lord, to_type, get_lord_assets(lord, from_type))
	set_lord_assets(lord, from_type, 0)
	set_lord_assets(lord, to_type, Math.ceil(get_lord_assets(lord, to_type) / 2))
}

states.plow_and_reap = {
	prompt() {
		let from_type, to_type
		let turn = current_turn()
		if (turn === 2 || turn === 10) {
			view.prompt = "Plow and Reap: Flip Carts to Sleds and discard half."
			from_type = CART
			to_type = SLED
		} else {
			view.prompt = "Plow and Reap: Flip Sleds to Carts and discard half."
			from_type = SLED
			to_type = CART
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
	}
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
	log(`L${lord} discarded ${ASSET_TYPE_NAME[type]}.`)
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
			view.prompt = "Wastage: Discard one asset or capability from each affected Lord."
		}
	},
	card(c) {
		push_undo()
		let lord = find_lord_capability(c)
		log(`L${lord} wasted C${c}.`)
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
	}
}

function end_wastage() {
	if (WASTAGE_DISCARD) {
		push_undo()
		goto_reset()
	} else {
		clear_undo()
		set_active_enemy()
		if (game.active === P2)
			goto_plow_and_reap()
		else
			goto_reset()

	}
}

// === END CAMPAIGN: RESET (DISCARD ARTS OF WAR) ===

function reset_serfs() {
}

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
			log("Discarded held card.")
			set_delete(game.hand1, c)
		} else if (set_has(game.hand2, c)) {
			log("Discarded held card.")
			set_delete(game.hand2, c)
		} else {
			let lord = find_lord_capability(c)
			if (lord !== NOBODY) {
				log(`L${lord} discarded C${c}.`)
				discard_lord_capability(lord, c)
			}
		}
	},
	end_discard() {
		end_reset()
	},
}

function end_reset() {
	if (WASTAGE_DISCARD) {
		clear_undo()
		set_active_enemy()
		if (game.active === P2)
			goto_plow_and_reap()
		else
			goto_advance_campaign()
	} else {
		clear_undo()
		set_active_enemy()
		if (game.active === P2)
			goto_reset()
		else
			goto_advance_campaign()
	}
}

// === END CAMPAIGN: RESET (ADVANCE CAMPAIGN) ===

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

function gen_action_lord_on_calendar(lord) {
	if (lord !== game.who) {
		if (is_lord_on_calendar(lord))
			gen_action_lord(lord)
		else
			gen_action_service(lord)
	}
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

exports.view = function (state, current) {
	load_state(state)

	view = {
		prompt: null,
		actions: null,
		log: game.log,

		turn: game.turn,
		events: game.events,
		capabilities: game.capabilities,
		pieces: game.pieces,
		battle: game.battle,

		command: game.command,
		hand: null,
		plan: null,
	}

	if (current === P1) {
		view.hand = game.hand1
		view.plan = game.plan1
		// view.arts_of_war = game.deck1
	}
	if (current === P2) {
		view.hand = game.hand2
		view.plan = game.plan2
		// view.arts_of_war = game.deck2
	}

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

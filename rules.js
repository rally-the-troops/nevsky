"use strict"

const TEUTONS = "Teutons"
const RUSSIANS = "Russians"

const P1 = TEUTONS
const P2 = RUSSIANS

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
	"Return of the Prince (Nicolle Variant)",
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

function find_lord(name) { return data.lords.findIndex(x => x.name === name) }
function find_locale(name) { return data.locales.findIndex(x => x?.name === name) }

const lord_name = data.lords.map(lord => lord.name)

const lord_count = data.lords.length
const vassal_count = data.vassals.length
const last_vassal = vassal_count - 1
const last_lord = lord_count - 1

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
	SUMMER, SUMMER, EARLY_WINTER, EARLY_WINTER, LATE_WINTER, LATE_WINTER, RASPUTITSA, RASPUTITSA,
	SUMMER, SUMMER, EARLY_WINTER, EARLY_WINTER, LATE_WINTER, LATE_WINTER, RASPUTITSA, RASPUTITSA,
]

const TURN_NAME = [
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
	} else {
		first_friendly_lord = 6
		last_friendly_lord = 11
		first_enemy_lord = 0
		last_enemy_lord = 5
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
		update_active_aliases()
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
	game.lords.service[lord] = service
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

function is_card_in_use(c) {
	if (set_has(game.global_cards, c))
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

function is_lord_at_friendly_locale(lord) {
	let loc = get_lord_locale(lord)
	return is_friendly_locale(loc)
}

function is_friendly_locale(loc) {
	// TODO
	return loc !== NOWHERE && loc < CALENDAR
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
	// TODO: limit to transports usable in current season?
	return get_lord_assets(who, what) < 8
}

function roll_die(reason) {
	let die = random(6) + 1
	log(`Rolled ${die}${reason}.`)
	return die
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
		global_cards: [],

		who: NOBODY,
		where: NOWHERE,
		what: NOTHING,
		levy: 0, // lordship used
		count: 0,
	}

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
	case "Return of the Prince (Nicolle Variant)":
		setup_return_of_the_prince_nicolle()
		break
	case "Crusade on Novgorod":
		setup_crusade_on_novgorod()
		break
	case "Pleskau (Quickstart)":
		setup_quickstart()
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

function setup_quickstart() {
	setup_pleskau()
	// TODO: automated muster
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
		push_state('muster_lord_transport')
		set_lord_moved(lord, 1)
		game.who = lord
		game.count = data.lords[lord].assets.transport
	},
	end_setup() {
		clear_undo()
		end_setup()
	},
}

function end_setup_lords() {
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		set_lord_moved(lord, 0)
	if (game.active === P1) {
		set_active_enemy()
	} else {
		set_active_enemy()
		goto_levy_arts_of_war()
	}
}

// === LEVY: ARTS OF WAR ===

function goto_levy_arts_of_war() {
	log_h1("Levy " + current_turn_name())
	game.state = 'levy_arts_of_war'
	end_levy_arts_of_war()
}

function end_levy_arts_of_war() {
	goto_levy_pay()
}

states.levy_arts_of_war = {
}

// === LEVY: PAY ===

function goto_levy_pay() {
	game.state = 'levy_pay'
	end_levy_pay()
}

function end_levy_pay() {
	goto_levy_disband()
}

states.levy_pay = {
}

// === LEVY: DISBAND ===

function goto_levy_disband() {
	game.state = 'levy_disband'
	end_levy_disband()
}

function end_levy_disband() {
	goto_levy_muster()
}

states.levy_disband = {
}

// === LEVY: MUSTER ===

function goto_levy_muster() {
	game.state = 'levy_muster'
}

function end_levy_muster() {
	for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord)
		set_lord_moved(lord, 0)
	if (game.active === P1) {
		set_active_enemy()
	} else {
		set_active_enemy()
		goto_levy_call_to_arms()
	}
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
		push_state('levy_muster_lord')
		game.who = lord
		game.count = data.lords[lord].lordship
	},
	end_muster() {
		clear_undo()
		end_levy_muster()
	},
}

states.levy_muster_lord = {
	prompt() {
		view.prompt = `Muster ${lord_name[game.who]}.`

		if (game.count > 0) {
			view.prompt += ` ${game.count} lordship left.`

			// Roll to muster Ready Lord at Seat
			for (let lord = first_friendly_lord; lord <= last_friendly_lord; ++lord) {
				if (lord === ALEKSANDR)
					continue
				if (lord === ANDREY && game.who !== ALEKSANDR)
					continue
				if (is_lord_ready(lord))
					// TODO: has available seat
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
		--game.count
		let die = roll_die(` to muster ${lord_name[other]}`)
		// TODO: roll for lord
		if (die <= data.lords[other].fealty) {
			logi(`Success!`)
			push_state('muster_lord_at_seat')
			game.who = other
		} else {
			logi(`Failed.`)
		}
	},

	vassal(vassal) {
		push_undo()
		--game.count
		muster_vassal(game.who, vassal)
	},

	ship() {
		push_undo()
		--game.count
		add_lord_assets(game.who, SHIP, 1)
	},
	boat() {
		push_undo()
		--game.count
		add_lord_assets(game.who, BOAT, 1)
	},
	cart() {
		push_undo()
		--game.count
		add_lord_assets(game.who, CART, 1)
	},
	sled() {
		push_undo()
		--game.count
		add_lord_assets(game.who, SLED, 1)
	},

	capability() {
		push_undo()
		--game.count
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
		logi(`Mustered at %${loc}.`)
		set_lord_moved(game.who, 1)
		muster_lord(game.who, loc)
		game.state = 'muster_lord_transport'
		game.count = data.lords[game.who].assets.transport
	},
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
		add_lord_assets(game.who, SHIP, 1)
		if (--game.count === 0)
			pop_state()
	},
	boat() {
		push_undo()
		add_lord_assets(game.who, BOAT, 1)
		if (--game.count === 0)
			pop_state()
	},
	cart() {
		push_undo()
		add_lord_assets(game.who, CART, 1)
		if (--game.count === 0)
			pop_state()
	},
	sled() {
		push_undo()
		add_lord_assets(game.who, SLED, 1)
		if (--game.count === 0)
			pop_state()
	},
}

states.muster_capability = {
	prompt() {
		view.prompt = `Select a new capability for ${lord_name[game.who]}.`
		for_each_friendly_arts_of_war(c => {
			if (!is_card_in_use(c)) {
				if (!data.cards[c].lords || set_has(data.cards[c].lords, game.who))
					gen_action_arts_of_war(c)
			}
		})
	},
	arts_of_war(c) {
		push_undo()
		if (!data.cards[c].lords) {
			set_add(game.global_cards, c)
		} else {
			if (get_lord_capability(game.who, 0) < 0)
				set_lord_capability(game.who, 0, c)
			else if (get_lord_capability(game.who, 1) < 0)
				set_lord_capability(game.who, 1, c)
			else {
				game.what = c
				game.state = 'muster_capability_discard'
				return
			}
		}
		pop_state()
	},
}

// === LEVY: CALL TO ARMS ===

function goto_levy_call_to_arms() {
	game.state = 'levy_call_to_arms'
	end_levy_call_to_arms()
}

function end_levy_call_to_arms() {
	goto_campaign_plan()
}

states.levy_call_to_arms = {
}

// === CAMPAIGN ===

function goto_campaign_plan() {
	game.state = 'campaign_plan'
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
	log_br()
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

function gen_action_arts_of_war(c) {
	gen_action('arts_of_war', c)
}

exports.view = function(state, current) {
	game = state
	view = {
		log: game.log,
		turn: game.turn,
		lords: game.lords,
		vassals: game.vassals,
		legate: game.legate,
		veche_vp: game.veche_vp,
		veche_coin: game.veche_coin,
		global_cards: game.global_cards,
		conquered: game.conquered,
		ravaged: game.ravaged,
		who: game.who,
		where: game.where,
	}
	if (game.state === 'game_over') {
		view.prompt = game.victory
	} else if (current === 'Observer' || game.active !== current) {
		let inactive = states[game.state].inactive || game.state
		view.prompt = `Waiting for ${game.active} \u2014 ${inactive}...`
	} else {
		view.actions = {}
		if (states[game.state])
			states[game.state].prompt()
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
		S[action](arg)
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

// Sorted array treated as Set (for JSON)
function set_index(set, item) {
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
			return m
	}
	return -1
}

function set_has(set, item) {
	return set_index(set, item) >= 0
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
	set.splice(a, 0, item)
}

function set_delete(set, item) {
	let i = set_index(set, item)
	if (i >= 0)
		set.splice(i, 1)
}

function set_clear(set) {
	set.length = 0
}

function set_toggle(set, item) {
	if (set_has(set, item))
		set_delete(set, item)
	else
		set_add(set, item)
}

function deep_copy(original) {
	if (Array.isArray(original)) {
		let n = original.length
		let copy = new Array(n)
		for (let i = 0; i < n; ++i) {
			let v = original[i]
			if (typeof v === "object" && v !== null)
				copy[i] = deep_copy(v)
			else
				copy[i] = v
		}
		return copy
	} else {
		let copy = {}
		for (let i in original) {
			let v = original[i]
			if (typeof v === "object" && v !== null)
				copy[i] = deep_copy(v)
			else
				copy[i] = v
		}
		return copy
	}
}

function push_undo() {
	let copy = {}
	for (let k in game) {
		let v = game[k]
		if (k === "undo") continue
		else if (k === "log") v = v.length
		else if (typeof v === "object" && v !== null) v = deep_copy(v)
		copy[k] = v
	}
	game.undo.push(copy)
}

function pop_undo() {
	let save_log = game.log
	let save_undo = game.undo
	let state = save_undo.pop()
	save_log.length = state.log
	state.log = save_log
	state.undo = save_undo
	load_state(state)
}

function clear_undo() {
	game.undo.length = 0
}

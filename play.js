"use strict"

const MAP_DPI = 75

const round = Math.round
const floor = Math.floor
const ceil = Math.ceil

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

function pack1_get(word, n) {
	return (word >>> n) & 1
}

function pack4_get(word, n) {
	n = n << 2
	return (word >>> n) & 15
}

function is_lord_action(lord) {
	return !!(view.actions && view.actions.lord && view.actions.lord.includes(lord))
}

function is_plan_action(lord) {
	return !!(view.actions && view.actions.plan && view.actions.plan.includes(lord))
}

function is_service_action(lord) {
	return !!(view.actions && view.actions.service && view.actions.service.includes(lord))
}

function is_vassal_action(vassal) {
	return !!(view.actions && view.actions.vassal && view.actions.vassal.includes(vassal))
}

function is_locale_action(locale) {
	return !!(view.actions && view.actions.locale && view.actions.locale.includes(locale))
}

const force_type_count = 7
const force_type_name = [ "knights", "sergeants", "light_horse", "asiatic_horse", "men_at_arms", "militia", "serfs" ]

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
	for (let loc of view.castles)
		if (is_p2_locale(loc))
			vp += 2
	for (let loc of view.conquered)
		if (is_p2_locale(loc))
			vp += data.locales[loc].vp << 1
	for (let loc of view.ravaged)
		if (is_p2_locale(loc))
			vp += 1
	return vp
}

function count_vp2() {
	let vp = view.veche_vp * 2
	for (let loc of view.castles)
		if (is_p1_locale(loc))
			vp += 2
	for (let loc of view.conquered)
		if (is_p1_locale(loc))
			vp += data.locales[loc].vp << 1
	for (let loc of view.ravaged)
		if (is_p1_locale(loc))
			vp += 1
	return vp
}

function is_card_in_use(c) {
	if (view.global_cards.includes(c))
		return true
	if (view.lords.cards.includes(c))
		return true
	if (c === 18 || c === 19 || c === 20)
		return true
	if (c === 39 || c === 40 || c === 41)
		return true
	return false
}

function for_each_teutonic_arts_of_war(fn) {
	for (let i = 0; i < 21; ++i)
		fn(i)
}

function for_each_russian_arts_of_war(fn) {
	for (let i = 21; i < 42; ++i)
		fn(i)
}

function for_each_friendly_arts_of_war(fn) {
	if (player === "Teutons")
		for_each_teutonic_arts_of_war(fn)
	else
		for_each_russian_arts_of_war(fn)
}

function for_each_enemy_arts_of_war(fn) {
	if (player !== "Teutons")
		for_each_teutonic_arts_of_war(fn)
	else
		for_each_russian_arts_of_war(fn)
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
	[0, 0],
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
	[4470, 2052],
].map(([x,y])=>[x/4|0,y/4|0])

const locale_xy = []

const ui = {
	locale: [],
	locale_extra: [],
	lord_cylinder: [],
	lord_service: [],
	lord_mat: [],
	vassal_service: [],
	forces: [],
	routed: [],
	assets: [],
	c1: [],
	c2: [],
	arts_of_war: [],
	boxes: {},
	veche: document.getElementById("veche"),
	plan_dialog: document.getElementById("plan"),
	plan_list: document.getElementById("plan_list"),
	plan_actions: document.getElementById("plan_actions"),
	plan_list_cards: [],
	plan_action_cards: [],
	arts_of_war_dialog: document.getElementById("arts_of_war"),
	arts_of_war_list: document.getElementById("arts_of_war_list"),
	p1_global: document.getElementById("p1_global"),
	p2_global: document.getElementById("p2_global"),
	command: document.getElementById("command"),
	turn: document.getElementById("turn"),
	vp1: document.getElementById("vp1"),
	vp2: document.getElementById("vp2"),
}

let locale_layout = new Array(data.locales.length).fill(0)
let calendar_layout = new Array(18).fill(0)

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

function on_click_arts_of_war(evt) {
	if (evt.button === 0) {
		let id = evt.target.my_id
		send_action('arts_of_war', id)
	}
}

function on_click_plan(evt) {
	if (evt.button === 0) {
		let id = evt.target.my_id
		send_action('plan', id)
	}
}

function on_focus_cylinder(evt) {
	let id = evt.target.my_id
	document.getElementById("status").textContent = `(${id}) ${data.lords[id].full_name} [${data.lords[id].command}] - ${data.lords[id].title}`
}

function on_click_lord_service_marker(evt) {
	if (evt.button === 0) {
		let id = evt.target.my_id
		send_action('lord_service', id)
	}
}

function on_focus_lord_service_marker(evt) {
	let id = evt.target.my_id
	document.getElementById("status").textContent = `(${id}) ${data.lords[id].full_name} - ${data.lords[id].title}`
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

function on_focus_card_tip(c) {
}

function on_blur_card_tip(c) {
}

function sub_card_name(match, p1) {
	let x = p1 | 0
	let n = data.cards[x].name
	return `<span class="card_tip" onmouseenter="on_focus_card_tip(${x})" onmouseleave="on_blur_card_tip(${x})">${n}</span>`
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

function sub_locale_name(match, p1) {
	let x = p1 | 0
	let n = data.locales[x].name
	return `<span class="locale_tip" onmouseenter="on_focus_locale_tip(${x})" onmouseleave="on_blur_locale_tip(${x})" onclick="on_click_locale_tip(${x})">${n}</span>`
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

	text = text.replace(/#(\d+)/g, sub_card_name)
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

function layout_locale_item(loc, e) {
	let [x, y] = locale_xy[loc]
	x += locale_layout[loc] * (46 + 6)
	e.style.top = (y - 23) + "px"
	e.style.left = (x - 23) + "px"
	locale_layout[loc] ++
}

function layout_calendar_item(loc, e) {
	let [x, y] = calendar_xy[loc]
	y += 66 + calendar_layout[loc] * 42
	x += 24 + calendar_layout[loc] * 6
	e.style.top = (y + 4) + "px"
	e.style.left = (x + 4) + "px"
	calendar_layout[loc] ++
}

function add_force(parent, type) {
	// TODO: reuse pool of elements?
	build_div(parent, "unit " + force_type_name[type], "force", type)
}

function add_asset(parent, type, n) {
	// TODO: reuse pool of elements?
	build_div(parent, "asset " + asset_type_name[type] + " x"+n, "asset", type)
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

function update_assets(parent, assets) {
	parent.replaceChildren()
	for (let i = 0; i < asset_type_count; ++i) {
		let n = pack4_get(assets, i)
		while (n >= 4) {
			add_asset(parent, i, 4)
			n -= 4
		}
		if (asset_type_x3[i]) {
			while (n >= 3) {
				add_asset(parent, i, 3)
				n -= 3
			}
		}
		while (n >= 2) {
			add_asset(parent, i, 2)
			n -= 2
		}
		while (n >= 1) {
			add_asset(parent, i, 1)
			n -= 1
		}
	}
}

function update_vassals(parent, lord_ix) {
	for (let v of data.lords[lord_ix].vassals) {
		let e = ui.vassal_service[v]
		if (view.vassals[v] === 0) {
			e.classList.remove("hide")
			parent.appendChild(e)
		} else {
			e.classList.add("hide")
		}
		e.classList.toggle("action", is_vassal_action(v))
	}
}

function update_lord_mat(ix) {
	update_assets(ui.assets[ix], view.lords.assets[ix])
	update_vassals(ui.assets[ix], ix)
	update_forces(ui.forces[ix], view.lords.forces[ix])
	update_forces(ui.routed[ix], view.lords.routed_forces[ix])
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
		layout_locale_item(locale, ui.lord_cylinder[ix])
		layout_calendar_item(service, ui.lord_service[ix])
		ui.lord_cylinder[ix].classList.remove("hide")
		ui.lord_service[ix].classList.remove("hide")
		ui.lord_mat[ix].classList.remove("hide")
		update_lord_mat(ix)
	} else {
		layout_calendar_item(locale - 100, ui.lord_cylinder[ix])
		ui.lord_cylinder[ix].classList.remove("hide")
		ui.lord_service[ix].classList.add("hide")
		ui.lord_mat[ix].classList.add("hide")
	}
	ui.lord_cylinder[ix].classList.toggle("action", is_lord_action(ix))
	ui.lord_service[ix].classList.toggle("action", is_service_action(ix))

	ui.lord_cylinder[ix].classList.toggle("selected", ix === view.who)
	ui.lord_mat[ix].classList.toggle("selected", ix === view.who)
}

function update_veche() {
	ui.veche.replaceChildren()

	let n = view.veche_coin
	while (n >= 3) {
		add_asset(ui.veche, COIN, 3)
		n -= 3
	}
	while (n >= 2) {
		add_asset(ui.veche, COIN, 2)
		n -= 2
	}
	while (n >= 1) {
		add_asset(ui.veche, COIN, 1)
		n -= 1
	}

	for (let i = 0; i < view.veche_vp; ++i)
		add_veche_vp(ui.veche)
}

function update_locale(loc) {
	ui.locale[loc].classList.toggle("action", is_locale_action(loc))
	if (ui.locale_extra[loc])
		ui.locale_extra[loc].classList.toggle("action", is_locale_action(loc))
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

function update_arts_of_war() {
	if (view.actions && view.actions.arts_of_war) {
		ui.arts_of_war_dialog.classList.remove("hide")
		ui.arts_of_war_list.replaceChildren()
		for_each_friendly_arts_of_war(c => {
			if (!is_card_in_use(c)) {
				let elt = ui.arts_of_war[c]
				ui.arts_of_war_list.appendChild(elt)
				elt.classList.toggle("action", view.actions.arts_of_war.includes(c))
				elt.classList.toggle("disabled", !view.actions.arts_of_war.includes(c))
			}
		})
	} else {
		ui.arts_of_war_dialog.classList.add("hide")
		for (let c = 0; c < 42; ++c) {
			let elt = ui.arts_of_war[c]
			elt.classList.remove("action")
			elt.classList.remove("disabled")
		}
	}

	ui.p1_global.replaceChildren()
	for_each_teutonic_arts_of_war(c => {
		if (view.global_cards.includes(c))
			ui.p1_global.appendChild(ui.arts_of_war[c])
	})

	ui.p2_global.replaceChildren()
	for_each_russian_arts_of_war(c => {
		if (view.global_cards.includes(c))
			ui.p2_global.appendChild(ui.arts_of_war[c])
	})

	for (let ix = 0; ix < data.lords.length; ++ix) {
		let side = ix < 6 ? "teutonic" : "russian"
		let c = view.lords.cards[(ix << 1) + 0]
		if (c < 0)
			ui.c1[ix].classList = `c1 card ${side} hide`
		else
			ui.c1[ix].classList = `c1 card ${side} aow_${c}`
		c = view.lords.cards[(ix << 1) + 1]
		if (c < 0)
			ui.c2[ix].classList = `c2 card ${side} hide`
		else
			ui.c2[ix].classList = `c2 card ${side} aow_${c}`
	}
}

function on_update() {
	restart_cache()

	locale_layout.fill(0)
	calendar_layout.fill(0)

	for (let ix = 0; ix < data.lords.length; ++ix) {
		if (view.lords[ix] === null) {
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

	update_veche()

	if ((view.turn & 1) === 0) {
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
	update_arts_of_war()

	action_button("ship", "Ship")
	action_button("boat", "Boat")
	action_button("cart", "Cart")
	action_button("sled", "Sled")

	action_button("capability", "Capability")

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

function build_div(parent, className, dataname, datavalue, onclick) {
	let e = document.createElement("div")
	e.className = className
	if (dataname)
		e.dataset[dataname] = datavalue
	if (onclick)
		e.addEventListener("mousedown", onclick)
	parent.appendChild(e)
	return e
}

function build_lord_mat(lord, ix, side, name) {
	let parent = document.getElementById(side === 'teutonic' ? "p1_court" : "p2_court")
	let mat = build_div(parent, `mat ${side} ${name} hide`)
	let bg = build_div(mat, "background")
	ui.forces[ix] = build_div(bg, "forces", "lord", ix)
	ui.routed[ix] = build_div(bg, "routed", "lord", ix)
	ui.assets[ix] = build_div(bg, "assets", "lord", ix)
	ui.c1[ix] = build_div(mat, `c1 card ${side} hide`, "lord", ix)
	ui.c2[ix] = build_div(mat, `c2 card ${side} hide`, "lord", ix)
	ui.lord_mat[ix] = mat
}

function build_arts_of_war(side, c) {
	let card = ui.arts_of_war[c] = document.createElement("div")
	card.className = `card ${side} aow_${c}`
	card.my_id = c
	card.addEventListener("mousedown", on_click_arts_of_war)
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
		e.addEventListener("mouseleave", on_blur)
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
		build_arts_of_war("teutonic", c)
	for (let c = 21; c < 42; ++c)
		build_arts_of_war("russian", c)
}

build_map()
// drag_element_with_mouse("#battle", "#battle_header")
drag_element_with_mouse("#arts_of_war", "#arts_of_war_header")
drag_element_with_mouse("#plan", "#plan_header")
scroll_with_middle_mouse("main")

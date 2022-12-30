"use strict"

const A1 = 0, A2 = 1, A3 = 2
const D1 = 3, D2 = 4, D3 = 5

const NAMES = [
	"A1", "A2", "A3",
	"D1", "D2", "D3",
]

const OPPOSE = [
	D1, D2, D3,
	A1, A2, A3,
]

const strike_steps = [
	[ D1, D2, D3 ],
	[ A1, A2, A3 ],
]

const receive_steps = [
	[ A1, A2, A3 ],
	[ D1, D2, D3 ],
]

function pack_group2(grp) {
	let p = 0
	for (let i of grp)
		p |= (1 << i)
	return p
}

function pack_group1(grp) {
	return grp.sort((a,b)=>(a-b))
}

let pack_group = pack_group2

function show_group(p) {
	let grp = []
	for (let i = 0; i < 6; ++i)
		if ((p >> i) & 1 === 1)
			grp.push(NAMES[i])
	return grp.join("+")
}

// who can strike who theoretically (both left and right)
// used to detect who is flanking who
function list_flanking_groups(array) {
	function oppose_then_near_then_far(result, o, a, b) {
		if (array[o]) return result.push(o)
		if (array[a]) return result.push(a)
		if (array[b]) return result.push(b)
	}
	function oppose_then_left_and_right(result, o, a, b) {
		if (array[o]) return result.push(o)
		if (array[a]) result.push(a)
		if (array[b]) result.push(b)
	}
	function oppose_or_flanking(result, pos) {
		switch (pos) {
		case A1: return oppose_then_near_then_far(result, D1, D2, D3)
		case A2: return oppose_then_left_and_right(result, D2, D1, D3)
		case A3: return oppose_then_near_then_far(result, D3, D2, D1)
		case D1: return oppose_then_near_then_far(result, A1, A2, A3)
		case D2: return oppose_then_left_and_right(result, A2, A1, A3)
		case D3: return oppose_then_near_then_far(result, A3, A2, A1)
		}
	}
	let groups = [ [], [], [], [], [], [] ]
	for (let pos = 0; pos < 6; ++pos)
		if (array[pos])
			oppose_or_flanking(groups[pos], pos)
	return groups
}

// who can strike who (having chosen left or right)
// used to create the actual strike groups
function list_strike_groups(array, striking, choice) {
	function target_oppose_then_near_then_far(o, a, b) {
		if (array[o]) return o
		if (array[a]) return a
		if (array[b]) return b
		return -1
	}
	function target_oppose_then_left_or_right(o, a, b) {
		if (choice === 0) {
			if (array[o]) return o
			if (array[a]) return a
			if (array[b]) return b
		} else {
			if (array[o]) return o
			if (array[b]) return b
			if (array[a]) return a
		}
		return -1
	}
	function target_oppose_or_flanking(pos) {
		switch (pos) {
		case A1: return target_oppose_then_near_then_far(D1, D2, D3)
		case A2: return target_oppose_then_left_or_right(D2, D1, D3)
		case A3: return target_oppose_then_near_then_far(D3, D2, D1)
		case D1: return target_oppose_then_near_then_far(A1, A2, A3)
		case D2: return target_oppose_then_left_or_right(A2, A1, A3)
		case D3: return target_oppose_then_near_then_far(A3, A2, A1)
		}
		return -1
	}
	let groups = [ [], [], [], [], [], [] ]
	for (let pos of striking) {
		if (array[pos]) {
			let tgt = target_oppose_or_flanking(pos)
			if (tgt >= 0)
				groups[tgt].push(pos)
		}
	}
	return groups
}


function show_array(array) {
	for (let row = 0; row < 6; row += 3) {
		let s = []
		for (let col = 0; col < 3; ++col) {
			if (array[row+col])
				s.push(NAMES[row+col].padEnd(3, ' '))
			else
				s.push("-- ")
		}
		console.log(s.join(" "))
	}
	console.log("")
}

function print_strikes(grp) {
	for (let i = 0; i < 6; ++i) {
		if (grp[i].length > 0) {
			console.log(NAMES[i] + ":", show_group(grp[i]))
		}
	}
	console.log("")
}

function list_hit_groups_OLD(array, flanking, strikers, step) {
	function is_flanking_target(target, pos) {
		return array[OPPOSE[pos]] === 0 && flanking[pos].includes(OPPOSE[target])
	}
	function is_flanking_striker(list) {
		for (let pos of list)
			if (array[OPPOSE[pos]] === 0)
				return true
		return false
	}
	function list_flanking_2(target, list1, list2) {
		let result = [ target ]
		function list_flanking_3(list) {
			for (let pos of list)
				if (array[pos] && is_flanking_target(target, pos))
					result.push(pos)
		}
		list_flanking_3(list1)
		list_flanking_3(list2)
		return result
	}
	function list_flanking_1(target) {
		switch (target) {
		case A1: return list_flanking_2(target, [ A2, A3 ], [])
		case A3: return list_flanking_2(target, [ A2, A1 ], [])
		case D1: return list_flanking_2(target, [ D2, D3 ], [])
		case D3: return list_flanking_2(target, [ D2, D1 ], [])
		case A2: return list_flanking_2(target, [ A1 ], [ A3 ])
		case D2: return list_flanking_2(target, [ D1 ], [ D3 ])
		}
	}

	let result = []
	let sg, hg
	for (let pos of step) {
		if (strikers[pos].length > 0) {
			sg = pack_group(strikers[pos])
			if (is_flanking_striker(strikers[pos]))
				hg = pack_group([pos])
			else
				hg = pack_group(list_flanking_1(pos))
			result.push([sg,hg])
		}
	}
	return result
}

function list_hit_groups_INF(array, flanking, strikers, step) {
	function is_flanking_all_strikers(def, strikers) {
		for (let str of strikers)
			if (!flanking[def].includes(str))
				return false
		return true
	}
	function list_flanking_2(target, strikers, list) {
		let result = [ target ]
		for (let pos of list) {
			if (array[pos]) {
				if (is_flanking_all_strikers(pos, strikers))
					result.push(pos)
			}
		}
		return result
	}
	function list_flanking_1(target, strikers) {
		switch (target) {
		case A1: return list_flanking_2(target, strikers, [ A2, A3 ])
		case A2: return list_flanking_2(target, strikers, [ A1, A3 ])
		case A3: return list_flanking_2(target, strikers, [ A1, A2 ])
		case D1: return list_flanking_2(target, strikers, [ D2, D3 ])
		case D2: return list_flanking_2(target, strikers, [ D1, D3 ])
		case D3: return list_flanking_2(target, strikers, [ D1, D2 ])
		}
	}

	let result = []
	let sg, hg
	for (let pos of step) {
		if (strikers[pos].length > 0) {
			sg = pack_group(strikers[pos])
			hg = pack_group(list_flanking_1(pos, strikers[pos]))
			result.push([sg,hg])
		}
	}
	return result
}

function list_hit_groups(array, flanking, strikers, step) {
	function is_target_flanked(target) {
		for (let pos of flanking[target])
			if (pos !== OPPOSE[target])
				return true
		return false
	}
	function is_flanking_all_strikers(def, strikers) {
		for (let str of strikers)
			if (!flanking[def].includes(str))
				return false
		return true
	}
	function list_flanking_2(target, strikers, list) {
		let result = [ target ]
		if (!is_target_flanked(target))
			for (let pos of list) {
				if (array[pos]) {
					if (is_flanking_all_strikers(pos, strikers))
						result.push(pos)
				}
			}
		return result
	}
	function list_flanking_1(target, strikers) {
		switch (target) {
		case A1: return list_flanking_2(target, strikers, [ A2, A3 ])
		case A2: return list_flanking_2(target, strikers, [ A1, A3 ])
		case A3: return list_flanking_2(target, strikers, [ A1, A2 ])
		case D1: return list_flanking_2(target, strikers, [ D2, D3 ])
		case D2: return list_flanking_2(target, strikers, [ D1, D3 ])
		case D3: return list_flanking_2(target, strikers, [ D1, D2 ])
		}
	}

	let result = []
	let sg, hg
	for (let pos of step) {
		if (strikers[pos].length > 0) {
			sg = pack_group(strikers[pos])
			hg = pack_group(list_flanking_1(pos, strikers[pos]))
			result.push([sg,hg])
		}
	}
	return result
}

function show_group_list(list) {
	for (let [sg, hg] of list) {
		console.log(show_group(sg) + " strike " + show_group(hg))
	}
}

function run_step(bits, array, i, output_a, output_b, do_show) {
	let a, b, strikers, flanking

	flanking = list_flanking_groups(array)

	strikers = list_strike_groups(array, strike_steps[i], 0)
	a = list_hit_groups(array, flanking, strikers, receive_steps[i])

	strikers = list_strike_groups(array, strike_steps[i], 1)
	b = list_hit_groups(array, flanking, strikers, receive_steps[i])

	output_a[bits] = a.length > 0 ? a : 0
	if (do_show) {
		show_group_list(a)
	}

	if (JSON.stringify(a) !== JSON.stringify(b)) {
		output_b[bits] = b.length > 0 ? b : 0
		if (do_show) {
			console.log("-OR-")
			show_group_list(b)
		}
	} else {
		output_b[bits] = 0
	}

	console.log()
}

let group_defending_a = []
let group_defending_b = []
let group_attacking_a = []
let group_attacking_b = []

function run(bits, array, step) {
	console.log("<tr>")
	console.log("<td>")
	show_array(array)

	console.log("<td>")
	run_step(bits, array, 0, group_defending_a, group_defending_b, true)
	console.log("<td>")
	run_step(bits, array, 1, group_attacking_a, group_attacking_b, true)
}

function runall() {
	for (let x = 0; x < 64; ++x) {
		//if ((x & 7) && (x & 56)) run(x, [ (x>>5)&1, (x>>4)&1, (x>>3)&1, (x>>2)&1, (x>>1)&1, (x>>0)&1 ])
		run(x, [ (x>>0)&1, (x>>1)&1, (x>>2)&1, (x>>3)&1, (x>>4)&1, (x>>5)&1 ])
	}
}

//run(0, [1,0,1, 0,1,0])
//run(0, [0,1,1, 1,0,0])
//run(0, [1,0,0, 0,1,1])
//run(0, [1,1,0, 1,0,1])

console.log("<!DOCTYPE html>")
console.log("<style>td{white-space:pre;font-family:monospace;padding:3em;border:1px solid black}</style>")
console.log("<table>")
runall()
console.log("</table>")

let GROUPS = [
	[ group_defending_a, group_defending_b ],
	[ group_attacking_a, group_attacking_b ],
]
console.log("const GROUPS = " + JSON.stringify(GROUPS))

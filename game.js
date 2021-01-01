"use strict";
//NOTE: code based on Aemoeba Aescape, which used boilerplate from the TCHOW 2016 New Year's card "pins & noodles".

let ctx = null;

const TILE_SIZE = 9;

const TILES_IMG = new Image();
TILES_IMG.onload = function(){
	console.log("tiles loaded.");
};
TILES_IMG.src = "tiles.png";

/*
const AUDIO = {
	click:"click.wav",
	move:"grund.wav",
	winLevel:"fin.wav",
	winGame:"end.wav"
};
(function loadAudio(){
	for (let n in AUDIO) {
		let a = new Audio();
		a.src = AUDIO[n];
		AUDIO[n] = a;
		a.oneshot = function() {
			this.pause();
			this.currentTime = 0;
			this.play();
		};
	}
})();
*/

//n.b. coordinates are in 0,0-is-upper-left system:
const SPRITES = {
	activePlayer:{x:63, y:0, w:9, h:9, ax:0, ay:0},
	arrowSR1:{x:54, y:18, w:18, h:9, ax:0, ay:0},
	arrowR1:{x:72, y:0, w:18, h:9, ax:0, ay:0},
	arrowR2:{x:90, y:0, w:27, h:9, ax:0, ay:0},
	arrowR1U1:{x:72, y:9, w:18, h:18, ax:0, ay:9},
	arrowR1U2:{x:72, y:27, w:18, h:27, ax:0, ay:18},
	arrowR1D1:{x:72, y:54, w:18, h:18, ax:0, ay:0},
	arrowR1D2:{x:72, y:72, w:18, h:27, ax:0, ay:0},
	arrowR2U1:{x:90, y:9, w:27, h:18, ax:0, ay:9},
	arrowR2D1:{x:90, y:27, w:27, h:18, ax:0, ay:0},
	step:{x:117, y:26, w:25, h:9, ax:0, ay:0},
	next:{x:117, y:36, w:25, h:9, ax:0, ay:0},
	undo:{x:117, y:46, w:25, h:9, ax:0, ay:0},
	reset:{x:117, y:56, w:25, h:9, ax:0, ay:0},
	disable:{x:117, y:66, w:25, h:9, ax:0, ay:0},
	highlight:{x:116, y:75, w:27, h:11, ax:1, ay:1},
	help:{x:119, y:100, w:155, h:8, ax:78, ay:8},
	message:{x:119, y:112, w:91, h:5, ax:45, ay:5},
	win:{x:117, y:129, w:159, h:70, ax:79, ay:36},
/*
	title:{x:1, y:1, width:120, height:90},
	end:{x:74, y:94, width:120, height:90},
*/
};

//n.b. coordinates are in 0,0-is-upper-left system:
const TILES = {
	//block edges indexed by filled quadrant:
	//1 2
	//4 8
	blockRed:[], blockGreen:[], blockBlue:[], blockShine:[],
	platform:{x:0, y:54},
	background:{x:9, y:54},
	//player animations:
	playerGreenStand:[{x:0, y:0}],
	playerGreenWalkRight:[{x:9, y:0}, {x:9, y:9}],
	playerGreenJumpRight:[{x:18, y:0}],
	playerGreenLandRight:[{x:18, y:9}],
	playerGreenShoveRight:[{x:27, y:0}],

	playerPurpleStand:[{x:0, y:18}],
	playerPurpleWalkRight:[{x:9, y:18}, {x:9, y:27}],
	playerPurpleJumpRight:[{x:18, y:18}],
	playerPurpleLandRight:[{x:18, y:27}],
	playerPurpleShoveRight:[{x:27, y:18}],

	playerOrangeStand:[{x:0, y:36}],
	playerOrangeWalkRight:[{x:9, y:36}, {x:9, y:45}],
	playerOrangeJumpRight:[{x:18, y:36}],
	playerOrangeLandRight:[{x:18, y:45}],
	playerOrangeShoveRight:[{x:27, y:36}],

	playerGreenTarget:{x:54, y:27},
	playerPurpleTarget:{x:54, y:36},
	playerOrangeTarget:{x:54, y:45},
	playerGreenRTarget:{x:63, y:27},
	playerPurpleRTarget:{x:63, y:36},
	playerOrangeRTarget:{x:63, y:45},
	playerGreenLTarget:{x:63, y:27, flipX:true},
	playerPurpleLTarget:{x:63, y:36, flipX:true},
	playerOrangeLTarget:{x:63, y:45, flipX:true},
	dedBg:{x:18,y:54},
	dedFg:{x:18,y:63},
	/*
	//wall sides/tops indexed by adjacent walls:
	//.2.
	//4 1
	//.8.
	wallSides:[],
	*/
	/*
	//border fade-out:
	border:{E:null, NE:null, N:null, NW:null, W:null, SW:null, S:null, SE:null},
	//exit arrows:
	exit:{E:null, N:null, W:null, S:null},
	//doors:
	doorUp:null, doorDown:null,
	//buttons:
	buttonUp:null,buttonDown:null,
	//logic stuff:
	logicOutOff:{E:null, N:null, W:null, S:null},
	logicOutOn:{E:null, N:null, W:null, S:null},
	person:{x:50, y:10},
	poison:{x:50, y:30},
	*/
};

for (let name in TILES) {
	if (name.match(/Right$/)) {
		let newName = name.replace(/Right$/, "Left");
		if (!(newName in TILES)) {
			TILES[newName] = [];
			for (let frame of TILES[name]) {
				let newFrame = {
					x:frame.x, y:frame.y
				};
				if (!frame.flipX) newFrame.flipX = true;
				TILES[newName].push(newFrame);
			}
		}
	}
}

(function fill_TILES() {
	const blockMap = [
		0,0,0,1,1,0,0,0,
		1,0,0,1,1,1,1,1,
		1,0,0,1,1,1,1,1,
		0,1,1,1,1,1,1,0,
		0,1,1,1,1,1,1,0,
		0,0,0,0,0,1,1,0,
		0,0,0,0,0,1,1,0,
		0,0,0,1,1,0,0,0
	];
	for (let nxy of [{n:'Red', x:4, y:139}, {n:'Green', x:4, y:94}, {n:"Blue", x:58, y:103}, {n:"Shine", x:58, y:139}]) {
		const block = TILES["block" + nxy.n];
		for (let i = 0; i < 16; ++i) {
			block.push(null);
		}
		for (let y = 0; y < 4; ++y) {
			for (let x = 0; x < 4; ++x) {
				let bits = 0;
				if (blockMap[2*x  +(2*y  )*8]) bits |= 1;
				if (blockMap[2*x+1+(2*y  )*8]) bits |= 2;
				if (blockMap[2*x  +(2*y+1)*8]) bits |= 4;
				if (blockMap[2*x+1+(2*y+1)*8]) bits |= 8;
				console.assert(block[bits] === null, "No duplicate tiles.");
				block[bits] = {x:nxy.x + TILE_SIZE*x, y: nxy.y + TILE_SIZE*y};
			}
		}
	}
})();


//'o' => start
//'*' => destination
//' ' => must be empty (or other player)
//'.' => anything
//'#' => must be block/wall
const MOVES = [
	{
		sprite:SPRITES.arrowR1,
		anim:["WalkRight", 1],
		pattern:[
			"o*",
			".#"
		],
	},
	{
		sprite:SPRITES.arrowR2,
		anim:["JumpRight", 0.8, "LandRight", 0.2],
		pattern:[
			"o *",
			". #"
		],
	},
	{
		sprite:SPRITES.arrowR2,
		anim:["WalkRight", 1, "WalkRight", 1],
		pattern:[
			"o *",
			"..#"
		],
	},
	{
		sprite:SPRITES.arrowR1U1,
		//anim:["JumpRight", 0.45, "LandRight", 0.05],
		anim:["JumpRight", 0.5],
		pattern:[
			" *",
			"o#"
		],
	},
	{
		sprite:SPRITES.arrowR1U2,
		//anim:["JumpRight", 0.9, "LandRight", 0.1],
		anim:["JumpRight", 1.0],
		pattern:[
			" *",
			" #",
			"o."
		],
	},
	{
		sprite:SPRITES.arrowR1D1,
		anim:["JumpRight", 0.4, "LandRight", 0.1],
		pattern:[
			"o ",
			".*",
			".#"
		],
	},
	{
		sprite:SPRITES.arrowR1D2,
		anim:["JumpRight", 0.6, "LandRight", 0.1],
		pattern:[
			"o ",
			". ",
			".*",
			".#"
		],
	},
	{
		sprite:SPRITES.arrowR2U1,
		anim:["JumpRight", 1],
		pattern:[
			"  *",
			"o #"
		],
	},
	{
		sprite:SPRITES.arrowR2D1,
		anim:["JumpRight", 0.8, "LandRight", 0.2],
		pattern:[
			"o  ",
			". *",
			"..#"
		],
	},
	{
		sprite:SPRITES.arrowSR1,
		anim:["ShoveRight", 0.5],
		pattern:[
			"o>",
			"x."
		],
	}
];

(function fill_MOVES() {
	let count = MOVES.length;
	for (let i = 0; i < count; ++i) {
		let source = MOVES[i];
		let mirrored = {};
		if ('anim' in MOVES[i]) {
			mirrored.anim = MOVES[i].anim.slice();
			for (let i = 0; i < mirrored.anim.length; i += 2) {
				mirrored.anim[i] = mirrored.anim[i]
					.replace("Right", "Xeft")
					.replace("Left", "Right")
					.replace("Xeft", "Left");
			}
		}
		mirrored.sprite = {
			x:source.sprite.x, y:source.sprite.y, w:source.sprite.w, h:source.sprite.h,
			ax:source.sprite.ax+9, ay:source.sprite.ay, flipX:true
		};
		mirrored.pattern = [];
		for (let row of MOVES[i].pattern) {
			let rev = "";
			for (let ci = 0; ci < row.length; ++ci) {
				let c = row[ci];
				if (c === '>') c = '<';
				else if (c === '<') c = '>';
				rev = c + rev;
			}
			mirrored.pattern.push(rev);
		}
		MOVES.push(mirrored);
	}

	//convert moves from strings to little check functions:
	for (let i = 0; i < MOVES.length; ++i) {
		const sprite = MOVES[i].sprite;
		const pattern = MOVES[i].pattern;
		const anim = MOVES[i].anim;
		let start = null;
		let finish = null;
		let empty = [];
		let solid = [];
		let shoveA = null;
		let shoveB = null;
		let shoveDelta = 0;

		for (let y = 0; y < pattern.length; ++y) {
			for (let x = 0; x < pattern[y].length; ++x) {
				const c = pattern[y][x];
				if (c === '.') {
					//don't-care
				} else if (c === ' ') {
					empty.push({x:x, y:y});
				} else if (c === '>') {
					console.assert(shoveA === null && shoveDelta === 0);
					shoveA = {x:x, y:y};
					shoveDelta = 1;
				} else if (c === '<') {
					console.assert(shoveA === null && shoveDelta === 0);
					shoveA = {x:x, y:y};
					shoveDelta = -1;
				} else if (c === 'x') {
					console.assert(shoveB === null);
					shoveB = {x:x, y:y};
				} else if (c === '#') {
					solid.push({x:x, y:y});
				} else if (c === 'o') {
					console.assert(start === null);
					start = {x:x, y:y};
				} else if (c === '*') {
					console.assert(finish === null);
					finish = {x:x, y:y};
					empty.push({x:x, y:y});
				} else {
					console.assert(false);
				}
			}
		}
		for (let c of empty) {
			c.x -= start.x;
			c.y -= start.y;
		}
		for (let c of solid) {
			c.x -= start.x;
			c.y -= start.y;
		}
		console.assert((shoveA !== null) === (shoveB !== null));
		if (shoveA) {
			console.assert(finish === null);
			finish = shoveA;
		}
		MOVES[i] = {
			dx:finish.x-start.x,
			dy:finish.y-start.y,
			empty:empty,
			solid:solid,
			pattern:pattern,
			sprite:sprite,
		};
		if (typeof(anim) !== 'undefined') {
			MOVES[i].anim = anim;
		}
		if (shoveA !== null) {
			MOVES[i].shoveA = {x:shoveA.x-start.x, y:shoveA.y-start.y};
			MOVES[i].shoveB = {x:shoveB.x-start.x, y:shoveB.y-start.y};
			MOVES[i].shoveDelta = shoveDelta;
		}
	}
})();

let mouse = { x:NaN, y:NaN };

let board = {
	size:{x:5, y:5},
	//list of numbers for wall sprite types (0 == empty):
	walls:[
		0,0,0,0,0,
		1,0,0,1,1,
		0,0,1,0,0,
		0,0,0,0,0,
		1,1,1,1,1
	],
	//TODO: background?
	//list of all blocks (pushables):
	blocks:[
		{
			x:0, y:0,
			color:"Red",
			size:{x:1,y:1},
			filled:[
				1,
			]
		}
	],
	//list of all players (pushers):
	players:[
		{
			color:"Green",
			x:0, y:0
		}
	]
};
let activePlayer = -1;

//list of {advance:(elapsed) => returns unused time, compute:() => board to draw} functions
let pendingAnim = [];

let picture = null;
let isEnd = false;
let isTitle = false;

let undoStack = [];
let recordedMoves = [];

function makeBoard(map,layers,library) {
	let size = {x:map[0].length, y:map.length};
	let walls = [];
	let blocks = [];
	let players = [];

	let marked = []; //used when reading out blocks

	for (let i = 0; i < size.x * size.y; ++i) {
		walls.push(0);
		marked.push(0);
	}

	const blockColors = {
		g:"Green",
		G:"Green",
		r:"Red",
		R:"Red",
		b:"Blue",
		B:"Blue",
	};

	for (let y = 0; y < size.y; ++y) {
		for (let x = 0; x < size.x; ++x) {
			let c = map[y][x];
			if (c === ' ') /* nothing */;
			else if (c === '#') walls[size.x*y+x] = 1;
			else if (c in blockColors) {
				if (marked[size.x*y+x] !== 0) continue; //already marked
				const mark = blocks.length + 1;

				marked[size.x*y+x] = mark;
				let toExpand = [{x:x, y:y}];
				for (let i = 0; i < toExpand.length; ++i) {
					let at = toExpand[i];
					console.assert(marked[size.x*at.y+at.x] === mark);
					for (let n of [{x:at.x-1,y:at.y},{x:at.x+1,y:at.y},{x:at.x,y:at.y-1},{x:at.x,y:at.y+1}]) {
						if (n.x < 0 || n.x >= size.x || n.y < 0 || n.y >= size.y) continue;
						if (map[n.y][n.x] === c) {
							if (marked[size.x*n.y+n.x] === 0) {
								marked[size.x*n.y+n.x] = mark;
								toExpand.push(n);
							} else {
								console.assert(marked[size.x*n.y+n.x] === mark);
							}
						}
					}
				}
				//TODO: actually read back block position, size, filled.
				let min = {x:x, y:y};
				let max = {x:x, y:y};
				for (let pos of toExpand) {
					min.x = Math.min(min.x, pos.x);
					min.y = Math.min(min.y, pos.y);
					max.x = Math.max(max.x, pos.x);
					max.y = Math.max(max.y, pos.y);
				}
				let block = {
					color:blockColors[c],
					x:min.x, y:min.y,
					size:{x:max.x+1-min.x, y:max.y+1-min.y},
					filled:[]
				};
				for (let my = min.y; my <= max.y; ++my) {
					for (let mx = min.x; mx <= max.x; ++mx) {
						block.filled.push(marked[my*size.x+mx] === mark);
					}
				}
				blocks.push(block);
			} else if (c === '1') {
				players.push({
					color:"Green",
					x:x, y:y
				});
			} else if (c === '2') {
				players.push({
					color:"Purple",
					x:x, y:y
				});
			} else if (c === '3') {
				players.push({
					color:"Orange",
					x:x, y:y
				});
			} else {
				console.log("What is '" + c + "'?");
			}
		}
	}
	return {
		size:size,
		walls:walls,
		blocks:blocks,
		players:players
	};
}


function cloneBoard(b) {
	function cloneObjArray(arr) {
		let ret = [];
		arr.forEach(function(obj){
			let clone = {};
			for (var name in obj) {
				clone[name] = obj[name];
			}
			ret.push(clone);
		});
		return ret;
	}
	return {
		size:{x:b.size.x, y:b.size.y},
		walls:b.walls.slice(),
		blocks:cloneObjArray(b.blocks),
		players:cloneObjArray(b.players)
	};
}

function undo() {
	//AUDIO.click.oneshot();
	if (board) {
		if (undoStack.length) {
			board = undoStack.pop();
			pendingAnim = [];
		} else {
			for (let player of board.players) {
				delete player.moveIndex;
			}
			pendingAnim = [];
		}
	}
}

function reset() {
	//AUDIO.click.oneshot();
	if (isEnd) {
		setLevel(0);
	}
	if (board) {
		if (undoStack.length) {
			undoStack.push(board);
			board = cloneBoard(undoStack[0]);
			for (let player of board.players) {
				delete player.moveIndex;
			}
			pendingAnim = [];
		}
	}
	recordedMoves = [];
}

const LEVELS = [
	/*
	{title:"fall test",
	board:[
		"   1    ",
		"  ggg   ",
		"  #  g2 ",
		"########"
	]},
	*/
	/*
	{title:"friction test",
	board:[
		"        ",
		"   gg2  ",
		"  1rrg  ",
		"########"
	]},
	{title:"friction test",
	board:[
		"             ",
		"   ggg    2r ",
		"  rr rr2  gr ",
		"1gg   gg  rr ",
		"#############"
	]},
	{title:"friction tests",
	board:[
		"                        ",
		"        2g    ggg    2r ",
		"  1rr   rr   rr rr2  gr ",
		" 1gg  2ggg 1gg   gg  rr ",
		"########################"
	]},*/
	{title:"title",
	//play:[[11,8,1],[4,2,0],[8,8,10],[17,15,9],[11,9,8],[10,9,0],[0,17,8]],
	play:[[13,9,2],[5,3,0],[9,9,12],[19,17,10],[13,10,9],[12,10,0],[0,19,9]],
	isTitle:true,
	board:[
		"                ",
		"  ggg           ",
		"  r  rg   rr    ",
		"  rr1rg    r2r# ",
		"   bbbb  bbbbr  ",
		"     g      gr  ",
		"3    g      gg  ",
		"################"
	]},
	{title:"you can push blocks",
	board:[
		"        ",
		" 1 r  r ",
		"########"
	]},
	{title:"blocks fall",
	board:[
		"        ",
		" 1 r rr ",
		"#### ###",
		"#### ###"
	]},
	{title:"corner trick",
	board:[
		"         ",
		"    1    ",
		"    r    ",
		"    ##   ",
		"  r   r  ",
		"#########"
	]},
	{title:"some sort of hill",
	board:[
		"        ",
		"     r  ",
		"   gg#  ",
		" 1 r  g ",
		"########"
	]},
	{title:"multiplayer trick",
	board:[
		"         ",
		"         ",
		"  2 # 1  ",
		"  r r r  ",
		"#########"
	]},
	{title:"slippery trick",
	board:[
		"#          ",
		"#    ###   ",
		"##   rrr 1 ",
		"#    #  ###",
		"#     g   r",
		"#######g  #"
	]},
	{title:"acceleration trick",
	board:[
		"            ",
		"     rr     ",
		"  gg  ##    ",
		" ##         ",
		"            ",
		"##1 2     r ",
		" #####   ## ",
		"# # ##   ## ",
		" # # #   ## ",
		"# # ##g  ## ",
	]},
	{title:"you might get squished",
	board:[
		"         ",
		"       R ",
		" 3gg1  # ",
		" # rr2G  ",
		" ####### "
	]},
	{title:"stairway",
	board:[
		"  3         1   ",
		"  r  r   b  b   ",
		" rr rr  bb bb###",
		"######  #####  #",
		"     #  #     b#",
		"              ##",
		"                ",
		"                ",
		"                ",
		"      2         ",
		"################",
	]},
	{title:"stack thinking",
	board:[
		"     ",
		"   b ",
		"  rg ",
		"1gbr ",
		"#####"
	]},
	{title:"tchow",
	board:[
		"                ",
		"                ",
		"  1  r          ",
		" ggg r 2      # ",
		"   bbbbgrr   r  ",
		"   r g g r g r  ",
		" 3 rrg bbbbggr  ",
		"################"
	]},
	{title:"title-yourself",
	board:[
		"                ",
		"  ggg           ",
		"  r  rg   rr    ",
		"  rr1rg    r2r# ",
		"   bbbb  bbbbr  ",
		"     g      gr  ",
		"3    g      gg  ",
		"################"
	]},
	{title:"win",
		picture:SPRITES.win
	},
/*
	{title:"test chains / stacks",
	board:[
		"    1   ",
		"    r   ",
		"   gg#  ",
		" 1gr    ",
		"########"
	]},
	{title:"also shove test",
	board:[
		" rrrrr  ",
		" g3   2 ",
		"  rr1###",
		"  g # G ",
		" ########"
	]},
	{title:"shove test",
	board:[
		"        ",
		" 3gg1  #",
		" # rr2G ",
		" ########"
	]},
	{title:"test",
	board:[
		"  G  3",
		"  ## #",
		"1  G  ",
		"# #G2 ",
		"######"
	]},
	{title:"player test",
	board:[
		"     3",
		"   # #",
		"1     ",
		"# # 2 ",
		"######"
	]},
	{title:"first test",
	board:[
		"      ",
		"    G ",
		"1 gg##",
		"# #   ",
		"######"
	]},
*/
	//{picture:SPRITES.end,isEnd:true
	//},
];


let maxSize = {x:1, y:1};

LEVELS.forEach(function(level){
	if (level.picture) return;
	//console.log(level.title);
	level.board = makeBoard(level.board);
	maxSize.x = Math.max(maxSize.x, level.board.size.x);
	maxSize.y = Math.max(maxSize.y, level.board.size.y);
});

console.log("Largest level takes up " + maxSize.x * TILE_SIZE + " x " + maxSize.y * TILE_SIZE + " pixels.");

function setBoard(newBoard) {
	board = cloneBoard(newBoard);
	activePlayer = -1;
	undoStack = [];
	pendingAnim = [];
	recordedMoves = [];
}

let maxLevel = 0;
let currentLevel;

function setLevel(idx) {
	if (currentLevel !== idx) {
		if (history && history.replaceState) history.replaceState({},"","?" + idx);
	}
	currentLevel = idx;
	maxLevel = Math.max(maxLevel, currentLevel);
	pendingAnim = [];
	if (LEVELS[currentLevel].picture) {
		picture = LEVELS[currentLevel].picture;
		board = null;
		isEnd = (LEVELS[currentLevel].isEnd ? true : false);
		isTitle = false;
	} else {
		picture = null;
		setBoard(LEVELS[currentLevel].board);
		if ('play' in LEVELS[currentLevel]) {
			for (let moves of LEVELS[currentLevel].play) {
				for (let p = 0; p < board.players.length; ++p) {
					if (moves[p] !== -1) {
						board.players[p].moveIndex = moves[p];
					}
				}
				const anim = [];
				const after = tryMoves(board, anim);
				if (after) {
					pendingAnim.push(...anim);
					board = after;
				}
			}
		}
		isTitle = (LEVELS[currentLevel].isTitle ? true : false);
		isEnd = false;
	}
}

if (document.location.search.match(/^\?\d+/)) {
	setLevel(parseInt(document.location.search.substr(1)));
} else {
	setLevel(0);
}

function next() {
	if (isWon()) {
		setLevel(currentLevel + 1);
		/*
		if (currentLevel + 1 === LEVELS.length) {
			AUDIO.winGame.oneshot();
		} else {
			AUDIO.click.oneshot();
		}
		*/
	}
}

let drawOffset = {x:0, y:0};

function drawSprite(x,y,sprite) {
	ctx.save();
	if (sprite.flipX) {
		ctx.setTransform(-1,0, 0,1, sprite.w+x-(sprite.w-sprite.ax)+drawOffset.x,y-sprite.ay+drawOffset.y);
	} else {
		ctx.setTransform(1,0, 0,1, x-sprite.ax+drawOffset.x,y-sprite.ay+drawOffset.y);
	}
	ctx.drawImage(TILES_IMG, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, sprite.w, sprite.h);
	ctx.restore();
}

function drawTile(x,y,tile) {
	ctx.save();
	if (tile.flipX) {
		ctx.setTransform(-1,0, 0,1, x+TILE_SIZE+drawOffset.x, y+drawOffset.y);
	} else {
		ctx.setTransform(1,0, 0,1, x+drawOffset.x, y+drawOffset.y);
	}
	ctx.drawImage(TILES_IMG, tile.x,tile.y, TILE_SIZE,TILE_SIZE, 0, 0,TILE_SIZE,TILE_SIZE);
	ctx.restore();
}

function drawBoard(board, isAnim) {

	ctx.setTransform(1,0, 0,1, board.offset.x,board.offset.y);

	//draw background / walls:
	for (let y = 0; y < board.size.y; ++y) {
		for (let x = 0; x < board.size.x; ++x) {
			if (board.walls[y*board.size.x+x]) {
				drawTile(x*TILE_SIZE, y*TILE_SIZE, TILES.platform);
			} else {
				drawTile(x*TILE_SIZE, y*TILE_SIZE, TILES.background);
			}
		}
	}

	//draw players / bg splats:
	for (let player of board.players) {
		if (player.ded) {
			drawTile(player.x*TILE_SIZE, player.y*TILE_SIZE, TILES.dedBg);
		}
	}



	//draw players:
	for (let player of board.players) {
		if (player.ded) continue;
		if ('frame' in player) {
			drawTile(player.x*TILE_SIZE, player.y*TILE_SIZE, TILES["player" + player.color + player.frame][player.frameIndex]);
		} else {
			drawTile(player.x*TILE_SIZE, player.y*TILE_SIZE, TILES["player" + player.color + "Stand"][0]);
		}
	}

	//draw blocks:
	//NOTE: uses corner tiles, thus the odd offsets
	for (let block of board.blocks) {
		function filled(x,y) {
			if (x < 0 || x >= block.size.x || y < 0 || y >= block.size.y) return false;
			return block.filled[y*block.size.x+x];
		}
		let T = TILES["block" + block.color];
		let rx = Math.round(block.x * TILE_SIZE);
		let ry = Math.round(block.y * TILE_SIZE);
		for (let by = -1; by < block.size.y; ++by) {
			for (let bx = -1; bx < block.size.x; ++bx) {
				let bits = 0;
				if (filled(bx,by)) bits |= 1;
				if (filled(bx+1,by)) bits |= 2;
				if (filled(bx,by+1)) bits |= 4;
				if (filled(bx+1,by+1)) bits |= 8;
				drawTile(rx+bx*TILE_SIZE + 4, ry+by*TILE_SIZE + 4, T[bits]);
			}
		}
		if (block.shine) {
			ctx.globalAlpha = block.shine;
			let S = TILES.blockShine;
			for (let by = -1; by < block.size.y; ++by) {
				for (let bx = -1; bx < block.size.x; ++bx) {
					let bits = 0;
					if (filled(bx,by)) bits |= 1;
					if (filled(bx+1,by)) bits |= 2;
					if (filled(bx,by+1)) bits |= 4;
					if (filled(bx+1,by+1)) bits |= 8;
					drawTile(rx+bx*TILE_SIZE + 4, ry+by*TILE_SIZE + 4, S[bits]);
				}
			}
			ctx.globalAlpha = 1.0;
		}
	}

	//draw players / fg splats:
	for (let player of board.players) {
		if (player.ded && 'splatX' in player) {
			let x = player.splatX;
			let y = player.splatY;
			if ('splatRel' in player) {
				x += board.blocks[player.splatRel].x;
				y += board.blocks[player.splatRel].y;
			}
			drawTile(x*TILE_SIZE, y*TILE_SIZE, TILES.dedFg);
		}
	}

	/*//draw border:
	drawTile(TILE_SIZE*0, TILE_SIZE*0, TILES.border.SW);
	drawTile(TILE_SIZE*0, TILE_SIZE*(board.size.y-1), TILES.border.NW);
	drawTile(TILE_SIZE*(board.size.x-1), TILE_SIZE*0, TILES.border.SE);
	drawTile(TILE_SIZE*(board.size.x-1), TILE_SIZE*(board.size.y-1), TILES.border.NE);
	for (let y = 1; y + 1 < board.size.y; ++y) {
		drawTile(TILE_SIZE*0, TILE_SIZE*y, TILES.border.W);
		drawTile(TILE_SIZE*(board.size.x-1), TILE_SIZE*y, TILES.border.E);
	}
	for (let x = 1; x + 1 < board.size.x; ++x) {
		drawTile(TILE_SIZE*x, TILE_SIZE*0, TILES.border.S);
		drawTile(TILE_SIZE*x, TILE_SIZE*(board.size.y-1), TILES.border.N);
	}
	*/

	if (!isAnim) {
		//draw move arrows:
		for (let i = 0; i < board.players.length; ++i) {
			const player = board.players[i];
			//TODO: tints for mouse and such

			//no move:
			if (!('moveIndex' in player)) continue;

			let move = MOVES[player.moveIndex];

			if (move.shoveA) {
				//drawTile(TILE_SIZE*player.x, TILE_SIZE*player.y, TILES["player" + player.color + (move.dx > 0 ? "R" : "L") + "Target"]);
			} else {
				drawTile(TILE_SIZE*(player.x+move.dx), TILE_SIZE*(player.y+move.dy), TILES["player" + player.color + "Target"]);
			}

			if (move.sprite) {
				drawSprite(TILE_SIZE*player.x, TILE_SIZE*player.y, move.sprite);
			}
		}

		if (activePlayer >= 0 && activePlayer < board.players.length) {
			const player = board.players[activePlayer];
			drawSprite(TILE_SIZE*player.x, TILE_SIZE*player.y, SPRITES.activePlayer);
		}
	}

	/*(function DEBUG_draw_support(){
		if (isAnim) return;
		let {
			ids,
			gaps,
			contacts,
			forces
		} = computeSupport(board, false);

		for (let y = board.size.y-1; y >= 1; --y) {
			for (let x = 0; x < board.size.x; ++x) {
				let a = ids[y * board.size.x + x];
				let b = ids[(y+1) * board.size.x + x];
				if (a !== -1 && b !== -1 && a !== b && a < board.blocks.length) {
					let force = forces[a];
					ctx.beginPath();
					ctx.moveTo(TILE_SIZE*(x+0.0), TILE_SIZE*(y+1));
					ctx.lineTo(TILE_SIZE*(x+0.5), TILE_SIZE*(y+1+ 0.5*force));
					ctx.lineTo(TILE_SIZE*(x+1.0), TILE_SIZE*(y+1));
					ctx.lineWidth = 1.0;
					ctx.strokeStyle = '#f00';
					ctx.globalAlpha = 1.0;
					ctx.stroke();
				}
			}
		}
	})();*/

	//preview move:
	if (!isAnim && ('tx' in mouse) && mouse.tx >= 0 && mouse.tx < board.size.x && mouse.ty >= 0 && mouse.ty < board.size.y) {
		if (activePlayer >= 0 && activePlayer < board.players.length) {
			const player = board.players[activePlayer];
			let {index, valid} = getCloseMove(player, {x:mouse.tx, y:mouse.ty});
			if (index !== null) {
				if (!valid) ctx.globalAlpha = 0.5;
				drawSprite(TILE_SIZE*player.x, TILE_SIZE*player.y, MOVES[index].sprite);
				ctx.globalAlpha = 1.0;
			}
		}
	}
}

function draw() {
	ctx.setTransform(1,0, 0,1, 0,0);
	ctx.globalAlpha = 1.0;

	ctx.fillStyle = '#000';
	ctx.fillRect(0,0, ctx.width,ctx.height);

	if (board) {
		drawOffset = board.offset = {
			x:Math.floor((ctx.width - board.size.x*TILE_SIZE)/2),
			y:Math.floor((ctx.height - board.size.y*TILE_SIZE)/2)
		};

		if (mouse.x === mouse.x) {
			mouse.tx = Math.floor((mouse.x - board.offset.x) / TILE_SIZE);
			mouse.ty = Math.floor((mouse.y - board.offset.y) / TILE_SIZE);
		}
	} else {
		drawOffset = {
			x:Math.floor(ctx.width/2),
			y:Math.floor(ctx.height/2)
		};
	}

	delete SPRITES.reset.at;
	delete SPRITES.undo.at;
	delete SPRITES.step.at;
	delete SPRITES.next.at;

	if (picture) {
		drawSprite(0,0, picture);
	} else if (isTitle) {
		if (pendingAnim.length) {
			const anim = pendingAnim[0].compute();
			anim.offset = board.offset;
			drawBoard(anim, true);
		} else {
			drawBoard(board, true);
		}
		drawSprite(Math.round(0.5 * TILE_SIZE * board.size.x), -2, SPRITES.message);

		SPRITES.next.at = {x:board.offset.x + Math.round(0.5 * TILE_SIZE * board.size.x - 0.5 * SPRITES.next.w), y:board.offset.y + TILE_SIZE * board.size.y + 2};

		drawSprite(SPRITES.next.at.x-board.offset.x, SPRITES.next.at.y-board.offset.y, SPRITES.next);
		if (mouse.overNext) {
			drawSprite(SPRITES.next.at.x-board.offset.x, SPRITES.next.at.y-board.offset.y, SPRITES.highlight);
		}
	} else {
		if (pendingAnim.length) {
			const anim = pendingAnim[0].compute();
			anim.offset = board.offset;
			drawBoard(anim, true);
		} else {
			drawBoard(board, false);
		}
		drawSprite(Math.round(0.5 * TILE_SIZE * board.size.x), -2, SPRITES.help);

		SPRITES.reset.at = {x:board.offset.x + Math.round(0.5 * TILE_SIZE * board.size.x - 0.5 * 105), y:board.offset.y + TILE_SIZE * board.size.y + 2};
		SPRITES.undo.at = {x:SPRITES.reset.at.x + 27, y:SPRITES.reset.at.y};
		SPRITES.step.at = {x:SPRITES.undo.at.x + 27, y:SPRITES.undo.at.y};
		SPRITES.next.at = {x:SPRITES.step.at.x + 27, y:SPRITES.step.at.y};

		drawSprite(SPRITES.reset.at.x-board.offset.x, SPRITES.reset.at.y-board.offset.y, SPRITES.reset);
		if (mouse.overReset) {
			drawSprite(SPRITES.reset.at.x-board.offset.x, SPRITES.reset.at.y-board.offset.y, SPRITES.highlight);
		}
		drawSprite(SPRITES.undo.at.x-board.offset.x, SPRITES.undo.at.y-board.offset.y, SPRITES.undo);
		if (mouse.overUndo) {
			drawSprite(SPRITES.undo.at.x-board.offset.x, SPRITES.undo.at.y-board.offset.y, SPRITES.highlight);
		}
		drawSprite(SPRITES.step.at.x-board.offset.x, SPRITES.step.at.y-board.offset.y, SPRITES.step);
		if (mouse.overStep) {
			drawSprite(SPRITES.step.at.x-board.offset.x, SPRITES.step.at.y-board.offset.y, SPRITES.highlight);
		}
		drawSprite(SPRITES.next.at.x-board.offset.x, SPRITES.next.at.y-board.offset.y, SPRITES.next);
		if (!isWon()) {
			drawSprite(SPRITES.next.at.x-board.offset.x, SPRITES.next.at.y-board.offset.y, SPRITES.disable);
			delete SPRITES.next.at;
		} else if (mouse.overNext) {
			drawSprite(SPRITES.next.at.x-board.offset.x, SPRITES.next.at.y-board.offset.y, SPRITES.highlight);
		}


	} //end if(picture) else

	/*
	let resetX = isEnd ? Math.floor((ctx.width - SPRITES.reset.width) / 2) : 1;

	ctx.setTransform(1,0, 0,1, 0,0);

	ctx.fillStyle = '#444';
	if (mouse.overReset) {
		ctx.fillRect(resetX,1,SPRITES.reset.width, SPRITES.reset.height);
	}
	if (mouse.overUndo && board) {
		ctx.fillRect(ctx.width-1-SPRITES.undo.width,1,SPRITES.undo.width, SPRITES.undo.height);
	}
	*/

	/*
	if (isWon()) {
		let y = (picture ? 1 : 10);
		if (mouse.overNext) {
			ctx.fillRect(Math.floor((ctx.width-SPRITES.next.width)/2), y, SPRITES.next.width, SPRITES.next.height);
		}
		drawSprite(Math.floor((ctx.width-SPRITES.next.width)/2), y, SPRITES.next);
	}
	*/

	/*if (board || isEnd) {
		drawSprite(resetX,1, SPRITES.reset);
	}*/

	/*
	if (board) {
		drawSprite(ctx.width-1-SPRITES.undo.width,1, SPRITES.undo);
	}
	*/

	//draw mouse:
	if (mouse.x === mouse.x) {
		ctx.setTransform(1,0, 0,1, 0,0);
		ctx.fillStyle = "#fff";
		ctx.fillRect(mouse.x - 1, mouse.y, 3, 1);
		ctx.fillRect(mouse.x, mouse.y - 1, 1, 3);
		ctx.fillStyle = "#000";
		ctx.fillRect(mouse.x, mouse.y, 1, 1);
	}

	/*
	//mouse location:
	ctx.beginPath();
	ctx.moveTo(mouse.x-0.3, mouse.y-0.3);
	ctx.lineTo(mouse.x+0.3, mouse.y+0.3);
	ctx.moveTo(mouse.x-0.3, mouse.y+0.3);
	ctx.lineTo(mouse.x+0.3, mouse.y-0.3);
	ctx.strokeStyle = '#fff';
	ctx.lineWidth = px;
	ctx.stroke();
	*/

}

function update(elapsed) {
	//NOTE: should probably compute whether drawing is needed to save cpu.
	let remain = elapsed;
	while (remain > 0.0 && pendingAnim.length) {
		remain = pendingAnim[0].advance(remain);
		if (remain > 0.0) {
			pendingAnim.shift();
		}
	}
}

function makeTween(from_, to_, time, playerAnims_) {
	const from = cloneBoard(from_);
	const to = cloneBoard(to_);
	console.assert(from.players.length === to.players.length);
	console.assert(from.blocks.length === to.blocks.length);

	if (typeof(playerAnims_) === 'undefined') {
		playerAnims_ = [];
		for (let i = 0; i < from.players.length; ++i) playerAnims_.push(null);
	}
	const playerAnims = playerAnims_.slice();
	console.assert(playerAnims.length === from.players.length);
	console.assert(Array.isArray(playerAnims));
	for (let anim of playerAnims) {
		if (anim !== null) {
			console.assert(Array.isArray(anim));
			console.assert(anim.length % 2 === 0);
		}
	}

	let current = 0.0;
	return {
		advance:(elapsed) => {
			let next = current + elapsed;
			if (next >= time) {
				current = time;
				return next - time;
			} else {
				current = next;
				return 0.0;
			}
		},
		compute:() => {
			const amt = current / time;
			const ret = cloneBoard(from);

			function tweenTo(a,b,amt) {
				let dx = b.x - a.x;
				let dy = b.y - a.y;
				if (dx === 0 && dy === 0) return;

				if (Math.abs(dx) >= Math.abs(dy)) {
					let rx = Math.round(amt * dx * TILE_SIZE) / TILE_SIZE;
					let ramt = Math.max(0, Math.min(1, rx / dx));
					let ry = Math.round(ramt * dy * TILE_SIZE) / TILE_SIZE;
					a.x += rx;
					a.y += ry;
				} else {
					let ry = Math.round(amt * dy * TILE_SIZE) / TILE_SIZE;
					let ramt = Math.max(0, Math.min(1, ry / dy));
					let rx = Math.round(ramt * dx * TILE_SIZE) / TILE_SIZE;
					a.x += rx;
					a.y += ry;
				}
			}

			for (let p = 0; p < ret.players.length; ++p) {
				tweenTo(ret.players[p], to.players[p], amt);
				/*
				ret.players[p].x += amt * (to.players[p].x - ret.players[p].x);
				ret.players[p].y += amt * (to.players[p].y - ret.players[p].y);
				*/
				const anim = playerAnims[p];
				if (anim !== null) {
					console.assert(anim.length % 2 === 0);
					let total = 0;
					for (let i = 0; i + 1 < anim.length; i += 2) {
						total += anim[i+1];
					}
					let frame = amt * total;
					for (let i = 0; i + 1 < anim.length; i += 2) {
						frame -= anim[i+1];
						if (frame <= 0 || i + 2 >= anim.length) {
							ret.players[p].frame = anim[i];
							ret.players[p].frameIndex = 0;
							const a = TILES["player" + ret.players[p].color + anim[i]];
							if (typeof(a) === 'undefined') {
								console.log("Missing '" + "player" + ret.players[p].color + anim[i] + "'");
							} else {
								ret.players[p].frameIndex = Math.min(
									Math.floor((frame + anim[i+1]) / anim[i+1] * a.length),
									a.length-1);
							}
							break;
						}
					}
				} else {
					delete ret.players[p].frame;
				}
			}

			for (let b = 0; b < ret.blocks.length; ++b) {
				ret.blocks[b].x += amt * (to.blocks[b].x - ret.blocks[b].x);
				ret.blocks[b].y += amt * (to.blocks[b].y - ret.blocks[b].y);
			}
			return ret;
		}
	};
}

function makeShine(from_, matched_, time) {
	const from = cloneBoard(from_);
	const matched = matched_.slice();
	let current = 0.0;
	return {
		advance:(elapsed) => {
			let next = current + elapsed;
			if (next >= time) {
				current = time;
				return next - time;
			} else {
				current = next;
				return 0.0;
			}
		},
		compute:() => {
			const amt = current / time;
			const ret = cloneBoard(from);

			for (let b = 0; b < ret.blocks.length; ++b) {
				if (matched[b]) {
					ret.blocks[b].shine = amt;
				}
			}
			return ret;
		}
	};
}

function tryCollapse(board, animAcc) {
	const after = cloneBoard(board);

	const blocks = after.blocks;

	let ids = [];
	for (let w of board.walls) {
		ids.push((w ? blocks.length : -1));
	}
	for (let blockIndex = 0; blockIndex < blocks.length; ++blockIndex) {
		const block = blocks[blockIndex];
		for (let by = 0; by < block.size.y; ++by) {
			for (let bx = 0; bx < block.size.x; ++bx) {
				if (block.filled[by * block.size.x + bx]) {
					console.assert(ids[(block.y+by)*board.size.x+(block.x+bx)] === -1);
					ids[(block.y+by)*board.size.x+(block.x+bx)] = blockIndex;
				}
			}
		}
	}
	function get(x,y) {
		if (x < 0 || x >= board.size.x || y < 0 || y >= board.size.y) return VARIABLES-1;
		return ids[y*board.size.x+x];
	}

	const VARIABLES = blocks.length + 1;
	//heldBy[a][b] indicates whether a is held up (transitively) by b:
	let heldBy = [];
	function addOn(rel, a,b) {
		console.assert(!rel[a][b]);
		rel[a][b] = true;
		for (let k = 0; k < VARIABLES; ++k) {
			if (rel[k][a] && !rel[k][b]) addOn(rel, k,b);
			if (rel[b][k] && !rel[a][k]) addOn(rel, a,k);
		}
	}
	for (let a = 0; a < VARIABLES; ++a) {
		heldBy.push([]);
		for (let b = 0; b < VARIABLES; ++b) {
			heldBy[heldBy.length-1].push(false);
		}
	}
	for (let y = -1; y <= board.size.y; ++y) {
		for (let x = 0; x <= board.size.x; ++x) {
			let above = get(x, y);
			let below = get(x, y+1);
			if (above !== -1 && below !== -1 && above !== below) {
				if (!heldBy[above][below]) addOn(heldBy, above, below);
			}
		}
	}

	let didFall = [];
	for (let a = 0; a < blocks.length; ++a) {
		if (!heldBy[a][VARIABLES-1]) {
			didFall.push(a);
			blocks[a].y += 1;
		}
	}

	if (didFall.length) {
		for (let player of after.players) {
			if (player.ded) continue;
			if (didFall.indexOf(get(player.x, player.y+1)) !== -1) {
				player.y += 1;
			}
		}
		markDead(after);
		if (animAcc) {
			animAcc.push(makeTween(board, after, 0.2));
		}
		return tryCollapse(after, animAcc);
	}

	let matched = [];
	for (let b = 0; b < after.blocks.length; ++b) {
		matched.push(false);
	}
	for (let y = 0; y < after.size.y; ++y) {
		for (let x = 0; x < after.size.x; ++x) {
			let a = get(x,y);
			let r = get(x+1,y);
			let d = get(x,y+1);
			if (a !== r && 0 <= a && a < after.blocks.length && 0 <= r && r < after.blocks.length) {
				if (after.blocks[a].color === after.blocks[r].color) {
					matched[a] = true;
					matched[r] = true;
				}
			}
			if (a !== d && 0 <= a && a < after.blocks.length && 0 <= d && d < after.blocks.length) {
				if (after.blocks[a].color === after.blocks[d].color) {
					matched[a] = true;
					matched[d] = true;
				}
			}
		}
	}

	let newIndex = [];
	let newBlocks = [];
	for (let b = 0; b < after.blocks.length; ++b) {
		if (matched[b]) {
			newIndex.push(-1);
		} else {
			newIndex.push(newBlocks.length);
			newBlocks.push(after.blocks[b]);
		}
	}

	if (newBlocks.length === after.blocks.length) return after; //bail out if nothing matched

	if (animAcc) {
		animAcc.push(makeShine(board, matched, 0.25));
	}

	//remove matched blocks:
	after.blocks = newBlocks;

	let beforeFall = cloneBoard(after); //for animation

	let playerAnims = [];
	let maxFall = 0;
	for (let player of after.players) {
		playerAnims.push(null);
		//re-index relative splats of players!
		if ('splatRel' in player) {
			player.splatRel = newIndex[player.splatRel];
			if (player.splatRel === -1) {
				delete player.splatRel;
				delete player.splatX;
				delete player.splatY;
			}
		}
		//players fall until on a non-removed block:
		if (!player.ded) {
			let fall = 0;
			let on = get(player.x, player.y+1);
			while (on === -1 || (on >= 0 && on < matched.length && matched[on])) {
			//while (on >= 0 && on < matched.length && matched[on]) {
				player.y += 1;
				fall += 1;
				on = get(player.x, player.y+1);
				maxFall = Math.max(maxFall, fall);
			}
			if (fall > 2) {
				console.log("TODO: fall splat?");
			}
			if (fall > 0) {
				playerAnims[playerAnims.length-1] = ["JumpRight", 0.2 * fall];
			}
		}
	}

	if (maxFall > 0 && animAcc) {
		animAcc.push(makeTween(beforeFall, after, 0.2 * maxFall, playerAnims));
	}

	return tryCollapse(after, animAcc); //any further falling?
}


//Solve a system of linear equations:
// equations are row = 0
// rows are {var:coef, var2:coef2, ...} with "1" being the name of constant-1 value.

function solveEquations(equations, do_DEBUG) {
	let vars = {};
	for (let row of equations) {
		for (let name in row) {
			if (name != "1") vars[name] = true;
		}
	}
	vars = Object.keys(vars).sort();
	vars.push("1");
	//console.log(vars.join(" "));

	let matrix = [];
	for (let equation of equations) {
		let row = [];
		for (let name of vars) {
			if (name in equation) row.push(equation[name]);
			else row.push(0);
		}
		console.assert(row.length === vars.length);
		matrix.push(row);
	}

	function prettyPrint() {
		let colWidths = [];
		for (let name of vars) {
			colWidths.push(name.length);
		}
		for (let row of matrix) {
			for (let c = 0; c < row.length; ++c) {
				colWidths[c] = Math.max(colWidths[c], row[c].toString().length);
			}
		}
		let str = "";
		for (let c = 0; c < vars.length; ++c) {
			str += vars[c].padStart(colWidths[c]+1);
		}
		str += "\n"
		for (let row of matrix) {
			for (let c = 0; c < row.length; ++c) {
				str += row[c].toString().padStart(colWidths[c]+1);
			}
			str += "\n"
		}
		return str;
	}

	if (do_DEBUG) console.log(prettyPrint());

	let targetRow = 0;
	for (let targetColumn = 0; targetColumn < vars.length-1; ++targetColumn) {

		//move row with largest leading coef to target row position:
		let selectedRow = targetRow;
		for (let r = targetRow + 1; r < matrix.length; ++r) {
			if (Math.abs(matrix[r][targetColumn]) > Math.abs(matrix[selectedRow][targetColumn])) {
				selectedRow = r;
			}
		}
		if (matrix[selectedRow][targetColumn] === 0) continue; //empty column

		//move selected row to target row:
		if (selectedRow != targetRow) {
			const temp = matrix[targetRow];
			matrix[targetRow] = matrix[selectedRow];
			matrix[selectedRow] = temp;
		}

		{ //normalize target row:
			const factor = 1 / matrix[targetRow][targetColumn];
			matrix[targetRow][targetColumn] = 1.0;
			for (let c = targetColumn + 1; c < vars.length; ++c) {
				matrix[targetRow][c] *= factor;
			}
		}

		//clear other rows:
		for (let r = 0; r < matrix.length; ++r) {
			if (r == targetRow) continue;
			const factor = matrix[r][targetColumn];
			if (factor === 0) continue;
			matrix[r][targetColumn] = 0.0;
			for (let c = targetColumn + 1; c < vars.length; ++c) {
				matrix[r][c] -= factor * matrix[targetRow][c];
			}
		}

		targetRow += 1;
	}
	if (do_DEBUG) console.log(prettyPrint());

	let result = {};
	for (let r = 0; r < matrix.length; ++r) {
		for (let c = 0; c < vars.length; ++c) {
			if (matrix[r][c] !== 0) {
				if (c + 1 === vars.length) {
					//1 == 0 situation
					return null;
				}
				console.assert(!(vars[c] in result));
				console.assert(matrix[r][c] === 1);
				result[vars[c]] = -matrix[r][vars.length-1];
				break;
			}
		}
	}
	for (let name of vars) {
		if (!(name in result)) result[name] = 0;
	}
	return result;
}

//Incomplete, as of yet:
//solves linear program with equality constraints on rows subject to all variables >= 0:
// if no objective is given, minimizes sum of variables
// constraints rows are objects which map variable names to coefs
// object maps variable names to terms
function solveLP(constraints, objective) {
	if (typeof(objective) == 'undefined') {
		objective = {};
		for (let row of constraints) {
			for (let name in row) {
				objective[name] = 1;
			}
		}
	}
	let vars = {};
	for (let row of constraints) {
		for (let name in row) {
			if (name != "1") vars[name] = true;
		}
	}
	/*
	for (let ri = 0; ri < constraints.length; ++ri) {
		console.assert(!(("_s" + ri) in vars), "the _s*, _P, and _rhs variable names are reserved");
	}
	*/
	console.assert(!("_P" in vars), "the _s*, _P, and _rhs variable names are reserved");
	console.assert(!("_rhs" in vars), "the _s*, _P, and _rhs variable names are reserved");

	vars = Object.keys(vars).sort();
	/*
	for (let ri = 0; ri < constraints.length; ++ri) {
		vars.push("_s" + ri);
	}
	*/
	vars.push("_P");
	console.log(vars.join(" "));

	{ //DEBUG:
		let str = "Minimizing ";
		//objective:
		let first = true;
		for (let name of Object.keys(objective).sort()) {
			if (first) first = false;
			else str += " + ";
			str += objective[name].toString() + name;
		}
		str += "\nSubject to:";
		for (let row of constraints) {
			str += "\n  0 = ";
			let first = true;
			for (let name of Object.keys(row).sort()) {
				if (first) first = false;
				else str += " + ";
				str += row[name] + name;
			}
		}
		str += "\n (and all variables >= 0)";
		console.log(str);
	}

	//As per:
	//https://people.richland.edu/james/ictcm/2006/simplex.html

	let tableau = [];
	for (let ri = 0; ri < constraints.length; ++ri) {
		const row = constraints[ri];
		let eqn = [];
		for (let name of vars) {
			if (name in row) eqn.push(row[name]);
			//else if (name === "_s" + ri) eqn.push(1);
			else eqn.push(0);
		}
		//right-hand-side column:
		if ("1" in row) eqn.push(-row["1"]);
		else eqn.push(0);
		tableau.push(eqn);
	}
	{ //last row is objective row:
		let eqn = [];
		for (let name of vars) {
			if (name in objective) eqn.push(-objective[name]);
			else if (name === "_P") eqn.push(1);
			else eqn.push(0);
		}
		eqn.push(0); //rhs
		tableau.push(eqn);
	}

	function prettyPrint() {
		let colWidths = [];
		for (let name of vars) {
			colWidths.push(name.length);
		}
		colWidths.push(1);
		colWidths.push(1);
		for (let row of tableau) {
			for (let c = 0; c < row.length; ++c) {
				colWidths[c] = Math.max(colWidths[c], row[c].toString().length);
			}
		}
		let str = "";
		for (let c = 0; c < vars.length; ++c) {
			str += vars[c].padStart(colWidths[c]+1);
		}
		str += "\n"
		for (let row of tableau) {
			for (let c = 0; c < row.length; ++c) {
			str += row[c].toString().padStart(colWidths[c]+1);
			}
			str += "\n"
		}
		return str;
	}

	console.log(prettyPrint());

	while (true) {
		//most important object fn direction:
		let pivotCol = 0;
		{
			const lastRow = tableau[tableau.length-1];
			for (let c = 0; c < lastRow.length - 1; ++c) {
				if (lastRow[c] < lastRow[pivotCol]) {
					pivotCol = c;
				}
			}
			if (lastRow[pivotCol] >= 0) {
				//SOLVED!
				break;
			}
		}

		//row that will avoid setting rhs negative in other rows:
		let pivotRatio = Infinity;
		let pivotRow = null;
		for (let r = 0; r < tableau.length-1; ++r) {
			const row = tableau[r];
			const rhs = row[row.length-1];
			const coef = row[pivotCol];
			if (coef === 0) continue;
			const ratio = rhs / coef;
			if (ratio < 0) continue;

			if (ratio < pivotRatio) {
				pivotRow = row;
				pivotRatio = ratio;
			}
		}
		if (pivotRow === null) {
			//NO SOLUTION!
			return null;
		}

		/*
		{ //normalize the pivot row:
			const amt = 1 / pivotRow[pivotCol];
			for (let c = 0; c < pivotRow.length; ++c) {
				pivotRow[c] *= amt;
			}
		}
		*/

		//now clear the pivot column:
		for (let r = 0; r < tableau.length; ++r) {
			const row = tableau[r];
			if (row === pivotRow) continue;
			let multiple = row[pivotCol] / pivotRow[pivotCol];
			if (multiple === 0) continue;
			for (let c = 0; c < pivotRow.length; ++c) {
				row[c] += multiple * pivotRow[c];
			}
			row[pivotCol] = 0.0;
		}

		console.log(prettyPrint());
	}

	//read tableau to extract variable values:
	/*
	let vals = {};
	for (let r = 0; r < tableau.length-1; ++r) {
		const row = tableau[r];
		for (let c = 0; c < row.length-1; ++c) {
			if (row[c] != 0) {
				vals[vars[
				break;
			}
		}
	}
	*/

	//INCOMPLETE CODE!!




}

//helper that computes friction/lifted/support relationships:
function computeSupport(board, do_DEBUG) {
	const blocks = board.blocks;

	//record block ids of each location (-1 == no id, 0 .. blocks.length-1 => block, blocks.length => wall)
	let ids = [];
	for (let w of board.walls) {
		ids.push((w ? blocks.length : -1));
	}
	for (let blockIndex = 0; blockIndex < blocks.length; ++blockIndex) {
		const block = blocks[blockIndex];
		for (let by = 0; by < block.size.y; ++by) {
			for (let bx = 0; bx < block.size.x; ++bx) {
				if (block.filled[by * block.size.x + bx]) {
					console.assert(ids[(block.y+by)*board.size.x+(block.x+bx)] === -1);
					ids[(block.y+by)*board.size.x+(block.x+bx)] = blockIndex;
				}
			}
		}
	}

	const VARIABLES = blocks.length + 1;

	function get(x,y) {
		if (x < 0 || x >= board.size.x || y < 0 || y >= board.size.y) return VARIABLES-1;
		return ids[y*board.size.x+x];
	}

	//gaps[a][b] is the minimum empty space a (space) b:
	let gaps = [];
	for (let a = 0; a < VARIABLES; ++a) {
		gaps.push([]);
		for (let b = 0; b < VARIABLES; ++b) {
			gaps[gaps.length-1].push(Infinity);
		}
	}

	for (let y = 0; y < board.size.y; ++y) {
		let prevX = -1;
		let prevId = get(prevX,y);
		for (let x = 0; x <= board.size.x; ++x) {
			let id = get(x, y);
			if (id !== -1) {
				//have [prevId] (gap) [id]
				const gap = x - prevX - 1;
				if (prevId !== id) {
					gaps[prevId][id] = Math.min(gaps[prevId][id], gap);
				}

				prevX = x;
				prevId = id;
			}
		}
	}

	if (do_DEBUG) { //DEBUG: print gaps
		let colWidths = [];
		for (let b = 0; b < VARIABLES; ++b) {
			colWidths.push(gaps[0][b].toString().length);
		}
		for (let a = 1; a < VARIABLES; ++a) {
			for (let b = 0; b < VARIABLES; ++b) {
				colWidths[b] = Math.max(colWidths[b], gaps[a][b].toString().length);
			}
		}
		let str = "";
		for (let a = 0; a < VARIABLES; ++a) {
			for (let b = 0; b < VARIABLES; ++b) {
				str += gaps[a][b].toString().padStart(colWidths[b]+1);
			}
			str += "\n"
		}
		console.log("Gaps (before):\n" + str);
	}

	//fill in gaps transitively:
	for (let k = 0; k < VARIABLES; ++k) {
		for (let a = 0; a < VARIABLES; ++a) {
			for (let b = 0; b < VARIABLES; ++b) {
				for (let c = 0; c < VARIABLES-1; ++c) { //can't fill in gaps through wall
					gaps[a][b] = Math.min(gaps[a][b], gaps[a][c] + gaps[c][b]);
				}
			}
		}
	}
	//PARANOIA:
	for (let a = 0; a < VARIABLES; ++a) {
		for (let b = 0; b < VARIABLES; ++b) {
			for (let c = 0; c < VARIABLES-1; ++c) {
				console.assert(gaps[a][b] <= gaps[a][c] + gaps[c][b]);
			}
		}
	}


	//contacts[a][b] is the contact patch count between a (above) and b (below):
	let contacts = [];
	for (let a = 0; a < VARIABLES; ++a) {
		contacts.push([]);
		for (let b = 0; b < VARIABLES; ++b) {
			contacts[contacts.length-1].push(0);
		}
	}
	for (let y = -1; y <= board.size.y; ++y) {
		for (let x = 0; x <= board.size.x; ++x) {
			let above = get(x, y);
			let below = get(x, y+1);
			if (above !== -1 && below !== -1 && above !== below) {
				contacts[above][below] += 1;
			}
		}
	}

	if (do_DEBUG) { //DEBUG: print gaps
		let colWidths = [];
		for (let b = 0; b < VARIABLES; ++b) {
			colWidths.push(contacts[0][b].toString().length);
		}
		for (let a = 1; a < VARIABLES; ++a) {
			for (let b = 0; b < VARIABLES; ++b) {
				colWidths[b] = Math.max(colWidths[b], contacts[a][b].toString().length);
			}
		}
		let str = "";
		for (let a = 0; a < VARIABLES; ++a) {
			for (let b = 0; b < VARIABLES; ++b) {
				str += contacts[a][b].toString().padStart(colWidths[b]+1);
			}
			str += "\n"
		}
		console.log("Contacts (before lifted):\n" + str);
	}

	//support relationship:
	let supports = []; //supports[a][b] will be what a supports
	for (let a = 0; a < VARIABLES; ++a) {
		let row = [];
		for (let b = 0; b < VARIABLES; ++b) {
			if (contacts[b][a]) row.push(b);
		}
		supports.push(row);
	}
	//add player pushes to supports:
	for (let player of board.players) {
		if (player.ded) continue;
		if (!('moveIndex' in player)) continue;
		const move = MOVES[player.moveIndex];
		if (!('shoveA' in move)) continue;
		const below = get(player.x, player.y+1);
		const beside = get(player.x+move.shoveA.x, player.y+move.shoveA.y);
		if (beside !== VARIABLES-1) {
			supports[below].push(beside);
		}
	}

	//check if a block supports itself:
	function supportsSelf(b) {
		let visited = [];
		for (let i = 0; i < VARIABLES; ++i) {
			visited[i] = false;
		}
		let todo = [b];
		visited[b] = true;
		while (todo.length) {
			let i = todo.pop();
			for (let n of supports[i]) {
				if (n === b) return true;
				if (!visited[n]) {
					visited[n] = true;
					todo.push(n);
				}
			}
		}
		return false;
	}

	//lifted is everything that is slightly lifted because of pushes:
	let lifted = [];
	for (let a = 0; a < VARIABLES; ++a) {
		lifted.push(false);
	}
	function setLifted(b) {
		console.assert(b !== VARIABLES-1); //should never lift ground
		if (lifted[b]) return;
		lifted[b] = true;
		for (let a = 0; a < VARIABLES-1; ++a) {
			if (contacts[a][b]) {
				setLifted(a);
			}
		}
	}

	//add player pushes to supports:
	for (let player of board.players) {
		if (player.ded) continue;
		if (!('moveIndex' in player)) continue;
		const move = MOVES[player.moveIndex];
		if (!('shoveA' in move)) continue;
		const below = get(player.x, player.y+1);
		const beside = get(player.x+move.shoveA.x, player.y+move.shoveA.y);
		if (beside !== VARIABLES-1) {
			if (!supportsSelf(beside)) {
				setLifted(beside);
			}
		}
	}


	if (do_DEBUG) {
		console.log(lifted);
	}

	//edit contacts to account for lifted:
	for (let a = 0; a < VARIABLES; ++a) {
		let over = 0;
		for (let b = 0; b < VARIABLES; ++b) {
			if (lifted[a] && !lifted[b]) {
				contacts[a][b] = 0;
			}
		}
	}
	for (let player of board.players) {
		if (player.ded) continue;
		if (!('moveIndex' in player)) continue;
		const move = MOVES[player.moveIndex];
		if (!('shoveA' in move)) continue;
		const beside = get(player.x+move.shoveA.x, player.y+move.shoveA.y);
		const below = get(player.x, player.y+1);
		if (beside !== VARIABLES-1) {
			contacts[beside][below] += 1;
		}
	}

	if (do_DEBUG) { //DEBUG: print gaps
		let colWidths = [];
		for (let b = 0; b < VARIABLES; ++b) {
			colWidths.push(contacts[0][b].toString().length);
		}
		for (let a = 1; a < VARIABLES; ++a) {
			for (let b = 0; b < VARIABLES; ++b) {
				colWidths[b] = Math.max(colWidths[b], contacts[a][b].toString().length);
			}
		}
		let str = "";
		for (let a = 0; a < VARIABLES; ++a) {
			for (let b = 0; b < VARIABLES; ++b) {
				str += contacts[a][b].toString().padStart(colWidths[b]+1);
			}
			str += "\n"
		}
		console.log("Contacts (after lifted):\n" + str);
	}


	//solve for weight on each contact patch:
	let playerWeight = [];

	for (let a = 0; a < blocks.length; ++a) {
		playerWeight.push(0);
	}

	for (let player of board.players) {
		if (player.ded) continue;
		const below = get(player.x, player.y+1);
		if (below !== VARIABLES-1) {
			playerWeight[below] += 1;
		}
	}

	let forceEqns = [];
	for (let a = 0; a < blocks.length; ++a) {
		let row = {};
		let gravity = 0;
		blocks[a].filled.forEach((f) => {if (f) gravity -= 1;});

		gravity -= playerWeight[a];

		//TODO: add weight from players

		row["1"] = gravity; //gravity pushing down
		row["f" + a] = 0; //per-contact-patch force pushing up from below (coef will # contact patches)
		for (let b = 0; b < VARIABLES; ++b) {
			if (contacts[a][b] > 0) {
				row["f" + a] += contacts[a][b]; //force from below pushing up
			}
			if (contacts[b][a] > 0 && b !== VARIABLES-1) {
				row["f" + b] = -contacts[b][a]; //force from above pushing down (not exerted by floor)
			}
		}
		console.assert(row["f" + a] > 0, "blocks should all be supported on something");
		forceEqns.push(row);
	}

	let forces = [];
	let forceVals = solveEquations(forceEqns, do_DEBUG);
	for (let a = 0; a < blocks.length; ++a) {
		forces.push(forceVals["f" + a]);
	}

	return {
		ids,
		gaps,
		contacts,
		forces
	};
}

function markDead(board) {
	//check if any players got squished:
	let full = [];
	for (let w of board.walls) {
		full.push((w ? board.blocks.length : -1));
	}
	for (let blockIndex = 0; blockIndex < board.blocks.length; ++blockIndex) {
		const block = board.blocks[blockIndex];
		for (let by = 0; by < block.size.y; ++by) {
			for (let bx = 0; bx < block.size.x; ++bx) {
				if (block.filled[by * block.size.x + bx]) {
					console.assert(full[(block.y+by)*board.size.x+(block.x+bx)] === -1);
					full[(block.y+by)*board.size.x+(block.x+bx)] = blockIndex;
				}
			}
		}
	}
	for (let player of board.players) {
		if (player.ded) continue;
		let idx = full[player.y * board.size.x + player.x];
		if (idx !== -1) {
			player.ded = true;
			player.splatX = player.x;
			player.splatY = player.y + 1;
			if (player.y + 1 < board.size.y) {
				let rel = full[(player.y + 1) * board.size.x + player.x];
				if (rel >= 0 && rel < board.blocks.length) {
					player.splatRel = rel;
					player.splatX -= board.blocks[rel].x;
					player.splatY -= board.blocks[rel].y;
				}
			}
		}
	}

}

//finish moves when all live moves are shoves
function tryShoves(board, animAcc) {
	const blocks = board.blocks;

	//no moves => done!
	if (board.players.every((p) => !('moveIndex' in p))) return tryCollapse(board, animAcc);

	//NOTE: https://people.richland.edu/james/ictcm/2006/simplex.html
	//...though does model of static friction fit this?


	//Principles:
	// blocks movement choices penalized for static friction breaks.

	//MAYBE:
	// blocks are lifted by one pixel when pushed (if stacking relationship allows)
	// ^^ why do we need lifting? to prevent long blocks from being hard to shove off of obstacles.
	//    could also consider forgoing lifting and letting friction take its toll, I s'pose

	// there is ambiguity in pushes
	//  (pushing two blocks into the same space while standing on two blocks of the same size)
	//  could break ambiguity by giving pushers slightly different weights, likely.
	//  other ambiguity block is to prefer less movement over more movement.

	//Basic thinking on this:
	// (1) compute support forces between objects (slightly complicated in the case of cycles)
	// (2) in support order (bottom-to-top) try object movements, accruing penalty based on # of support patches that are not static
	//   ^^ this is an enumerative process, but so it goes.
	//      enumeration can prefer movements that are more static.

	const do_DEBUG = false;

	const VARIABLES = blocks.length + 1;

	let {
		ids,
		gaps,
		contacts,
		forces
	} = computeSupport(board, do_DEBUG);

	console.assert(ids.length === board.size.y * board.size.x);
	console.assert(gaps.length === VARIABLES && gaps[0].length === VARIABLES);
	console.assert(contacts.length === VARIABLES && contacts[0].length === VARIABLES);
	console.assert(forces.length === board.blocks.length);


	function get(x,y) {
		if (x < 0 || x >= board.size.x || y < 0 || y >= board.size.y) return VARIABLES-1;
		return ids[y*board.size.x+x];
	}

	//constraints from shoves:
	let deltas = []; //shove[a] + deltas[a][b] = shove[b] (unless NaN)
	for (let a = 0; a < VARIABLES; ++a) {
		deltas.push([]);
		for (let b = 0; b < VARIABLES; ++b) {
			deltas[deltas.length-1].push((a === b ? 0 : NaN));
		}
	}

	for (let player of board.players) {
		if (player.ded) continue;
		if (!('moveIndex' in player)) continue;
		const move = MOVES[player.moveIndex];
		const below = get(player.x+move.shoveB.x, player.y+move.shoveB.y);
		const beside = get(player.x+move.shoveA.x, player.y+move.shoveA.y);
		//console.log("Below: " + below + ", beside: " + beside);
		if (beside === VARIABLES-1 && below === VARIABLES-1) {
			console.warn("Trying to push a wall/wall!");
			return null;
		}
		if (deltas[below][beside] === deltas[below][beside]) {
			if (deltas[below][beside] !== move.shoveDelta) {
				//conflicting shoves
				return null;
			}
		} else {
			deltas[below][beside] = move.shoveDelta;
		}

		if (deltas[beside][below] === deltas[beside][below]) {
			if (deltas[beside][below] !== -move.shoveDelta) {
				//conflicting shoves
				return null;
			}
		} else {
			deltas[beside][below] = -move.shoveDelta;
		}
	}

	//fill in deltas transitively:
	for (let k = 0; k < VARIABLES; ++k) {
		for (let a = 0; a < VARIABLES; ++a) {
			for (let b = 0; b < VARIABLES; ++b) {
				for (let c = 0; c < VARIABLES; ++c) {
					let sum = deltas[a][c] + deltas[c][b];
					if (sum === sum) {
						if (deltas[a][b] === deltas[a][b]) {
							if (deltas[a][b] !== sum) {
								return null;
							}
						} else {
							deltas[a][b] = sum;
						}
					}
				}
			}
		}
	}
	//PARANOIA:
	for (let a = 0; a < VARIABLES; ++a) {
		for (let b = 0; b < VARIABLES; ++b) {
			for (let c = 0; c < VARIABLES; ++c) {
				let sum = deltas[a][c] + deltas[c][b];
				if (sum === sum) {
					console.assert(sum === deltas[a][b]);
				}
			}
		}
	}

	if (do_DEBUG) { //DEBUG: print deltas
		let colWidths = [];
		for (let b = 0; b < VARIABLES; ++b) {
			colWidths.push(deltas[0][b].toString().length);
		}
		for (let a = 1; a < VARIABLES; ++a) {
			for (let b = 0; b < VARIABLES; ++b) {
				colWidths[b] = Math.max(colWidths[b], deltas[a][b].toString().length);
			}
		}
		let str = "";
		for (let a = 0; a < VARIABLES; ++a) {
			for (let b = 0; b < VARIABLES; ++b) {
				str += deltas[a][b].toString().padStart(colWidths[b]+1);
			}
			str += "\n"
		}
		console.log("Deltas:\n" + str);
	}

	if (do_DEBUG) { //DEBUG: print gaps
		let colWidths = [];
		for (let b = 0; b < VARIABLES; ++b) {
			colWidths.push(gaps[0][b].toString().length);
		}
		for (let a = 1; a < VARIABLES; ++a) {
			for (let b = 0; b < VARIABLES; ++b) {
				colWidths[b] = Math.max(colWidths[b], gaps[a][b].toString().length);
			}
		}
		let str = "";
		for (let a = 0; a < VARIABLES; ++a) {
			for (let b = 0; b < VARIABLES; ++b) {
				str += gaps[a][b].toString().padStart(colWidths[b]+1);
			}
			str += "\n"
		}
		console.log("Gaps:\n" + str);
	}

	/*
	//DEBUG: print constraints
	for (let row of constraints) {
		let str = "";
		console.assert(row.length === VARIABLES);
		for (let v = 0; v < VARIABLES; ++v) {
			if (row[v] !== 0) {
				if (str !== "") {
					str += " + ";
				}
				str += row[v].toString();
				if (v === VARIABLES-1) {
				} else {
					str += "*b" + v.toString();
				}
			}
		}
		str += " >= 0"
		console.log(str);
	}
	*/

	let order = [];
	for (let i = 0; i < blocks.length; ++i) {
		order.push(i);
	}

	let bestShove = null;
	let bestCost = Infinity;

	{ //do a search:

		let shove = [];
		for (let i = 0; i < blocks.length; ++i) {
			shove.push(NaN);
		}

		let searchSteps = 0;

		function localCost(blockIndex) {
			//charge for static friction broken:
			let ret = 0;
			for (let other = 0; other < VARIABLES-1; ++other) {
				if (shove[other] === shove[other] && shove[other] !== shove[blockIndex]) {
					ret += contacts[blockIndex][other] * forces[blockIndex];
					ret += contacts[other][blockIndex] * forces[other];
				}
			}
			if (shove[blockIndex] !== 0) {
				ret += contacts[blockIndex][VARIABLES-1] * forces[blockIndex];
			}
			return ret;

			//total force required to overcome static friction
			// awkward because can't actually charge until *all* adjacent blocks have movement.
			/*
			let totalForce = 0;
			for (let other = 0; other < VARIABLES-1; ++other) {
				if (shove[other] === shove[other]) {
					//&& shove[other] !== shove[blockIndex]) {
					if (shove[blockIndex] > shove[other]) {
						totalForce += contacts[blockIndex][other] * forces[blockIndex];
						totalForce += contacts[other][blockIndex] * forces[other];
					} else if (shove[blockIndex] < shove[other]) {
						totalForce -= contacts[blockIndex][other] * forces[blockIndex];
						totalForce -= contacts[other][blockIndex] * forces[other];
					}
				}
			}
			if (shove[blockIndex] > 0) {
				totalForce += contacts[blockIndex][VARIABLES-1] * forces[blockIndex];
			} else {
				totalForce -= contacts[blockIndex][VARIABLES-1] * forces[blockIndex];
			}
			return ret;*/
		}

		function getLimits(blockIndex) {
			let min = -gaps[VARIABLES-1][blockIndex];
			let max = gaps[blockIndex][VARIABLES-1];

			for (let other = 0; other < VARIABLES-1; ++other) {
				if (other === blockIndex) continue;
				if (shove[other] === shove[other]) {
					//shove[other] - shove[blockIndex] <= gaps[other][blockIndex]:
					min = Math.max(min, shove[other] - gaps[other][blockIndex]);
					//shove[blockIndex] - shove[other] <= gaps[blockIndex][other]:
					max = Math.min(max, gaps[blockIndex][other] + shove[other]);
				}
			}
			return {min, max};
		}


		let initialCost = 0;

		for (let i = 0; i < blocks.length; ++i) {
			if (deltas[VARIABLES-1][i] === deltas[VARIABLES-1][i]) {
				shove[i] = deltas[VARIABLES-1][i];
				initialCost += localCost(i);
				const {min, max} = getLimits(i);
				if (shove[i] < min || shove[i] > max) {
					//immediate limit fail
					return null;
				}
			}
		}

		function shoveSearch(cost, next) {
			if (cost >= bestCost) return;

			if (next >= order.length) {
				console.assert(cost < bestCost);
				bestCost = cost;
				bestShove = shove.slice();
				if (do_DEBUG) console.log("After " + searchSteps + " steps, have cost " + bestCost + " for shove " + bestShove.join(", ") + ".");
				return;
			}
			let blockIndex = order[next];


			if (shove[blockIndex] === shove[blockIndex]) {
				//shove already determined by deltas, cost already added, just move on:
				shoveSearch(cost, next + 1);
				return;
			}

			searchSteps += 1;

			//limits allowable by gaps:
			const {min, max} = getLimits(blockIndex);

			if (min > max) {
				//dead end, no valid shove
				return;
			}

			/*//DEBUG: sanity check range
			for (let x = min; x <= max; ++x) {
				for (let other = 0; other < VARIABLES-1; ++other) {
					if (other === blockIndex) continue;
					if (shove[other] === shove[other]) {
						console.assert(shove[other] - x <= gaps[other][blockIndex]);
						console.assert(x - shove[other] <= gaps[blockIndex][other]);
					}
				}
			}*/

			function tryShove(x) {
				let newCost = cost; // + localCost(blockIndex);
				//shove[blockIndex] = x;
				console.assert(deltas[blockIndex][blockIndex] === deltas[blockIndex][blockIndex]);

				let limitFail = false;
				for (let other = 0; other < VARIABLES-1; ++other) {
					if (deltas[blockIndex][other] === deltas[blockIndex][other]) {
						console.assert(!(shove[other] === shove[other]));

						shove[other] = x + deltas[blockIndex][other];
						let {min:oMin, max:oMax} = getLimits(other);
						if (shove[other] < oMin || shove[other] > oMax) {
							limitFail = true;
							break;
						}

						newCost += localCost(other);
					}
				}

				if (!limitFail) {
					shoveSearch(newCost, next + 1);
				}

				for (let other = 0; other < VARIABLES-1; ++other) {
					if (deltas[blockIndex][other] === deltas[blockIndex][other]) {
						shove[other] = NaN;
					}
				}
				shove[blockIndex] = NaN;
			}

			let short = Math.min(Math.abs(min), Math.abs(max));
			if (min <= 0 && 0 <= max) short = 0;
			let long = Math.max(Math.abs(min), Math.abs(max));

			for (let x = short; x <= long; ++x) {
				if (min <= x && x <= max) tryShove(x);
				if (x !== 0 && min <= -x && -x <= max) tryShove(-x);
			}
		}
		shoveSearch(initialCost, 0);
		if (bestShove === null) {
			console.log("Failed to find a valid shove in " + searchSteps + " steps."); //DEBUG
			return null;
		}
	}


	//.... figure out lowest cost shove ...


	//move *does* work(!):
	let after = cloneBoard(board);
	for (let b = 0; b < after.blocks.length; ++b) {
		after.blocks[b].x += bestShove[b];
	}
	for (let player of after.players) {
		if (player.ded) continue;
		let on = get(player.x, player.y+1);
		if (on < after.blocks.length) {
			player.x += bestShove[on];
		}
		delete player.moveIndex;
	}

	markDead(after);
	if (animAcc) {
		animAcc.push(makeTween(board, after, 0.25)); //TODO: tweak timing
	}

	return tryCollapse(after, animAcc);
}

//returns board after given move, or null if move isn't possible:
function tryMoves(board, animAcc) {
	//now all of the non-push moves:
	//mask & 1 == wall
	//mask & 2 == block
	//mask & 4 == player (final pos)
	let mask = [];
	for (let w of board.walls) {
		mask.push((w ? 1 : 0));
	}
	for (let block of board.blocks) {
		for (let by = 0; by < block.size.y; ++by) {
			for (let bx = 0; bx < block.size.x; ++bx) {
				if (block.filled[by * block.size.x + bx]) {
					console.assert(mask[(block.y+by)*board.size.x+(block.x+bx)] === 0);
					mask[(block.y+by)*board.size.x+(block.x+bx)] = 2;
				}
			}
		}
	}

	function get(x,y) {
		if (x < 0 || x >= board.size.x || y < 0 || y >= board.size.y) return 1;
		return mask[y*board.size.x+x];
	}

	let after = cloneBoard(board);
	let needAnim = false;
	let playerAnims = [];

	//first, resolve all non-shove moves:
	for (let i = 0; i < board.players.length; ++i) {
		playerAnims.push(null);

		const player = board.players[i];
		if (player.ded) {
			console.assert(!('moveIndex' in player));
			continue;
		}

		if (!('moveIndex' in player)) {
			//no move, just check/block:
			if (mask[player.y*board.size.x+player.x] !== 0) return null;
			mask[player.y*board.size.x+player.x] = 4;
			continue;
		}

		const move = MOVES[player.moveIndex];

		if (move.shoveA) {
			//block position for first phase:
			if (mask[player.y*board.size.x+player.x] !== 0) return null;
			mask[player.y*board.size.x+player.x] = 4;
			playerAnims[i] = move.anim;
			needAnim = true;
			continue; //will resolve in second phase
		}


		//reserve ending position:
		if (mask[(move.dy+player.y)*board.size.x+(move.dx+player.x)] !== 0) return null;
		mask[(move.dy+player.y)*board.size.x+(move.dx+player.x)] = 4;

		//perform move in after board:
		after.players[i].x = player.x + move.dx;
		after.players[i].y = player.y + move.dy;
		delete after.players[i].moveIndex;

		playerAnims[i] = move.anim;
		needAnim = true;
	}

	if (needAnim) {
		animAcc.push(makeTween(board, after, 0.35, playerAnims)); //TODO: tweak timing
	}

	return tryShoves(after, animAcc);
}

function execute() {
	const anim = [];
	const after = tryMoves(board, anim);
	if (after) {
		let moves = [];
		for (let player of board.players) {
			if ('moveIndex' in player) {
				moves.push(player.moveIndex);
			} else {
				moves.push(-1);
			}
		}
		recordedMoves.push(moves);
		undoStack.push(board);
		board = after;
		pendingAnim = anim;
		console.log("Animations: ", pendingAnim); //DEBUG
	} else {
		//TODO: show failure location!
		console.log("Something went wrong.");
	}
}


function isWon() {
	return currentLevel + 1 < LEVELS.length && (board === null || (board.blocks.length === 0 && pendingAnim.length === 0) || isTitle);
}

function getCloseMove(player, target) {
	let mask = [];
	for (let w of board.walls) {
		mask.push((w ? 1 : 0));
	}
	for (let block of board.blocks) {
		for (let by = 0; by < block.size.y; ++by) {
			for (let bx = 0; bx < block.size.x; ++bx) {
				if (block.filled[by * block.size.x + bx]) {
					console.assert(mask[(block.y+by)*board.size.x+(block.x+bx)] === 0);
					mask[(block.y+by)*board.size.x+(block.x+bx)] = 2;
				}
			}
		}
	}

	function get(x,y) {
		if (x < 0 || x >= board.size.x || y < 0 || y >= board.size.y) return 1;
		return mask[y*board.size.x+x];
	}

	const dx = target.x - player.x;
	const dy = target.y - player.y;

	let invalid = null;
	for (let i = 0; i < MOVES.length; ++i) {
		const template = MOVES[i];

		if (template.dx !== dx) continue;
		if (template.dy !== dy) continue;

		if (invalid === null) invalid = i; //remember matching direction in case no valid move is found

		if (!template.empty.every((t) => (get(player.x+t.x, player.y+t.y) & 3) === 0)) continue;
		if (!template.solid.every((t) => (get(player.x+t.x, player.y+t.y) & 3) !== 0)) continue;
		if ('shoveA' in template) {
			const a = get(player.x+template.shoveA.x,player.y+template.shoveA.y);
			const b = get(player.x+template.shoveB.x,player.y+template.shoveB.y);
			if ((a & 3) === 0 || (b & 3) === 0) continue; //can't have empty
			if ((a & 3) === 1 && (b & 3) === 1) continue; //can't have both solid
		}

//		if (!template.blocks.every((t) => get(player.x+t.x, player.y+t.y) === 2)) continue;

		return {index:i, valid:true};
	}

	return {index:invalid, valid:false};
}

function setup() {
	let canvas = document.getElementById("canvas");
	ctx = canvas.getContext('2d');
	ctx.width = canvas.width;
	ctx.height = canvas.height;

	//------------

	function setMouse(evt) {
		var rect = canvas.getBoundingClientRect();
		mouse.x = Math.floor( (evt.clientX - rect.left) / rect.width * ctx.width );
		mouse.y = Math.floor( (evt.clientY - rect.top) / rect.height * ctx.height );

		if (board !== null && 'offset' in board) {
			mouse.tx = Math.floor((mouse.x - board.offset.x) / TILE_SIZE);
			mouse.ty = Math.floor((mouse.y - board.offset.y) / TILE_SIZE);
		}

		function inSprite(s) {
			if (!('at' in s)) return false;
			const x = s.at.x - s.ax;
			const y = s.at.y - s.ay;
			return (mouse.x >= x && mouse.x < x+s.w && mouse.y >= y && mouse.y < y+s.h);
		}

		//let resetX = isEnd ? Math.floor((ctx.width - SPRITES.reset.width) / 2) : 1;
		mouse.overReset = (board ? inSprite(SPRITES.reset) : false);
		mouse.overUndo = (board ? inSprite(SPRITES.undo) : false);
		mouse.overStep = (board ? inSprite(SPRITES.step) : false);
		mouse.overNext = (board ? inSprite(SPRITES.next) : false);

		let y = (picture ? 1 : 10);
		//mouse.overNext = (isWon() ? inRect(Math.floor((ctx.width-SPRITES.next.width)/2),y,SPRITES.next.width, SPRITES.next.height) : false);
	}

	function handleDown() {
		if (mouse.overReset) {
			reset();
		} else if (mouse.overUndo) {
			undo();
		} else if (mouse.overStep) {
			execute();
		} else if (mouse.overNext) {
			next();
		} else if (picture || isTitle) {
			return;
		} else if (mouse.tx >= 0 && mouse.tx < board.size.x && mouse.ty >= 0 && mouse.ty < board.size.y) {
			if (activePlayer >= 0 && activePlayer < board.players.length) {
				const player = board.players[activePlayer];
				let {index, valid} = getCloseMove(player, {x:mouse.tx, y:mouse.ty});
				if (valid) {
					player.moveIndex = index;
				} else {
					delete player.moveIndex;
				}
				activePlayer = -1;
				//auto-move if all players have moveIndex:
				if (board.players.every((p) => p.ded || ('moveIndex' in p))) {
					execute();
				}
			} else {
				//if a player is on tile, select the player:
				for (let i = 0; i < board.players.length; ++i) {
					const player = board.players[i];
					if (player.ded) continue;
					if (player.x === mouse.tx && player.y === mouse.ty) {
						activePlayer = i;
						delete player.moveIndex;
						break;
					}
				}
			}
			return;
		}
	}

	function handleUp() {
	}

	canvas.addEventListener('touchstart', function(evt){
		evt.preventDefault();
		setMouse(evt.touches[0]);
		handleDown(evt.touches[0]);
		return false;
	});
	canvas.addEventListener('touchmove', function(evt){
		evt.preventDefault();
		setMouse(evt.touches[0]);
		return false;
	});
	canvas.addEventListener('touchend', function(evt){
		handleUp();
		mouse.x = NaN;
		mouse.y = NaN;
		return false;
	});

	window.addEventListener('mousemove', function(evt){
		evt.preventDefault();
		setMouse(evt);
		return false;
	});
	window.addEventListener('mousedown', function(evt){
		evt.preventDefault();
		setMouse(evt);
		handleDown(evt);
		return false;
	});

	window.addEventListener('mouseup', function(evt){
		evt.preventDefault();
		setMouse(evt);
		handleUp();
		return false;
	});

	window.addEventListener('keydown', function(evt){
		if (!evt.repeat) {
			if (evt.code === 'KeyS') {
				execute();
			} else if (evt.code === 'KeyZ') {
				undo();
			} else if (evt.code === 'KeyX') {
				reset();
			} else if (evt.code === 'KeyN') {
				next();
			}
		}
	});


	//------------

	function resized() {
		let game = document.getElementById("game");
		let style = getComputedStyle(game);
		let size = {x:game.clientWidth, y:game.clientHeight};
		size.x -= parseInt(style.getPropertyValue("padding-left")) + parseInt(style.getPropertyValue("padding-right"));
		size.y -= parseInt(style.getPropertyValue("padding-top")) + parseInt(style.getPropertyValue("padding-bottom"));

		let mul = Math.max(1, Math.min(Math.floor(size.x / canvas.width), Math.floor(size.y / canvas.height)));
		size.x = mul * canvas.width;
		size.y = mul * canvas.height;

		canvas.style.width = size.x + "px";
		canvas.style.height = size.y + "px";
	}

	window.addEventListener('resize', resized);
	resized();

	let requestAnimFrame =
		window.requestAnimationFrame
		|| window.webkitRequestAnimationFrame
		|| window.mozRequestAnimationFrame
		|| window.oRequestAnimationFrame
		|| window.msRequestAnimationFrame
	;

	if (!requestAnimFrame) {
		alert("browser does not appear to support requestAnimationFrame");
		return;
	}

	var previous = NaN;
	var acc = 0.0;
	function animate(timestamp) {
		if (isNaN(previous)) {
			previous = timestamp;
		}
		var elapsed = (timestamp - previous) / 1000.0;
		previous = timestamp;

		//Run update (variable timestep):
		update(elapsed);

		//Draw:
		draw();

		requestAnimFrame(animate);
	}

	requestAnimFrame(animate);


}

setup();

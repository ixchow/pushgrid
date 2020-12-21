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
/*
	undo:{x:61, y:261, width:31, height:8},
	reset:{x:61, y:271, width:36, height:8},
	next:{x:61, y:251, width:31, height:8},
	title:{x:1, y:1, width:120, height:90},
	end:{x:74, y:94, width:120, height:90},
*/
};

//n.b. coordinates are in 0,0-is-upper-left system:
const TILES = {
	//block edges indexed by filled quadrant:
	//1 2
	//4 8
	blockRed:[],
	platform:{x:0, y:45},
	background:{x:0, y:36},
	//player animations:
	playerGreenStand:[{x:0, y:0}],
	playerGreenWalk:[{x:9, y:0}, {x:9, y:9}],
	playerGreenJump:[{x:18, y:0}],
	playerPurpleStand:[{x:0, y:27}],
	playerOrangeStand:[{x:9, y:27}],
	playerGreenTarget:{x:54, y:27},
	playerPurpleTarget:{x:54, y:36},
	playerOrangeTarget:{x:54, y:45},
	playerGreenRTarget:{x:63, y:27},
	playerPurpleRTarget:{x:63, y:36},
	playerOrangeRTarget:{x:63, y:45},
	playerGreenLTarget:{x:63, y:27, flipX:true},
	playerPurpleLTarget:{x:63, y:36, flipX:true},
	playerOrangeLTarget:{x:63, y:45, flipX:true},
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
	for (let i = 0; i < 16; ++i) {
		TILES.blockRed.push(null);
	}
	for (let y = 0; y < 4; ++y) {
		for (let x = 0; x < 4; ++x) {
			let bits = 0;
			if (blockMap[2*x  +(2*y  )*8]) bits |= 1;
			if (blockMap[2*x+1+(2*y  )*8]) bits |= 2;
			if (blockMap[2*x  +(2*y+1)*8]) bits |= 4;
			if (blockMap[2*x+1+(2*y+1)*8]) bits |= 8;
			console.assert(TILES.blockRed[bits] === null, "No duplicate tiles.");
			TILES.blockRed[bits] = {x:4 + TILE_SIZE*x, y: 139 + TILE_SIZE*y};
		}
	}
})();


//'o' => start
//'*' => destination
//' ' => must be empty (or other player)
//'.' => anything
//'#' => must be block/wall
const MOVES = [
	[ SPRITES.arrowR1,
		"o*",
		".#"
	],
	[ SPRITES.arrowR2,
		"o *",
		"..#"
	],
	[ SPRITES.arrowR1U1,
		" *",
		"o#",
		".."
	],
	[ SPRITES.arrowR1U2,
		" *",
		" #",
		"o.",
		".."
	],
	[ SPRITES.arrowR1D1,
		"o ",
		".*",
		".#"
	],
	[ SPRITES.arrowR1D2,
		"o ",
		". ",
		".*",
		".#"
	],
	[ SPRITES.arrowR2U1,
		"  *",
		"o #",
		"..."
	],
	[ SPRITES.arrowR2D1,
		"o  ",
		". *",
		"..#"
	],
	[ SPRITES.arrowSR1,
		"o>"
	]
];

(function fill_MOVES() {
	let count = MOVES.length;
	for (let i = 0; i < count; ++i) {
		let mirrored = [];
		for (let row of MOVES[i]) {
			if (typeof(row) === 'string') {
				let rev = "";
				for (let ci = 0; ci < row.length; ++ci) {
					let c = row[ci];
					if (c === '>') c = '<';
					else if (c === '<') c = '>';
					rev = c + rev;
				}
				mirrored.push(rev);
				//mirrored.push(row.split("").reverse().join(""));
			} else {
				mirrored.push({
					x:row.x, y:row.y, w:row.w, h:row.h,
					ax:row.ax+9, ay:row.ay, flipX:true
				});
			}
		}
		MOVES.push(mirrored);
	}

	//convert moves from strings to little check functions:
	for (let i = 0; i < MOVES.length; ++i) {
		const move = MOVES[i];
		let sprite = move.shift();
		let start = null;
		let finish = null;
		let empty = [];
		let solid = [];
		let blocks = [];
		let shove = 0;
		for (let y = 0; y < move.length; ++y) {
			for (let x = 0; x < move[y].length; ++x) {
				const c = move[y][x];
				if (c === '.') {
					//don't-care
				} else if (c === ' ') {
					empty.push({x:x, y:y});
				} else if (c === '>') {
					console.assert(finish === null);
					finish = {x:x, y:y};
					blocks.push({x:x, y:y});
					shove = 1;
				} else if (c === '<') {
					console.assert(finish === null);
					finish = {x:x, y:y};
					blocks.push({x:x, y:y});
					shove = -1;
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
		MOVES[i] = {
			dx:finish.x-start.x,
			dy:finish.y-start.y,
			empty:empty,
			solid:solid,
			blocks:blocks,
			shove:shove,
			pattern:move,
			sprite:sprite
		};
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

let picture = null;
let isEnd = false;

let undoStack = [];

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

	for (let y = 0; y < size.y; ++y) {
		for (let x = 0; x < size.x; ++x) {
			let c = map[y][x];
			if (c === ' ') /* nothing */;
			else if (c === '#') walls[size.x*y+x] = 1;
			else if (c === 'g' || c === 'G') {
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
					color:"Red",
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
	AUDIO.click.oneshot();
	if (board) {
		if (undoStack.length) {
			board = undoStack.pop();
		}
	}
}

function reset() {
	AUDIO.click.oneshot();
	if (isEnd) {
		setLevel(0);
	}
	if (board) {
		if (undoStack.length) {
			undoStack.push(board);
			board = cloneBoard(undoStack[0]);
		}
	}
}

const LEVELS = [
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
	//{picture:SPRITES.end,isEnd:true
	//},
];

LEVELS.forEach(function(level){
	if (level.picture) return;
	console.log(level.title);
	level.board = makeBoard(level.board);
});

function setBoard(newBoard) {
	board = cloneBoard(newBoard);
	activePlayer = -1;
	undoStack = [];
}

let maxLevel = 0;
let currentLevel;

function setLevel(idx) {
	if (currentLevel !== idx) {
		if (history && history.replaceState) history.replaceState({},"","?" + idx);
	}
	currentLevel = idx;
	maxLevel = Math.max(maxLevel, currentLevel);
	if (LEVELS[currentLevel].picture) {
		picture = LEVELS[currentLevel].picture;
		board = null;
		isEnd = (LEVELS[currentLevel].isEnd ? true : false);
	} else {
		picture = null;
		setBoard(LEVELS[currentLevel].board);
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
		if (currentLevel + 1 === LEVELS.length) {
			AUDIO.winGame.oneshot();
		} else {
			AUDIO.click.oneshot();
		}
	}
}

function draw() {
	ctx.setTransform(1,0, 0,1, 0,0);
	ctx.globalAlpha = 1.0;

	ctx.fillStyle = '#000';
	ctx.fillRect(0,0, ctx.width,ctx.height);

	if (board) {
		board.offset = {
			x:Math.floor((ctx.width - board.size.x*TILE_SIZE)/2),
			y:Math.floor((ctx.height - 10 - board.size.y*TILE_SIZE + 10)/2)
		};

		if (mouse.x === mouse.x) {
			mouse.tx = Math.floor((mouse.x - board.offset.x) / TILE_SIZE);
			mouse.ty = Math.floor((mouse.y - board.offset.y) / TILE_SIZE);
		}
	}

	function drawSprite(x,y,sprite) {
		ctx.save();
		if (sprite.flipX) {
			ctx.setTransform(-1,0, 0,1, sprite.w+x-(sprite.w-sprite.ax)+board.offset.x,y-sprite.ay+board.offset.y);
		} else {
			ctx.setTransform(1,0, 0,1, x-sprite.ax+board.offset.x,y-sprite.ay+board.offset.y);
		}
		ctx.drawImage(TILES_IMG, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, sprite.w, sprite.h);
		ctx.restore();
	}

	if (picture) {
		drawSprite(0,Math.floor((ctx.height-picture.height)/2), picture);
	} else {

	ctx.setTransform(1,0, 0,1, board.offset.x,board.offset.y);

	function drawTile(x,y,tile) {
		ctx.save();
		ctx.setTransform(1,0, 0,1, x+board.offset.x, y+board.offset.y);
		ctx.drawImage(TILES_IMG, tile.x,tile.y, TILE_SIZE,TILE_SIZE, 0, 0,TILE_SIZE,TILE_SIZE);
		ctx.restore();
	}

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

	//draw players:
	for (let player of board.players) {
		drawTile(player.x*TILE_SIZE, player.y*TILE_SIZE, TILES["player" + player.color + "Stand"][0]);
	}

	//draw blocks:
	//NOTE: uses corner tiles, thus the odd offsets
	for (let block of board.blocks) {
		function filled(x,y) {
			if (x < 0 || x >= block.size.x || y < 0 || y >= block.size.y) return false;
			return block.filled[y*block.size.x+x];
		}
		for (let by = -1; by < block.size.y; ++by) {
			for (let bx = -1; bx < block.size.x; ++bx) {
				let bits = 0;
				if (filled(bx,by)) bits |= 1;
				if (filled(bx+1,by)) bits |= 2;
				if (filled(bx,by+1)) bits |= 4;
				if (filled(bx+1,by+1)) bits |= 8;
				drawTile((block.x+bx)*TILE_SIZE + 4, (block.y+by)*TILE_SIZE + 4, TILES.blockRed[bits]);
			}
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

	//draw move arrows:
	for (let i = 0; i < board.players.length; ++i) {
		const player = board.players[i];
		//TODO: tints for mouse and such

		//no move:
		if (!('moveIndex' in player)) continue;

		let move = MOVES[player.moveIndex];

		if (move.shove) {
			drawTile(TILE_SIZE*player.x, TILE_SIZE*player.y, TILES["player" + player.color + (player.dx > 0 ? "R" : "L") + "Target"]);
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

	//preview move:
	if ('tx' in mouse) {
		if (activePlayer >= 0 && activePlayer < board.players.length) {
			const player = board.players[activePlayer];
			let {index, valid} = getCloseMove(player, {x:mouse.tx, y:mouse.ty});
			if (index !== null) {
				if (!valid) ctx.globalAlpha = 0.5;
				drawSprite(TILE_SIZE*player.x, TILE_SIZE*player.y, MOVES[index].sprite);
				ctx.globalAlpha = 1.0;
			}
		}
		//let g = canGrowTo(mouse.tx, mouse.ty);
		//if (g !== null) {
		//drawTile(mouse.tx*TILE_SIZE, mouse.ty*TILE_SIZE, TILES.playerGreenStand[0]);
		//}
	}

	} //end if(picture) else

	let resetX = isEnd ? Math.floor((ctx.width - SPRITES.reset.width) / 2) : 1;

	ctx.setTransform(1,0, 0,1, 0,0);

	ctx.fillStyle = '#444';
	if (mouse.overReset) {
		ctx.fillRect(resetX,1,SPRITES.reset.width, SPRITES.reset.height);
	}
	if (mouse.overUndo && board) {
		ctx.fillRect(ctx.width-1-SPRITES.undo.width,1,SPRITES.undo.width, SPRITES.undo.height);
	}

	if (isWon()) {
		let y = (picture ? 1 : 10);
		if (mouse.overNext) {
			ctx.fillRect(Math.floor((ctx.width-SPRITES.next.width)/2), y, SPRITES.next.width, SPRITES.next.height);
		}
		drawSprite(Math.floor((ctx.width-SPRITES.next.width)/2), y, SPRITES.next);
	}

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
}

function isPerson(tx, ty) {
	return board.people.some(function(p){
		return p.x === tx && p.y === ty;
	});
}

function isWall(tx, ty) {
	if (tx < 0 || tx >= board.size.x || ty < 0 || ty >= board.size.y) return true;
	if (board.walls[tx+ty*board.size.x]) return true;
	return false;
}
function getBlock(tx, ty) {
	let over = null;
	for (const block of board.blocks) {
		if (tx >= block.x && tx < block.x + block.size.x && ty >= block.y && ty < block.y + block.size.y) {
			if (block.filled[(ty - block.y)*block.size.x + tx-block.x]) {
				console.assert(over === null);
				over = block;
			}
		}
	}
	return over;
}
function getPlayer(tx, ty) {
	let over = null;
	for (const player of board.players) {
		if (player.x === tx && player.y == ty) {
			console.assert(over === null);
			over = player;
		}
	}
	return over;
}

//finish moves when all live moves are shoves
function tryShoves(board) {

	//no moves => done!
	if (board.players.every((p) => !('moveIndex' in p))) return board;

	//TODO: actual shoves.
	return null;

	//TODO:
	//First, assign motion based on stacking:
	//For each block, compute 'must' and 'should' move relationships for left and right moves
	//...
	//(1) 
	//(1) every player is assigned motion based on the block they are standing on + their shove
	//(2) every block is assigned motion based on block it is standing on + nearby blocks
}

//returns board after given move, or null if move isn't possible:
function tryMoves(board) {
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
				console.assert(mask[(block.y+by)*board.size.x+(block.x+bx)] === 0);
				mask[(block.y+by)*board.size.x+(block.x+bx)] = 2;
			}
		}
	}

	function get(x,y) {
		if (x < 0 || x >= board.size.x || y < 0 || y >= board.size.y) return 1;
		return mask[y*board.size.x+x];
	}

	let after = cloneBoard(board);

	let playerShoves = [];

	//first, resolve all non-shove moves:
	for (let i = 0; i < board.players.length; ++i) {
		const player = board.players[i];

		if (!('moveIndex' in player)) {
			//no move, just check/block:
			if (mask[player.y*board.size.x+player.x] !== 0) return null;
			mask[player.y*board.size.x+player.x] = 4;
			continue;
		}

		const move = MOVES[player.moveIndex];

		if (move.shove) {
			playerShoves.push(move.shove);
			//block position for first phase:
			if (mask[player.y*board.size.x+player.x] !== 0) return null;
			mask[player.y*board.size.x+player.x] = 4;
			continue; //will resolve in second phase
		} else {
			playerShoves.push(0);
		}

		//reserve ending position:
		if (mask[(move.dy+player.y)*board.size.x+(move.dx+player.x)] !== 0) return null;
		mask[(move.dy+player.y)*board.size.x+(move.dx+player.x)] = 4;

		//perform move in after board:
		after.players[i].x = player.x + move.dx;
		after.players[i].y = player.y + move.dy;
		delete after.players[i].moveIndex;

		//TODO: pull animation out of move(?)
	}

	return tryShoves(after, playerShoves);
}

function execute() {
	const after = tryMoves(board);
	if (after) {
		undoStack.push(board);
		board = after;
	} else {
		//TODO: show failure location!
		console.log("Something went wrong.");
	}
}


function isWon() {
	return false; // currentLevel + 1 < LEVELS.length && (board === null || board.blob[board.exit.x+board.exit.y*board.size.x]);
}

function getCloseMove(player, target) {
	let mask = [];
	for (let w of board.walls) {
		mask.push((w ? 1 : 0));
	}
	for (let block of board.blocks) {
		for (let by = 0; by < block.size.y; ++by) {
			for (let bx = 0; bx < block.size.x; ++bx) {
				console.assert(mask[(block.y+by)*board.size.x+(block.x+bx)] === 0);
				mask[(block.y+by)*board.size.x+(block.x+bx)] = 2;
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
		if (!template.blocks.every((t) => get(player.x+t.x, player.y+t.y) === 2)) continue;

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

		function inRect(x,y,w,h) {
			return (mouse.x >= x && mouse.x < x+w && mouse.y >= y && mouse.y < y+h);
		}

		//let resetX = isEnd ? Math.floor((ctx.width - SPRITES.reset.width) / 2) : 1;
		//mouse.overReset = (board || isEnd ? inRect(resetX,1,SPRITES.reset.width,SPRITES.reset.height) : false);
		//mouse.overUndo = (board ? inRect(ctx.width-1-SPRITES.undo.width,1,SPRITES.undo.width,SPRITES.undo.height) : false);

		let y = (picture ? 1 : 10);
		//mouse.overNext = (isWon() ? inRect(Math.floor((ctx.width-SPRITES.next.width)/2),y,SPRITES.next.width, SPRITES.next.height) : false);
	}

	function handleDown() {
		if (mouse.overReset) {
			reset();
		} else if (mouse.overUndo) {
			undo();
		} else if (mouse.overNext) {
			next();
		} else if (picture) {
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
			} else {
			//if a player is on tile, select the player:
				for (let i = 0; i < board.players.length; ++i) {
					const player = board.players[i];
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
			if (evt.code === 'Space') {
				execute();
			} else if (evt.code === 'KeyZ') {
				undo();
			} else if (evt.code === 'KeyX') {
				reset();
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

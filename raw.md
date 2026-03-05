<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hide & Seek: Survival</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background-color: #0b0c10;
            overflow: hidden;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        canvas {
            display: block;
        }
        #ui-layer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .pointer-events-auto {
            pointer-events: auto;
        }
        .menu-overlay {
            background: rgba(11, 12, 16, 0.85);
            backdrop-filter: blur(5px);
        }
        .text-glow {
            text-shadow: 0 0 10px currentColor;
        }
    </style>
</head>
<body>

    <!-- Game Canvas -->
    <canvas id="gameCanvas"></canvas>

    <!-- UI Layer -->
    <div id="ui-layer" class="p-4">
        
        <!-- HUD -->
        <div id="hud" class="hidden flex justify-between items-start w-full">
            <div class="flex flex-col gap-4">
                <div class="bg-gray-900 bg-opacity-80 text-white px-6 py-3 rounded-xl border border-gray-700 shadow-lg">
                    <div class="text-sm text-gray-400 font-bold uppercase tracking-wider">Time Remaining</div>
                    <div id="time-display" class="text-3xl font-mono font-bold text-white text-glow">01:30</div>
                </div>
                <!-- Minimap -->
                <canvas id="minimapCanvas" class="rounded-xl border border-gray-700 shadow-lg bg-gray-900 bg-opacity-80" width="200" height="112"></canvas>
            </div>
            
            <div class="bg-gray-900 bg-opacity-80 text-white px-6 py-3 rounded-xl border border-gray-700 shadow-lg text-right">
                <div class="text-sm text-gray-400 font-bold uppercase tracking-wider">Hiders Alive</div>
                <div id="alive-display" class="text-3xl font-mono font-bold text-green-400 text-glow">10</div>
            </div>
        </div>

        <!-- Main Menu -->
        <div id="main-menu" class="absolute inset-0 flex flex-col items-center justify-center menu-overlay pointer-events-auto z-50">
            <h1 class="text-6xl md:text-8xl font-black text-white tracking-tighter mb-2 text-glow" style="color: #F5F557;">HIDE & SEEK</h1>
            <p class="text-xl text-gray-300 mb-8 font-semibold tracking-wide">SURVIVE FOR 90 SECONDS.</p>
            
            <div class="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-8 max-w-md text-left text-gray-300 shadow-2xl">
                <h3 class="text-xl font-bold text-white mb-3">RULES</h3>
                <ul class="list-disc pl-5 space-y-2">
                    <li>You are <span class="text-blue-400 font-bold">BLUE</span>. The Seeker is <span class="text-red-500 font-bold">RED</span>.</li>
                    <li>There are 9 other AI hiders.</li>
                    <li>Use <kbd class="bg-gray-800 px-2 py-1 rounded text-white">W</kbd><kbd class="bg-gray-800 px-2 py-1 rounded text-white">A</kbd><kbd class="bg-gray-800 px-2 py-1 rounded text-white">S</kbd><kbd class="bg-gray-800 px-2 py-1 rounded text-white">D</kbd> or <kbd class="bg-gray-800 px-2 py-1 rounded text-white">ARROWS</kbd> to move.</li>
                    <li>Stay out of the Seeker's line of sight!</li>
                </ul>
            </div>

            <button id="start-btn" class="bg-blue-600 hover:bg-blue-500 text-white font-black text-2xl px-12 py-4 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all transform hover:scale-105 active:scale-95">
                START GAME
            </button>
        </div>

        <!-- Game Over Screen -->
        <div id="game-over" class="absolute inset-0 flex flex-col items-center justify-center menu-overlay pointer-events-auto z-50 hidden">
            <h1 id="go-title" class="text-7xl font-black text-white tracking-tighter mb-4 text-glow">YOU DIED</h1>
            <p id="go-desc" class="text-xl text-gray-300 mb-8 font-semibold">The Seeker found you.</p>
            <button id="restart-btn" class="bg-white hover:bg-gray-200 text-gray-900 font-black text-xl px-10 py-4 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95">
                PLAY AGAIN
            </button>
        </div>

    </div>

<script>
/**
 * ENGINE CONSTANTS & SETUP
 */
const TILE_SIZE = 60;
const PLAYER_RADIUS = 20;
const VISION_RADIUS = 500;
const SEEKER_VISION_RADIUS = 450;
const ROUND_TIME = 90; 

const mapGridStr = [
    "##################################################",
    "#................................................#",
    "#.#########.########..########..########.#######.#",
    "#.#.......#.#......#..#......#..#......#.#.....#.#",
    "#.#.#####.#.#.####.#..#.####.#..#.####.#.#.###.#.#",
    "#.#.#...#.#.#.#..#.#..#.#..#.#..#.#..#.#.#.#.#.#.#",
    "#.###.###.#.###..###..###..###..###..###.###.###.#",
    "#.....#..........................................#",
    "#######.####.##############.##############.#######",
    "#............#............#.#............#.......#",
    "#.#######.####.##########.#.#.##########.#######.#",
    "#.#.....#......#........#.#.#.#........#.......#.#",
    "#.#.###.########.######.#.#.#.#.######.#######.#.#",
    "#.#.#.#..........#....#.#.#.#.#.#....#.......#.#.#",
    "#.#.#.############.##.#.#.#.#.#.#.##.#######.#.#.#",
    "#.#.#..............#..#.#.#.#.#.#..#.......#.#.#.#",
    "#.###.##############..###.#.#.###..#########.###.#",
    "#.........................#.#....................#",
    "######################.####.####.#################",
    "#................................................#",
    "#.#####.######.######.#######.######.######.####.#",
    "#.#...#.#....#.#....#.#.....#.#....#.#....#.#..#.#",
    "#.#.#.#.#.##.#.#.##.#.#.###.#.#.##.#.#.##.#.#.##.#",
    "#.#.#.#.#..#.#.#..#.#.#...#.#.#..#.#.#..#.#.#....#",
    "#.###.###..###.####.###...###.####.###..###.####.#",
    "#................................................#",
    "#................................................#",
    "##################################################"
];

const COLORS = {
    'Seeker': { primary: '#C51111', shadow: '#7A0838', visor: '#93B6C9' },
    'Player': { primary: '#132ED1', shadow: '#09158E', visor: '#93B6C9' },
    'Green':  { primary: '#117F2D', shadow: '#0A4D1A', visor: '#93B6C9' },
    'Pink':   { primary: '#ED54BA', shadow: '#AB3B85', visor: '#93B6C9' },
    'Orange': { primary: '#EF7D0D', shadow: '#B35A08', visor: '#93B6C9' },
    'Yellow': { primary: '#F5F557', shadow: '#C3C333', visor: '#93B6C9' },
    'Black':  { primary: '#3F474E', shadow: '#1E2326', visor: '#93B6C9' },
    'White':  { primary: '#D6E0F0', shadow: '#8394BF', visor: '#93B6C9' },
    'Purple': { primary: '#6B2FBB', shadow: '#3B177C', visor: '#93B6C9' },
    'Brown':  { primary: '#71491E', shadow: '#3E250A', visor: '#93B6C9' },
    'Cyan':   { primary: '#38FEDB', shadow: '#24A891', visor: '#93B6C9' }
};

const HIDER_NAMES = ['Green', 'Pink', 'Orange', 'Yellow', 'Black', 'White', 'Purple', 'Brown', 'Cyan'];

/**
 * MAP & GRID PARSING
 */
let walls = [];
let grid = [];
let shadowSegments = [];
let cols = mapGridStr[0].length;
let rows = mapGridStr.length;
let mapWidth = cols * TILE_SIZE;
let mapHeight = rows * TILE_SIZE;

function initMap() {
    walls = [];
    grid = [];
    shadowSegments = [];
    let visited = Array(rows).fill(0).map(() => Array(cols).fill(false));

    // Build optimized wall rectangles
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (mapGridStr[y][x] === '#' && !visited[y][x]) {
                let w = 1;
                while (x + w < cols && mapGridStr[y][x + w] === '#' && !visited[y][x + w]) w++;
                let h = 1;
                let valid = true;
                while (y + h < rows && valid) {
                    for (let i = 0; i < w; i++) {
                        if (mapGridStr[y + h][x + i] !== '#' || visited[y + h][x + i]) {
                            valid = false;
                            break;
                        }
                    }
                    if (valid) h++;
                }
                for (let i = 0; i < h; i++) {
                    for (let j = 0; j < w; j++) visited[y + i][x + j] = true;
                }
                walls.push({ x: x * TILE_SIZE, y: y * TILE_SIZE, w: w * TILE_SIZE, h: h * TILE_SIZE });
            }
        }
    }

    // Build A* Grid (1 = wall, 0 = walkable)
    for (let y = 0; y < rows; y++) {
        grid[y] = [];
        for (let x = 0; x < cols; x++) {
            grid[y][x] = (mapGridStr[y][x] === '#') ? 1 : 0;
        }
    }

    // Build continuous shadow segments for merged wall boundaries
    // Horizontal edges
    for (let y = 0; y <= rows; y++) {
        let currentTop = null;
        let currentBottom = null;
        for (let x = 0; x <= cols; x++) {
            let isWall = (y < rows && x < cols && grid[y][x] === 1);
            let isWallAbove = (y > 0 && x < cols && grid[y-1][x] === 1);

            // Top edge (wall below, empty above)
            if (isWall && !isWallAbove) {
                if (!currentTop) currentTop = {x1: x, y: y, x2: x+1};
                else currentTop.x2 = x+1;
            } else {
                if (currentTop) {
                    shadowSegments.push({
                        p1: {x: currentTop.x1 * TILE_SIZE, y: currentTop.y * TILE_SIZE},
                        p2: {x: currentTop.x2 * TILE_SIZE, y: currentTop.y * TILE_SIZE}
                    });
                    currentTop = null;
                }
            }

            // Bottom edge (wall above, empty below)
            if (!isWall && isWallAbove) {
                if (!currentBottom) currentBottom = {x1: x, y: y, x2: x+1};
                else currentBottom.x2 = x+1;
            } else {
                if (currentBottom) {
                    shadowSegments.push({
                        p1: {x: currentBottom.x2 * TILE_SIZE, y: currentBottom.y * TILE_SIZE},
                        p2: {x: currentBottom.x1 * TILE_SIZE, y: currentBottom.y * TILE_SIZE}
                    });
                    currentBottom = null;
                }
            }
        }
    }

    // Vertical edges
    for (let x = 0; x <= cols; x++) {
        let currentLeft = null;
        let currentRight = null;
        for (let y = 0; y <= rows; y++) {
            let isWall = (y < rows && x < cols && grid[y][x] === 1);
            let isWallLeft = (y < rows && x > 0 && grid[y][x-1] === 1);

            // Left edge (wall right, empty left)
            if (isWall && !isWallLeft) {
                if (!currentLeft) currentLeft = {x: x, y1: y, y2: y+1};
                else currentLeft.y2 = y+1;
            } else {
                if (currentLeft) {
                    shadowSegments.push({
                        p1: {x: currentLeft.x * TILE_SIZE, y: currentLeft.y2 * TILE_SIZE},
                        p2: {x: currentLeft.x * TILE_SIZE, y: currentLeft.y1 * TILE_SIZE}
                    });
                    currentLeft = null;
                }
            }

            // Right edge (wall left, empty right)
            if (!isWall && isWallLeft) {
                if (!currentRight) currentRight = {x: x, y1: y, y2: y+1};
                else currentRight.y2 = y+1;
            } else {
                if (currentRight) {
                    shadowSegments.push({
                        p1: {x: currentRight.x * TILE_SIZE, y: currentRight.y1 * TILE_SIZE},
                        p2: {x: currentRight.x * TILE_SIZE, y: currentRight.y2 * TILE_SIZE}
                    });
                    currentRight = null;
                }
            }
        }
    }
}

/**
 * PATHFINDING (A*)
 */
class Node {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.g = 0;
        this.h = 0;
        this.f = 0;
        this.parent = null;
    }
}

function getWalkableNeighbors(node) {
    const dirs = [
        {x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0},
        {x: 1, y: -1}, {x: 1, y: 1}, {x: -1, y: 1}, {x: -1, y: -1}
    ];
    let neighbors = [];
    for (let d of dirs) {
        let nx = node.x + d.x;
        let ny = node.y + d.y;
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && grid[ny][nx] === 0) {
            // Check diagonal squeezing
            if (Math.abs(d.x) === 1 && Math.abs(d.y) === 1) {
                if (grid[node.y][nx] === 1 || grid[ny][node.x] === 1) continue;
            }
            neighbors.push(new Node(nx, ny));
        }
    }
    return neighbors;
}

function findPath(startX, startY, endX, endY) {
    let sx = Math.floor(startX / TILE_SIZE);
    let sy = Math.floor(startY / TILE_SIZE);
    let ex = Math.floor(endX / TILE_SIZE);
    let ey = Math.floor(endY / TILE_SIZE);

    if (sx < 0 || sx >= cols || sy < 0 || sy >= rows || ex < 0 || ex >= cols || ey < 0 || ey >= rows) return null;
    if (grid[ey][ex] === 1) return null;

    let openList = [];
    let closedList = new Set();
    let startNode = new Node(sx, sy);
    startNode.h = Math.hypot(ex - sx, ey - sy);
    startNode.f = startNode.h;
    openList.push(startNode);

    let iters = 0;
    while (openList.length > 0 && iters < 500) {
        iters++;
        // Get lowest F
        let lowestIdx = 0;
        for (let i = 1; i < openList.length; i++) {
            if (openList[i].f < openList[lowestIdx].f) lowestIdx = i;
        }
        let current = openList.splice(lowestIdx, 1)[0];

        if (current.x === ex && current.y === ey) {
            let path = [];
            let curr = current;
            while (curr.parent) {
                path.push({x: curr.x, y: curr.y});
                curr = curr.parent;
            }
            return path.reverse();
        }

        closedList.add(`${current.x},${current.y}`);

        let neighbors = getWalkableNeighbors(current);
        for (let neighbor of neighbors) {
            if (closedList.has(`${neighbor.x},${neighbor.y}`)) continue;

            let gScore = current.g + ((current.x !== neighbor.x && current.y !== neighbor.y) ? 1.414 : 1);
            let existingNode = openList.find(n => n.x === neighbor.x && n.y === neighbor.y);

            if (!existingNode) {
                neighbor.parent = current;
                neighbor.g = gScore;
                neighbor.h = Math.hypot(ex - neighbor.x, ey - neighbor.y);
                neighbor.f = neighbor.g + neighbor.h;
                openList.push(neighbor);
            } else if (gScore < existingNode.g) {
                existingNode.parent = current;
                existingNode.g = gScore;
                existingNode.f = existingNode.g + existingNode.h;
            }
        }
    }
    return null;
}

function getRandomWalkablePos() {
    let x, y;
    do {
        x = Math.floor(Math.random() * cols);
        y = Math.floor(Math.random() * rows);
    } while (grid[y][x] === 1);
    return { x: x * TILE_SIZE + TILE_SIZE/2, y: y * TILE_SIZE + TILE_SIZE/2 };
}

/**
 * MATH & UTILS
 */
function checkLineOfSight(x1, y1, x2, y2) {
    let dist = Math.hypot(x2 - x1, y2 - y1);
    if (dist > VISION_RADIUS) return false;

    // Line-Rectangle intersection
    for (let w of walls) {
        if (lineRectIntersect(x1, y1, x2, y2, w.x, w.y, w.w, w.h)) {
            return false;
        }
    }
    return true;
}

function lineRectIntersect(x1, y1, x2, y2, rx, ry, rw, rh) {
    let left = lineLine(x1,y1,x2,y2, rx,ry,rx,ry+rh);
    let right = lineLine(x1,y1,x2,y2, rx+rw,ry,rx+rw,ry+rh);
    let top = lineLine(x1,y1,x2,y2, rx,ry,rx+rw,ry);
    let bottom = lineLine(x1,y1,x2,y2, rx,ry+rh,rx+rw,ry+rh);
    // Check if points are inside rect
    let inside = (x1 > rx && x1 < rx+rw && y1 > ry && y1 < ry+rh) || 
                 (x2 > rx && x2 < rx+rw && y2 > ry && y2 < ry+rh);
    return left || right || top || bottom || inside;
}

function lineLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    let uA = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    let uB = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    return (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1);
}

/**
 * ENTITIES
 */
class Entity {
    constructor(x, y, colorId) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = PLAYER_RADIUS;
        this.speed = 180;
        this.colorId = colorId;
        this.colors = COLORS[colorId];
        this.facingLeft = false;
        this.walkCycle = 0;
        this.isDead = false;
        this.isMoving = false;
    }

    update(delta) {
        if (this.isDead) return;

        this.isMoving = Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1;
        if (this.isMoving) {
            this.walkCycle += delta * 15;
            if (this.vx < -0.1) this.facingLeft = true;
            if (this.vx > 0.1) this.facingLeft = false;
        } else {
            this.walkCycle = 0;
        }

        // Apply velocity with collision sliding
        this.moveAxis(this.vx * delta, 0);
        this.moveAxis(0, this.vy * delta);
    }

    moveAxis(dx, dy) {
        this.x += dx;
        this.y += dy;
        for (let w of walls) {
            // Find closest point on rect to circle
            let cX = Math.max(w.x, Math.min(this.x, w.x + w.w));
            let cY = Math.max(w.y, Math.min(this.y, w.y + w.h));
            let distX = this.x - cX;
            let distY = this.y - cY;
            let dist = Math.hypot(distX, distY);
            
            if (dist < this.radius) {
                let pen = this.radius - dist;
                if (dist === 0) { distX = 1; distY = 0; dist = 1; }
                this.x += (distX / dist) * pen;
                this.y += (distY / dist) * pen;
            }
        }
    }

    draw(ctx) {
        if (this.isDead) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Bobbing animation
        let bob = this.isMoving ? Math.abs(Math.sin(this.walkCycle)) * 4 : 0;
        ctx.translate(0, -bob);

        if (this.facingLeft) ctx.scale(-1, 1);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(0, bob + this.radius - 2, this.radius, this.radius/2, 0, 0, Math.PI*2);
        ctx.fill();

        // Backpack
        ctx.fillStyle = this.colors.shadow;
        ctx.beginPath();
        ctx.roundRect(-this.radius - 6, -this.radius/2, 12, this.radius + 5, 6);
        ctx.fill();

        // Main Body
        ctx.fillStyle = this.colors.primary;
        ctx.beginPath();
        ctx.roundRect(-this.radius + 2, -this.radius, this.radius*2 - 4, this.radius*2, this.radius);
        ctx.fill();

        // Body shadow overlay for depth
        ctx.fillStyle = this.colors.shadow;
        ctx.beginPath();
        ctx.roundRect(-this.radius + 2, 0, this.radius*2 - 4, this.radius, {bl: this.radius, br: this.radius});
        ctx.fill();

        // Visor
        ctx.fillStyle = '#223847'; // visor frame
        ctx.beginPath();
        ctx.roundRect(4, -this.radius/2 - 2, 18, 14, 7);
        ctx.fill();

        ctx.fillStyle = this.colors.visor;
        ctx.beginPath();
        ctx.roundRect(6, -this.radius/2, 14, 10, 5);
        ctx.fill();

        // Visor reflection
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(14, -this.radius/2 + 3, 4, 2, Math.PI/6, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    }
}

class Bot extends Entity {
    constructor(x, y, colorId, role) {
        super(x, y, colorId);
        this.role = role; // 'seeker' or 'hider'
        this.speed = role === 'seeker' ? 200 : 170;
        this.path = [];
        this.pathTimer = 0;
        this.state = role === 'seeker' ? 'PATROL' : 'WANDER';
        this.targetNode = null;
        this.waitTimer = 0;
    }

    update(delta) {
        if (this.isDead) return;

        this.waitTimer -= delta;
        this.pathTimer -= delta;

        if (this.waitTimer <= 0 && this.pathTimer <= 0) {
            this.pathTimer = 0.3 + Math.random() * 0.2;
            this.think();
        }

        if (this.path && this.path.length > 0) {
            let next = this.path[0];
            let tx = next.x * TILE_SIZE + TILE_SIZE / 2;
            let ty = next.y * TILE_SIZE + TILE_SIZE / 2;
            let dx = tx - this.x;
            let dy = ty - this.y;
            let dist = Math.hypot(dx, dy);

            if (dist < 10) {
                this.path.shift();
                if (this.path.length === 0) {
                    this.vx = 0; this.vy = 0;
                    this.waitTimer = this.state === 'CHASE' ? 0 : 1 + Math.random();
                }
            } else {
                this.vx = (dx / dist) * this.speed;
                this.vy = (dy / dist) * this.speed;
            }
        } else {
            this.vx = 0; this.vy = 0;
        }

        super.update(delta);
    }

    think() {
        if (this.role === 'seeker') {
            // Find closest visible hider
            let closest = null;
            let minDist = Infinity;
            for (let e of entities) {
                if (e === this || e.isDead || e.role === 'seeker') continue;
                if (checkLineOfSight(this.x, this.y, e.x, e.y)) {
                    let d = Math.hypot(e.x - this.x, e.y - this.y);
                    if (d < minDist && d < SEEKER_VISION_RADIUS) {
                        minDist = d;
                        closest = e;
                    }
                }
            }

            if (closest) {
                this.state = 'CHASE';
                this.path = findPath(this.x, this.y, closest.x, closest.y);
            } else {
                this.state = 'PATROL';
                if (!this.path || this.path.length === 0) {
                    let dest = getRandomWalkablePos();
                    this.path = findPath(this.x, this.y, dest.x, dest.y);
                }
            }
        } else {
            // Hider AI
            let seeSeeker = false;
            if (checkLineOfSight(this.x, this.y, seeker.x, seeker.y)) {
                let d = Math.hypot(seeker.x - this.x, seeker.y - this.y);
                if (d < VISION_RADIUS) seeSeeker = true;
            }

            if (seeSeeker) {
                this.state = 'FLEE';
                // Move away from seeker
                let dx = this.x - seeker.x;
                let dy = this.y - seeker.y;
                let len = Math.hypot(dx, dy);
                let targetX = this.x + (dx/len) * 500;
                let targetY = this.y + (dy/len) * 500;
                
                // Clamp to map
                targetX = Math.max(50, Math.min(mapWidth-50, targetX));
                targetY = Math.max(50, Math.min(mapHeight-50, targetY));

                // Find a valid point near the opposite direction
                let tx = Math.floor(targetX / TILE_SIZE);
                let ty = Math.floor(targetY / TILE_SIZE);
                
                if (tx >= 0 && tx < cols && ty >= 0 && ty < rows && grid[ty][tx] === 0) {
                     this.path = findPath(this.x, this.y, targetX, targetY);
                } else {
                     let rand = getRandomWalkablePos();
                     this.path = findPath(this.x, this.y, rand.x, rand.y);
                }
            } else {
                this.state = 'WANDER';
                if (!this.path || this.path.length === 0) {
                    if (Math.random() < 0.2) {
                        let dest = getRandomWalkablePos();
                        this.path = findPath(this.x, this.y, dest.x, dest.y);
                    }
                }
            }
        }
    }
}

/**
 * GLOBALS
 */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
let shadowCanvas, shadowCtx;

let player;
let seeker;
let entities = [];
let bloodDecals = [];

let keys = {};
let camera = { x: 0, y: 0 };
let gameState = 'MENU'; // MENU, PLAYING, GAMEOVER
let timer = ROUND_TIME;
let lastTime = 0;

// UI Elements
const uiMenu = document.getElementById('main-menu');
const uiGameOver = document.getElementById('game-over');
const uiHud = document.getElementById('hud');
const btnStart = document.getElementById('start-btn');
const btnRestart = document.getElementById('restart-btn');
const timeDisplay = document.getElementById('time-display');
const aliveDisplay = document.getElementById('alive-display');

// Minimap Context
const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas.getContext('2d');

/**
 * INPUT
 */
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

window.addEventListener('resize', resizeCanvas);
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = canvas.width;
    shadowCanvas.height = canvas.height;
    shadowCtx = shadowCanvas.getContext('2d');
}

/**
 * GAME LOGIC
 */
function startGame() {
    initMap();
    entities = [];
    bloodDecals = [];
    timer = ROUND_TIME;

    // Spawn Player
    let pPos = getRandomWalkablePos();
    player = new Entity(pPos.x, pPos.y, 'Player');
    player.role = 'hider';
    entities.push(player);

    // Spawn Seeker
    let sPos;
    do { sPos = getRandomWalkablePos(); } while (Math.hypot(sPos.x - pPos.x, sPos.y - pPos.y) < 800);
    seeker = new Bot(sPos.x, sPos.y, 'Seeker', 'seeker');
    entities.push(seeker);

    // Spawn Bots
    for (let i = 0; i < 9; i++) {
        let bPos = getRandomWalkablePos();
        let b = new Bot(bPos.x, bPos.y, HIDER_NAMES[i], 'hider');
        entities.push(b);
    }

    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    gameState = 'PLAYING';
    uiMenu.classList.add('hidden');
    uiGameOver.classList.add('hidden');
    uiHud.classList.remove('hidden');
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function stopGame(won) {
    gameState = 'GAMEOVER';
    uiHud.classList.add('hidden');
    uiGameOver.classList.remove('hidden');
    
    const goTitle = document.getElementById('go-title');
    const goDesc = document.getElementById('go-desc');
    
    if (won) {
        goTitle.textContent = "YOU SURVIVED!";
        goTitle.style.color = "#4ADE80"; // Green
        goDesc.textContent = "The rescue ship has arrived.";
    } else {
        goTitle.textContent = "YOU DIED";
        goTitle.style.color = "#F87171"; // Red
        goDesc.textContent = "The Seeker found you.";
    }
}

/**
 * MAIN LOOP
 */
function gameLoop(timestamp) {
    if (gameState !== 'PLAYING') return;
    
    let delta = (timestamp - lastTime) / 1000;
    if (delta > 0.1) delta = 0.1;
    lastTime = timestamp;

    update(delta);
    draw();

    requestAnimationFrame(gameLoop);
}

function update(delta) {
    // Player Input
    player.vx = 0;
    player.vy = 0;
    if (keys['KeyW'] || keys['ArrowUp']) player.vy = -player.speed;
    if (keys['KeyS'] || keys['ArrowDown']) player.vy = player.speed;
    if (keys['KeyA'] || keys['ArrowLeft']) player.vx = -player.speed;
    if (keys['KeyD'] || keys['ArrowRight']) player.vx = player.speed;

    // Normalize diagonal speed
    if (player.vx !== 0 && player.vy !== 0) {
        let length = Math.hypot(player.vx, player.vy);
        player.vx = (player.vx / length) * player.speed;
        player.vy = (player.vy / length) * player.speed;
    }

    // Update Entities
    let hidersAlive = 0;
    for (let e of entities) {
        e.update(delta);
        if (e.role === 'hider' && !e.isDead) hidersAlive++;
    }

    // Seeker Kill Logic
    for (let e of entities) {
        if (e.role === 'hider' && !e.isDead) {
            let dist = Math.hypot(e.x - seeker.x, e.y - seeker.y);
            if (dist < PLAYER_RADIUS * 2) {
                e.isDead = true;
                // Blood splatter
                for(let i=0; i<5; i++) {
                    bloodDecals.push({
                        x: e.x + (Math.random()-0.5)*30,
                        y: e.y + (Math.random()-0.5)*30,
                        r: 5 + Math.random()*10
                    });
                }
                if (e === player) {
                    stopGame(false);
                    return;
                }
            }
        }
    }

    // Camera Interpolation
    camera.x += (player.x - canvas.width / 2 - camera.x) * 5 * delta;
    camera.y += (player.y - canvas.height / 2 - camera.y) * 5 * delta;

    // Update Timer & UI
    timer -= delta;
    if (timer <= 0) {
        stopGame(true);
        return;
    }

    let m = Math.floor(timer / 60);
    let s = Math.floor(timer % 60);
    timeDisplay.textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    aliveDisplay.textContent = hidersAlive.toString();
}

/**
 * RENDERING
 */
function draw() {
    // 1. Draw Floor
    ctx.fillStyle = '#1A1E24';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Floor Grid pattern
    ctx.strokeStyle = '#22272E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let startX = Math.floor(camera.x / TILE_SIZE) * TILE_SIZE;
    let startY = Math.floor(camera.y / TILE_SIZE) * TILE_SIZE;
    for (let x = startX; x < camera.x + canvas.width; x += TILE_SIZE) {
        ctx.moveTo(x, camera.y);
        ctx.lineTo(x, camera.y + canvas.height);
    }
    for (let y = startY; y < camera.y + canvas.height; y += TILE_SIZE) {
        ctx.moveTo(camera.x, y);
        ctx.lineTo(camera.x + canvas.width, y);
    }
    ctx.stroke();

    // Draw Blood
    ctx.fillStyle = '#8B0000';
    for(let b of bloodDecals) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
        ctx.fill();
    }

    // Sort entities by Y for depth
    entities.sort((a, b) => a.y - b.y);
    
    // Determine who is visible to player
    let visibleEntities = [];
    for (let e of entities) {
        if (e === player) { visibleEntities.push(e); continue; }
        if (!e.isDead && checkLineOfSight(player.x, player.y, e.x, e.y)) {
            visibleEntities.push(e);
        } else if (e.isDead) {
            // keep dead bodies visible if in LOS
            if (checkLineOfSight(player.x, player.y, e.x, e.y)) visibleEntities.push(e);
        }
    }

    // Draw Visible Entities
    for (let e of visibleEntities) {
        e.draw(ctx);
    }

    // Draw Walls
    ctx.fillStyle = '#2A2F3D';
    ctx.strokeStyle = '#4A5568';
    ctx.lineWidth = 4;
    for (let w of walls) {
        // Only draw if on screen
        if (w.x + w.w > camera.x && w.x < camera.x + canvas.width &&
            w.y + w.h > camera.y && w.y < camera.y + canvas.height) {
            
            ctx.beginPath();
            ctx.rect(w.x, w.y, w.w, w.h);
            ctx.fill();
            ctx.stroke();
            
            // Top edge highlight
            ctx.fillStyle = '#3A4153';
            ctx.fillRect(w.x, w.y, w.w, 10);
        }
    }

    ctx.restore();

    // 2. Shadows & FOV (Offscreen Canvas)
    shadowCtx.clearRect(0, 0, shadowCanvas.width, shadowCanvas.height);
    
    // Fill ambient darkness
    shadowCtx.fillStyle = 'rgba(0, 5, 15, 0.98)';
    shadowCtx.fillRect(0, 0, canvas.width, canvas.height);

    // Punch out vision circle
    let cx = player.x - camera.x;
    let cy = player.y - camera.y;

    shadowCtx.globalCompositeOperation = 'destination-out';
    let grad = shadowCtx.createRadialGradient(cx, cy, 0, cx, cy, VISION_RADIUS);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.7, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    
    shadowCtx.fillStyle = grad;
    shadowCtx.beginPath();
    shadowCtx.arc(cx, cy, VISION_RADIUS, 0, Math.PI * 2);
    shadowCtx.fill();

    // Draw Wall Shadows using unified segments
    shadowCtx.globalCompositeOperation = 'source-over';
    shadowCtx.fillStyle = 'rgba(0, 5, 15, 0.98)';

    for (let seg of shadowSegments) {
        // Culling optimization: is segment near camera/player?
        let minX = Math.min(seg.p1.x, seg.p2.x);
        let maxX = Math.max(seg.p1.x, seg.p2.x);
        let minY = Math.min(seg.p1.y, seg.p2.y);
        let maxY = Math.max(seg.p1.y, seg.p2.y);

        if (maxX < camera.x - VISION_RADIUS || minX > camera.x + canvas.width + VISION_RADIUS ||
            maxY < camera.y - VISION_RADIUS || minY > camera.y + canvas.height + VISION_RADIUS) {
            continue; 
        }

        let dx = seg.p2.x - seg.p1.x;
        let dy = seg.p2.y - seg.p1.y;
        let nx = -dy;
        let ny = dx;

        let midX = (seg.p1.x + seg.p2.x) / 2;
        let midY = (seg.p1.y + seg.p2.y) / 2;
        let lx = midX - player.x;
        let ly = midY - player.y;

        // If segment faces player
        if (nx * lx + ny * ly < 0) {
            // Screen space coordinates
            let sp1x = seg.p1.x - camera.x;
            let sp1y = seg.p1.y - camera.y;
            let sp2x = seg.p2.x - camera.x;
            let sp2y = seg.p2.y - camera.y;
            let splx = player.x - camera.x;
            let sply = player.y - camera.y;

            // Project out shadows dynamically
            let ep1x = sp1x + (sp1x - splx) * 50;
            let ep1y = sp1y + (sp1y - sply) * 50;
            let ep2x = sp2x + (sp2x - splx) * 50;
            let ep2y = sp2y + (sp2y - sply) * 50;

            // Pad slightly to prevent sub-pixel rendering seams
            let padDirX = sp2x - sp1x;
            let padDirY = sp2y - sp1y;
            let pLen = Math.hypot(padDirX, padDirY);
            if (pLen > 0) {
                padDirX /= pLen; padDirY /= pLen;
                sp1x -= padDirX * 1; sp1y -= padDirY * 1;
                sp2x += padDirX * 1; sp2y += padDirY * 1;
            }

            shadowCtx.beginPath();
            shadowCtx.moveTo(sp1x, sp1y);
            shadowCtx.lineTo(sp2x, sp2y);
            shadowCtx.lineTo(ep2x, ep2y);
            shadowCtx.lineTo(ep1x, ep1y);
            shadowCtx.fill();
        }
    }

    // Blend shadow layer to main canvas
    ctx.drawImage(shadowCanvas, 0, 0);

    // Vignette
    let vGrad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height/3, canvas.width/2, canvas.height/2, canvas.height);
    vGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update Minimap
    drawMinimap(visibleEntities);
}

function drawMinimap(visibleEntities) {
    minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    
    let scaleX = minimapCanvas.width / mapWidth;
    let scaleY = minimapCanvas.height / mapHeight;

    // Draw Map Walls
    minimapCtx.fillStyle = 'rgba(74, 85, 104, 0.7)'; // Grayish walls
    for (let w of walls) {
        minimapCtx.fillRect(w.x * scaleX, w.y * scaleY, w.w * scaleX, w.h * scaleY);
    }

    // Draw Player Range (Line of sight approx)
    minimapCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    minimapCtx.beginPath();
    minimapCtx.arc(player.x * scaleX, player.y * scaleY, VISION_RADIUS * scaleX, 0, Math.PI*2);
    minimapCtx.fill();

    // Draw Entities
    for (let e of entities) {
        if (e.isDead) continue;
        
        let ex = e.x * scaleX;
        let ey = e.y * scaleY;

        if (e === player) {
            minimapCtx.fillStyle = '#3B82F6'; // Blue for player
        } else if (e.role === 'hider') {
            minimapCtx.fillStyle = '#10B981'; // Green for fellow hiders
        } else if (e.role === 'seeker') {
            // Only show seeker on minimap if visible!
            if (visibleEntities.includes(e)) {
                minimapCtx.fillStyle = '#EF4444'; // Red for seeker
            } else {
                continue; // Skip drawing unseen seeker
            }
        }
        
        minimapCtx.beginPath();
        minimapCtx.arc(ex, ey, 3, 0, Math.PI*2);
        minimapCtx.fill();
    }
}

// Init Setup
resizeCanvas();
btnStart.addEventListener('click', startGame);
btnRestart.addEventListener('click', startGame);

// Draw background once on menu
ctx.fillStyle = '#0b0c10';
ctx.fillRect(0, 0, canvas.width, canvas.height);

</script>
</body>
</html>
// Game Configuration
const GRID_SIZE = 15;
const CELL_SIZE = 1;
const MOVE_INTERVAL = 150; // milliseconds between moves

// Three.js Setup
let scene, camera, renderer;
let snake = [];
let food = null;
let snakeMeshes = [];
let foodMesh = null;
let gridHelper;
let score = 0;
let lastMoveTime = 0;
let gameRunning = true;

// Initialize the game
function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Camera setup
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(GRID_SIZE / 2, GRID_SIZE * 1.2, GRID_SIZE * 1.2);
    camera.lookAt(GRID_SIZE / 2, 0, GRID_SIZE / 2);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('game-canvas'),
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    // Create grid floor
    createGrid();

    // Initialize snake
    initSnake();

    // Spawn first food
    spawnFood();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Start game loop
    animate();
}

function createGrid() {
    // Create a grid floor
    const gridGeometry = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
    const gridMaterial = new THREE.MeshBasicMaterial({
        color: 0x2a2a4e,
        side: THREE.DoubleSide
    });
    const gridFloor = new THREE.Mesh(gridGeometry, gridMaterial);
    gridFloor.rotation.x = -Math.PI / 2;
    gridFloor.position.set(GRID_SIZE / 2 - 0.5, -0.5, GRID_SIZE / 2 - 0.5);
    scene.add(gridFloor);

    // Grid lines
    const gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, 0x444466, 0x333355);
    gridHelper.position.set(GRID_SIZE / 2 - 0.5, -0.49, GRID_SIZE / 2 - 0.5);
    scene.add(gridHelper);

    // Border walls
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.3 });
    const wallHeight = 0.5;
    
    // Create walls around the grid
    const walls = [
        { pos: [GRID_SIZE / 2 - 0.5, wallHeight / 2, -0.5], size: [GRID_SIZE, wallHeight, 0.1] },
        { pos: [GRID_SIZE / 2 - 0.5, wallHeight / 2, GRID_SIZE - 0.5], size: [GRID_SIZE, wallHeight, 0.1] },
        { pos: [-0.5, wallHeight / 2, GRID_SIZE / 2 - 0.5], size: [0.1, wallHeight, GRID_SIZE] },
        { pos: [GRID_SIZE - 0.5, wallHeight / 2, GRID_SIZE / 2 - 0.5], size: [0.1, wallHeight, GRID_SIZE] }
    ];

    walls.forEach(wall => {
        const geometry = new THREE.BoxGeometry(...wall.size);
        const mesh = new THREE.Mesh(geometry, wallMaterial);
        mesh.position.set(...wall.pos);
        scene.add(mesh);
    });
}

function initSnake() {
    snake = [
        { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }
    ];
    score = 0;
    updateUI();
    createSnakeMeshes();
}

function createSnakeMeshes() {
    // Remove old meshes
    snakeMeshes.forEach(mesh => scene.remove(mesh));
    snakeMeshes = [];

    // Create new meshes
    snake.forEach((segment, index) => {
        const geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
        const material = new THREE.MeshPhongMaterial({
            color: index === 0 ? 0x00ff88 : 0x00cc66,
            emissive: index === 0 ? 0x00ff88 : 0x00cc66,
            emissiveIntensity: 0.2
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(segment.x, 0, segment.y);
        scene.add(mesh);
        snakeMeshes.push(mesh);
    });
}

function updateSnakeMeshes() {
    snake.forEach((segment, index) => {
        if (snakeMeshes[index]) {
            snakeMeshes[index].position.set(segment.x, 0, segment.y);
        }
    });
}

function spawnFood() {
    let validPosition = false;
    let x, y;

    while (!validPosition) {
        x = Math.floor(Math.random() * GRID_SIZE);
        y = Math.floor(Math.random() * GRID_SIZE);
        
        validPosition = !snake.some(segment => segment.x === x && segment.y === y);
    }

    food = { x, y };

    // Remove old food mesh
    if (foodMesh) {
        scene.remove(foodMesh);
    }

    // Create new food mesh
    const geometry = new THREE.SphereGeometry(0.4, 16, 16);
    const material = new THREE.MeshPhongMaterial({
        color: 0xff4444,
        emissive: 0xff4444,
        emissiveIntensity: 0.5
    });
    foodMesh = new THREE.Mesh(geometry, material);
    foodMesh.position.set(x, 0, y);
    scene.add(foodMesh);
}

// Autonomous movement using BFS pathfinding
function getNextMove() {
    if (!food) return null;

    const head = snake[0];
    const directions = [
        { dx: 0, dy: -1 },  // up
        { dx: 0, dy: 1 },   // down
        { dx: -1, dy: 0 },  // left
        { dx: 1, dy: 0 }    // right
    ];

    // Try to find path to food using BFS
    const path = findPath(head, food);
    
    if (path && path.length > 1) {
        const nextPos = path[1];
        return {
            x: nextPos.x,
            y: nextPos.y
        };
    }

    // If no path to food, try to find any valid move
    for (const dir of directions) {
        const newX = head.x + dir.dx;
        const newY = head.y + dir.dy;
        
        if (isValidMove(newX, newY)) {
            return { x: newX, y: newY };
        }
    }

    return null; // No valid moves
}

function findPath(start, end) {
    const queue = [[start]];
    const visited = new Set();
    visited.add(`${start.x},${start.y}`);

    while (queue.length > 0) {
        const path = queue.shift();
        const current = path[path.length - 1];

        if (current.x === end.x && current.y === end.y) {
            return path;
        }

        const directions = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
        ];

        for (const dir of directions) {
            const newX = current.x + dir.dx;
            const newY = current.y + dir.dy;
            const key = `${newX},${newY}`;

            if (isValidMove(newX, newY) && !visited.has(key)) {
                visited.add(key);
                const newPath = [...path, { x: newX, y: newY }];
                queue.push(newPath);
            }
        }
    }

    return null; // No path found
}

function isValidMove(x, y) {
    // Check bounds
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
        return false;
    }

    // Check collision with snake (except tail, which will move)
    for (let i = 0; i < snake.length - 1; i++) {
        if (snake[i].x === x && snake[i].y === y) {
            return false;
        }
    }

    return true;
}

function moveSnake() {
    const nextMove = getNextMove();

    if (!nextMove) {
        // No valid moves - game over, restart
        restartGame();
        return;
    }

    const newHead = { x: nextMove.x, y: nextMove.y };

    // Check if ate food
    if (food && newHead.x === food.x && newHead.y === food.y) {
        snake.unshift(newHead);
        score += 10;
        updateUI();
        spawnFood();
        createSnakeMeshes();
    } else {
        snake.unshift(newHead);
        snake.pop();
        updateSnakeMeshes();
    }
}

function restartGame() {
    // Clear snake meshes
    snakeMeshes.forEach(mesh => scene.remove(mesh));
    snakeMeshes = [];
    
    // Clear food
    if (foodMesh) {
        scene.remove(foodMesh);
        foodMesh = null;
    }

    // Reset game
    initSnake();
    spawnFood();
}

function updateUI() {
    document.getElementById('length').textContent = snake.length;
    document.getElementById('score').textContent = score;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(currentTime) {
    requestAnimationFrame(animate);

    // Move snake at fixed interval
    if (currentTime - lastMoveTime > MOVE_INTERVAL) {
        moveSnake();
        lastMoveTime = currentTime;
    }

    // Rotate food for visual effect
    if (foodMesh) {
        foodMesh.rotation.y += 0.05;
        foodMesh.position.y = 0.1 + Math.sin(currentTime * 0.005) * 0.1;
    }

    renderer.render(scene, camera);
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
        console.log('Service worker registration failed:', err);
    });
}

// Start the game
init();

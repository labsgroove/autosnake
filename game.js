// Game Configuration
const GRID_SIZE = 15;
const GRID_HEIGHT = 10;
const CELL_SIZE = 1;
const MOVE_INTERVAL = 150; // milliseconds between moves
const INTERPOLATION_SPEED = 0.15; // smooth interpolation factor

// Three.js Setup
let scene, camera, renderer;
let snake = [];
let food = null;
let snakeMesh = null; // Single curved tube mesh
let snakeHeadMesh = null; // Sphere for head
let snakeTailMesh = null; // Sphere for tail
let foodMesh = null;
let gridHelper;
let score = 0;
let lastMoveTime = 0;
let gameRunning = true;
let particles = [];
let audioContext;
let interpolatedSnake = []; // Smoothly interpolated positions

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
    camera.position.set(GRID_SIZE / 2, GRID_HEIGHT * 1.5, GRID_SIZE * 1.5);
    camera.lookAt(GRID_SIZE / 2, GRID_HEIGHT / 2, GRID_SIZE / 2);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('game-canvas'),
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x00ff88, 1, 20);
    pointLight.position.set(GRID_SIZE / 2, 5, GRID_SIZE / 2);
    scene.add(pointLight);

    // Initialize audio
    initAudio();

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
    // Create 3D grid box
    const boxGeometry = new THREE.BoxGeometry(GRID_SIZE, GRID_HEIGHT, GRID_SIZE);
    const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.3 });

    // Create grid planes for each axis
    const gridMaterial = new THREE.MeshBasicMaterial({
        color: 0x2a2a4e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.1
    });

    // Floor grid
    const floorGrid = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, 0x444466, 0x333355);
    floorGrid.position.set(GRID_SIZE / 2 - 0.5, -0.5, GRID_SIZE / 2 - 0.5);
    scene.add(floorGrid);
}

function initSnake() {
    snake = [
        { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2), z: Math.floor(GRID_HEIGHT / 2) }
    ];
    // Initialize interpolated positions to match grid positions
    interpolatedSnake = snake.map(seg => ({ x: seg.x, y: seg.y, z: seg.z }));
    score = 0;
    updateUI();
    createSnakeMesh();
}

function createSnakeMesh() {
    // Remove old meshes
    if (snakeMesh) {
        scene.remove(snakeMesh);
        snakeMesh = null;
    }
    if (snakeHeadMesh) {
        scene.remove(snakeHeadMesh);
        snakeHeadMesh = null;
    }
    if (snakeTailMesh) {
        scene.remove(snakeTailMesh);
        snakeTailMesh = null;
    }

    // Create curved tube using Catmull-Rom spline
    updateSnakeMesh();
}

function updateSnakeMesh() {
    // Remove old mesh
    if (snakeMesh) {
        scene.remove(snakeMesh);
    }
    if (snakeHeadMesh) {
        scene.remove(snakeHeadMesh);
        snakeHeadMesh = null;
    }
    if (snakeTailMesh) {
        scene.remove(snakeTailMesh);
        snakeTailMesh = null;
    }

    // Need at least 2 points to create a curve
    if (interpolatedSnake.length < 2) {
        // Create a single sphere for single-segment snake
        const geometry = new THREE.SphereGeometry(0.4, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ff88,
            emissive: 0x00ff88,
            emissiveIntensity: 0.3,
            shininess: 100
        });
        snakeMesh = new THREE.Mesh(geometry, material);
        snakeMesh.position.set(interpolatedSnake[0].x, interpolatedSnake[0].z, interpolatedSnake[0].y);
        scene.add(snakeMesh);
        return;
    }

    // Create curve points from interpolated positions
    const points = interpolatedSnake.map(seg => 
        new THREE.Vector3(seg.x, seg.z, seg.y)
    );

    // Create Catmull-Rom curve for smooth interpolation
    const curve = new THREE.CatmullRomCurve3(points);
    curve.curveType = 'catmullrom';
    curve.tension = 0.5;

    // Create tube geometry along the curve
    const tubeGeometry = new THREE.TubeGeometry(curve, interpolatedSnake.length * 8, 0.35, 16, false);
    
    // Create gradient material (head brighter, tail darker)
    const material = new THREE.MeshPhongMaterial({
        color: 0x00cc66,
        emissive: 0x00cc66,
        emissiveIntensity: 0.3,
        shininess: 100
    });

    snakeMesh = new THREE.Mesh(tubeGeometry, material);
    scene.add(snakeMesh);

    // Add head sphere (brighter)
    const headGeometry = new THREE.SphereGeometry(0.35, 32, 32);
    const headMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff88,
        emissive: 0x00ff88,
        emissiveIntensity: 0.4,
        shininess: 100
    });
    snakeHeadMesh = new THREE.Mesh(headGeometry, headMaterial);
    const headPos = interpolatedSnake[0];
    snakeHeadMesh.position.set(headPos.x, headPos.z, headPos.y);
    scene.add(snakeHeadMesh);

    // Add tail sphere (slightly smaller)
    const tailGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const tailMaterial = new THREE.MeshPhongMaterial({
        color: 0x00aa55,
        emissive: 0x00aa55,
        emissiveIntensity: 0.2,
        shininess: 100
    });
    snakeTailMesh = new THREE.Mesh(tailGeometry, tailMaterial);
    const tailPos = interpolatedSnake[interpolatedSnake.length - 1];
    snakeTailMesh.position.set(tailPos.x, tailPos.z, tailPos.y);
    scene.add(snakeTailMesh);
}

function spawnFood() {
    let validPosition = false;
    let x, y, z;

    while (!validPosition) {
        x = Math.floor(Math.random() * GRID_SIZE);
        y = Math.floor(Math.random() * GRID_SIZE);
        z = Math.floor(Math.random() * GRID_HEIGHT);
        
        validPosition = !snake.some(segment => segment.x === x && segment.y === y && segment.z === z);
    }

    food = { x, y, z };

    // Remove old food mesh
    if (foodMesh) {
        scene.remove(foodMesh);
    }

    // Create new food mesh with glow effect
    const geometry = new THREE.SphereGeometry(0.4, 32, 32);
    const material = new THREE.MeshPhongMaterial({
        color: 0xff4444,
        emissive: 0xff4444,
        emissiveIntensity: 0.8,
        shininess: 100
    });
    foodMesh = new THREE.Mesh(geometry, material);
    foodMesh.position.set(x, z, y);
    scene.add(foodMesh);
}

// Autonomous movement using BFS pathfinding
function getNextMove() {
    if (!food) return null;

    const head = snake[0];
    const directions = [
        { dx: 0, dy: -1, dz: 0 },  // up (negative y)
        { dx: 0, dy: 1, dz: 0 },   // down (positive y)
        { dx: -1, dy: 0, dz: 0 },  // left (negative x)
        { dx: 1, dy: 0, dz: 0 },   // right (positive x)
        { dx: 0, dy: 0, dz: -1 },  // down (negative z)
        { dx: 0, dy: 0, dz: 1 }    // up (positive z)
    ];

    // Try to find path to food using BFS
    const path = findPath(head, food);
    
    if (path && path.length > 1) {
        const nextPos = path[1];
        return {
            x: nextPos.x,
            y: nextPos.y,
            z: nextPos.z
        };
    }

    // If no path to food, try to find any valid move
    for (const dir of directions) {
        const newX = head.x + dir.dx;
        const newY = head.y + dir.dy;
        const newZ = head.z + dir.dz;
        
        if (isValidMove(newX, newY, newZ)) {
            return { x: newX, y: newY, z: newZ };
        }
    }

    return null; // No valid moves
}

function findPath(start, end) {
    const queue = [[start]];
    const visited = new Set();
    visited.add(`${start.x},${start.y},${start.z}`);

    while (queue.length > 0) {
        const path = queue.shift();
        const current = path[path.length - 1];

        if (current.x === end.x && current.y === end.y && current.z === end.z) {
            return path;
        }

        const directions = [
            { dx: 0, dy: -1, dz: 0 },
            { dx: 0, dy: 1, dz: 0 },
            { dx: -1, dy: 0, dz: 0 },
            { dx: 1, dy: 0, dz: 0 },
            { dx: 0, dy: 0, dz: -1 },
            { dx: 0, dy: 0, dz: 1 }
        ];

        for (const dir of directions) {
            const newX = current.x + dir.dx;
            const newY = current.y + dir.dy;
            const newZ = current.z + dir.dz;
            const key = `${newX},${newY},${newZ}`;

            if (isValidMove(newX, newY, newZ) && !visited.has(key)) {
                visited.add(key);
                const newPath = [...path, { x: newX, y: newY, z: newZ }];
                queue.push(newPath);
            }
        }
    }

    return null; // No path found
}

function isValidMove(x, y, z) {
    // Check bounds
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE || z < 0 || z >= GRID_HEIGHT) {
        return false;
    }

    // Check collision with snake (except tail, which will move)
    for (let i = 0; i < snake.length - 1; i++) {
        if (snake[i].x === x && snake[i].y === y && snake[i].z === z) {
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

    const newHead = { x: nextMove.x, y: nextMove.y, z: nextMove.z };

    // Check if ate food
    if (food && newHead.x === food.x && newHead.y === food.y && newHead.z === food.z) {
        snake.unshift(newHead);
        // Add new interpolated position at head
        interpolatedSnake.unshift({ x: newHead.x, y: newHead.y, z: newHead.z });
        score += 10;
        updateUI();
        createParticles(food.x, food.z, food.y, 0xff4444);
        playSound('eat');
        spawnFood();
        createSnakeMesh();
    } else {
        snake.unshift(newHead);
        snake.pop();
        // Update interpolated positions to match new snake structure
        // Keep the same number of interpolated segments
        interpolatedSnake.unshift({ x: newHead.x, y: newHead.y, z: newHead.z });
        interpolatedSnake.pop();
    }
}

function restartGame() {
    // Clear snake mesh
    if (snakeMesh) {
        scene.remove(snakeMesh);
        snakeMesh = null;
    }
    if (snakeHeadMesh) {
        scene.remove(snakeHeadMesh);
        snakeHeadMesh = null;
    }
    if (snakeTailMesh) {
        scene.remove(snakeTailMesh);
        snakeTailMesh = null;
    }
    
    // Clear food
    if (foodMesh) {
        scene.remove(foodMesh);
        foodMesh = null;
    }

    // Clear particles
    particles.forEach(p => scene.remove(p.mesh));
    particles = [];

    // Reset timing
    lastMoveTime = 0;

    // Reset game
    initSnake();
    spawnFood();
    playSound('gameover');
}

function updateUI() {
    document.getElementById('length').textContent = snake.length;
    document.getElementById('score').textContent = score;
}

function interpolateSnakePositions() {
    // Smoothly interpolate each segment towards its target position
    for (let i = 0; i < interpolatedSnake.length && i < snake.length; i++) {
        const target = snake[i];
        const current = interpolatedSnake[i];
        
        // Linear interpolation (lerp)
        current.x += (target.x - current.x) * INTERPOLATION_SPEED;
        current.y += (target.y - current.y) * INTERPOLATION_SPEED;
        current.z += (target.z - current.z) * INTERPOLATION_SPEED;
    }
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

    // Smoothly interpolate snake positions
    interpolateSnakePositions();

    // Update snake mesh with interpolated positions
    updateSnakeMesh();

    // Rotate food for visual effect
    if (foodMesh) {
        foodMesh.rotation.y += 0.05;
        foodMesh.rotation.x += 0.03;
        foodMesh.position.y = food.z + Math.sin(currentTime * 0.005) * 0.15;
    }

    // Update particles
    updateParticles();

    // Animate snake glow
    if (snakeMesh) {
        const pulse = 0.3 + Math.sin(currentTime * 0.01) * 0.1;
        snakeMesh.material.emissiveIntensity = pulse;
    }
    if (snakeHeadMesh) {
        const headPulse = 0.4 + Math.sin(currentTime * 0.01) * 0.15;
        snakeHeadMesh.material.emissiveIntensity = headPulse;
    }
    if (snakeTailMesh) {
        const tailPulse = 0.2 + Math.sin(currentTime * 0.01) * 0.05;
        snakeTailMesh.material.emissiveIntensity = tailPulse;
    }

    renderer.render(scene, camera);
}

// Particle system
function createParticles(x, y, z, color) {
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1
        });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.set(x, y, z);
        
        const velocity = {
            x: (Math.random() - 0.5) * 0.2,
            y: (Math.random() - 0.5) * 0.2,
            z: (Math.random() - 0.5) * 0.2
        };
        
        scene.add(mesh);
        particles.push({ mesh, velocity, life: 1.0 });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        p.mesh.position.x += p.velocity.x;
        p.mesh.position.y += p.velocity.y;
        p.mesh.position.z += p.velocity.z;
        
        p.life -= 0.02;
        p.mesh.material.opacity = p.life;
        
        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }
}

// Audio system
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('Audio not supported');
    }
}

function playSound(type) {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch (type) {
        case 'eat':
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'gameover':
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
    }
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
        console.log('Service worker registration failed:', err);
    });
}

// Start the game
init();

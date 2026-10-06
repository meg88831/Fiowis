/* ==========================================
   State & App Management
   ========================================== */
let currentTab = 'home';
let isDarkMode = false;
let showGridAxis = true;

// Compass variables
let compassRadius = 120;
let compassColor = '#0284c7';
let compassThickness = 3;

/* ==========================================
   Tab Navigation & Theme
   ========================================== */
function switchTab(tabId) {
    // Verberg alle panelen
    const panels = ['home', 'passer', '3dshapes', 'liniaal', 'grafiek', 'vormen', 'game', 'pomodoro'];
    panels.forEach(p => {
        const el = document.getElementById(`panel-${p}`);
        if (el) el.classList.add('hidden');
        
        const tabBtn = document.getElementById(`tab-${p}`);
        if (tabBtn) {
            tabBtn.classList.remove('border-sky-600', 'text-sky-600', 'dark:text-sky-400', 'font-semibold');
            tabBtn.classList.add('border-transparent', 'text-slate-500');
        }
    });

    // Toon het actieve paneel
    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.remove('hidden');
        if (tabId === 'passer' || tabId === 'liniaal' || tabId === '3dshapes' || tabId === 'grafiek') {
            activePanel.classList.add('flex');
        }
    }

    const activeTabBtn = document.getElementById(`tab-${tabId}`);
    if (activeTabBtn) {
        activeTabBtn.classList.remove('border-transparent', 'text-slate-500');
        activeTabBtn.classList.add('border-sky-600', 'text-sky-600', 'dark:text-sky-400', 'font-semibold');
    }

    currentTab = tabId;

    // Trigger canvas re-renders
    if (tabId === 'passer') initCompassCanvas();
    if (tabId === '3dshapes') init3DScene();
    if (tabId === 'grafiek') drawFunction();
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.documentElement.classList.toggle('dark', isDarkMode);
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = isDarkMode ? 'fa-solid fa-sun text-amber-400' : 'fa-solid fa-moon text-base';
    }
}

/* ==========================================
   Modal Functions
   ========================================== */
function showModal(title, message) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalMessage').innerText = message;
    document.getElementById('customModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('customModal').classList.add('hidden');
}

/* ==========================================
   Passer / Compass Canvas
   ========================================== */
function initCompassCanvas() {
    const canvas = document.getElementById('compassCanvas');
    if (!canvas) return;
    const container = document.getElementById('canvasContainer');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    drawCompassGrid(canvas);
}

function drawCompassGrid(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showGridAxis) {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        const gridSize = 20;

        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Assen
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);

        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, canvas.height);
        ctx.moveTo(0, centerY);
        ctx.lineTo(canvas.width, centerY);
        ctx.stroke();
    }
}

function updateCompassRadius(val) {
    compassRadius = parseFloat(val);
    document.getElementById('radiusValDisplay').innerText = `${val} px`;
    
    // Berekeningen
    const perimeter = (2 * Math.PI * compassRadius).toFixed(1);
    const area = (Math.PI * Math.pow(compassRadius, 2)).toFixed(1);
    document.getElementById('calcPerimeter').innerText = `${perimeter} px`;
    document.getElementById('calcArea').innerText = `${area} px²`;
}

function setCompassColor(color) {
    compassColor = color;
}

function updateThickness(val) {
    compassThickness = parseInt(val);
}

function toggleGridAxis() {
    showGridAxis = !showGridAxis;
    document.getElementById('axisToggleText').innerText = `Assen: ${showGridAxis ? 'AAN' : 'UIT'}`;
    initCompassCanvas();
}

function clearCompassCanvas() {
    initCompassCanvas();
}

function autoDrawFullCircle() {
    const canvas = document.getElementById('compassCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, compassRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = compassColor;
    ctx.lineWidth = compassThickness;
    ctx.stroke();
}

/* ==========================================
   3D Shapes Viewer (Three.js)
   ========================================== */
let scene, camera, renderer, currentMesh;
let is3DInit = false;

function init3DScene() {
    const container = document.getElementById('threeContainer');
    if (!container || is3DInit) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7.5).normalize();
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    change3DShape('cube');
    animate3D();
    is3DInit = true;
}

function change3DShape(shape) {
    if (!scene) return;
    if (currentMesh) scene.remove(currentMesh);

    let geometry;
    const p1 = parseFloat(document.getElementById('param1Slider').value);
    const p2 = parseFloat(document.getElementById('param2Slider').value);

    switch (shape) {
        case 'cylinder':
            geometry = new THREE.CylinderGeometry(p1 / 2, p1 / 2, p2, 32);
            break;
        case 'sphere':
            geometry = new THREE.SphereGeometry(p1 / 2, 32, 32);
            break;
        case 'cone':
            geometry = new THREE.ConeGeometry(p1 / 2, p2, 32);
            break;
        case 'pyramid':
            geometry = new THREE.ConeGeometry(p1 / 2, p2, 4);
            break;
        case 'cube':
        default:
            geometry = new THREE.BoxGeometry(p1, p2, p1);
            break;
    }

    const material = new THREE.MeshPhongMaterial({ color: 0x6366f1, wireframe: false });
    currentMesh = new THREE.Mesh(geometry, material);
    scene.add(currentMesh);
}

function update3DShapeParams() {
    const shape = document.getElementById('shape3DSelect').value;
    change3DShape(shape);
}

function toggle3DWireframe() {
    if (currentMesh) {
        currentMesh.material.wireframe = !currentMesh.material.wireframe;
        document.getElementById('wireframeBtn').innerText = `Wireframe: ${currentMesh.material.wireframe ? 'AAN' : 'UIT'}`;
    }
}

function reset3DCamera() {
    if (camera) {
        camera.position.set(10, 10, 10);
        camera.lookAt(0, 0, 0);
    }
}

function animate3D() {
    requestAnimationFrame(animate3D);
    if (currentMesh) {
        currentMesh.rotation.y += 0.005;
    }
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

/* ==========================================
   Ruler Canvas
   ========================================== */
function clearRulerCanvas() {
    const canvas = document.getElementById('rulerCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/* ==========================================
   Function Graph Plotter
   ========================================== */
function drawFunction() {
    const canvas = document.getElementById('graphCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Assenstelsel
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const scale = 40;

    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, canvas.height);
    ctx.moveTo(0, cy); ctx.lineTo(canvas.width, cy);
    ctx.stroke();

    // Grafiek
    const expr = document.getElementById('functionInput').value;
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();

    let first = true;
    for (let px = 0; px < canvas.width; px++) {
        const x = (px - cx) / scale;
        try {
            const y = eval(expr);
            const py = cy - (y * scale);
            if (first) {
                ctx.moveTo(px, py);
                first = false;
            } else {
                ctx.lineTo(px, py);
            }
        } catch (e) {
            // Negeer evaluatiefouten
        }
    }
    ctx.stroke();
}

function setGraphFunc(fn) {
    document.getElementById('functionInput').value = fn;
    drawFunction();
}

function resetGraphZoom() {
    drawFunction();
}

/* ==========================================
   Initialization
   ========================================== */
window.addEventListener('resize', () => {
    if (currentTab === 'passer') initCompassCanvas();
    if (currentTab === 'grafiek') drawFunction();
});

window.addEventListener('DOMContentLoaded', () => {
    switchTab('home');
});
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

// Interactive Compass state
let isAnchored = false;
let anchorX = 0;
let anchorY = 0;
let mouseX = 0;
let mouseY = 0;
let isDrawing = false;
let lastAngle = null;

// Persistent offscreen canvas for drawings
let drawnCanvas = document.createElement('canvas');
let drawnCtx = drawnCanvas.getContext('2d');

/* ==========================================
   Tab Navigation & Theme
   ========================================== */
function switchTab(tabId) {
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
   Passer / Compass Interactive Canvas Logic
   ========================================== */
function initCompassCanvas() {
    const canvas = document.getElementById('compassCanvas');
    if (!canvas) return;
    const container = document.getElementById('canvasContainer');
    
    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width;
    canvas.height = height;

    if (drawnCanvas.width !== width || drawnCanvas.height !== height) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = drawnCanvas.width;
        tempCanvas.height = drawnCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(drawnCanvas, 0, 0);

        drawnCanvas.width = width;
        drawnCanvas.height = height;
        drawnCtx.drawImage(tempCanvas, 0, 0);
    }

    if (!mouseX && !mouseY) {
        mouseX = width / 2;
        mouseY = height / 2;
    }

    setupCompassEventListeners();
    renderCompass();
}

function setupCompassEventListeners() {
    const canvas = document.getElementById('compassCanvas');
    if (!canvas || canvas.dataset.compassSetup) return;
    canvas.dataset.compassSetup = 'true';

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function handleMove(e) {
        const pos = getPos(e);
        mouseX = pos.x;
        mouseY = pos.y;

        // Coordinate relative to canvas center
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);
        const activeX = isAnchored ? anchorX : mouseX;
        const activeY = isAnchored ? anchorY : mouseY;
        const relX = Math.round(activeX - centerX);
        const relY = Math.round(centerY - activeY);

        const coordDisplay = document.getElementById('needleCoordDisplay');
        if (coordDisplay) {
            coordDisplay.innerText = `(${relX}, ${relY})`;
        }

        if (isAnchored) {
            const dx = mouseX - anchorX;
            const dy = mouseY - anchorY;
            let currentAngleDeg = Math.round((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360);
            const calcAngle = document.getElementById('calcAngle');
            if (calcAngle) calcAngle.innerText = `${currentAngleDeg}°`;

            if (isDrawing) {
                const currentAngleRad = Math.atan2(dy, dx);
                if (lastAngle !== null) {
                    drawnCtx.beginPath();
                    drawnCtx.arc(anchorX, anchorY, compassRadius, lastAngle, currentAngleRad, false);
                    drawnCtx.strokeStyle = compassColor;
                    drawnCtx.lineWidth = compassThickness;
                    drawnCtx.lineCap = 'round';
                    drawnCtx.stroke();
                }
                lastAngle = currentAngleRad;
            }
        }

        renderCompass();
    }

    function handleDown(e) {
        if (e.button !== undefined && e.button !== 0) return;
        const pos = getPos(e);
        mouseX = pos.x;
        mouseY = pos.y;

        if (!isAnchored) {
            isAnchored = true;
            anchorX = mouseX;
            anchorY = mouseY;
            
            const badge = document.getElementById('passerStatusBadge');
            if (badge) {
                badge.className = "inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold";
                badge.innerHTML = `<i class="fa-solid fa-thumbtack mr-1.5"></i> Passer verankerd! Sleep de muis om te tekenen.`;
            }
            const unanchorBtn = document.getElementById('unanchorBtn');
            if (unanchorBtn) unanchorBtn.classList.remove('hidden');
        } else {
            isDrawing = true;
            const dx = mouseX - anchorX;
            const dy = mouseY - anchorY;
            lastAngle = Math.atan2(dy, dx);
        }
        renderCompass();
    }

    function handleUp() {
        isDrawing = false;
        lastAngle = null;
    }

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mousedown', handleDown);
    canvas.addEventListener('mouseup', handleUp);
    canvas.addEventListener('mouseleave', handleUp);

    canvas.addEventListener('touchstart', (e) => { handleDown(e); e.preventDefault(); });
    canvas.addEventListener('touchmove', (e) => { handleMove(e); e.preventDefault(); });
    canvas.addEventListener('touchend', handleUp);
}

function unanchorCompass() {
    isAnchored = false;
    isDrawing = false;
    lastAngle = null;

    const badge = document.getElementById('passerStatusBadge');
    if (badge) {
        badge.className = "inline-flex items-center px-2.5 py-1 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-semibold";
        badge.innerHTML = `<i class="fa-solid fa-hand-pointer mr-1.5"></i> Klik om de passer te verankeren op het canvas!`;
    }
    const unanchorBtn = document.getElementById('unanchorBtn');
    if (unanchorBtn) unanchorBtn.classList.add('hidden');

    renderCompass();
}

function renderCompass() {
    const canvas = document.getElementById('compassCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawCompassGrid(canvas);

    ctx.drawImage(drawnCanvas, 0, 0);

    const needleX = isAnchored ? anchorX : mouseX;
    const needleY = isAnchored ? anchorY : mouseY;

    let currentAngle = 0;
    if (isAnchored) {
        const dx = mouseX - anchorX;
        const dy = mouseY - anchorY;
        currentAngle = Math.atan2(dy, dx);
    }

    const pencilX = needleX + compassRadius * Math.cos(currentAngle);
    const pencilY = needleY + compassRadius * Math.sin(currentAngle);

    if (isAnchored) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(needleX, needleY, compassRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(2, 132, 199, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.restore();
    }

    drawCompassGraphic(ctx, needleX, needleY, pencilX, pencilY);
}

function drawCompassGraphic(ctx, nX, nY, pX, pY) {
    const dx = pX - nX;
    const dy = pY - nY;
    const dist = Math.hypot(dx, dy);

    const legLen = Math.max(dist * 0.85, 90);
    const midX = (nX + pX) / 2;
    const midY = (nY + pY) / 2;
    const hDiff = Math.sqrt(Math.max(0, legLen * legLen - (dist / 2) * (dist / 2)));
    const hAngle = Math.atan2(dy, dx) - Math.PI / 2;
    
    const hingeX = midX + hDiff * Math.cos(hAngle);
    const hingeY = midY + hDiff * Math.sin(hAngle);

    const handleX = hingeX + 22 * Math.cos(hAngle);
    const handleY = hingeY + 22 * Math.sin(hAngle);

    ctx.save();

    // Top knob
    ctx.beginPath();
    ctx.moveTo(hingeX, hingeY);
    ctx.lineTo(handleX, handleY);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(handleX, handleY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    // Needle Leg (Silver)
    ctx.beginPath();
    ctx.moveTo(hingeX, hingeY);
    ctx.lineTo(nX, nY);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Pencil Leg (Silver)
    ctx.beginPath();
    ctx.moveTo(hingeX, hingeY);
    ctx.lineTo(pX, pY);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Center Hinge Joint
    ctx.beginPath();
    ctx.arc(hingeX, hingeY, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#0284c7';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Needle Pin Tip
    ctx.beginPath();
    ctx.arc(nX, nY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Pencil Lead Head
    ctx.beginPath();
    ctx.arc(pX, pY, Math.max(compassThickness, 4), 0, Math.PI * 2);
    ctx.fillStyle = compassColor;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.restore();
}

function drawCompassGrid(canvas) {
    const ctx = canvas.getContext('2d');

    if (showGridAxis) {
        ctx.strokeStyle = isDarkMode ? '#334155' : '#e2e8f0';
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

        ctx.strokeStyle = isDarkMode ? '#64748b' : '#94a3b8';
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
    
    const perimeter = (2 * Math.PI * compassRadius).toFixed(1);
    const area = (Math.PI * Math.pow(compassRadius, 2)).toFixed(1);
    document.getElementById('calcPerimeter').innerText = `${perimeter} px`;
    document.getElementById('calcArea').innerText = `${area} px²`;

    renderCompass();
}

function setCompassColor(color) {
    compassColor = color;
    const picker = document.getElementById('customColorPicker');
    if (picker) picker.value = color;
    renderCompass();
}

function updateThickness(val) {
    compassThickness = parseInt(val);
    renderCompass();
}

function toggleGridAxis() {
    showGridAxis = !showGridAxis;
    document.getElementById('axisToggleText').innerText = `Assen: ${showGridAxis ? 'AAN' : 'UIT'}`;
    renderCompass();
}

function clearCompassCanvas() {
    drawnCtx.clearRect(0, 0, drawnCanvas.width, drawnCanvas.height);
    renderCompass();
}

function autoDrawFullCircle() {
    const canvas = document.getElementById('compassCanvas');
    if (!canvas) return;
    const cX = isAnchored ? anchorX : canvas.width / 2;
    const cY = isAnchored ? anchorY : canvas.height / 2;

    drawnCtx.beginPath();
    drawnCtx.arc(cX, cY, compassRadius, 0, 2 * Math.PI);
    drawnCtx.strokeStyle = compassColor;
    drawnCtx.lineWidth = compassThickness;
    drawnCtx.stroke();

    renderCompass();
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

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const scale = 40;

    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, canvas.height);
    ctx.moveTo(0, cy); ctx.lineTo(canvas.width, cy);
    ctx.stroke();

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
            // Ignore evaluation errors
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
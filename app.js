/* ==========================================
   State & App Management
   ========================================== */
let currentTab = 'home';
let isDarkMode = false;
let showGridAxis = true;

/* --- Passer State --- */
let compassRadius = 120;
let compassColor = '#0284c7';
let compassThickness = 3;
let isAnchored = false;
let anchorX = 0;
let anchorY = 0;
let mouseX = 0;
let mouseY = 0;
let isDrawing = false;
let lastAngle = null;
let passerZoom = 1.0;

let drawnCanvas = document.createElement('canvas');
let drawnCtx = drawnCanvas.getContext('2d');

/* --- Geodriehoek & Liniaal State --- */
let rulerZoom = 1.0;
let geoX = 300;
let geoY = 250;
let geoAngle = 0;
let geoScale = 1.0;
let rulerColor = '#0284c7';
let rulerThickness = 3;
let rulerToolMode = 'line';

let isDraggingGeo = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

let isDrawingRuler = false;
let rulerStartPos = null;
let rulerCurrentPos = null;
let freePoints = [];

let rulerDrawnCanvas = document.createElement('canvas');
let rulerDrawnCtx = rulerDrawnCanvas.getContext('2d');

/* ==========================================
   Tab Navigation & Theme
   ========================================== */
function switchTab(tabId) {
    const panels = ['home', 'passer', '3dshapes', 'liniaal', 'grafiek', 'vormen', 'game', 'pomodoro'];
    
    panels.forEach(p => {
        const el = document.getElementById(`panel-${p}`);
        if (el) {
            el.classList.add('hidden');
            el.classList.remove('flex');
        }
        
        const tabBtn = document.getElementById(`tab-${p}`);
        if (tabBtn) {
            tabBtn.classList.remove('border-sky-600', 'text-sky-600', 'dark:text-sky-400', 'font-semibold');
            tabBtn.classList.add('border-transparent', 'text-slate-500');
        }
    });

    const activePanel = document.getElementById(`panel-${tabId}`);
    if (activePanel) {
        activePanel.classList.remove('hidden');
        if (['passer', 'liniaal', '3dshapes', 'grafiek'].includes(tabId)) {
            activePanel.classList.add('flex');
        }
    }

    const activeTabBtn = document.getElementById(`tab-${tabId}`);
    if (activeTabBtn) {
        activeTabBtn.classList.remove('border-transparent', 'text-slate-500');
        activeTabBtn.classList.add('border-sky-600', 'text-sky-600', 'dark:text-sky-400', 'font-semibold');
    }

    currentTab = tabId;

    requestAnimationFrame(() => {
        if (tabId === 'passer') initCompassCanvas();
        if (tabId === 'liniaal') initRulerCanvas();
        if (tabId === '3dshapes') init3DScene();
        if (tabId === 'grafiek') drawFunction();
        if (tabId === 'game') startNewGame();
    });
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.documentElement.classList.toggle('dark', isDarkMode);
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = isDarkMode ? 'fa-solid fa-sun text-amber-400' : 'fa-solid fa-moon text-base';
    }
}

function showModal(title, message) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalMessage').innerText = message;
    document.getElementById('customModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('customModal').classList.add('hidden');
}

/* ==========================================
   PASSER / COMPASS CANVAS LOGIC
   ========================================== */
function initCompassCanvas() {
    const canvas = document.getElementById('compassCanvas');
    if (!canvas) return;
    const container = document.getElementById('canvasContainer');
    if (!container) return;
    
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    canvas.width = width;
    canvas.height = height;

    if (drawnCanvas.width !== width || drawnCanvas.height !== height) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = drawnCanvas.width || width;
        tempCanvas.height = drawnCanvas.height || height;
        const tempCtx = tempCanvas.getContext('2d');

        if (drawnCanvas.width > 0 && drawnCanvas.height > 0) {
            tempCtx.drawImage(drawnCanvas, 0, 0);
        }

        drawnCanvas.width = width;
        drawnCanvas.height = height;

        if (tempCanvas.width > 0 && tempCanvas.height > 0) {
            drawnCtx.drawImage(tempCanvas, 0, 0);
        }
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

    let initialPinchDistance = 0;
    let initialPinchZoom = 1.0;
    let isPinching = false;

    function getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.hypot(dx, dy);
    }

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) / passerZoom,
            y: (clientY - rect.top) / passerZoom
        };
    }

    function handleMove(e) {
        const pos = getPos(e);
        mouseX = pos.x;
        mouseY = pos.y;

        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);
        const activeX = isAnchored ? anchorX : mouseX;
        const activeY = isAnchored ? anchorY : mouseY;
        const relX = Math.round(activeX - centerX);
        const relY = Math.round(centerY - activeY);

        const coordDisplay = document.getElementById('needleCoordDisplay');
        if (coordDisplay) coordDisplay.innerText = `(${relX}, ${relY})`;

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
                badge.innerHTML = `<i class="fa-solid fa-thumbtack mr-1.5"></i> Passer verankerd! Sleep om te tekenen.`;
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

    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            isPinching = true;
            isDrawing = false;
            initialPinchDistance = getTouchDistance(e.touches[0], e.touches[1]);
            initialPinchZoom = passerZoom;
            e.preventDefault();
            return;
        }
        if (e.touches.length === 1) {
            isPinching = false;
            handleDown(e);
            e.preventDefault();
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && isPinching) {
            const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
            if (initialPinchDistance > 0) {
                const scale = currentDistance / initialPinchDistance;
                passerZoom = Math.min(Math.max(0.5, initialPinchZoom * scale), 2.5);
                const zoomDisplay = document.getElementById('passerZoomDisplay
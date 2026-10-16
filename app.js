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
let geoAngle = 0; // in graden (0-360)
let geoScale = 1.0; // 0.5 tot 2.2
let rulerColor = '#0284c7';
let rulerThickness = 3;
let rulerToolMode = 'line'; // 'line', 'triangle', 'free'

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
    if (tabId === 'liniaal') initRulerCanvas();
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
   PASSER / COMPASS CANVAS LOGIC
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

    canvas.addEventListener('touchstart', (e) => { handleDown(e); e.preventDefault(); });
    canvas.addEventListener('touchmove', (e) => { handleMove(e); e.preventDefault(); });
    canvas.addEventListener('touchend', handleUp);

    // Wheel Zoom op Passer Canvas
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        changePasserZoom(e.deltaY < 0 ? 0.1 : -0.1);
    }, { passive: false });
}

/* Passer Zoom Knoppen */
function changePasserZoom(delta) {
    passerZoom = Math.min(Math.max(0.5, passerZoom + delta), 2.5);
    document.getElementById('passerZoomDisplay').innerText = `${Math.round(passerZoom * 100)}%`;
    renderCompass();
}

function resetPasserZoom() {
    passerZoom = 1.0;
    document.getElementById('passerZoomDisplay').innerText = `100%`;
    renderCompass();
}

function unanchorCompass() {
    isAnchored = false;
    isDrawing = false;
    lastAngle = null;

    const badge = document.getElementById('passerStatusBadge');
    if (badge) {
        badge.className = "inline-flex items-center px-2.5 py-1 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-semibold";
        badge.innerHTML = `<i class="fa-solid fa-hand-pointer mr-1.5"></i> Klik om de passer te verankeren!`;
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

    ctx.save();
    ctx.scale(passerZoom, passerZoom);

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
        ctx.strokeStyle = 'rgba(2, 132, 199, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.restore();
    }

    drawCompassGraphic(ctx, needleX, needleY, pencilX, pencilY);
    ctx.restore();
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

    ctx.beginPath();
    ctx.moveTo(hingeX, hingeY);
    ctx.lineTo(nX, nY);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(hingeX, hingeY);
    ctx.lineTo(pX, pY);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(hingeX, hingeY, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#0284c7';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(nX, nY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

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

        for (let x = 0; x < canvas.width / passerZoom; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height / passerZoom);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height / passerZoom; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width / passerZoom, y);
            ctx.stroke();
        }

        ctx.strokeStyle = isDarkMode ? '#64748b' : '#94a3b8';
        ctx.lineWidth = 2;
        const centerX = Math.floor((canvas.width / passerZoom) / 2);
        const centerY = Math.floor((canvas.height / passerZoom) / 2);

        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, canvas.height / passerZoom);
        ctx.moveTo(0, centerY);
        ctx.lineTo(canvas.width / passerZoom, centerY);
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
    const cX = isAnchored ? anchorX : (canvas.width / passerZoom) / 2;
    const cY = isAnchored ? anchorY : (canvas.height / passerZoom) / 2;

    drawnCtx.beginPath();
    drawnCtx.arc(cX, cY, compassRadius, 0, 2 * Math.PI);
    drawnCtx.strokeStyle = compassColor;
    drawnCtx.lineWidth = compassThickness;
    drawnCtx.stroke();

    renderCompass();
}

/* ==========================================
   GEODRIEHOEK & LINIAAL CANVAS LOGIC
   ========================================== */
function initRulerCanvas() {
    const canvas = document.getElementById('rulerCanvas');
    if (!canvas) return;
    const container = document.getElementById('rulerCanvasContainer');

    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width;
    canvas.height = height;

    if (rulerDrawnCanvas.width !== width || rulerDrawnCanvas.height !== height) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = rulerDrawnCanvas.width;
        tempCanvas.height = rulerDrawnCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(rulerDrawnCanvas, 0, 0);

        rulerDrawnCanvas.width = width;
        rulerDrawnCanvas.height = height;
        rulerDrawnCtx.drawImage(tempCanvas, 0, 0);
    }

    if (geoX === 300 && geoY === 250) {
        geoX = width / 2;
        geoY = height / 2;
    }

    setupRulerEventListeners();
    renderRulerScene();
}

function setupRulerEventListeners() {
    const canvas = document.getElementById('rulerCanvas');
    if (!canvas || canvas.dataset.rulerSetup) return;
    canvas.dataset.rulerSetup = 'true';

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) / rulerZoom,
            y: (clientY - rect.top) / rulerZoom
        };
    }

    function isPointInGeodriehoek(px, py) {
        const rad = geoAngle * Math.PI / 180;
        const dx = px - geoX;
        const dy = py - geoY;
        const localX = dx * Math.cos(-rad) - dy * Math.sin(-rad);
        const localY = dx * Math.sin(-rad) + dy * Math.cos(-rad);

        const baseHalf = 160 * geoScale;
        const height = 140 * geoScale;

        return (localY >= 0 && localY <= height && Math.abs(localX) <= (baseHalf * (1 - localY / height)));
    }

    function handleDown(e) {
        if (e.button !== undefined && e.button !== 0) return;
        const pos = getPos(e);

        if (isPointInGeodriehoek(pos.x, pos.y)) {
            isDraggingGeo = true;
            dragOffsetX = pos.x - geoX;
            dragOffsetY = pos.y - geoY;
        } else {
            isDrawingRuler = true;
            rulerStartPos = pos;
            rulerCurrentPos = pos;
            if (rulerToolMode === 'free') {
                freePoints = [pos];
            }
        }
        renderRulerScene();
    }

    function handleMove(e) {
        const pos = getPos(e);

        if (isDraggingGeo) {
            geoX = pos.x - dragOffsetX;
            geoY = pos.y - dragOffsetY;
            renderRulerScene();
            return;
        }

        if (isDrawingRuler) {
            rulerCurrentPos = pos;
            if (rulerToolMode === 'free') {
                freePoints.push(pos);
            }
            renderRulerScene();
        }
    }

    function handleUp() {
        if (isDrawingRuler && rulerStartPos && rulerCurrentPos) {
            rulerDrawnCtx.strokeStyle = rulerColor;
            rulerDrawnCtx.lineWidth = rulerThickness;
            rulerDrawnCtx.lineCap = 'round';
            rulerDrawnCtx.lineJoin = 'round';

            if (rulerToolMode === 'line') {
                rulerDrawnCtx.beginPath();
                rulerDrawnCtx.moveTo(rulerStartPos.x, rulerStartPos.y);
                rulerDrawnCtx.lineTo(rulerCurrentPos.x, rulerCurrentPos.y);
                rulerDrawnCtx.stroke();
            } else if (rulerToolMode === 'triangle') {
                const midX = (rulerStartPos.x + rulerCurrentPos.x) / 2;
                const heightY = rulerStartPos.y - Math.abs(rulerCurrentPos.x - rulerStartPos.x);

                rulerDrawnCtx.beginPath();
                rulerDrawnCtx.moveTo(rulerStartPos.x, rulerStartPos.y);
                rulerDrawnCtx.lineTo(rulerCurrentPos.x, rulerCurrentPos.y);
                rulerDrawnCtx.lineTo(midX, heightY);
                rulerDrawnCtx.closePath();
                rulerDrawnCtx.stroke();
            } else if (rulerToolMode === 'free' && freePoints.length > 1) {
                rulerDrawnCtx.beginPath();
                rulerDrawnCtx.moveTo(freePoints[0].x, freePoints[0].y);
                for (let i = 1; i < freePoints.length; i++) {
                    rulerDrawnCtx.lineTo(freePoints[i].x, freePoints[i].y);
                }
                rulerDrawnCtx.stroke();
            }
        }

        isDraggingGeo = false;
        isDrawingRuler = false;
        rulerStartPos = null;
        rulerCurrentPos = null;
        freePoints = [];
        renderRulerScene();
    }

    canvas.addEventListener('mousedown', handleDown);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleUp);
    canvas.addEventListener('mouseleave', handleUp);

    canvas.addEventListener('touchstart', (e) => { handleDown(e); e.preventDefault(); });
    canvas.addEventListener('touchmove', (e) => { handleMove(e); e.preventDefault(); });
    canvas.addEventListener('touchend', handleUp);

    // Muiswiel Zoom op Geodriehoek Canvas
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        changeRulerZoom(e.deltaY < 0 ? 0.1 : -0.1);
    }, { passive: false });
}

/* Zoom Knoppen Geodriehoek Canvas */
function changeRulerZoom(delta) {
    rulerZoom = Math.min(Math.max(0.5, rulerZoom + delta), 2.5);
    document.getElementById('rulerZoomDisplay').innerText = `${Math.round(rulerZoom * 100)}%`;
    renderRulerScene();
}

function resetRulerZoom() {
    rulerZoom = 1.0;
    document.getElementById('rulerZoomDisplay').innerText = `100%`;
    renderRulerScene();
}

/* Teken & Rendering van Geodriehoek Canvas */
function renderRulerScene() {
    const canvas = document.getElementById('rulerCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(rulerZoom, rulerZoom);

    // Grid achtergrond
    drawCompassGrid(canvas);

    // Reeds getekende figuren
    ctx.drawImage(rulerDrawnCanvas, 0, 0);

    // Live preview tijdens het slepen/tekenen
    if (isDrawingRuler && rulerStartPos && rulerCurrentPos) {
        ctx.save();
        ctx.strokeStyle = rulerColor;
        ctx.lineWidth = rulerThickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (rulerToolMode === 'line') {
            ctx.beginPath();
            ctx.moveTo(rulerStartPos.x, rulerStartPos.y);
            ctx.lineTo(rulerCurrentPos.x, rulerCurrentPos.y);
            ctx.stroke();
        } else if (rulerToolMode === 'triangle') {
            const midX = (rulerStartPos.x + rulerCurrentPos.x) / 2;
            const heightY = rulerStartPos.y - Math.abs(rulerCurrentPos.x - rulerStartPos.x);

            ctx.beginPath();
            ctx.moveTo(rulerStartPos.x, rulerStartPos.y);
            ctx.lineTo(rulerCurrentPos.x, rulerCurrentPos.y);
            ctx.lineTo(midX, heightY);
            ctx.closePath();
            ctx.stroke();
        } else if (rulerToolMode === 'free' && freePoints.length > 1) {
            ctx.beginPath();
            ctx.moveTo(freePoints[0].x, freePoints[0].y);
            for (let i = 1; i < freePoints.length; i++) {
                ctx.lineTo(freePoints[i].x, freePoints[i].y);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    // Geodriehoek Tool Visualisaties
    drawGeodriehoekGraphic(ctx);

    ctx.restore();
}

/* Tekent de Geodriehoek met schaalverdeling en gradenboog */
function drawGeodriehoekGraphic(ctx) {
    ctx.save();
    ctx.translate(geoX, geoY);
    ctx.rotate(geoAngle * Math.PI / 180);
    ctx.scale(geoScale, geoScale);

    const baseHalf = 160;
    const height = 140;

    // Transparante gele kunststof geodriehoek body
    ctx.beginPath();
    ctx.moveTo(-baseHalf, 0);
    ctx.lineTo(baseHalf, 0);
    ctx.lineTo(0, height);
    ctx.closePath();

    ctx.fillStyle = 'rgba(254, 240, 138, 0.45)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#d97706';
    ctx.stroke();

    // 90-graden loodlijn in het midden
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, height);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Millimeter/Centimeter verdeling op de liniaal-rand
    ctx.strokeStyle = '#78350f';
    ctx.fillStyle = '#78350f';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';

    for (let i = -14; i <= 14; i++) {
        const x = i * 10;
        let tickLen = 4;
        if (i % 5 === 0) tickLen = 7;
        if (i % 10 === 0) tickLen = 11;

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, tickLen);
        ctx.stroke();

        if (i % 2 === 0 && i !== 0 && Math.abs(i) <= 12) {
            ctx.fillText(Math.abs(i / 2), x, 19);
        }
    }
    ctx.fillText('0', 0, 19);

    // Gradenboog Bogen (0° tot 180°)
    ctx.beginPath();
    ctx.arc(0, 0, 90, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
}

/* Besturing Geodriehoek Instellingen */
function updateGeoAngle(val) {
    geoAngle = parseFloat(val);
    document.getElementById('geoAngleDisplay').innerText = `${geoAngle}°`;
    renderRulerScene();
}

function setGeoAngle(deg) {
    geoAngle = deg;
    document.getElementById('geoAngleSlider').value = deg;
    document.getElementById('geoAngleDisplay').innerText = `${deg}°`;
    renderRulerScene();
}

function updateGeoScale(val) {
    geoScale = parseFloat(val) / 100;
    document.getElementById('geoScaleDisplay').innerText = `${val}%`;
    renderRulerScene();
}

function setRulerToolMode(mode) {
    rulerToolMode = mode;
    ['line', 'triangle', 'free'].forEach(m => {
        const btn = document.getElementById(`btnTool${m.charAt(0).toUpperCase() + m.slice(1)}`);
        if (btn) {
            if (m === mode) {
                btn.className = "py-2 px-3 bg-sky-600 text-white font-medium text-xs rounded-xl flex flex-col items-center justify-center space-y-1 shadow-sm";
            } else {
                btn.className = "py-2 px-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs rounded-xl flex flex-col items-center justify-center space-y-1 hover:bg-slate-200";
            }
        }
    });
}

function setRulerPencilColor(color) {
    rulerColor = color;
    const picker = document.getElementById('rulerColorPicker');
    if (picker) picker.value = color;
}

function updateRulerThickness(val) {
    rulerThickness = parseInt(val);
}

function centerGeodriehoek() {
    const canvas = document.getElementById('rulerCanvas');
    if (canvas) {
        geoX = (canvas.width / rulerZoom) / 2;
        geoY = (canvas.height / rulerZoom) / 2;
        renderRulerScene();
    }
}

function clearRulerCanvas() {
    rulerDrawnCtx.clearRect(0, 0, rulerDrawnCanvas.width, rulerDrawnCanvas.height);
    renderRulerScene();
}

/* ==========================================
   3D SHAPES & GRAFIEK (Ondersteuning)
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
    const p1 = parseFloat(document.getElementById('param1Slider')?.value || 4);
    const p2 = parseFloat(document.getElementById('param2Slider')?.value || 4);

    switch (shape) {
        case 'cylinder': geometry = new THREE.CylinderGeometry(p1 / 2, p1 / 2, p2, 32); break;
        case 'sphere': geometry = new THREE.SphereGeometry(p1 / 2, 32, 32); break;
        case 'cone': geometry = new THREE.ConeGeometry(p1 / 2, p2, 32); break;
        case 'pyramid': geometry = new THREE.ConeGeometry(p1 / 2, p2, 4); break;
        case 'cube': default: geometry = new THREE.BoxGeometry(p1, p2, p1); break;
    }

    const material = new THREE.MeshPhongMaterial({ color: 0x6366f1, wireframe: false });
    currentMesh = new THREE.Mesh(geometry, material);
    scene.add(currentMesh);
}

function animate3D() {
    requestAnimationFrame(animate3D);
    if (currentMesh) currentMesh.rotation.y += 0.005;
    if (renderer && scene && camera) renderer.render(scene, camera);
}

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

    const expr = document.getElementById('functionInput')?.value || 'Math.sin(x)';
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
        } catch (e) {}
    }
    ctx.stroke();
}

/* ==========================================
   Window Resize & Init
   ========================================== */
window.addEventListener('resize', () => {
    if (currentTab === 'passer') initCompassCanvas();
    if (currentTab === 'liniaal') initRulerCanvas();
    if (currentTab === 'grafiek') drawFunction();
});

window.addEventListener('DOMContentLoaded', () => {
    switchTab('home');
});

/* ==========================================
   WISKUNDE OEFENSPEL (1e Klas VO / Brugklas)
   ========================================== */

let currentGameIndex = 0;
let gameScore = 0;
let gameStreak = 0;
let answeredCurrentQuestion = false;

// Vragenbank op brugklas niveau met uitgeschreven uitwerkingen
const gameQuestions = [
    {
        title: "Los de vergelijking op: 3x + 7 = 22",
        choices: [
            {
                steps: [
                    "Stap 1: Trek aan beide kanten 7 af → 3x = 15",
                    "Stap 2: Deel beide kanten door 3 → x = 5"
                ],
                correct: true,
                explanation: "Uitstekend! Eerst de losse getallen naar de rechterkant halen (balansmethode) en daarna delen door het getal voor x."
            },
            {
                steps: [
                    "Stap 1: Tel aan beide kanten 7 op → 3x = 29",
                    "Stap 2: Deel beide kanten door 3 → x = 9,67"
                ],
                correct: false,
                explanation: "Helaas! Als er +7 staat, moet je 7 AFTREKKEN aan beide kanten om het op te heffen."
            },
            {
                steps: [
                    "Stap 1: Deel meteen door 3 → x + 7 = 7,33",
                    "Stap 2: Trek 7 af → x = -0,33"
                ],
                correct: false,
                explanation: "Foutieve volgorde! Werk bij de balansmethode altijd eerst losse getallen weg voordat je deelt."
            },
            {
                steps: [
                    "Stap 1: Trek 22 af van 7 → 3x = -15",
                    "Stap 2: Deel door 3 → x = -5"
                ],
                correct: false,
                explanation: "Incorrect! Je moet 7 van 22 aftrekken (22 - 7 = 15), niet andersom."
            }
        ]
    },
    {
        title: "Los de vergelijking met haakjes op: 2(x + 4) = 18",
        choices: [
            {
                steps: [
                    "Stap 1: Werk de haakjes uit → 2x + 8 = 18",
                    "Stap 2: Trek aan beide kanten 8 af → 2x = 10",
                    "Stap 3: Deel door 2 → x = 5"
                ],
                correct: true,
                explanation: "Klopt helemaal! Haakjes wegwerken (2 · x en 2 · 4) is de standaard eerste stap."
            },
            {
                steps: [
                    "Stap 1: Werk haakjes uit → 2x + 4 = 18",
                    "Stap 2: Trek 4 af → 2x = 14",
                    "Stap 3: Deel door 2 → x = 7"
                ],
                correct: false,
                explanation: "Pas op! Vergeet niet om de 2 ook met de 4 binnen de haakjes te vermenigvuldigen (2 · 4 = 8)."
            },
            {
                steps: [
                    "Stap 1: Trek 4 af van 18 → 2x = 14",
                    "Stap 2: Deel door 2 → x = 7"
                ],
                correct: false,
                explanation: "Onjuist! Je kunt de 4 niet zomaar aftrekken zonder eerst de haakjes weg te werken."
            },
            {
                steps: [
                    "Stap 1: Deel door 2 → x + 4 = 9",
                    "Stap 2: Tel 4 op → x = 13"
                ],
                correct: false,
                explanation: "Bijna, maar in Stap 2 moet je 4 AFTREKKEN van 9 (9 - 4 = 5)."
            }
        ]
    },
    {
        title: "Los op met x aan beide kanten: 5x - 3 = 2x + 12",
        choices: [
            {
                steps: [
                    "Stap 1: Trek aan beide kanten 2x af → 3x - 3 = 12",
                    "Stap 2: Tel aan beide kanten 3 op → 3x = 15",
                    "Stap 3: Deel beide kanten door 3 → x = 5"
                ],
                correct: true,
                explanation: "Perfect! Eerst de kleinste x naar links halen, daarna het losse getal naar rechts."
            },
            {
                steps: [
                    "Stap 1: Tel 2x op aan beide kanten → 7x - 3 = 12",
                    "Stap 2: Tel 3 op → 7x = 15",
                    "Stap 3: Deel door 7 → x = 2,14"
                ],
                correct: false,
                explanation: "Onjuist! Om +2x weg te werken aan de rechterkant moet je 2x aftrekken, niet optellen."
            },
            {
                steps: [
                    "Stap 1: Tel 3 op → 5x = 2x + 15",
                    "Stap 2: Deel door 5 → x = 2x + 3"
                ],
                correct: false,
                explanation: "Fout! Je mag niet delen als er aan de rechterkant nog een term met x staat."
            },
            {
                steps: [
                    "Stap 1: Trek 5x af → -3 = -3x + 12",
                    "Stap 2: Trek 12 af → -15 = -3x",
                    "Stap 3: Deel door -3 → x = -5"
                ],
                correct: false,
                explanation: "Reken-foutje in stap 3: -15 gedeeld door -3 is positef 5, niet -5."
            }
        ]
    },
    {
        title: "Bereken de oppervlakte van een driehoek met basis = 8 cm en hoogte = 5 cm",
        choices: [
            {
                steps: [
                    "Stap 1: Gebruik de formule Oppervlakte = 0,5 · basis · hoogte",
                    "Stap 2: Vul de maten in → 0,5 · 8 · 5",
                    "Stap 3: Reken uit → 4 · 5 = 20 cm²"
                ],
                correct: true,
                explanation: "Helemaal goed! Vergeet bij een driehoek nooit te vermenigvuldigen met 0,5 (of te delen door 2)."
            },
            {
                steps: [
                    "Stap 1: Gebruik de formule Oppervlakte = basis · hoogte",
                    "Stap 2: Vul in → 8 · 5 = 40 cm²"
                ],
                correct: false,
                explanation: "Fout! Dit is de formule voor een rechthoek. Een driehoek is precies de helft daarvan."
            },
            {
                steps: [
                    "Stap 1: Tel alle zijden op → 8 + 5 + 5 = 18 cm²"
                ],
                correct: false,
                explanation: "Onjuist! Dit berekent de omtrek, niet de oppervlakte."
            },
            {
                steps: [
                    "Stap 1: Kwadrateer de basis → 8² = 64",
                    "Stap 2: Deel door hoogte → 64 / 5 = 12,8 cm²"
                ],
                correct: false,
                explanation: "Onjuist! Kwadrateren is niet van toepassing bij de oppervlakte van een standaard driehoek."
            }
        ]
    }
];

/* Besturingsfuncties voor het Spel */
function startNewGame() {
    currentGameIndex = 0;
    gameScore = 0;
    gameStreak = 0;
    updateGameHeader();
    loadQuestion();
}

function updateGameHeader() {
    document.getElementById('gameScore').innerText = gameScore;
    document.getElementById('gameStreak').innerText = gameStreak;
    document.getElementById('totalQuestionsCount').innerText = gameQuestions.length;
}

function loadQuestion() {
    answeredCurrentQuestion = false;
    const q = gameQuestions[currentGameIndex];

    document.getElementById('questionNum').innerText = currentGameIndex + 1;
    document.getElementById('questionTitle').innerText = q.title;

    const feedbackEl = document.getElementById('gameFeedback');
    feedbackEl.classList.add('hidden');
    feedbackEl.className = "hidden p-4 rounded-xl text-center text-xs sm:text-sm font-semibold transition-all";

    document.getElementById('nextQuestionContainer').classList.add('hidden');

    const choicesContainer = document.getElementById('choicesContainer');
    choicesContainer.innerHTML = '';

    // Maak voor elk stappenplan een interactieve kaart
    q.choices.forEach((choice, idx) => {
        const card = document.createElement('div');
        card.className = "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-4 cursor-pointer transition flex flex-col justify-between space-y-3 group shadow-sm";
        card.onclick = () => selectChoice(idx);

        let stepsHTML = `<div class="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 font-mono">`;
        choice.steps.forEach(step => {
            stepsHTML += `<div class="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700/60">${step}</div>`;
        });
        stepsHTML += `</div>`;

        card.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/50 pb-2">
                <span class="font-bold text-xs text-slate-500 dark:text-slate-400 group-hover:text-emerald-600">Optie ${String.fromCharCode(65 + idx)}</span>
                <i class="fa-regular fa-circle text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 text-sm"></i>
            </div>
            ${stepsHTML}
        `;
        choicesContainer.appendChild(card);
    });
}

function selectChoice(choiceIndex) {
    if (answeredCurrentQuestion) return;
    answeredCurrentQuestion = true;

    const q = gameQuestions[currentGameIndex];
    const selected = q.choices[choiceIndex];
    const feedbackEl = document.getElementById('gameFeedback');

    if (selected.correct) {
        gameScore += 10 + (gameStreak * 2);
        gameStreak++;
        feedbackEl.className = "p-4 rounded-xl text-center text-xs sm:text-sm font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800";
        feedbackEl.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600 mr-1.5"></i> ${selected.explanation}`;
    } else {
        gameStreak = 0;
        feedbackEl.className = "p-4 rounded-xl text-center text-xs sm:text-sm font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800";
        feedbackEl.innerHTML = `<i class="fa-solid fa-circle-xmark text-rose-600 mr-1.5"></i> ${selected.explanation}`;
    }

    feedbackEl.classList.remove('hidden');
    updateGameHeader();

    document.getElementById('nextQuestionContainer').classList.remove('hidden');
}

function nextQuestion() {
    currentGameIndex++;
    if (currentGameIndex >= gameQuestions.length) {
        showModal('Gefeliciteerd! 🎉', `Je hebt alle vragen beantwoord! Eindscore: ${gameScore} punten.`);
        startNewGame();
    } else {
        loadQuestion();
    }
}

// Zorg dat bij het openen van het spel het eerste spelniveau automatisch laadt
window.addEventListener('DOMContentLoaded', () => {
    startNewGame();
});
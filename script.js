// --- 1. INICIALIZACIÓN DE ICONOS Y CONFIGURACIÓN CENTRAL ---
lucide.createIcons();

const CONFIG = {
    sensitivity: 0.5,
    reactionSpeed: 0.015,
    forceMode: 'auto',
    showPip: true,
    maxParticles: 110,
    aloneThreshold: 25,
    crowdThreshold: 15
};

const STATE = {
    presenceLevel: 0,
    targetPresence: 0,
    plants: [],
    particles: [],
    butterflies: [],
    width: window.innerWidth,
    height: window.innerHeight,
    mousePos: { x: -1000, y: -1000 },
    isMouseActive: false,
    aloneTime: 0,
    crowdTime: 0,
    superBloomActive: false,
    scorchedActive: false,
    uiHidden: false
};

const PALETTES = {
    healthyStems: ['#1b4332', '#2d6a4f', '#40916c', '#52b788', '#74c69d'],
    witheredStems: ['#3a332a', '#4a3f35', '#2b231d', '#5c4d3e', '#1e1814'],
    blooms: [
        { main: '#ff4d6d', accent: '#ff758f', center: '#ffb703' },
        { main: '#7209b7', accent: '#b5179e', center: '#4cc9f0' },
        { main: '#3a86ff', accent: '#8338ec', center: '#ff006e' },
        { main: '#ffb703', accent: '#fb8500', center: '#d4d700' },
        { main: '#e0aaff', accent: '#c77dff', center: '#ffffff' }
    ],
    witheredBlooms: { main: '#4a3b32', accent: '#362a23', center: '#241b16' },
    cauliflower: { main: '#a855f7', accent: '#38bdf8', curds: ['#f43f5e', '#a855f7', '#34d399', '#facc15'] }
};

// --- 2. CLASES DEL DOMINIO ARTÍSTICO ---

class Plant {
    constructor(x, isColossal = false) {
        this.x = x;
        this.baseY = STATE.height + 10;
        this.isColossal = isColossal;
        
        const scale = isColossal ? 1.7 : 1;
        this.height = (Math.random() * (STATE.height * 0.45) + (STATE.height * 0.25)) * scale;
        this.curve = (Math.random() - 0.5) * (120 * scale);
        this.thickness = (Math.random() * 8 + 4) * scale;
        
        this.flowerType = isColossal ? 3 : (Math.random() < 0.25 ? 3 : Math.floor(Math.random() * 3));
        this.bloomPalette = PALETTES.blooms[Math.floor(Math.random() * PALETTES.blooms.length)];
        this.stemColorHealthy = PALETTES.healthyStems[Math.floor(Math.random() * PALETTES.healthyStems.length)];
        this.stemColorDead = PALETTES.witheredStems[Math.floor(Math.random() * PALETTES.witheredStems.length)];
        
        this.petalsCount = Math.floor(Math.random() * 6) + 5;
        this.flowerRadius = (Math.random() * 22 + 18) * scale;

        this.hasLeaf = Math.random() > 0.3;
        this.leafSide = Math.random() > 0.5 ? 1 : -1;
        this.leafHeightPos = Math.random() * 0.4 + 0.3;
        
        this.windPhase = Math.random() * Math.PI * 2;
        this.windSpeed = Math.random() * 0.02 + 0.01;

        this.isBroken = false;
        this.breakProgress = 0;
        this.breakAngle = (Math.random() > 0.5 ? 1 : -1) * (Math.PI * 0.4 + Math.random() * 0.3);
    }

    draw(ctx, p) {
        if ((p > 0.8 || STATE.scorchedActive) && !this.isBroken) {
            this.isBroken = true;
        } else if (p < 0.3 && !STATE.scorchedActive && this.isBroken) {
            this.isBroken = false;
            this.breakProgress = 0;
        }

        if (this.isBroken && this.breakProgress < 1) {
            this.breakProgress = Math.min(1, this.breakProgress + 0.04);
        }

        this.windPhase += this.windSpeed;
        const sway = Math.sin(this.windPhase) * (15 * (1 - p * 0.5));
        const droop = p * 60;
        const currentHeight = this.height * (1 - p * 0.2);

        const startX = this.x;
        const startY = this.baseY;
        const ctrlX = this.x + this.curve + sway + (this.leafSide * droop * 0.5);
        const ctrlY = this.baseY - (currentHeight * 0.5);
        let endX = this.x + (this.curve * 0.6) + sway + droop;
        let endY = this.baseY - currentHeight + droop;

        const stemColor = interpolateColor(this.stemColorHealthy, this.stemColorDead, p);

        if (!this.isBroken) {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
            ctx.strokeStyle = stemColor;
            ctx.lineWidth = Math.max(1, this.thickness * (1 - p * 0.4));
            ctx.lineCap = 'round';
            ctx.stroke();

            if (this.hasLeaf) {
                const lx = startX + (ctrlX - startX) * this.leafHeightPos;
                const ly = startY + (ctrlY - startY) * this.leafHeightPos;
                
                ctx.save();
                ctx.translate(lx, ly);
                const leafAngle = (this.leafSide * Math.PI / 4) + (p * Math.PI / 3);
                ctx.rotate(leafAngle);
                
                ctx.beginPath();
                ctx.ellipse(20, 0, 18 * (1 - p * 0.3), 7 * (1 - p * 0.5), 0, 0, Math.PI * 2);
                ctx.fillStyle = stemColor;
                ctx.fill();
                ctx.restore();
            }

            this.drawFlower(ctx, endX, endY, p);
        } else {
            const breakHeight = currentHeight * 0.25;
            const breakX = startX + (ctrlX - startX) * 0.25;
            const breakY = startY - breakHeight;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(breakX, breakY);
            ctx.strokeStyle = PALETTES.witheredStems[0];
            ctx.lineWidth = this.thickness * 0.8;
            ctx.stroke();

            ctx.save();
            ctx.translate(breakX, breakY);
            ctx.rotate(this.breakAngle * this.breakProgress);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(ctrlX - breakX, ctrlY - breakY, endX - breakX, endY - breakY);
            ctx.strokeStyle = stemColor;
            ctx.lineWidth = Math.max(1, this.thickness * 0.6);
            ctx.stroke();

            this.drawFlower(ctx, endX - breakX, endY - breakY, Math.max(0.85, p));
            ctx.restore();
        }
    }

    drawFlower(ctx, x, y, p) {
        ctx.save();
        ctx.translate(x, y);

        const shrinkFactor = Math.max(0.08, 1 - p * 0.65);
        const rotFactor = p * Math.PI * 0.5;
        ctx.rotate(rotFactor);

        const colorMain = interpolateColor(this.bloomPalette.main, PALETTES.witheredBlooms.main, p);
        const colorAccent = interpolateColor(this.bloomPalette.accent, PALETTES.witheredBlooms.accent, p);
        const colorCenter = interpolateColor(this.bloomPalette.center, PALETTES.witheredBlooms.center, p);

        if (this.flowerType === 3) {
            const curdRadius = this.flowerRadius * 0.5 * shrinkFactor;
            const curdColors = PALETTES.cauliflower.curds;

            for (let i = 0; i < 7; i++) {
                const angle = (i * Math.PI * 2) / 7;
                const cx = Math.cos(angle) * (curdRadius * 1.1);
                const cy = Math.sin(angle) * (curdRadius * 1.1);

                ctx.beginPath();
                ctx.arc(cx, cy, curdRadius * 0.8, 0, Math.PI * 2);
                const col = p > 0.4 ? PALETTES.witheredBlooms.accent : curdColors[i % curdColors.length];
                ctx.fillStyle = col;
                if (p < 0.4) {
                    ctx.shadowBlur = 12;
                    ctx.shadowColor = col;
                }
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.arc(0, 0, curdRadius * 0.9, 0, Math.PI * 2);
            ctx.fillStyle = p > 0.4 ? PALETTES.witheredBlooms.main : '#ffffff';
            ctx.fill();

        } else if (this.flowerType === 0) {
            for (let i = 0; i < this.petalsCount; i++) {
                const angle = (i * Math.PI * 2) / this.petalsCount;
                ctx.save();
                ctx.rotate(angle);
                
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(12 * shrinkFactor, (this.flowerRadius * shrinkFactor), 0, (this.flowerRadius * 1.3 * shrinkFactor));
                ctx.quadraticCurveTo(-12 * shrinkFactor, (this.flowerRadius * shrinkFactor), 0, 0);
                ctx.fillStyle = i % 2 === 0 ? colorMain : colorAccent;
                ctx.globalAlpha = 1 - (p * 0.4);
                ctx.fill();
                ctx.restore();
            }

            ctx.beginPath();
            ctx.arc(0, 0, (this.flowerRadius * 0.35) * shrinkFactor, 0, Math.PI * 2);
            ctx.fillStyle = colorCenter;
            ctx.fill();

        } else if (this.flowerType === 1) {
            for (let i = -1; i <= 1; i++) {
                ctx.save();
                ctx.rotate(i * 0.35);
                ctx.beginPath();
                ctx.arc(0, -this.flowerRadius * 0.6 * shrinkFactor, this.flowerRadius * 0.7 * shrinkFactor, 0, Math.PI * 2);
                ctx.fillStyle = i === 0 ? colorAccent : colorMain;
                ctx.globalAlpha = 0.85 - (p * 0.4);
                ctx.fill();
                ctx.restore();
            }

            ctx.beginPath();
            ctx.arc(0, 0, (this.flowerRadius * 0.3) * shrinkFactor, 0, Math.PI * 2);
            ctx.fillStyle = colorCenter;
            ctx.fill();

        } else {
            const spikeCount = 14;
            for (let i = 0; i < spikeCount; i++) {
                const angle = (i * Math.PI * 2) / spikeCount;
                ctx.save();
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, this.flowerRadius * 1.2 * shrinkFactor);
                ctx.strokeStyle = colorAccent;
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(0, this.flowerRadius * 1.2 * shrinkFactor, 3 * shrinkFactor, 0, Math.PI * 2);
                ctx.fillStyle = colorMain;
                ctx.fill();
                ctx.restore();
            }
        }

        if (p > 0.6 && Math.random() < 0.08) {
            STATE.particles.push(new Particle(x + (Math.random() - 0.5) * 20, y, 'ash'));
        }

        ctx.restore();
    }
}

class Particle {
    constructor(x, y, type) {
        this.x = x || Math.random() * STATE.width;
        this.y = y || (type === 'ash' ? STATE.height * 0.5 + Math.random() * STATE.height * 0.5 : STATE.height + 10);
        this.type = type;
        this.size = type === 'butterfly' ? Math.random() * 6 + 4 : Math.random() * 3 + 1;
        this.vx = (Math.random() - 0.5) * (type === 'ash' ? 0.8 : 1.5);
        this.vy = type === 'ash' ? Math.random() * 1.2 + 0.3 : -(Math.random() * 1.5 + 0.5);
        this.alpha = Math.random() * 0.7 + 0.3;
        this.life = 1;
        this.decay = Math.random() * 0.01 + 0.005;
        this.wingAngle = 0;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        
        if (this.type === 'butterfly') {
            this.wingAngle += 0.2;
            this.vx += (Math.random() - 0.5) * 0.3;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life * this.alpha);

        if (this.type === 'pollen') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = '#ffea00';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ffe600';
            ctx.fill();
        } else if (this.type === 'ash') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = '#8c7b70';
            ctx.fill();
        } else if (this.type === 'butterfly') {
            ctx.translate(this.x, this.y);
            const wingSqueeze = Math.sin(this.wingAngle);
            
            ctx.beginPath();
            ctx.ellipse(-this.size * 0.8, 0, this.size * Math.abs(wingSqueeze), this.size * 1.2, 0.3, 0, Math.PI * 2);
            ctx.fillStyle = '#4cc9f0';
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(this.size * 0.8, 0, this.size * Math.abs(wingSqueeze), this.size * 1.2, -0.3, 0, Math.PI * 2);
            ctx.fillStyle = '#f72585';
            ctx.fill();
        }

        ctx.restore();
    }
}

// --- 3. HELPER FUNCTIONS ---

function interpolateColor(hex1, hex2, factor) {
    let c1 = hexToRgb(hex1);
    let c2 = hexToRgb(hex2);
    let r = Math.round(c1.r + factor * (c2.r - c1.r));
    let g = Math.round(c1.g + factor * (c2.g - c1.g));
    let b = Math.round(c1.b + factor * (c2.b - c1.b));
    return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function initLandscape() {
    STATE.plants = [];
    const count = Math.floor(STATE.width / 45);
    const step = STATE.width / count;
    for (let i = 0; i < count; i++) {
        const x = (i * step) + (Math.random() * step * 0.8);
        STATE.plants.push(new Plant(x));
    }
}

function drawGrassBackground(ctx, p) {
    const grassColor = interpolateColor('#133c27', '#2b221a', p);
    ctx.fillStyle = grassColor;
    ctx.beginPath();
    ctx.moveTo(0, STATE.height);
    for (let x = 0; x <= STATE.width; x += 20) {
        const h = Math.sin(x * 0.05) * 15 + (30 * (1 - p * 0.3));
        ctx.lineTo(x, STATE.height - h);
    }
    ctx.lineTo(STATE.width, STATE.height);
    ctx.closePath();
    ctx.fill();
}

function triggerSuperBloom() {
    STATE.superBloomActive = true;
    for (let i = 0; i < 6; i++) {
        const x = Math.random() * STATE.width;
        STATE.plants.push(new Plant(x, true));
    }
}

function triggerScorchedEarth() {
    STATE.scorchedActive = true;
    STATE.plants.forEach(p => p.isBroken = true);
}

// --- 4. BUCLE PRINCIPAL DE RENDERIZADO ---

const artCanvas = document.getElementById('artCanvas');
const ctx = artCanvas.getContext('2d');
let lastTime = performance.now();

function animate(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    analyzeWebcamFrame();

    const diff = STATE.targetPresence - STATE.presenceLevel;
    STATE.presenceLevel += diff * CONFIG.reactionSpeed;
    const p = STATE.presenceLevel;

    if (p < 0.25) {
        STATE.aloneTime += dt;
        STATE.crowdTime = Math.max(0, STATE.crowdTime - dt * 2);
    } else if (p > 0.5) {
        STATE.crowdTime += dt;
        STATE.aloneTime = Math.max(0, STATE.aloneTime - dt * 2);
    }

    if (STATE.aloneTime >= CONFIG.aloneThreshold && !STATE.superBloomActive) triggerSuperBloom();
    if (STATE.crowdTime >= CONFIG.crowdThreshold && !STATE.scorchedActive) triggerScorchedEarth();

    if (p > 0.6 && STATE.superBloomActive) STATE.superBloomActive = false;
    if (p < 0.2 && STATE.scorchedActive) STATE.scorchedActive = false;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, STATE.height);
    if (p < 0.25) {
        bgGrad.addColorStop(0, '#020907'); bgGrad.addColorStop(1, '#0a2217');
    } else if (p < 0.5) {
        bgGrad.addColorStop(0, '#0b110d'); bgGrad.addColorStop(1, '#15241b');
    } else if (p < 0.75) {
        bgGrad.addColorStop(0, '#140f0b'); bgGrad.addColorStop(1, '#1d1712');
    } else {
        bgGrad.addColorStop(0, '#180a0a'); bgGrad.addColorStop(1, '#080505');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, STATE.width, STATE.height);

    if (p < 0.4 && Math.random() < 0.35) {
        if (Math.random() < 0.05 && STATE.butterflies.length < 7) {
            STATE.butterflies.push(new Particle(null, null, 'butterfly'));
        } else if (STATE.particles.length < CONFIG.maxParticles) {
            STATE.particles.push(new Particle(null, null, 'pollen'));
        }
    } else if (p >= 0.4 && Math.random() < 0.45) {
        if (STATE.particles.length < CONFIG.maxParticles) {
            STATE.particles.push(new Particle(null, null, 'ash'));
        }
    }

    for (let i = STATE.particles.length - 1; i >= 0; i--) {
        const pt = STATE.particles[i];
        pt.update();
        pt.draw(ctx);
        if (pt.life <= 0 || pt.y < -20 || pt.y > STATE.height + 20) STATE.particles.splice(i, 1);
    }

    for (let i = STATE.butterflies.length - 1; i >= 0; i--) {
        const bf = STATE.butterflies[i];
        bf.update();
        bf.draw(ctx);
        if (bf.life <= 0 || p > 0.4) STATE.butterflies.splice(i, 1);
    }

    drawGrassBackground(ctx, p);
    STATE.plants.forEach(plant => plant.draw(ctx, p));
    updateUIIndicators(p);

    requestAnimationFrame(animate);
}

// --- 5. VISIÓN POR COMPUTADORA / CAM ---

const video = document.getElementById('webcamVideo');
const procCanvas = document.getElementById('procCanvas');
const procCtx = procCanvas.getContext('2d');
const camWarning = document.getElementById('camWarning');
let prevFrameData = null;

function initWebcam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        camWarning.classList.remove('hidden');
        camWarning.classList.add('flex');
        return;
    }

    navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, frameRate: 15 } })
        .then(stream => { video.srcObject = stream; video.play(); })
        .catch(() => {
            camWarning.classList.remove('hidden');
            camWarning.classList.add('flex');
        });
}

function analyzeWebcamFrame() {
    if (CONFIG.forceMode === 'alone') { STATE.targetPresence = 0; return; }
    if (CONFIG.forceMode === 'people') { STATE.targetPresence = 1; return; }

    if (!video.srcObject || video.readyState !== 4) {
        STATE.targetPresence = STATE.isMouseActive ? 0.8 : 0;
        return;
    }

    const w = 160, h = 120;
    procCanvas.width = w;
    procCanvas.height = h;

    procCtx.drawImage(video, 0, 0, w, h);
    const currentFrame = procCtx.getImageData(0, 0, w, h);
    const curr = currentFrame.data;

    if (!prevFrameData) { prevFrameData = curr; return; }

    let diffScore = 0;
    const threshold = 25;
    const totalPixels = w * h;

    for (let i = 0; i < curr.length; i += 4) {
        const avgDiff = (Math.abs(curr[i] - prevFrameData[i]) + Math.abs(curr[i+1] - prevFrameData[i+1]) + Math.abs(curr[i+2] - prevFrameData[i+2])) / 3;
        if (avgDiff > threshold) diffScore++;
    }

    prevFrameData = curr;
    const motionRatio = diffScore / (totalPixels * (1.1 - CONFIG.sensitivity));
    STATE.targetPresence = Math.min(1, Math.max(0, motionRatio * 3.5));
}

// --- 6. CONTROL DE UI Y EVENTOS DE USUARIO ---

const statusBadge = document.getElementById('statusBadge');
const timerBadge = document.getElementById('timerBadge');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const presencePercent = document.getElementById('presencePercent');
const aloneTimerText = document.getElementById('aloneTimerText');
const aloneTimerBar = document.getElementById('aloneTimerBar');
const crowdTimerText = document.getElementById('crowdTimerText');
const crowdTimerBar = document.getElementById('crowdTimerBar');

function updateUIIndicators(p) {
    presencePercent.textContent = `${Math.round(p * 100)}% Presencia`;

    aloneTimerBar.style.width = `${Math.min(100, (STATE.aloneTime / CONFIG.aloneThreshold) * 100)}%`;
    aloneTimerText.textContent = `${Math.floor(STATE.aloneTime)}s`;

    crowdTimerBar.style.width = `${Math.min(100, (STATE.crowdTime / CONFIG.crowdThreshold) * 100)}%`;
    crowdTimerText.textContent = `${Math.floor(STATE.crowdTime)}s`;

    if (STATE.superBloomActive) {
        statusDot.className = "w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping";
        statusText.textContent = "🌟 Evento: Superfloración Salvaje";
        statusText.className = "font-bold tracking-wider uppercase text-cyan-200";
    } else if (STATE.scorchedActive) {
        statusDot.className = "w-2.5 h-2.5 rounded-full bg-red-600 animate-bounce";
        statusText.textContent = "🔥 Evento: Tierra Quemada / Poda Total";
        statusText.className = "font-bold tracking-wider uppercase text-red-300";
    } else if (p < 0.25) {
        statusDot.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse";
        statusText.textContent = "Etapa 1: Jardín Próspero";
        statusText.className = "font-light tracking-wider uppercase text-emerald-200";
    } else if (p < 0.50) {
        statusDot.className = "w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse";
        statusText.textContent = "Etapa 2: Inquietud (Hongo & Coliflor)";
        statusText.className = "font-light tracking-wider uppercase text-sky-200";
    } else if (p < 0.75) {
        statusDot.className = "w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping";
        statusText.textContent = "Etapa 3: Decadencia & Secado";
        statusText.className = "font-light tracking-wider uppercase text-amber-200";
    } else {
        statusDot.className = "w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse";
        statusText.textContent = "Etapa 4: Quebranto Total";
        statusText.className = "font-light tracking-wider uppercase text-rose-300";
    }
}

const controlPanel = document.getElementById('controlPanel');
const toggleControlsBtn = document.getElementById('toggleControlsBtn');
const closeControlsBtn = document.getElementById('closeControlsBtn');
let isPanelOpen = false;

function togglePanel(open) {
    isPanelOpen = open !== undefined ? open : !isPanelOpen;
    if (isPanelOpen) {
        controlPanel.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-6');
        controlPanel.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0');
    } else {
        controlPanel.classList.add('opacity-0', 'pointer-events-none', 'translate-y-6');
        controlPanel.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
    }
}

toggleControlsBtn.addEventListener('click', () => togglePanel());
closeControlsBtn.addEventListener('click', () => togglePanel(false));

window.addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H') {
        STATE.uiHidden = !STATE.uiHidden;
        const d = STATE.uiHidden ? 'none' : 'block';
        statusBadge.style.display = d;
        timerBadge.style.display = d;
        toggleControlsBtn.style.display = d;
        if (STATE.uiHidden) togglePanel(false);
    }
});

document.getElementById('fullscreenBtn').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
});

document.getElementById('regenBtn').addEventListener('click', () => initLandscape());
document.getElementById('triggerWild').addEventListener('click', () => triggerSuperBloom());
document.getElementById('triggerScorch').addEventListener('click', () => triggerScorchedEarth());

const modeAuto = document.getElementById('modeAuto');
const modeForceAlone = document.getElementById('modeForceAlone');
const modeForcePeople = document.getElementById('modeForcePeople');

function setMode(m) {
    CONFIG.forceMode = m;
    [modeAuto, modeForceAlone, modeForcePeople].forEach(b => b.className = "py-1.5 px-2 rounded-lg text-center text-slate-400 hover:text-white transition-all");
    if (m === 'auto') modeAuto.className = "py-1.5 px-2 rounded-lg text-center transition-all bg-emerald-600 text-white font-medium";
    if (m === 'alone') modeForceAlone.className = "py-1.5 px-2 rounded-lg text-center transition-all bg-emerald-600 text-white font-medium";
    if (m === 'people') modeForcePeople.className = "py-1.5 px-2 rounded-lg text-center transition-all bg-rose-600 text-white font-medium";
}

modeAuto.addEventListener('click', () => setMode('auto'));
modeForceAlone.addEventListener('click', () => setMode('alone'));
modeForcePeople.addEventListener('click', () => setMode('people'));

document.getElementById('sensitivitySlider').addEventListener('input', (e) => {
    CONFIG.sensitivity = e.target.value / 100;
    document.getElementById('sensitivityVal').textContent = `${e.target.value}%`;
});

document.getElementById('speedSlider').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    CONFIG.reactionSpeed = [0.005, 0.01, 0.02, 0.035, 0.06][val - 1];
    document.getElementById('speedVal').textContent = ['Muy Lenta', 'Lenta', 'Normal', 'Rápida', 'Instantánea'][val - 1];
});

document.getElementById('togglePip').addEventListener('change', (e) => {
    document.getElementById('pipContainer').style.display = e.target.checked ? 'flex' : 'none';
});

window.addEventListener('mousemove', () => {
    STATE.isMouseActive = true;
    clearTimeout(window.mouseTimer);
    window.mouseTimer = setTimeout(() => { STATE.isMouseActive = false; }, 2000);
});

window.addEventListener('resize', () => {
    STATE.width = window.innerWidth;
    STATE.height = window.innerHeight;
    artCanvas.width = STATE.width;
    artCanvas.height = STATE.height;
    initLandscape();
});

// --- 7. INICIALIZACIÓN AL CARGAR LA PÁGINA ---
window.onload = () => {
    STATE.width = window.innerWidth;
    STATE.height = window.innerHeight;
    artCanvas.width = STATE.width;
    artCanvas.height = STATE.height;
    
    initLandscape();
    initWebcam();
    requestAnimationFrame(animate);
};
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealItems = document.querySelectorAll('.reveal, .scroll-reveal, .problem-step, .difference-item, .work-project');
const revealObserver = !reducedMotion && 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('show'); }), { threshold: 0.14 })
  : null;

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index % 5, 4) * 80}ms`;
  if (revealObserver) revealObserver.observe(item);
  else item.classList.add('show');
});

const hero = document.querySelector('.hero');
const canvas = document.querySelector('.honeycomb');
const context = canvas.getContext('2d');
let mouse = { x: -9999, y: -9999 };

function hexagon(x, y, radius) {
  context.beginPath();
  for (let point = 0; point < 6; point += 1) {
    const angle = Math.PI / 3 * point - Math.PI / 6;
    const px = x + radius * Math.cos(angle);
    const py = y + radius * Math.sin(angle);
    point === 0 ? context.moveTo(px, py) : context.lineTo(px, py);
  }
  context.closePath();
}

function drawHoneycomb() {
  const rect = hero.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);
  const radius = Math.max(31, Math.min(52, rect.width / 27));
  const rowStep = radius * 1.5;
  const columnStep = Math.sqrt(3) * radius;
  for (let row = -1; row < rect.height / rowStep + 2; row += 1) {
    for (let column = -1; column < rect.width / columnStep + 2; column += 1) {
      const x = column * columnStep + (row % 2 ? columnStep / 2 : 0);
      const y = row * rowStep;
      const glow = reducedMotion ? 0 : Math.max(0, 1 - Math.hypot(mouse.x - x, mouse.y - y) / (radius * 3.2));
      hexagon(x, y, radius - 1);
      context.strokeStyle = glow ? `rgba(205,98,34,${0.12 + glow * 0.54})` : 'rgba(255,255,255,.12)';
      context.lineWidth = glow ? 1 + glow : 1;
      context.stroke();
    }
  }
}

hero.addEventListener('pointermove', (event) => {
  const rect = hero.getBoundingClientRect();
  mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  drawHoneycomb();
});
hero.addEventListener('pointerleave', () => { mouse = { x: -9999, y: -9999 }; drawHoneycomb(); });
let resizeFrame;
window.addEventListener('resize', () => { window.cancelAnimationFrame(resizeFrame); resizeFrame = window.requestAnimationFrame(drawHoneycomb); });
drawHoneycomb();

const soundtrack = document.querySelector('.soundtrack');
const soundToggle = document.querySelector('.sound-toggle');
soundToggle.addEventListener('click', async () => {
  if (soundtrack.paused) {
    try {
      await soundtrack.play();
      soundToggle.textContent = 'Sound on';
      soundToggle.setAttribute('aria-pressed', 'true');
    } catch {
      soundToggle.textContent = 'Sound unavailable';
    }
  } else {
    soundtrack.pause();
    soundToggle.textContent = 'Sound off';
    soundToggle.setAttribute('aria-pressed', 'false');
  }
});
soundtrack.addEventListener('ended', () => { soundToggle.textContent = 'Sound off'; soundToggle.setAttribute('aria-pressed', 'false'); });

const processSection = document.querySelector('.process');
const processViewport = document.querySelector('.process-sticky');
const processTrack = document.querySelector('.process-track');
const processRail = [...document.querySelectorAll('.process-rail span')];
const processCards = processTrack ? [...processTrack.querySelectorAll('.process-card')] : [];
let processIndex = 0;
let processTimer;
let processResumeTimer;

function setProcessStage(index) {
  processIndex = Math.max(0, Math.min(index, processCards.length - 1));
  processRail.forEach((stage, railIndex) => stage.classList.toggle('active', railIndex === processIndex));
}

function moveProcessTo(index) {
  if (!processViewport || !processCards.length) return;
  setProcessStage(index);
  const card = processCards[processIndex];
  processViewport.scrollTo({ left: card.offsetLeft - processTrack.offsetLeft, behavior: 'smooth' });
}

function pauseProcess() {
  window.clearInterval(processTimer);
  processTimer = undefined;
}

function startProcess() {
  if (reducedMotion || window.innerWidth <= 700 || processTimer || !processCards.length) return;
  processTimer = window.setInterval(() => {
    if (processIndex < processCards.length - 1) moveProcessTo(processIndex + 1);
    else pauseProcess();
  }, 5200);
}

function pauseThenResume() {
  pauseProcess();
  window.clearTimeout(processResumeTimer);
  processResumeTimer = window.setTimeout(startProcess, 8000);
}

if (processSection && processViewport) {
  processViewport.addEventListener('scroll', () => {
    const nearestIndex = processCards.reduce((closest, card, index) => {
      const closestDistance = Math.abs(processViewport.scrollLeft - (processCards[closest].offsetLeft - processTrack.offsetLeft));
      const distance = Math.abs(processViewport.scrollLeft - (card.offsetLeft - processTrack.offsetLeft));
      return distance < closestDistance ? index : closest;
    }, 0);
    setProcessStage(nearestIndex);
  }, { passive: true });
  processViewport.addEventListener('pointerenter', pauseProcess);
  processViewport.addEventListener('pointerleave', startProcess);
  processViewport.addEventListener('pointerdown', pauseThenResume);
  processViewport.addEventListener('focusin', pauseProcess);
  processViewport.addEventListener('focusout', startProcess);
  new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) startProcess();
    else pauseProcess();
  }), { threshold: 0.45 }).observe(processSection);
}
window.addEventListener('resize', () => {
  pauseProcess();
  window.clearTimeout(processResumeTimer);
  processResumeTimer = window.setTimeout(startProcess, 200);
});

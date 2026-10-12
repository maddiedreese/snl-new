import { fitText, FONT_STACK, normalizeText } from './layout.js';

export const WIDTH = 1080;
export const HEIGHT = 1350;
export const DEFAULT_COLORS = ['#f6efdd', '#bef0f1', '#f174c5'];
export const PINS = [
  { id: 'clear', label: 'Clear', color: '#c4ccd0' },
  { id: 'red', label: 'Red', color: '#b92d35' },
  { id: 'blue', label: 'Blue', color: '#4268b0' },
  { id: 'yellow', label: 'Yellow', color: '#d9ae36' },
  { id: 'green', label: 'Green', color: '#538164' },
  { id: 'black', label: 'Black', color: '#343838' },
];

function random(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
}

function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

async function loadPhoto() {
  const image = new Image(); image.src = '/assets/cork-photo.jpg';
  await image.decode(); return image;
}

function corkBackground(photo) {
  const c = canvas(WIDTH, HEIGHT), ctx = c.getContext('2d', { willReadFrequently: true });
  // One photograph, placed once. Never tiled, mirrored, or synthetically generated.
  const scale = Math.max(WIDTH / photo.width, HEIGHT / photo.height);
  ctx.drawImage(photo, (WIDTH - photo.width * scale) / 2, (HEIGHT - photo.height * scale) / 2, photo.width * scale, photo.height * scale);
  const pixels = ctx.getImageData(0, 0, WIDTH, HEIGHT), data = pixels.data;
  let sum = 0, squared = 0;
  for (let i = 0; i < data.length; i += 4) { const l = .2126 * data[i] + .7152 * data[i+1] + .0722 * data[i+2]; sum += l; squared += l*l; }
  const n = WIDTH * HEIGHT, mean = sum/n, sd = Math.sqrt(squared/n - mean*mean);
  // Muted beige/pink sampled from exposed cork in the NBC reference.
  // Tonal mapping preserves the real photographic grain and its irregularity.
  for (let i = 0; i < data.length; i += 4) {
    const l = .2126 * data[i] + .7152 * data[i+1] + .0722 * data[i+2];
    const d = (l - mean) / Math.max(sd, 1);
    data[i] = 187 + d * 26; data[i+1] = 149 + d * 27; data[i+2] = 129 + d * 27;
  }
  ctx.putImageData(pixels, 0, 0);
  return c;
}

function paperTexture() {
  const c = canvas(780, 430), ctx = c.getContext('2d'), rng = random(8134);
  const pixels = ctx.createImageData(c.width, c.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    pixels.data[i] = 72; pixels.data[i+1] = 56; pixels.data[i+2] = 38;
    pixels.data[i+3] = rng() > .98 ? 16 + rng()*19 : rng()*6;
  }
  ctx.putImageData(pixels, 0, 0); return c;
}

function ellipse(ctx, x, y, rx, ry, fill, stroke) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI*2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = .8; ctx.stroke(); }
}

function pin(ctx, x, y, choice, angle) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  const clear = choice.id === 'clear';
  // Tiny steel needle, lower plastic flange, neck, and raised oval head.
  ctx.shadowColor = '#25211c75'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 5;
  ctx.strokeStyle = '#70787c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(-4, 14); ctx.stroke();
  let base = ctx.createRadialGradient(-4, -1, 1, 0, 2, 16);
  base.addColorStop(0, '#ffffffa0'); base.addColorStop(.55, clear ? '#c3ced580' : choice.color); base.addColorStop(.82, clear ? '#66778080' : '#32363788'); base.addColorStop(1, '#f0f4f4d0');
  ellipse(ctx, 0, 4, 15, 13, base, '#ffffff8c');
  ctx.shadowColor = 'transparent';
  const neck = ctx.createLinearGradient(-9, 0, 9, 0);
  neck.addColorStop(0, '#edf4f590'); neck.addColorStop(.28, clear ? '#86979d90' : choice.color); neck.addColorStop(.68, '#eefbfcbb'); neck.addColorStop(1, '#43596780');
  ctx.fillStyle = neck; ctx.beginPath(); ctx.moveTo(-8,2); ctx.lineTo(-8,-15); ctx.lineTo(8,-15); ctx.lineTo(8,2); ctx.quadraticCurveTo(0,9,-8,2); ctx.fill();
  const top = ctx.createRadialGradient(-5,-20,1,0,-15,15);
  top.addColorStop(0,'#ffffffed'); top.addColorStop(.3, clear ? '#e5eceeb5' : choice.color); top.addColorStop(.74,clear ? '#8796a5a0' : choice.color); top.addColorStop(1,clear ? '#d8e0e9cc' : '#3b434699');
  ellipse(ctx,0,-15,13,10,top,'#f6fcffbb');
  ellipse(ctx,-2,-16,8,6,null,'#ffffff7a');
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(-2,-17,8,5,0,Math.PI,Math.PI*1.8); ctx.stroke();
  ctx.restore();
}

function paperPath(ctx, w, h, index) {
  const edge = [1.2,-1.4,.8][index];
  ctx.beginPath(); ctx.moveTo(-w/2, -h/2 + edge); ctx.lineTo(w/2-1,-h/2); ctx.lineTo(w/2,h/2-1); ctx.lineTo(-w/2+.4,h/2+edge); ctx.closePath();
}

export async function createRenderer() {
  await Promise.all([document.fonts.load(`100px ${FONT_STACK}`), document.fonts.ready]);
  if (!document.fonts.check('100px "Studio Marker"')) throw new Error('The marker font could not load.');
  const photo = await loadPhoto(), cork = corkBackground(photo), texture = paperTexture();
  return (target, state) => {
    const ctx = target.getContext('2d');
    ctx.clearRect(0, 0, WIDTH, HEIGHT); ctx.drawImage(cork, 0, 0);
    const layouts = [];
    const choice = PINS.find(p => p.id === state.pin) || PINS[0];
    const w = 698, h = 408, positions = [243, 675, 1107], angles = [-.006,.004,-.008];
    [state.date, state.host, state.music].forEach((text, i) => {
      ctx.save(); ctx.translate(WIDTH/2 + [0,-2,1][i], positions[i]); ctx.rotate(angles[i]);
      ctx.shadowColor = '#2420198a'; ctx.shadowBlur = 5; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 8;
      paperPath(ctx,w,h,i); ctx.fillStyle = state.colors[i]; ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.save(); paperPath(ctx,w,h,i); ctx.clip();
      ctx.drawImage(texture,-w/2,-h/2,w,h);
      const light = ctx.createLinearGradient(0,-h/2,0,h/2); light.addColorStop(0,'#ffffff12'); light.addColorStop(.8,'#ffffff00'); light.addColorStop(1,'#55422b08');
      ctx.fillStyle=light; ctx.fillRect(-w/2,-h/2,w,h);
      ctx.restore();
      const box = { width: w-80, height: h-82, maxSize: i===0 ? 200 : 218, maxLines:3, date:i===0 };
      const layout = fitText(ctx,text,box); layouts.push({...layout,box,text:normalizeText(text)});
      ctx.font=`${layout.fontSize}px ${FONT_STACK}`; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
      // Dark ink for all ordinary cards; white ink only for very dark custom paper.
      const rgb=state.colors[i].match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16));
      ctx.fillStyle = .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2] < 73 ? '#faf8ee' : '#10100e';
      let y = 10 - layout.height/2 + (layout.metrics[0]?.ascent || 0);
      // No clipping is used on text: every glyph must fit by measurement.
      layout.lines.forEach((line,j) => {
        const m=layout.metrics[j], x=(m.left-m.right)/2;
        ctx.fillText(line,x,y); y+=layout.lineHeight;
      });
      pin(ctx,[3,-5,5][i],-h/2+17,choice,[-.25,.16,-.1][i]);
      ctx.restore();
    });
    target.setAttribute('aria-label',`Announcement board: ${state.date || 'blank date'}, hosted by ${state.host || 'blank host'}, with musical guest ${state.music || 'blank musical guest'}.`);
    return layouts;
  };
}

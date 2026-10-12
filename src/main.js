import { hosts, musicalGuests } from './celebrities.js';
import { nextSaturday, randomChoice } from './layout.js';
import { createRenderer, DEFAULT_COLORS, PINS } from './renderer.js';

const $ = id => document.getElementById(id);
const state = { date: nextSaturday(), host: 'Ayo Edebiri', music: 'Hozier', colors: [...DEFAULT_COLORS], pin: 'clear' };
let render, revision = 0, renderedRevision = -1, frame, exportFile, exportUrl;
const status = message => { $('status').textContent = message; };
const filename = () => `snl-card-${state.date.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'my-lineup'}.png`;

function updateExport(blob, current) {
  if (!blob || current !== revision) return;
  if (exportUrl) URL.revokeObjectURL(exportUrl);
  exportUrl = URL.createObjectURL(blob);
  exportFile = new File([blob], filename(), { type: 'image/png' });
  $('download').disabled = false; $('open-image').disabled = false;
  $('share').hidden = !(navigator.canShare && navigator.canShare({ files: [exportFile] }));
}

function draw() {
  frame = undefined;
  if (!render) return;
  const current = revision;
  const layouts = render($('board'),state);
  // Useful QA evidence: the exact measured layout used by the visible canvas.
  $('board').dataset.layout = JSON.stringify(layouts);
  renderedRevision = current;
  $('board').toBlob(blob => updateExport(blob,current),'image/png');
}

function schedule() {
  revision++;
  exportFile = undefined;
  $('download').disabled = true; $('open-image').disabled = true;
  $('share').hidden = true;
  if (frame !== undefined) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(draw);
}

function populate(id, options) {
  const fragment = document.createDocumentFragment();
  for (const name of options) { const option = document.createElement('option'); option.value = name; fragment.append(option); }
  $(id).replaceChildren(fragment);
}
populate('host-suggestions',hosts); populate('music-suggestions',musicalGuests);
$('suggestion-count').textContent = `${(hosts.length + musicalGuests.length).toLocaleString()} names`;
$('date').value = state.date;
for (const id of ['date','host','music']) {
  $(id).addEventListener('input',e => { state[id] = e.target.value; status(''); schedule(); });
}
$('lineup-form').addEventListener('submit',e => e.preventDefault());

function shuffle(key,list) {
  state[key] = randomChoice(list,state[key]); $(key).value = state[key];
}
$('shuffle-host').addEventListener('click',() => { shuffle('host',hosts); status(`New host: ${state.host}.`); schedule(); });
$('shuffle-music').addEventListener('click',() => { shuffle('music',musicalGuests); status(`New musical guest: ${state.music}.`); schedule(); });
$('shuffle-all').addEventListener('click',() => {
  shuffle('host',hosts); shuffle('music',musicalGuests);
  const saturday = new Date(); saturday.setDate(saturday.getDate()+Math.floor(Math.random()*52)*7);
  state.date = nextSaturday(saturday); $('date').value = state.date;
  status(`New lineup: ${state.host} with ${state.music}.`); schedule();
});

for (const [i,label] of ['Date','Host','Music'].entries()) {
  const wrapper = document.createElement('label'); wrapper.className = 'color-choice';
  const input = document.createElement('input'); input.type = 'color'; input.value = state.colors[i]; input.id = `color-${i}`;
  input.setAttribute('aria-label',`${label} card color`);
  const text = document.createElement('span'); text.textContent = label;
  wrapper.append(input,text); $('card-colors').append(wrapper);
  input.addEventListener('input',() => { state.colors[i] = input.value; schedule(); });
}
function syncPins() {
  for (const button of $('pin-colors').children) button.setAttribute('aria-pressed',String(button.dataset.pin===state.pin));
  $('pin-name').textContent=PINS.find(p=>p.id===state.pin).label;
}
for (const pin of PINS) {
  const button=document.createElement('button'); button.type='button'; button.className='pin-option'; button.dataset.pin=pin.id;
  button.setAttribute('aria-label',`${pin.label} push pins`); button.title=`${pin.label} push pins`;
  if(pin.id!=='clear') button.style.background=pin.color;
  button.addEventListener('click',()=>{state.pin=pin.id;syncPins();schedule();});
  $('pin-colors').append(button);
}
syncPins();
$('reset-style').addEventListener('click',()=>{
  state.colors=[...DEFAULT_COLORS]; state.pin='clear'; syncPins();
  state.colors.forEach((color,i)=>{$(`color-${i}`).value=color;});
  status('Classic card colors and clear pins restored.'); schedule();
});

$('download').addEventListener('click',()=>{
  if(!exportFile || renderedRevision!==revision) return;
  const a=document.createElement('a'); a.href=exportUrl; a.download=exportFile.name;
  document.body.append(a); a.click(); a.remove();
  status('Your PNG is ready. If it didn’t save, use “Open image to save.”');
});
$('open-image').addEventListener('click',()=>{
  if(!exportFile) return;
  $('export-image').src=exportUrl;
  $('export-image').alt=$('board').getAttribute('aria-label');
  $('dialog-download').href=exportUrl; $('dialog-download').download=exportFile.name;
  $('image-dialog').showModal();
});
$('close-dialog').addEventListener('click',()=>$('image-dialog').close());
$('image-dialog').addEventListener('click',e=>{if(e.target===$('image-dialog')){const rect=e.target.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)e.target.close();}});
$('share').addEventListener('click',async()=>{
  if(!exportFile) return;
  try { await navigator.share({ files:[exportFile] }); status('Your card was shared.'); }
  catch(error) { if(error.name!=='AbortError') status('Sharing isn’t available here. Download the PNG instead.'); }
});

try {
  render=await createRenderer(); $('loading').hidden=true; draw();
} catch(error) {
  console.error('Could not prepare board:',error);
  $('loading').textContent='The board couldn’t load. Please refresh to try again.';
  status('A font or image failed to load. Your browser needs access to this site’s local assets.');
}

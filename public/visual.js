// Shared renderer: the public site and editor use the same visual settings.
export const defaults=()=>({version:1,theme:{},media:{},pages:{},music:{src:'',volume:0.25,loop:true}});
const color=v=>/^#[0-9a-f]{6}$/i.test(v||'');
const num=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fallback;
export function youtubeURL(value){try{const u=new URL(value);let id;if(u.hostname==='youtu.be')id=u.pathname.slice(1);else if(['youtube.com','www.youtube.com','www.youtube-nocookie.com'].includes(u.hostname))id=u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).pop();if(/^[\w-]{11}$/.test(id||''))return 'https://www.youtube-nocookie.com/embed/'+id;}catch{}return '';}
const local=v=>typeof v==='string'&&/^\/assets\/[a-zA-Z0-9_.% /-]+$/.test(v)&&!v.split('/').includes('..');
export function visualAssets(v){const result=[];if(v?.music?.src)result.push(v.music.src);for(const blocks of Object.values(v?.pages||{}))for(const b of blocks){if(b.src&&local(b.src))result.push(b.src);if(b.poster)result.push(b.poster);for(const i of b.items||[])if(i.src)result.push(i.src);}return result;}
export function validateVisual(v){
 if(!v||v.version!==1||!v.theme||!v.media||!v.pages||!v.music)throw Error('La configuración visual no es válida.');
 if(JSON.stringify(v).length>500000)throw Error('Demasiado contenido adicional; divide las galerías.');
 for(const k of ['primary','dark','accent','background','ink'])if(v.theme[k]&&!color(v.theme[k]))throw Error('Selecciona un color válido.');
 for(const p of visualAssets(v))if(!local(p))throw Error('Archivo multimedia inválido.');
 for(const [page,blocks]of Object.entries(v.pages)){if(!/^[a-z]+$/.test(page)||!Array.isArray(blocks)||blocks.length>30)throw Error('Máximo 30 bloques adicionales por página.');for(const b of blocks){if(!['gallery','video','text'].includes(b.type)||!/^[\w-]+$/.test(b.id))throw Error('Bloque inválido.');if((b.items||[]).length>30)throw Error('Máximo 30 fotos por galería.');if(b.type==='video'&&b.src&&!local(b.src)&&!youtubeURL(b.src))throw Error('Usa MP4 o un enlace de YouTube válido.');}}
}
const css=`
.rv-block{padding:64px 24px;background:var(--rv-bg,transparent);color:var(--rv-fg,inherit)}.rv-inner{max-width:1200px;margin:auto}.rv-block h2{color:inherit;margin:0 0 20px;font-size:clamp(28px,3vw,44px)}.rv-block p{color:inherit;white-space:pre-line;margin:0 0 24px;line-height:1.7}.rv-gallery{display:grid;grid-template-columns:repeat(var(--rv-cols,3),minmax(0,1fr));gap:22px}.rv-gallery figure{margin:0;overflow:hidden}.rv-gallery img{width:100%;height:var(--rv-height,320px);object-fit:var(--rv-fit,cover);border-radius:var(--rv-radius,12px)}.rv-gallery figcaption{font-size:14px;margin:10px 0}.rv-video{width:100%;aspect-ratio:16/9;max-height:80vh;object-fit:contain;background:#081b13;border:0;border-radius:var(--rv-radius,12px)}.rv-music{position:fixed;left:20px;bottom:20px;z-index:80;border:1px solid #ffffff55;border-radius:30px;background:var(--dark,#073c2b);color:#fff;padding:12px 18px;cursor:pointer;font:500 14px system-ui}.rv-edit-block{outline:1px dashed #1a995633;cursor:pointer}.rv-motion{animation-duration:.75s;animation-fill-mode:both}.rv-fade{animation-name:rv-fade}.rv-rise{animation-name:rv-rise}.rv-zoom{animation-name:rv-zoom}@keyframes rv-fade{from{opacity:0}to{opacity:1}}@keyframes rv-rise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}@keyframes rv-zoom{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}@media(max-width:700px){.rv-gallery{grid-template-columns:repeat(min(2,var(--rv-cols,3)),minmax(0,1fr))}.rv-block{padding:40px 20px}.rv-gallery img{height:min(var(--rv-height,320px),260px)}}@media(max-width:450px){.rv-gallery{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.rv-motion{animation:none!important;opacity:1!important;transform:none!important}}
`;
export function applyVisual(doc,config,page,{resolve=x=>x,editing=false}={}){
 const v=config.visual||defaults(),media=config.media||{};const win=doc.defaultView;let observer;
 const style=doc.createElement('style');style.dataset.rv='style';style.textContent=css;doc.head.append(style);
 const root=doc.documentElement;const theme=v.theme||{};
 for(const [k,prop]of Object.entries({primary:'--green',dark:'--dark',accent:'--lime',background:'--pale',ink:'--ink'}))if(color(theme[k]))root.style.setProperty(prop,theme[k]);
 if(color(theme.background))doc.body.style.backgroundColor=theme.background;
 if(color(theme.ink))doc.body.style.color=theme.ink;
 const fonts={manrope:"Manrope,Arial,sans-serif",system:'system-ui,Arial,sans-serif',arial:'Arial,sans-serif',georgia:'Georgia,serif'};if(fonts[theme.font])root.style.fontFamily=fonts[theme.font];
 if(theme.fontSize)root.style.fontSize=num(theme.fontSize,12,24,16)+'px';
 if(theme.headingSize){const h=doc.createElement('style');h.textContent=`h1{font-size:clamp(32px,6vw,${num(theme.headingSize,36,120,80)}px)!important}`;doc.head.append(h);}
 if(theme.animation==='none'){const st=doc.createElement('style');st.textContent='.reveal{opacity:1!important;transform:none!important;animation:none!important}';doc.head.append(st);}
 for(const el of doc.querySelectorAll('img,video')){
  const src=el.getAttribute('src')||el.querySelector('source')?.getAttribute('src');const key=el.dataset.imageKey||Object.keys(media).find(k=>media[k]===src);const m=v.media?.[key];if(!m)continue;
  if(m.width)el.style.width=num(m.width,10,100,100)+'%';if(m.height)el.style.height=num(m.height,40,1200,320)+'px';
  if(key==='volcanes'&&el.closest('.hero')){if(m.height){el.closest('.hero').style.height=num(m.height,200,1200,720)+'px';el.closest('.hero').style.minHeight='0';el.style.height='100%';}el.style.width='100%';}
  if(key==='logo_relieve'){if(m.logoSize){el.style.width=num(m.logoSize,40,300,100)+'px';el.style.height='auto';}if(m.white===false)el.style.filter='none';}
  if(m.height&&el.parentElement.classList.contains('card-img'))el.parentElement.style.height=num(m.height,40,1200,320)+'px';
  if(['cover','contain','fill'].includes(m.fit))el.style.objectFit=m.fit;
  if(m.x!==undefined||m.y!==undefined)el.style.objectPosition=num(m.x,0,100,50)+'% '+num(m.y,0,100,50)+'%';
  if(m.zoom)el.style.scale=String(num(m.zoom,1,2.5,1));if(m.radius!==undefined)el.style.borderRadius=num(m.radius,0,100,0)+'px';
 }
 const main=doc.querySelector('main')||doc.body;const first=main.firstElementChild;let earlyAnchor=first;
 const create=(tag,cls,text)=>{const el=doc.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el;};
 for(const b of v.pages?.[page]||[]){
  const section=create('section','rv-block'+(editing?' rv-edit-block':''));section.dataset.rvBlock=b.id;
  if(color(b.bg))section.style.setProperty('--rv-bg',b.bg);if(color(b.color))section.style.setProperty('--rv-fg',b.color);
  section.style.setProperty('--rv-radius',num(b.radius,0,80,12)+'px');const inner=create('div','rv-inner');section.append(inner);
  if(b.title)inner.append(create('h2','',b.title));if(b.text)inner.append(create('p','',b.text));
  if(b.type==='gallery'){const grid=create('div','rv-gallery');grid.style.setProperty('--rv-cols',num(b.columns,1,4,3));grid.style.setProperty('--rv-height',num(b.height,80,900,320)+'px');grid.style.setProperty('--rv-fit',b.fit==='contain'?'contain':'cover');for(const item of b.items||[]){const figure=create('figure');const img=create('img');img.src=resolve(item.src);img.alt=item.caption||b.title||'Fotografía de RELIEVE';img.loading='lazy';figure.append(img);if(item.caption)figure.append(create('figcaption','',item.caption));grid.append(figure);}inner.append(grid);}
  if(b.type==='video'&&b.src){const yt=youtubeURL(b.src);if(yt&&editing){const placeholder=create('div','rv-video','▶ Video de YouTube · se reproduce en la página publicada');placeholder.style.cssText='display:grid;place-items:center;color:white;padding:24px;text-align:center';inner.append(placeholder);}else if(yt){const iframe=create('iframe','rv-video');iframe.src=yt;iframe.title=b.title||'Video de RELIEVE';iframe.loading='lazy';iframe.allow='fullscreen; picture-in-picture';iframe.allowFullscreen=true;inner.append(iframe);}else{const video=create('video','rv-video');video.src=resolve(b.src);video.controls=true;video.playsInline=true;video.preload='metadata';video.loop=!!b.loop;if(b.poster)video.poster=resolve(b.poster);if(b.autoplay){video.muted=true;video.autoplay=!editing;}inner.append(video);}}
  if(b.position==='start'&&earlyAnchor){earlyAnchor.after(section);earlyAnchor=section;}else main.append(section);
  section.dataset.rvAnimation=b.animation||theme.animation||'none';
 }
 if(['fade','rise','zoom'].includes(theme.animation))for(const el of doc.querySelectorAll('.service-card,.section-heading,.detail-hero'))el.dataset.rvAnimation=theme.animation;
 const animate=el=>{const type=el.dataset.rvAnimation;if(['fade','rise','zoom'].includes(type))el.classList.add('rv-motion','rv-'+type);};
 if(win?.IntersectionObserver&&!win.matchMedia?.('(prefers-reduced-motion: reduce)').matches){observer=new win.IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){animate(entry.target);observer.unobserve(entry.target);}},{threshold:.12});doc.querySelectorAll('[data-rv-animation]').forEach(el=>observer.observe(el));}
 if(v.music?.src){const audio=create('audio');audio.src=resolve(v.music.src);audio.preload='none';audio.loop=!!v.music.loop;audio.volume=num(v.music.volume,0,1,.25);const button=create('button','rv-music','♫ Activar música');button.type='button';button.setAttribute('aria-pressed','false');button.dataset.rvControl='music';button.addEventListener('click',async()=>{if(audio.paused){try{await audio.play();button.textContent='Ⅱ Pausar música';button.setAttribute('aria-pressed','true');}catch{button.textContent='No se pudo reproducir';}}else{audio.pause();button.textContent='♫ Activar música';button.setAttribute('aria-pressed','false');}});audio.addEventListener('ended',()=>{button.textContent='♫ Activar música';button.setAttribute('aria-pressed','false');});doc.body.append(audio,button);}
 return ()=>{observer?.disconnect();doc.querySelectorAll('audio').forEach(a=>a.pause());};
}
if(typeof document!=='undefined'&&document.querySelector('script[data-relieve-visual]')){
 const slug=location.pathname.split('/').filter(Boolean).pop()?.replace(/\.html$/,'')||'index';
 fetch('/visual-config.json').then(r=>{if(!r.ok)throw Error('Configuración no disponible');return r.json();}).then(c=>{validateVisual(c.visual);applyVisual(document,c,slug);}).catch(e=>console.warn('RELIEVE:',e.message));
}

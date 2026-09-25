import {REPO,BRANCH,names,clone,changedFiles,validate,encodeText,decodeText} from './core.js';
const $=id=>document.getElementById(id),frame=$('preview');
let token='',base={},data={},templates={},styles='',head='',treeSha='',page='index',selection=null,busy=false,history=[],uploads=new Map(),assetPaths=new Set(),renderTimer;
const apiRoot='https://api.github.com/repos/'+REPO;
const status=(message)=>{$('status').textContent=message;};
function dirty(){return changedFiles(base,data).length>0;}
function update(){const n=changedFiles(base,data).length;$('changes').textContent=n?n+' sección(es) con cambios':'Sin cambios';$('review').disabled=!n||busy;$('undo').disabled=!history.length||busy;}
async function api(path,method='GET',body){
 const response=await fetch(apiRoot+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(45000)});
 if(!response.ok){if(response.status===401)throw Error('La clave de GitHub es inválida o ha vencido. Sal y abre una nueva sesión.');if(response.status===403)throw Error('GitHub no permitió la operación. Revisa el acceso a relieve-web y el permiso Contents: Read and write, o espera si alcanzaste el límite de solicitudes.');if(response.status===409||response.status===422)throw Error('GitHub detectó un conflicto. Puede haber cambios más recientes. Recarga el editor antes de volver a publicar.');throw Error('GitHub respondió con error '+response.status+'. No se pudo completar la operación.');}
 return response.json();
}
async function pool(list,fn){let i=0;await Promise.all(Array.from({length:Math.min(4,list.length)},async()=>{while(i<list.length){const item=list[i++];await fn(item);}}));}
async function load(){
 const ref=await api('/git/ref/heads/'+BRANCH);head=ref.object.sha;
 const commit=await api('/git/commits/'+head);treeSha=commit.tree.sha;
 const tree=await api('/git/trees/'+treeSha+'?recursive=1');if(tree.truncated)throw Error('El repositorio es demasiado grande para cargarlo de forma segura.');
 assetPaths=new Set(tree.tree.filter(x=>x.type==='blob'&&x.path.startsWith('public/assets/')).map(x=>'/'+x.path.slice(7)));
 const files=tree.tree.filter(x=>x.type==='blob'&&(/^content\/[a-z]+\.json$/.test(x.path)||/^templates\/[a-z]+\.html$/.test(x.path)||x.path==='public/styles.css'));
 const incoming={},incomingTemplates={};
 await pool(files,async f=>{if(f.size>2e6)throw Error('Un archivo de contenido es demasiado grande.');const blob=await api('/git/blobs/'+f.sha);const text=decodeText(blob.content);if(f.path.startsWith('content/'))incoming[f.path.slice(8,-5)]=JSON.parse(text);else if(f.path.startsWith('templates/'))incomingTemplates[f.path.slice(10,-5)]=text;else styles=text;});
 if(!styles.includes('.hero')||!styles.includes(':root'))throw Error('No se pudo cargar el diseño. Recarga el editor; no se mostrará una página sin formato.');
 if(!incoming.media||!incoming.contacto||!incoming.index||!incomingTemplates.header||!incomingTemplates.footer)throw Error('No se encontró la estructura editable de RELIEVE.');
 base=clone(incoming);data=clone(incoming);templates=incomingTemplates;history=[];selection=null;revokeUploads();
 $('page').replaceChildren();for(const [slug,label]of Object.entries(names)){if(templates[slug]){const op=document.createElement('option');op.value=slug;op.textContent=label;$('page').append(op);}}
 $('media-select').replaceChildren();for(const key of Object.keys(data.media)){const option=document.createElement('option');option.value=key;option.textContent=({volcanes:'Portada — volcanes',logo_relieve:'Logo',video_poster:'Portada del video',relieve_original:'Video',equipo:'Equipo'})[key]||names[key]||key.replaceAll('_',' ');$('media-select').append(option);}
 page='index';fillContact();render(false);update();
}
function revokeUploads(){for(const u of uploads.values())URL.revokeObjectURL(u.url);uploads.clear();}
function fillContact(){$('email').value=data.contacto.email;$('phone').value=data.contacto.telefono;$('phone-label').value=data.contacto.telefono_visible;}
function checkpoint(){history.push(clone(data));if(history.length>40)history.shift();}
function value(group,key){return String(data[group]?.[key]??'');}
function mediaURL(path){return uploads.get(path)?.url||path;}
function render(keepScroll=true){
 const y=keepScroll?(frame.contentWindow?.scrollY||0):0;
 const source=templates[page].replace('[[HEADER]]',templates.header).replace('[[FOOTER]]',templates.footer);
 const doc=new DOMParser().parseFromString(source,'text/html');
 doc.querySelectorAll('script,link,base').forEach(el=>el.remove());
 const baseEl=doc.createElement('base');baseEl.href=location.origin+'/';doc.head.prepend(baseEl);
 const css=doc.createElement('style');css.id='relieve-design';css.textContent=styles;doc.head.append(css);
 const designLink=doc.createElement('link');designLink.rel='stylesheet';designLink.href='/styles.css?v='+encodeURIComponent(head||'visual-v2');doc.head.append(designLink);
 const editingCSS=doc.createElement('style');editingCSS.textContent='[data-edit-key]{cursor:text;white-space:pre-wrap}[data-edit-key]:focus{outline:2px solid #3cb675;outline-offset:3px}.hero-shade{pointer-events:none}[data-edit-key]:hover,[data-image-key]:hover{outline:2px dashed #3cb675;outline-offset:4px}[data-image-key]{cursor:pointer}.editing-selected{outline:3px solid #2ab36b!important;outline-offset:4px}a,button{cursor:pointer}.js-motion .reveal{opacity:1!important;transform:none!important}';doc.head.append(editingCSS);
 for(const el of doc.querySelectorAll('*')){
  if(el.tagName==='IMG'){const m=el.getAttribute('src')?.match(/^\[\[media\.([a-z_0-9]+)\]\]$/);if(m)el.dataset.imageKey=m[1];}
  if(el.tagName==='VIDEO'){const source=el.querySelector('source');const m=source?.getAttribute('src')?.match(/^\[\[media\.([a-z_0-9]+)\]\]$/);if(m)el.dataset.imageKey=m[1];}
  for(const attr of [...el.attributes]){
   if(attr.name.startsWith('on')){el.removeAttribute(attr.name);continue;}
   const v=attr.value.replace(/\[\[([a-z_]+)\.([a-z_0-9]+)\]\]/g,(_,g,k)=>value(g,k));
   el.setAttribute(attr.name,['src','poster'].includes(attr.name)?mediaURL(v):v);
  }
 }
 doc.title=doc.title.replace(/\[\[([a-z_]+)\.([a-z_0-9]+)\]\]/g,(_,g,k)=>value(g,k));
 const walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){const regex=/\[\[([a-z_]+)\.([a-z_0-9]+)\]\]/g;let match,last=0;const frag=doc.createDocumentFragment();let found=false;while((match=regex.exec(node.textContent))){found=true;frag.append(doc.createTextNode(node.textContent.slice(last,match.index)));const span=doc.createElement('span');span.dataset.editKey=match[1]+'.'+match[2];span.setAttribute('contenteditable','plaintext-only');span.setAttribute('spellcheck','true');span.setAttribute('aria-label','Editar texto');span.textContent=value(match[1],match[2]);frag.append(span);last=regex.lastIndex;}if(found){frag.append(doc.createTextNode(node.textContent.slice(last)));node.replaceWith(frag);}}
 // Scripts cannot execute in the sandboxed preview, and submissions are intercepted below.
 frame.onload=()=>{const d=frame.contentDocument;frame.contentWindow.scrollTo(0,y);bindInlineEditing(d);d.addEventListener('submit',e=>e.preventDefault(),true);d.addEventListener('click',e=>{e.preventDefault();const image=e.target.closest('[data-image-key]');const text=e.target.closest('[data-edit-key]');if(image)select('image',image.dataset.imageKey,image);else if(text){select('text',text.dataset.editKey,text);text.focus();}else if(e.target.closest('.menu-toggle')){const menu=d.querySelector('#menu');menu?.classList.toggle('open');}else{const a=e.target.closest('a');if(a){const dest=new URL(a.getAttribute('href'),location.origin);const slug=dest.pathname.split('/').pop().replace('.html','')||'index';if(dest.origin===location.origin&&names[slug]){page=slug;$('page').value=slug;clearSelection();render(false);}}}},true);highlight();};
 frame.srcdoc='<!doctype html>'+doc.documentElement.outerHTML;
}
function bindInlineEditing(d){
 d.addEventListener('beforeinput',e=>{const el=e.target.closest('[data-edit-key]');if(!el||busy)return;if(!el.dataset.editSession){checkpoint();el.dataset.editSession='1';}});
 d.addEventListener('input',e=>{const el=e.target.closest('[data-edit-key]');if(!el||busy)return;const [g,k]=el.dataset.editKey.split('.');data[g][k]=el.textContent;for(const other of d.querySelectorAll('[data-edit-key]'))if(other!==el&&other.dataset.editKey===el.dataset.editKey)other.textContent=el.textContent;$('text-value').value=el.textContent;update();status('Texto modificado. Revisa y publica cuando esté listo.');});
 d.addEventListener('focusout',e=>{const el=e.target.closest?.('[data-edit-key]');if(el)delete el.dataset.editSession;});
 d.addEventListener('keydown',e=>{if(e.target.closest('[data-edit-key]')&&['Enter','Escape'].includes(e.key)){e.preventDefault();e.target.blur();}});
}
function highlight(){const d=frame.contentDocument;if(!d)return;d.querySelectorAll('.editing-selected').forEach(x=>x.classList.remove('editing-selected'));if(selection){for(const e of d.querySelectorAll(selection.type==='text'?'[data-edit-key]':'[data-image-key]'))if(e.dataset[selection.type==='text'?'editKey':'imageKey']===selection.key)e.classList.add('editing-selected');}}
function clearSelection(){selection=null;$('text-panel').hidden=true;$('image-panel').hidden=true;$('selection-title').textContent='Selecciona un elemento';$('selection-help').textContent='Pulsa un texto, una foto o el logo en la vista de la derecha.';}
function select(type,key,el){selection={type,key};$('text-panel').hidden=type!=='text';$('image-panel').hidden=type!=='image';if(type==='text'){const [g,k]=key.split('.');$('selection-title').textContent='Editar texto';$('selection-help').textContent=g==='comun'?'Este texto se comparte entre todas las páginas.':'Edita este texto y revisa el resultado a la derecha.';$('text-value').value=value(g,k);}else{$('workspace').classList.add('panel-open');$('toggle-panel').setAttribute('aria-expanded','true');const video=/\.mp4$/i.test(data.media[key]);$('selection-title').textContent=video?'Cambiar video':key==='logo_relieve'?'Cambiar logo':'Cambiar imagen';$('selection-help').textContent='Este archivo se actualizará en todos los lugares donde se utiliza.';$('image-preview').hidden=video;$('image-preview').src=video?'':mediaURL(data.media[key]);$('file').accept=video?'video/mp4':'image/png,image/jpeg,image/webp,image/gif';$('file-label').textContent=video?'Seleccionar MP4':'Seleccionar imagen';$('media-note').textContent=video?'MP4 de hasta 20 MiB. Cambia su portada en Todas las fotos, logo y video.':key==='logo_relieve'?'Usa PNG transparente. El diseño muestra el logo en blanco.':'PNG, JPG, WebP o GIF. Hasta 8 MiB.';$('file').value='';}highlight();}
function edit(group,key,v){if(data[group][key]===v)return;checkpoint();data[group][key]=v;update();clearTimeout(renderTimer);renderTimer=setTimeout(()=>render(),150);status('Cambio en vista previa; todavía no se ha publicado.');}
$('text-value').addEventListener('input',()=>{if(selection?.type==='text'){const [g,k]=selection.key.split('.');edit(g,k,$('text-value').value);}});
for(const [id,key]of [['email','email'],['phone','telefono'],['phone-label','telefono_visible']])$(id).addEventListener('input',()=>edit('contacto',key,$(id).value));
$('file').addEventListener('change',async()=>{
 const f=$('file').files[0];if(!f||busy||selection?.type!=='image')return;lock(true);const key=selection.key;const video=data.media[key].endsWith('.mp4');
 try{if(video?f.type!=='video/mp4':!['image/png','image/jpeg','image/webp','image/gif'].includes(f.type))throw Error('Selecciona un archivo del formato indicado.');if(f.size>(video?20:8)*1024*1024)throw Error('El archivo es demasiado grande. Comprime la imagen o el video.');
 if(!video){const bitmap=await createImageBitmap(f);bitmap.close();}
 const ext=({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif','video/mp4':'mp4'})[f.type];const path='/assets/'+key+'-'+crypto.randomUUID()+'.'+ext;const bytes=new Uint8Array(await f.arrayBuffer());let bin='';for(let i=0;i<bytes.length;i+=8192)bin+=String.fromCharCode(...bytes.subarray(i,i+8192));
 uploads.set(path,{base64:btoa(bin),url:URL.createObjectURL(f),size:f.size});checkpoint();data.media[key]=path;update();render();select('image',key);status('Archivo listo en la vista previa. Pulsa Revisar y publicar para guardarlo.');
 }catch(e){status(e.message);}finally{lock(false);}
});
$('toggle-panel').onclick=()=>{const open=$('workspace').classList.toggle('panel-open');$('toggle-panel').setAttribute('aria-expanded',String(open));};
$('close-panel').onclick=()=>{$('workspace').classList.remove('panel-open');$('toggle-panel').setAttribute('aria-expanded','false');};
$('select-media').onclick=()=>select('image',$('media-select').value);
$('page').addEventListener('change',()=>{page=$('page').value;clearSelection();render(false);});
$('mobile').onclick=()=>{$('frame-wrap').classList.add('mobile');$('mobile').classList.add('selected');$('desktop').classList.remove('selected');$('mobile').setAttribute('aria-pressed','true');$('desktop').setAttribute('aria-pressed','false');};
$('desktop').onclick=()=>{$('frame-wrap').classList.remove('mobile');$('desktop').classList.add('selected');$('mobile').classList.remove('selected');$('desktop').setAttribute('aria-pressed','true');$('mobile').setAttribute('aria-pressed','false');};
$('undo').onclick=()=>{if(!history.length)return;data=history.pop();fillContact();clearSelection();render();update();status('Se deshizo el último cambio.');};
$('review').onclick=()=>{try{validate(data,base);const list=changedFiles(base,data);$('summary').textContent='Se actualizarán '+list.length+' sección(es): '+list.map(x=>names[x]||({media:'fotos y logo',comun:'menú y pie',contacto:'contacto'})[x]||x).join(', ')+'.';$('confirm').showModal();}catch(e){status(e.message);}};
$('confirm').addEventListener('close',()=>{if($('confirm').returnValue==='publish')publish();});
function lock(on){busy=on;document.querySelectorAll('#workspace input,#workspace textarea,#workspace select,#workspace button').forEach(x=>x.disabled=on);frame.style.pointerEvents=on?'none':'';update();}
async function publish(){
 if(busy||!dirty())return;lock(true);status('Comprobando la versión actual…');
 try{
 validate(data,base);const ref=await api('/git/ref/heads/'+BRANCH);if(ref.object.sha!==head)throw Error('Hay cambios nuevos en GitHub o Pages CMS. No se ha sobrescrito nada. Conserva tus textos y recarga el editor para trabajar sobre la última versión.');
 const entries=[];const used=new Set(Object.values(data.media));let total=0;
 for(const path of used){if(!uploads.has(path)&&!assetPaths.has(path))throw Error('Falta un archivo de imagen. Vuelve a seleccionarlo.');const f=uploads.get(path);if(!f||assetPaths.has(path))continue;total+=f.size;if(total>24*1024*1024)throw Error('Publica menos archivos a la vez: el máximo por operación es 24 MiB.');}
 status('Guardando los archivos en GitHub…');
 for(const [path,file]of uploads){if(!used.has(path)||assetPaths.has(path))continue;const blob=await api('/git/blobs','POST',{content:file.base64,encoding:'base64'});entries.push({path:'public'+path,mode:'100644',type:'blob',sha:blob.sha});}
 for(const key of changedFiles(base,data)){const blob=await api('/git/blobs','POST',{content:encodeText(JSON.stringify(data[key],null,2)+'\n'),encoding:'base64'});entries.push({path:'content/'+key+'.json',mode:'100644',type:'blob',sha:blob.sha});}
 const tree=await api('/git/trees','POST',{base_tree:treeSha,tree:entries});const commit=await api('/git/commits','POST',{message:'Actualizar RELIEVE desde el editor visual',tree:tree.sha,parents:[head]});
 try{await api('/git/refs/heads/'+BRANCH,'PATCH',{sha:commit.sha,force:false});}catch(e){const actual=await api('/git/ref/heads/'+BRANCH);if(actual.object.sha!==commit.sha)throw e;}
 head=commit.sha;treeSha=tree.sha;base=clone(data);history=[];for(const path of used)assetPaths.add(path);
 status('Guardado en GitHub. Cloudflare está procesando la actualización; comprueba su estado y después abre la página publicada.');
 }catch(e){status(e.name==='TimeoutError'?'La conexión tardó demasiado. Los cambios siguen en esta sesión. Comprueba GitHub antes de volver a publicar.':e.message);}finally{lock(false);}
}
$('login-form').addEventListener('submit',async e=>{e.preventDefault();token=$('token').value.trim();$('token').value='';$('connect').disabled=true;$('login-status').textContent='Abriendo la versión más reciente de tu página…';try{await load();$('login').hidden=true;$('workspace').hidden=false;status('Pulsa un texto y escribe directamente sobre la página.');}catch(e){token='';$('login-status').textContent=e.message;}finally{$('connect').disabled=false;}});
$('logout').onclick=()=>{if(dirty()&&!window.confirm('Hay cambios sin publicar. ¿Quieres descartarlos y salir?'))return;clearTimeout(renderTimer);token='';base={};data={};templates={};history=[];revokeUploads();frame.srcdoc='';$('workspace').hidden=true;$('login').hidden=false;$('login-status').textContent='Sesión cerrada.';};
window.addEventListener('beforeunload',e=>{if(dirty()){e.preventDefault();e.returnValue='';}});

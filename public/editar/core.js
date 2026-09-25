import {validateVisual} from '../visual.js';
export const REPO='relieveguate-star/relieve-web';
export const BRANCH='main';
export const names={index:'Inicio',servicios:'Servicios',experiencia:'Nuestra experiencia',cotizacion:'Cotización',geofisica:'Geofísica',topografia:'Topografía',geotecnia:'Geotecnia',geologia:'Geología',mineria:'Minería',hidrogeologia:'Hidrogeología',perforacion:'Perforación',ingenieria:'Ingeniería'};
export const clone=x=>JSON.parse(JSON.stringify(x));
export function changedFiles(original,current){return Object.keys(original).filter(k=>JSON.stringify(original[k])!==JSON.stringify(current[k]));}
export function validate(data,original){
 validateVisual(data.visual);
 if(!/^\d{8,15}$/.test(data.contacto.telefono))throw Error('El número de WhatsApp debe contener de 8 a 15 dígitos, con código de país.');
 if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.contacto.email))throw Error('Revisa el correo electrónico.');
 for(const [group,values] of Object.entries(original)){
  if(group==='visual')continue;
  if(!data[group]||Object.keys(values).length!==Object.keys(data[group]).length)throw Error('La estructura del contenido cambió. Recarga el editor.');
  for(const key of Object.keys(values)){
   const value=data[group][key];
   if(typeof value!=='string'||value.length>20000||value.includes('[['))throw Error('Revisa el contenido: usa texto de hasta 20 000 caracteres, sin la secuencia [[.');
   if(group==='media'&&(!/^\/assets\/[a-zA-Z0-9_./% -]+$/.test(value)||value.split('/').includes('..')))throw Error('Selecciona una imagen válida de la página.');
  }
 }
}
export const encodeText=s=>{const bytes=new TextEncoder().encode(s);let bin='';for(let i=0;i<bytes.length;i+=8192)bin+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(bin);};
export const decodeText=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,'')),c=>c.charCodeAt(0)));

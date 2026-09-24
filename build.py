"""Build the RELIEVE website from content edited through Pages CMS. Python 3, no dependencies."""
from pathlib import Path
import html,json,re,shutil
from urllib.parse import urlsplit,unquote
ROOT=Path(__file__).resolve().parent
PUBLIC=ROOT/'public'
DIST=ROOT/'dist'
TOKEN=re.compile(r'\[\[([a-z_]+)\.([a-z_0-9]+)\]\]')
def build():
 data={p.stem:json.loads(p.read_text(encoding='utf-8')) for p in (ROOT/'content').glob('*.json')}
 contact=data['contacto']
 if not re.fullmatch(r'[0-9]{8,15}',str(contact['telefono'])):raise ValueError('WhatsApp: escribe entre 8 y 15 dígitos, con código de país, sin espacios.')
 if not re.fullmatch(r'[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+',contact['email']):raise ValueError('Revisa el correo de contacto.')
 for key,url in data['media'].items():
  if not isinstance(url,str) or not url.startswith('/assets/'):raise ValueError(f'{key}: selecciona un archivo de la biblioteca de medios.')
  path=(PUBLIC/unquote(url).lstrip('/')).resolve()
  if not path.is_relative_to((PUBLIC/'assets').resolve()) or not path.is_file():raise ValueError(f'No se encuentra el archivo de {key}: {url}')
 for path in PUBLIC.rglob('*'):
  if path.is_file() and path.stat().st_size>25*1024*1024:raise ValueError(f'{path.name}: Cloudflare Pages admite hasta 25 MiB por archivo. Comprime el video antes de subirlo.')
 def render(text):
  def replace(m):return html.escape(str(data[m[1]][m[2]]),quote=True)
  return TOKEN.sub(replace,text)
 header=render((ROOT/'templates/header.html').read_text())
 footer=render((ROOT/'templates/footer.html').read_text())
 output={}
 for p in (ROOT/'templates').glob('*.html'):
  if p.stem in ('header','footer'):continue
  text=render(p.read_text().replace('[[HEADER]]',header).replace('[[FOOTER]]',footer))
  if '[[' in text:raise ValueError(f'Hay un campo sin resolver en {p.name}')
  output[p.name]=text
 if DIST.exists():shutil.rmtree(DIST)
 shutil.copytree(PUBLIC,DIST)
 for name,text in output.items():(DIST/name).write_text(text,encoding='utf-8')
 (DIST/'contacto.js').write_text('window.RELIEVE_CONTACT = '+json.dumps(contact,ensure_ascii=True)+';\n')
 print(f'RELIEVE: {len(output)} páginas generadas en dist.')
if __name__=='__main__':build()

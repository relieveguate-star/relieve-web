# RELIEVE · página editable

Esta versión conserva las 12 páginas, el diseño, las fotos, el logo y el video de RELIEVE. Está preparada para Pages CMS + GitHub + Cloudflare Pages. Todavía requiere conectarla con tus cuentas; este archivo no constituye una publicación.

## 1. Subir a GitHub

1. Abre https://github.com/new e inicia sesión.
2. Crea un repositorio llamado `relieve-web`, selecciona **Private** y activa **Add a README file**. Pulsa **Create repository**.
3. Descomprime el ZIP de RELIEVE en tu computadora.
4. Dentro del repositorio, pulsa **Add file → Upload files**.
5. Arrastra el CONTENIDO de la carpeta descomprimida, no el ZIP ni una carpeta contenedora adicional. Deben quedar en la raíz `build.py`, `.pages.yml`, `content`, `templates` y `public`.
6. Pulsa **Commit changes**. Si no se subió `.pages.yml`, repite la carga seleccionando ese archivo: es necesario para el editor. En macOS, Cmd+Shift+. muestra archivos ocultos.

El repositorio puede ser privado aunque la página publicada sea pública. No subas contraseñas ni documentos internos.

## 2. Publicar en Cloudflare Pages

1. En https://dash.cloudflare.com abre **Workers & Pages**.
2. Selecciona **Create application → Pages → Connect to Git**. Según la interfaz puede aparecer como **Get started → Import an existing Git repository**. Elige PAGES, no un proyecto Worker.
3. Conecta GitHub y concede acceso solamente a `relieve-web`.
4. Elige ese repositorio y configura:

| Campo | Valor |
| --- | --- |
| Nombre del proyecto | `relieve-guatemala` o un nombre disponible |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `python3 build.py` |
| Build output directory | `dist` |
| Root directory | dejar vacío |

5. Pulsa **Save and Deploy**.
6. Cuando indique éxito, abre la dirección `.pages.dev` que Cloudflare te asigne. El nombre propuesto no está reservado.

No uses Direct Upload para este proyecto: la conexión con GitHub permite actualizar automáticamente el sitio después de guardar cambios en el editor.

## 3. Activar el editor

1. Abre https://app.pagescms.org e inicia sesión con GitHub.
2. Autoriza Pages CMS para el repositorio `relieve-web`.
3. Selecciona el repositorio y la rama `main`.
4. Encontrarás:
   - **01 · Fotos, logo y video:** reemplaza imágenes y video. Las fotografías compartidas se actualizan en todas sus apariciones.
   - **02 · Contacto y cotizaciones:** correo y teléfono; se actualizan tanto la información visible como los destinos del formulario.
   - **03 · Menú y pie de página:** textos compartidos.
   - **Inicio, Servicios, Nuestra experiencia y las ocho especialidades:** textos de cada página. El nombre del campo muestra el texto original para localizarlo. Los textos de tarjetas repetidas en páginas distintas se editan en cada página.
5. Guarda los cambios. Cloudflare publicará una nueva versión automáticamente cuando termine de procesarla. Abre la dirección pública para comprobarla.

## Cambiar una foto, texto o logo

- Foto: abre **Fotos, logo y video**, elige por ejemplo **Portada — volcanes**, selecciona o sube una imagen y guarda. Subir una imagen a Medios por sí solo no reemplaza una foto: debes seleccionarla en el campo correspondiente.
- Texto: abre la página que deseas cambiar, modifica el campo y guarda. No necesitas escribir HTML.
- Logo: cambia el campo **Logo**. Usa un PNG transparente; el diseño muestra su silueta en blanco.
- Video: sube un MP4 optimizado, menor de 25 MiB. Cambia también **Portada del video** si lo necesitas. El video actual conserva los textos y números que ya vienen incrustados en el archivo original: cambiar el teléfono del sitio no modifica esos fotogramas.

Es un editor por campos, no un editor de arrastrar secciones. Cambios de distribución, animaciones o nuevas páginas requieren modificar las plantillas.

## Cotizaciones y respaldo

El formulario prepara un mensaje de WhatsApp o correo. El visitante debe terminar el envío; no hay base de datos ni envío automático desde un servidor.

GitHub conserva el historial de cambios. Guarda este ZIP como respaldo inicial. La versión anterior en ChatGPT es independiente y no se actualizará cuando edites en Pages CMS.

## Para desarrollo

Ejecuta `python3 build.py`. Se generan las páginas en `dist`. No edites `dist` manualmente: se reconstruye desde `templates`, `content` y `public`. Los contenidos se escapan antes de incorporarse al HTML. No hay dependencias que instalar.

Documentación:
- https://pagescms.org/docs/quick-start/
- https://pagescms.org/docs/configuration/
- https://developers.cloudflare.com/pages/get-started/git-integration/

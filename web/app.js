/* Better xCloud Web Lab 0.3.0: browser-aware installation helper. */
(()=>{'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const views={home:'Inicio',cloud:'Preparar Xbox',lab:'Laboratorio'};
let installPrompt=null,toastTimer=0,connectedPad=null;
const XBOX_URL="https://www.xbox.com/play/";
const PREF="better-xcloud-web-auto-open-v1";
const setupRequested=new URLSearchParams(location.search).has("setup");
const readAuto=()=>{try{return localStorage.getItem(PREF)==="yes";}catch{return false;}};
const writeAuto=state=>{try{localStorage.setItem(PREF,state?"yes":"no");}catch{}};
const openXbox=()=>{location.assign(XBOX_URL);};
function msg(t){const el=$('#toast');el.textContent=t;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3500);}
function closeMenu(){const nav=$('.sidebar');nav.classList.remove('mobile-open');$('#menu-toggle').setAttribute('aria-expanded','false');}
function showPage(t){if(!Object.hasOwn(views,t))return;$$('.view').forEach(el=>el.classList.toggle('visible',el.dataset.page===t));$$('.nav-link').forEach(el=>{const active=el.dataset.view===t;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});$('#current-page').textContent=views[t];closeMenu();if(t==='lab')updateStatus();window.scrollTo(0,0);}
$$('[data-view]').forEach(el=>el.addEventListener('click',()=>showPage(el.dataset.view)));
$$('[data-go]').forEach(el=>el.addEventListener('click',()=>showPage(el.dataset.go)));
$('#menu-toggle').addEventListener('click',()=>{const open=$('.sidebar').classList.toggle('mobile-open');$('#menu-toggle').setAttribute('aria-expanded',String(open));});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
function updateStatus(){const online=navigator.onLine;$('#status-badge').textContent=online?'● En línea':'● Sin conexión';$('#status-badge').classList.toggle('offline',!online);$('#network-text').textContent=online?'Red disponible':'Sin conexión';$('#network-indicator').classList.toggle('good',online);$('#network-indicator').classList.toggle('bad',!online);$('#network-check').textContent=online?'El navegador informa que hay conexión. El servicio Xbox requiere Internet.':'No hay conexión detectada; Xbox Cloud Gaming no estará disponible.';
$('#offline-check').textContent=('serviceWorker' in navigator && window.isSecureContext)?(navigator.serviceWorker.controller?'Interfaz web guardada para abrirse sin Internet. Los juegos de Xbox siempre requieren conexión.':'Instala la PWA para acceder a esta interfaz sin Internet (después de una primera visita en línea).'):'Para activar el caché de la interfaz, abre esta web desde HTTPS o localhost.';
$('#gamepad-check').textContent=connectedPad?'Detectado: '+connectedPad.id.slice(0,85):'Sin mando detectado. Conéctalo y pulsa un botón; depende del soporte del navegador.';}
window.addEventListener('online',updateStatus);window.addEventListener('offline',updateStatus);
if('serviceWorker' in navigator&&window.isSecureContext){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(updateStatus).catch(()=>{$('#offline-check').textContent='No se pudo instalar el caché de la interfaz.';}));navigator.serviceWorker.addEventListener('controllerchange',updateStatus);}
function detectPad(){let pads=[];try{pads=navigator.getGamepads?.()||[];}catch{}const next=Array.from(pads).find(p=>p&&p.connected)||null;if(next?.id!==connectedPad?.id){connectedPad=next;$('#gamepad-text').textContent=next?next.id.slice(0,27):'Sin control conectado';$('#gamepad-indicator').classList.toggle('good',!!next);updateStatus();}}
window.addEventListener('gamepadconnected',detectPad);window.addEventListener('gamepaddisconnected',detectPad);setInterval(detectPad,1200);
function install(){if(installPrompt){installPrompt.prompt();installPrompt.userChoice.finally(()=>{installPrompt=null;$('#install-app').hidden=true;});}else msg('Si está disponible, usa Instalar desde el menú del navegador. En iPhone: Compartir → Añadir a inicio.');}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#install-app').hidden=false;});window.addEventListener('appinstalled',()=>{$('#install-app').hidden=true;msg('Aplicación instalada.');});$('#install-app').addEventListener('click',install);$('#install-secondary').addEventListener('click',install);
$('#auto-open-xbox').checked=readAuto();
$('#auto-open-xbox').addEventListener('change',e=>{writeAuto(e.target.checked);msg(e.target.checked?'La próxima vez se abrirá Xbox directamente.':'Se mostrará el menú al abrir esta web.');});
$('#finish-setup').addEventListener('click',()=>{writeAuto(true);openXbox();});
function browserGuide(){
const ua=navigator.userAgent||"";
const ios=/iPad|iPhone|iPod/i.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const android=/Android/i.test(ua),edgeAndroid=/EdgA\//.test(ua);
const chromium=/Chrome|Chromium|Edg|OPR/.test(ua)&&!android&&!ios;
let name="Navegador",hint="Los scripts necesitan un gestor compatible y tu autorización.",guide="https://better-xcloud.github.io/";
if(ios){name="iPhone / iPad";hint="Safari admite extensiones como Userscripts. Otros navegadores pueden no permitir la integración.";guide="https://better-xcloud.github.io/safari/";}
else if(edgeAndroid){name="Microsoft Edge para Android";hint="Prueba Tampermonkey desde Extensiones, luego instala la integración completa.";guide="https://better-xcloud.github.io/android-browser/";}
else if(android){name="Android";hint="En este navegador puedes abrir Xbox, pero para los scripts utiliza un navegador compatible o una aplicación Android con WebView.";guide="https://better-xcloud.github.io/android-browser/";}
else if(chromium){name="PC · Chrome / Edge / Chromium";hint="Instala Tampermonkey y confirma el archivo de integración completa.";guide="https://better-xcloud.github.io/chromium/";}
else if(/Firefox|FxiOS/.test(ua)){name="Firefox";hint="La ejecución depende del gestor de scripts y de compatibilidad con las funciones de Xbox Cloud Gaming.";guide="https://better-xcloud.github.io/";}
else if(/Safari/.test(ua)){name="Safari";hint="Se requiere una extensión compatible de userscripts y tu autorización.";guide="https://better-xcloud.github.io/safari/";}
$('#browser-name').textContent=name;$('#browser-help').textContent=hint;$('#browser-guide').href=guide;$('#extension-guide').href=guide;
}
browserGuide();
updateStatus();detectPad();
if(readAuto()&&!setupRequested){openXbox();}
})();
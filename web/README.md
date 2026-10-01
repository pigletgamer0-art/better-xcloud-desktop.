# Better xCloud Web Lab — 0.2.0
Versión web comunitaria sin minijuegos y sin Ultimate Sandbox.

## Uso
- Acceso directo a `https://www.xbox.com/play/` para jugar en Xbox Cloud Gaming.
- El Better xCloud **oficial** se ejecuta en esa página únicamente después de instalar el userscript original en un navegador compatible (no se puede inyectar desde GitHub Pages por políticas de seguridad del navegador).
- Instala la versión oficial desde https://github.com/redphx/better-xcloud/releases/latest/download/better-xcloud.user.js.
- Instala opcionalmente `web/integration/better-xcloud-lab.user.js` para agregar la pestaña Laboratorio a los ajustes originales de Better xCloud, sin superposiciones sobre el stream.
- Desde el lanzador, confirma "Ya lo instalé" para abrir Xbox automáticamente las siguientes veces; `?setup=1` permite volver a la configuración.
- Interfaz web instalable y caché offline de la interfaz, pero Xbox Cloud Gaming siempre requiere Internet.
- Web: https://pigletgamer0-art.github.io/better-xcloud-desktop./web/

## Compatibilidad
En PC Chrome/Edge con Tampermonkey; Android Edge con Tampermonkey; Safari/iOS requiere un gestor de userscripts compatible. Una PWA instalada no garantiza soporte de extensiones.

## Publicación
El flujo GitHub Actions `.github/workflows/deploy-web-lab.yml` publica `web/` en GitHub Pages cada vez que cambia el directorio.

No está afiliado a Microsoft, Xbox ni redphx. La instalación oficial debe provenir del repositorio de redphx. No desbloquea contenidos de pago.

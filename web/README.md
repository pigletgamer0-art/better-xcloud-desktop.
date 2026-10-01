# Better xCloud Web Lab — 0.1.1

Sitio comunitario, sin minijuegos y sin Ultimate Sandbox.

- Inicio, Xbox Cloud Gaming y Laboratorio.
- Laboratorio: conexión, control detectado, instalación y caché offline de la **interfaz**.
- Los juegos de Xbox siempre requieren Internet y acceso válido.
- Userscript opcional: `web/integration/better-xcloud-lab.user.js` integra la pestaña Laboratorio dentro de los ajustes de Better xCloud; requiere un navegador con gestores de scripts.
- Sin elementos flotantes durante la partida.
- Web: https://pigletgamer0-art.github.io/better-xcloud-desktop./web/

## Publicación

El flujo de GitHub Actions `.github/workflows/deploy-web-lab.yml` publica automáticamente `web/` a GitHub Pages cuando se modifica la carpeta. **Requiere habilitar Pages > Build and deployment > Source: GitHub Actions** en Settings del repositorio. Si GitHub Pages no está habilitado, la acción falla hasta que el propietario cambie esa opción.

Este proyecto no está afiliado a Microsoft, Xbox o redphx.
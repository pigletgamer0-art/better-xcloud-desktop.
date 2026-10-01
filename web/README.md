# Better xCloud Web Lab v0.3.0

Web complementaria de Xbox Cloud Gaming: https://pigletgamer0-art.github.io/better-xcloud-desktop./web/

## Un instalador para Better xCloud + Laboratorio

`web/integration/better-xcloud-completo.user.js` es un archivo para gestores de userscripts; utiliza `@require` para cargar Better xCloud **original 6.7.12** desde el GitHub de redphx y nuestro userscript `web/integration/better-xcloud-lab.user.js`. Esta técnica requiere la extensión correspondiente, permiso y confirmación: una web normal no puede instalar scripts en Xbox desde otro dominio.

Si tenías scripts instalados individualmente, desactiva los duplicados. Nuestro Laboratorio va dentro del menú de ajustes, sin añadir botón flotante al juego.

En Android, una APK con WebView integrado puede inyectar scripts en su propio WebView y es una **alternativa nativa distinta**; no puede instalarlos en todos los navegadores. El APK Mobile Enhanced aportado como referencia incluye mejoras de mandos, imagen y comprobación de que Better xCloud esté disponible, pero también crea un botón flotante que no reutilizamos.

Guías de Better xCloud: https://better-xcloud.github.io/ ; https://better-xcloud.github.io/android/ . Xbox Cloud Gaming requiere Internet y acceso autorizado a los juegos. No incluye minijuegos ni Ultimate Sandbox. No estamos afiliados con Microsoft ni con el autor original.

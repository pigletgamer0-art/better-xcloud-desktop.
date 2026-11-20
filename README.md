# Better xCloud Desktop

Aplicación comunitaria para **Windows 10/11 x64** que ejecuta Xbox Cloud Gaming en un runtime de escritorio propio e integra Better xCloud.

> Proyecto no oficial. No está afiliado con Microsoft, Xbox ni con el autor original de Better xCloud.

## Desarrollo 4.0

**Versión objetivo: 4.0.0-beta.1**

La rama `feature/desktop-4.0-ui-performance` contiene el trabajo de rediseño y optimización. La interfaz nueva se está integrando y validando; todavía no es una publicación estable.

### Interfaz 4.0

- Navegación: **Inicio**, **Jugar**, **Laboratorio** y **Ajustes**.
- Tema oscuro con acentos azules y cian.
- Diseño adaptable a pantallas de portátil y ventanas pequeñas.
- Tipografía del sistema y recursos locales.
- Sin framework visual, fuentes remotas ni animaciones pesadas.
- Accesibilidad básica: foco visible, navegación por teclado y respeto a `prefers-reduced-motion`.

Los paneles de Laboratorio y Ajustes son una vista previa visual hasta que se conecten con las funciones existentes. No representan controles ya implementados.

### Objetivos de rendimiento

- Mantener un único runtime Electron/Chromium.
- No modificar el pipeline de streaming durante el rediseño visual.
- Evitar trabajo periódico en paneles ocultos cuando no sea necesario.
- Reducir escrituras repetidas de configuración.
- Medir inicio, memoria, CPU en reposo y estabilidad durante una sesión antes de afirmar mejoras.

### Funciones que deben conservarse

- Perfiles y distribución de controles Xbox, PlayStation y Nintendo/Switch.
- Native Look.
- MIC Sensitivity.
- Ultra Assistant y Stream Health.
- Sesión, ajustes y datos del usuario.
- Instalador y desinstalador de Windows.

### Sincronización con Better xCloud Original

La aplicación comprueba nuevas versiones del proyecto oficial `redphx/better-xcloud`. La actualización debe validarse antes de reemplazar la copia local y solicitar el reinicio para activarla. No se debe sustituir el script durante una sesión activa. Si falla la descarga o la validación, se conserva la versión que ya funciona.

## Estado de publicación

- [ ] Integración de la interfaz con el runtime Electron.
- [ ] Regresión de controles, audio, micrófono y streaming.
- [ ] Pruebas de instalación y actualización desde versiones anteriores.
- [ ] Medición de CPU, memoria y tiempo de inicio en Windows.
- [ ] Compilación final y publicación de instalador con checksum.

**No descargar ni tratar los ejecutables de validación como la versión estable 4.0.0.** La publicación final se hará únicamente después de superar las pruebas.

Consulta:
- [Hoja de ruta 4.0](docs/ROADMAP-4.0.md)
- [Política de rendimiento](docs/PERFORMANCE-4.0.md)
- [Plan de publicación](docs/RELEASE-4.0.md)

## Versión estable anterior

La rama estable conserva las versiones anteriores y sus instrucciones de instalación. El historial no se elimina para que sea posible revisar cambios y recuperar código si fuera necesario.

## Licencias y atribución

**Better xCloud** fue creado por **redphx** y se distribuye bajo licencia MIT. Se conservan sus avisos de copyright y la licencia original en `LICENSE-BETTER-XCLOUD.txt`.

Better xCloud Desktop es un cliente comunitario no oficial. No pretende presentarse como el proyecto original ni como una versión oficial de Microsoft o Xbox. Consulta también `NOTICE.txt` para los avisos de terceros. El código propio de este empaquetado se publica bajo MIT salvo componentes que mantengan licencias distintas.

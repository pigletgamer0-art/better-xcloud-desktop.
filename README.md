# Better xCloud Desktop

Aplicación independiente para **Windows 10/11 x64** que ejecuta Xbox Cloud Gaming con un runtime propio de Electron/Chromium e integra Better xCloud.

> Proyecto no oficial. No está afiliado con Microsoft, Xbox ni con el autor original de Better xCloud.

## Beta pública — v2.7.7

**The Version It Should Have Been — Beta Preview**

La beta pública **v2.7.7** está disponible en la rama `beta-v2.7.7`.

Incluye:

- Perfiles automáticos para controles Xbox, PlayStation y Nintendo/Switch.
- Símbolos de PlayStation y soporte ABXY/BAYX para Nintendo.
- `MIC Sensitivity` para juegos que usan micrófono, incluidos audífonos/headsets.
- Native Look con las correcciones de estabilidad de las betas 2.7.4–2.7.6.
- `Alt + F9`: Ultra Assistant.
- `Alt + F10`: Stream Health.
- `Ctrl + Shift + M`: MIC Sensitivity.

Notas completas: `BETA-v2.7.7.md` en la rama `beta-v2.7.7`.

> La rama `main` sigue siendo la versión estable mientras se prueba la beta.

## Versión estable actual

**4.0.0-beta.1 (en desarrollo)**

### Incluye

- App independiente: al abrirla carga directamente Xbox Cloud Gaming (`https://www.xbox.com/es-CL/play`); no muestra una pantalla de inicio intermedia, no abre Microsoft Edge y no requiere Tampermonkey.
- Better xCloud Original se obtiene desde el último release compatible de redphx/better-xcloud durante la compilación.
- Instalador y desinstalador para Windows.
- Registro en **Configuración → Aplicaciones instaladas**.
- Accesos directos en Menú Inicio.
- Sesión y ajustes guardados en un perfil separado.
- Detección periódica de nuevas versiones oficiales de Better xCloud (descarga validada y aviso para reiniciar).

## Estado de la versión 4.0\n\nEsta rama corresponde a la beta de desarrollo. Los ejecutables de validación no son instaladores estables ni deben confundirse con la publicación oficial 4.0.0. Consulta [el plan de lanzamiento](docs/RELEASE-4.0.md).\n\n## Controles

- `F11`: pantalla completa
- `Ctrl + R`: recargar
- `Alt + ← / →`: navegar atrás/adelante

## Instalación

1. Descarga o compila `BetterXcloud-Desktop-Setup-v2.6.exe`.
2. Ejecútalo en Windows 10/11 x64.
3. En la primera instalación se descargará Electron 44.3.0 para Windows x64 desde sus releases oficiales.
4. El runtime queda instalado en `%LOCALAPPDATA%\BetterXcloudDesktop`.
5. La sesión, ajustes, respaldos y logs se guardan en `%APPDATA%\BetterXcloudDesktop`.

El instalador no está firmado digitalmente, por lo que Windows SmartScreen puede mostrar una advertencia.

## Compilar la beta de validación

Requisitos: **Go 1.22 o superior**.

Para reproducir la compilación de validación, copia `app/` dentro de `installer/embedded/app/`. Luego, desde `installer/`:

```bat
set GOOS=windows
set GOARCH=amd64
set CGO_ENABLED=0
go build -trimpath -ldflags="-H=windowsgui -s -w" -o BetterXcloud-Desktop-4.0.0-beta.1-Validation.exe .
```

Este ejecutable de validación no debe confundirse con el instalador oficial. El runtime de Electron no se incluye; el instalador final lo descargará y verificará durante la primera instalación.

## Verificación del runtime

Electron 44.3.0 para Windows x64 se verifica con SHA-256 antes de instalarse.

SHA-256 esperado:

```text
26bf9a617d58d81772b3d68305d59ee48272969c15083c06db634a77358a8d9d
```

## Estructura

- `app/`: aplicación Electron.
- `app/scripts/`: Better xCloud integrado.
- `installer/`: instalador/desinstalador escrito en Go.
- `.github/workflows/`: compilación automática del instalador para Windows.

## Licencias y atribución

**Better xCloud** fue creado por **redphx**. La idea, el nombre y la funcionalidad original de Better xCloud provienen del proyecto original de redphx. **Better xCloud Desktop** es únicamente un wrapper/cliente de escritorio comunitario no oficial construido alrededor de ese proyecto y no pretende presentarse como el proyecto original ni como una versión oficial.

Better xCloud se distribuye bajo la licencia MIT. La copia completa de su licencia original, incluyendo todos los avisos de copyright que deben conservarse, está en `LICENSE-BETTER-XCLOUD.txt`. Consulta también `NOTICE.txt` para la atribución de componentes de terceros.

Electron también se distribuye bajo licencia MIT. El código propio de este empaquetado se publica bajo licencia MIT salvo componentes de terceros, que conservan sus respectivas licencias.

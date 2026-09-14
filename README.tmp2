# Better xCloud Desktop

Aplicación independiente para **Windows 10/11 x64** que ejecuta Xbox Cloud Gaming con un runtime propio de Electron/Chromium e integra Better xCloud.

> Proyecto no oficial. No está afiliado con Microsoft, Xbox ni con el autor original de Better xCloud.

## Versión actual

**2.6.0**

### Incluye

- App independiente: no abre Microsoft Edge y no requiere Tampermonkey.
- Better xCloud 6.7.12 como versión estable integrada.
- Instalador y desinstalador para Windows.
- Registro en **Configuración → Aplicaciones instaladas**.
- Accesos directos en Menú Inicio.
- Sesión y ajustes guardados en un perfil separado.
- Actualización automática del núcleo oficial de Better xCloud con validación antes de aplicarla.

## Controles

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

## Compilar el instalador

Requisitos: **Go 1.22 o superior**.

Antes de compilar, copia `app/` dentro de `installer/embedded/app/`. Luego, desde `installer/`:

```bat
set GOOS=windows
set GOARCH=amd64
set CGO_ENABLED=0
go build -trimpath -ldflags="-H=windowsgui -s -w" -o BetterXcloud-Desktop-Setup-v2.6.exe .
```

El runtime de Electron no se incluye dentro del instalador; se descarga y verifica durante la primera instalación.

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

# Source package

The source used by the Windows build workflow is stored here as eight Base64 chunks because this repository was initially published through an integration that only accepted UTF-8 text files.

GitHub Actions reconstructs them in lexical order:

```powershell
$parts = Get-ChildItem 'source-package/part-*.b64' | Sort-Object Name
$base64 = ($parts | ForEach-Object { Get-Content $_.FullName -Raw }) -join ''
[IO.File]::WriteAllBytes('repo-source-min.zip', [Convert]::FromBase64String($base64))
Expand-Archive 'repo-source-min.zip' -DestinationPath 'build' -Force
```

The reconstructed archive contains the Electron app, Ultra Assistant, Windows installer source and project assets. Better xCloud itself is intentionally not duplicated inside this archive: the workflow downloads the official **v6.7.12** release asset from `redphx/better-xcloud` and verifies its published SHA-256 before compiling.

Expected Better xCloud v6.7.12 SHA-256:

```text
bb78931b4ec94d68cb18da97fa4ae1f88e6b3103bc159905931b2238a51b517e
```

A later cleanup can unpack this archive into ordinary repository files and remove the Base64 chunks without changing the application.

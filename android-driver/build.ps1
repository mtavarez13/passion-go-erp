$ErrorActionPreference = 'Stop'
$driverRoot = $PSScriptRoot
$sdkRoot = 'C:\Users\marti\AppData\Local\Android\Sdk'
$javaRoot = 'C:\Program Files\Android\Android Studio\jbr'
$buildTools = Join-Path $sdkRoot 'build-tools\35.0.0'
$androidJar = Join-Path $sdkRoot 'platforms\android-35\android.jar'
$env:JAVA_HOME = $javaRoot
$env:Path = "$javaRoot\bin;$env:Path"
function Run([string]$exe, [string[]]$arguments) {
  & $exe @arguments
  if ($LASTEXITCODE -ne 0) { throw "Falló $exe ($LASTEXITCODE)" }
}
$buildRoot = Join-Path $driverRoot 'build'
New-Item -ItemType Directory -Force -Path "$buildRoot\classes","$buildRoot\dex","$driverRoot\res\drawable" | Out-Null
Copy-Item -LiteralPath (Join-Path $driverRoot '..\public\app-icon.png') -Destination "$driverRoot\res\drawable\app_icon.png" -Force
Run "$buildTools\aapt2.exe" @('compile','--dir',"$driverRoot\res",'-o',"$buildRoot\resources.zip")
Run "$buildTools\aapt2.exe" @('link','-o',"$buildRoot\unsigned.apk",'-I',$androidJar,'--manifest',"$driverRoot\AndroidManifest.xml","$buildRoot\resources.zip")
$javaFiles = @(Get-ChildItem "$driverRoot\src" -Recurse -Filter '*.java' | ForEach-Object FullName)
Run "$javaRoot\bin\javac.exe" (@('-encoding','UTF-8','-source','8','-target','8','-classpath',$androidJar,'-d',"$buildRoot\classes") + $javaFiles)
$classFiles = @(Get-ChildItem "$buildRoot\classes" -Recurse -Filter '*.class' | ForEach-Object FullName)
Run "$buildTools\d8.bat" (@('--lib',$androidJar,'--min-api','26','--output',"$buildRoot\dex") + $classFiles)
Push-Location "$buildRoot\dex"
try { Run "$buildTools\aapt.exe" @('add',"$buildRoot\unsigned.apk",'classes.dex') } finally { Pop-Location }
Run "$buildTools\zipalign.exe" @('-f','4',"$buildRoot\unsigned.apk","$buildRoot\aligned.apk")
# Debug signing key remains outside the repository. Release distribution needs a protected release key.
$keyFile = Join-Path $env:USERPROFILE '.android\debug.keystore'
if (!(Test-Path $keyFile)) {
  New-Item -ItemType Directory -Force -Path (Split-Path $keyFile) | Out-Null
  Run "$javaRoot\bin\keytool.exe" @('-genkeypair','-keystore',$keyFile,'-storepass','android','-keypass','android','-alias','androiddebugkey','-keyalg','RSA','-validity','10000','-dname','CN=Android Debug,O=Android,C=US')
}
Run "$buildTools\apksigner.bat" @('sign','--ks',$keyFile,'--ks-key-alias','androiddebugkey','--ks-pass','pass:android','--key-pass','pass:android','--out',"$buildRoot\Passion-Go-Repartidores.apk","$buildRoot\aligned.apk")
Run "$buildTools\apksigner.bat" @('verify','--verbose',"$buildRoot\Passion-Go-Repartidores.apk")
Write-Output "APK: $buildRoot\Passion-Go-Repartidores.apk"

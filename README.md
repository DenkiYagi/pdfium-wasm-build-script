# PDFium WASM build script

PDFiumをEmscriptenでWASM（WebAssembly）にビルドするスクリプトです。

## ビルド方法

DockerとGitが事前にインストールされている必要があります。

### 初回設定

```sh
git clone TODO

cd pdfium-wasm-build-script
docker build -t pdfium-wasm-buildenv .
```

### Windows PowerShellでのビルド方法

```powershell
docker run -it --rm `
  -v "$((Get-Location -PSProvider FileSystem).Path):/root/build-host" `
  pdfium-wasm-buildenv build-host/build-wasm.sh
```

### Mac, Linuxでのビルド方法

```sh
docker run -it --rm \
  -v "$(pwd)":/root/build-host \
  pdfium-wasm-buildenv build-host/build-wasm.sh
```

※動作未確認ですが、`$(pwd)` している所に問題がなければ動くはずです。

### ビルド結果

上記の手順でビルドに成功すると、`dist` ディレクトリに `pdfium.js`, `pdfium.wasm` の2ファイルが出力されます。これをコピーしてください。

### ESMとしてビルド

このビルドスクリプトでは、`pdfium.js` がCJSとして出力されます。ESMにしたい場合は `build-wasm.sh` の `-s EXPORT_ES6=0` の部分を `-s EXPORT_ES6=1` に変更してビルドしてください。

### WASMからエクスポートする関数を変更

`exported-functions.txt` を編集すると、WASMからエクスポートする関数を変更することができます。

エクスポート出来る関数の一覧は `llvm-nm` を使うと取得できます。

```sh
apt install llvm
llvm-nm libpdfium.a --format=just-symbols
```

## WASMの使用例

PDFをPNGに変換するサンプルプログラムが `sample` ディレクトリに配置されています。

このサンプルを実行する場合は、ビルド完了後に次のコマンドを実行してください。

```sh
cd sample
npm install
node index.js
```

## 参考プロジェクト

このビルドスクリプトは、次のプロジェクトを参考にして作成されています。

* https://github.com/bblanchon/pdfium-binaries
* https://github.com/paulocoutinhox/pdfium-lib
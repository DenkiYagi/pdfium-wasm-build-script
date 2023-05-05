# PDFium WASM build script

PDFiumをEmscriptenでWASM（WebAssembly）にビルドするスクリプトです。

## ビルド方法

DockerとGitが事前にインストールされている必要があります。

### 初回設定

```sh
git clone https://github.com/DenkiYagi/pdfium-wasm-build-script

cd pdfium-wasm-build-script
docker build -t pdfium-wasm-buildenv .
```

### ビルド対象とするブランチ名を調べる

後述のビルドコマンドでは、ビルド対象とするPDFiumのブランチを指定できます。未指定の場合は `master` をcheckoutしてビルドします。

Chromeのバージョンから対応するPDFuimのブランチ名（バージョン）を特定する方法は次の記事を参考にしてください。

* https://zenn.dev/terurou/articles/2bfe44682a7de3

### Windows PowerShellでのビルドコマンド

ブランチ未指定の場合

```powershell
docker run -it --rm `
  -v "$((Get-Location -PSProvider FileSystem).Path):/root/build-host" `
  pdfium-wasm-buildenv build-host/build-wasm.sh
```

ブランチを指定する場合は `-b` オプションを指定してください。次の例ではブランチに `chromium/5672` を指定しています。

```powershell
docker run -it --rm `
  -v "$((Get-Location -PSProvider FileSystem).Path):/root/build-host" `
  pdfium-wasm-buildenv build-host/build-wasm.sh -b chromium/5672
```

### Mac, Linuxでのビルドコマンド

```sh
docker run -it --rm \
  -v "$(pwd)":/root/build-host \
  pdfium-wasm-buildenv build-host/build-wasm.sh
```

* 動作未確認ですが、`$(pwd)` している所に問題がなければ動くはずです。
* ブランチはWindowsでの例と同様に `-b` オプションを使って指定してください。

### ビルド結果

上記の手順でビルドに成功すると、`dist` ディレクトリに `pdfium.js`, `pdfium.wasm` の2ファイルが出力されます。これをコピーしてください。

### ESMとしてビルド

このビルドスクリプトでは、`pdfium.js` がCJSとして出力されます。ESMにしたい場合は `build-wasm.sh` の `-s EXPORT_ES6=0` の部分を `-s EXPORT_ES6=1` に変更してビルドしてください。

### WASMからエクスポートする関数を変更

`exported-functions.txt` を編集すると、WASMからエクスポートする関数を変更することができます。エクスポートする関数を必要最低限にすることで、.wasm/.jsファイルのサイズを小さくすることができます。

エクスポートできる関数の一覧は `llvm-nm` を使うことで取得できます。 `build-wasm.sh` の末尾に次のようなコードを追加すると、関数の一覧を取得できます。

```sh
apt install llvm
llvm-nm libpdfium.a --format=just-symbols > /root/build-host/dist/symbols.txt
```

## WASMの使用例

PDFをPNGに変換するサンプルプログラムが `sample` ディレクトリに配置されています。

このサンプルを実行する場合は、ビルド完了後に次のコマンドを実行してください。

```sh
cd sample
npm install
node pdftopng.js
```

サンプルに同梱している `pdftopng-canvas.js` は画像化処理に `node-canvas` を使った実装例です。 `node-canvas` は `cairo` に依存しているため、実行する際はREADMEに記載に従い追加のセットアップが必要になります。

## 参考プロジェクト

このビルドスクリプトは、次のプロジェクトを参考にして作成されています。

* https://github.com/bblanchon/pdfium-binaries
* https://github.com/paulocoutinhox/pdfium-lib

#!/bin/bash -eux

# chckout
gclient config \
  --unmanaged https://pdfium.googlesource.com/pdfium.git \
  --custom-var "checkout_configuration=minimal"
gclient sync --no-history --shallow

cd pdfium

# patch
git apply -v /root/build-host/patch/pdfium.patch
git -C build apply -v /root/build-host/patch/build/build.patch

mkdir -p build/toolchain/wasm
cp /root/build-host/patch/build/toolchain/wasm/BUILD.gn build/toolchain/wasm

mkdir -p build/config/wasm
cp /root/build-host/patch/build/config/wasm/BUILD.gn build/config/wasm

mkdir -p out
cp /root/build-host/patch/out/args.gn out

# install additional tools
./build/install-build-deps.sh

# build
EXPORTED_FUNCTIONS=`grep -v -e '^\s*#' -e '^\s*$' /root/build-host/exported-functions.txt | sed 's/^/_/' | tr '\n' ',' | sed -e 's/,$/\n/g'`

gn gen out
ninja -C out pdfium
em++ \
  --no-entry \
  -s LLD_REPORT_UNDEFINED \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=0 \
  -s EXPORT_NAME=pdfium \
  -s EXPORTED_FUNCTIONS="$EXPORTED_FUNCTIONS" \
  -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
  -o out/pdfium.js \
  out/obj/libpdfium.a

# copy wasm
mkdir -p /root/build-host/dist
cp -f out/pdfium.js out/pdfium.wasm /root/build-host/dist

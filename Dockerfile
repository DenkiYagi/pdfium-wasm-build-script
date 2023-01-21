FROM ubuntu:22.04

# replace mirror url to ftp.riken.jp
RUN sed -i.bak -r 's!(deb|deb-src) \S+!\1 http://ftp.riken.jp/Linux/ubuntu/!' /etc/apt/sources.list

# install depens packages
RUN apt-get -y update
RUN apt-get install -y \
    build-essential \
    sudo \
    curl \
    git \
    lsb-release \
    python3 \
 && rm -rf /var/lib/apt/lists/* \
 && apt-get clean

# install depot_tools
RUN git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git /opt/depot-tools
ENV PATH $PATH:/opt/depot-tools

# install emscripten
RUN git clone https://github.com/emscripten-core/emsdk.git /opt/emsdk
RUN /opt/emsdk/emsdk install 3.1.29
RUN /opt/emsdk/emsdk activate 3.1.29
ENV PATH ${PATH}:/opt/emsdk:/opt/emsdk/upstream/emscripten:/opt/emsdk/node/14.18.2_64bit/bin

WORKDIR /root

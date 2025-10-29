FROM ubuntu:noble

# Defina argumentos e variáveis de ambiente
ARG NODE_VERSION=18
ENV DEBIAN_FRONTEND=noninteractive

# Instale dependências do sistema
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Instale Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Instale Nix
RUN sh <(curl -L https://nixos.org/nix/install) --no-daemon

# Configure environment para Nix
ENV PATH="/root/.nix-profile/bin:/nix/var/nix/profiles/default/bin:${PATH}"

# Fase de build
WORKDIR /app

# Instale pacotes Nix e limpe o garbage
RUN nix-env -if .nixpacks/nixpkgs-ffeebf0acf3ae8b29f8c7049cd911b9636efd7e7.nix && \
    nix-collect-garbage -d

# Instale dependências do Chromium
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libgbm1 \
    libasound2t64 \
    libpangocairo-1.0-0 \
    libxss1 \
    libgtk-3-0 \
    libxshmfence1 \
    libglu1 \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Configure environment path
ENV NIXPACKS_PATH=/app/node_modules/.bin:$NIXPACKS_PATH

# Copie os arquivos do projeto
COPY . /app/

# Instale dependências npm com legacy-peer-deps para resolver conflitos
RUN --mount=type=cache,id=s/00160558-6ed1-4560-acd3-4625e1881506-/root/npm,target=/root/.npm \
    npm i --legacy-peer-deps

# Fase de build (se aplicável)
# RUN npm run build

# Comando para executar a aplicação
CMD ["npm", "start"]

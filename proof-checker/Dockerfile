FROM debian:bullseye-slim as builder

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    libgmp-dev \
    libffi-dev \
    libncurses5-dev \
    libtinfo5 \
    zlib1g-dev \
    git \
    unzip \
    wget \
    python3 \
    python3-pip \
    minisat \
    libnuma-dev \
    && rm -rf /var/lib/apt/lists/*

# Install GHCup to manage GHC (Haskell compiler)
RUN curl --proto '=https' --tlsv1.2 -sSf https://get-ghcup.haskell.org | BOOTSTRAP_HASKELL_NONINTERACTIVE=1 sh

# Add GHCup to PATH
ENV PATH="/root/.ghcup/bin:${PATH}"

# Install GHC and Cabal
RUN ghcup install ghc 9.4.8 && \
    ghcup set ghc 9.4.8 && \
    ghcup install cabal 3.6.2.0 && \
    ghcup set cabal 3.6.2.0

# Clone Carnap repository
WORKDIR /opt
RUN git clone https://github.com/Carnap/Carnap.git

# Build Carnap libraries
WORKDIR /opt/Carnap
RUN cabal update && \
    cabal build Carnap Carnap-Core Carnap-GHCJS

# Create a smaller runtime image
FROM python:3.11-slim

# Install Minisat
RUN apt-get update && apt-get install -y \
    minisat \
    && rm -rf /var/lib/apt/lists/*

# Copy built Carnap binaries from builder
COPY --from=builder /opt/Carnap/dist-newstyle /opt/Carnap/dist-newstyle

# Set up working directory
WORKDIR /app

# Copy application files
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose the port
EXPOSE 3000

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "3000", "--reload"] 
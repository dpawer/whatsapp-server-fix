{ pkgs ? import <nixpkgs> {} }:

pkgs.buildEnv {
  name = "ffeebf0acf3ae8b29f8c7049cd911b9636efd7e7-env";
  paths = with pkgs; [
    nodejs_22
    chromium
    
    # Dependências do Chromium (nomes CORRETOS)
    nss
    atk
    at-spi2-core      # CORREÇÃO: nome correto
    cups
    libdrm
    mesa
    alsa-lib
    pango
    gtk3
    libglvnd
    xorg.libXScrnSaver  # CORREÇÃO: nome correto
    
    # Dependências X11 adicionais
    xorg.libX11
    xorg.libxcb
    xorg.libXcomposite
    xorg.libXdamage
    xorg.libXext
    xorg.libXfixes
    xorg.libXi
    xorg.libXrandr
    xorg.libXrender
    xorg.libXtst
    xorg.libXxf86vm
    
    # Outras dependências
    libva
    libvdpau
    dbus
  ];
}

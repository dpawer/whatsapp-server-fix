{ pkgs ? import <nixpkgs> {} }:

pkgs.buildEnv {
  name = "ffeebf0acf3ae8b29f8c7049cd911b9636efd7e7-env";
  paths = with pkgs; [
    nodejs_22
    chromium
    nss
    atk
    at-spi2-atk
    cups
    libdrm
    mesa
    alsa-lib
    pango
    libxscrnsaver
    gtk3
    libglvnd
    # REMOVIDO: glu - não existe
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
    libva
    libvdpau
  ];
}

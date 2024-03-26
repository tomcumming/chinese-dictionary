{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-23.11";
  };
  outputs = { self, nixpkgs }:
    let
      system = "aarch64-darwin";
      pkgs = nixpkgs.legacyPackages."${system}";
    in
    {
      devShells."${system}".default = pkgs.mkShell {
        packages = [
          pkgs.nodejs
          pkgs.esbuild
        ];
      };
      formatter."${system}" = pkgs.nixpkgs-fmt;
    };
}

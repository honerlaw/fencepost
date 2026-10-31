#!/usr/bin/env bash
# Installs one pinned scanner into ~/.local/bin, refusing anything that fails its checksum.
set -euo pipefail

tool="$1"
bin="$HOME/.local/bin"
mkdir -p "$bin"
work="$(mktemp -d)"

fetch() { # url sha256 file
  curl --fail --location --silent --show-error --output "$work/$3" "$1"
  echo "$2  $work/$3" | sha256sum --check --quiet
}

case "$tool" in
  gitleaks)
    fetch https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz \
      551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb gitleaks.tgz
    tar -xzf "$work/gitleaks.tgz" -C "$bin" gitleaks
    ;;
  actionlint)
    fetch https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_linux_amd64.tar.gz \
      8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8 actionlint.tgz
    tar -xzf "$work/actionlint.tgz" -C "$bin" actionlint
    ;;
  hadolint)
    fetch https://github.com/hadolint/hadolint/releases/download/v2.15.1/hadolint-linux-x86_64 \
      c7187db94eeeeca956519a6af171adc31453941a1e777961f6e680f697c8c507 hadolint
    install -m 0755 "$work/hadolint" "$bin/hadolint"
    ;;
  osv-scanner)
    fetch https://github.com/google/osv-scanner/releases/download/v2.7.0/osv-scanner_linux_amd64 \
      160c6253e2922e9e0a6a9771c5c4c40a4b3c6090b34a3cdd5e80c96cc2e4218b osv-scanner
    install -m 0755 "$work/osv-scanner" "$bin/osv-scanner"
    ;;
  *)
    echo "unknown tool: $tool" >&2
    exit 1
    ;;
esac

echo "$bin" >> "$GITHUB_PATH"

#!/usr/bin/env bash
# Prepare a fresh Ubuntu 24.04 box. SPEC.md §11.
#
#   sudo ./provision.sh cidadeploy "ssh-ed25519 AAAA... you@laptop"
#
# Idempotent: safe to re-run after a change, and re-running is how you apply one.
# Everything it does is either a package install, a config file it owns, or a
# check-then-act.
set -euo pipefail

DEPLOY_USER="${1:-cidadeploy}"
SSH_PUBKEY="${2:-}"
APP_DIR="/opt/cidaplus"
SWAP_FILE="/swapfile"
SWAP_SIZE_MB=4096

if [[ $EUID -ne 0 ]]; then
  echo "run as root: sudo $0 <deploy-user> \"<ssh-public-key>\"" >&2
  exit 1
fi

log() { echo -e "\n=== $* ==="; }

# --- deploy user ------------------------------------------------------------
log "deploy user: $DEPLOY_USER"
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG sudo "$DEPLOY_USER"

if [[ -n "$SSH_PUBKEY" ]]; then
  install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
  auth="/home/$DEPLOY_USER/.ssh/authorized_keys"
  touch "$auth"
  grep -qxF "$SSH_PUBKEY" "$auth" || echo "$SSH_PUBKEY" >> "$auth"
  chmod 600 "$auth"
  chown "$DEPLOY_USER:$DEPLOY_USER" "$auth"
else
  echo "!! no SSH key given; not disabling password login (that would lock you out)"
fi

# --- ssh hardening ----------------------------------------------------------
# Only with a key installed. Disabling password auth without one is how a box
# becomes unreachable.
if [[ -n "$SSH_PUBKEY" ]]; then
  log "ssh hardening"
  cat > /etc/ssh/sshd_config.d/10-cidaplus.conf <<'SSHCONF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
SSHCONF
  # `sshd -t` first: a bad config that restarts sshd locks everyone out.
  sshd -t && systemctl reload ssh
fi

# --- firewall ---------------------------------------------------------------
log "ufw"
apt-get update -qq
apt-get install -y -qq ufw fail2ban
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw default deny incoming
ufw default allow outgoing
ufw --force enable

# fail2ban's defaults already jail sshd on Ubuntu; this makes it explicit and
# survives a package default change.
cat > /etc/fail2ban/jail.d/cidaplus.conf <<'JAIL'
[sshd]
enabled = true
maxretry = 5
findtime = 10m
bantime = 1h
JAIL
systemctl enable --now fail2ban
systemctl restart fail2ban

# --- swap -------------------------------------------------------------------
# §11 calls this non-negotiable: 6 GB with Postgres at 1.5 GB and the web
# container at 1 GB has no headroom for a spike, and the OOM killer takes the
# database first because it is the largest process.
log "swap"
if [[ ! -f "$SWAP_FILE" ]]; then
  fallocate -l "${SWAP_SIZE_MB}M" "$SWAP_FILE" || dd if=/dev/zero of="$SWAP_FILE" bs=1M count="$SWAP_SIZE_MB"
  chmod 600 "$SWAP_FILE"
  mkswap "$SWAP_FILE"
fi
swapon --show | grep -q "$SWAP_FILE" || swapon "$SWAP_FILE"
grep -qF "$SWAP_FILE" /etc/fstab || echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab
# Swap is insurance, not a tier of memory: only reach for it under real pressure.
echo 'vm.swappiness=10' > /etc/sysctl.d/60-cidaplus.conf
sysctl -p /etc/sysctl.d/60-cidaplus.conf >/dev/null

# --- docker -----------------------------------------------------------------
log "docker engine"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  # shellcheck disable=SC1091 # /etc/os-release exists on the target, not here
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
usermod -aG docker "$DEPLOY_USER"
systemctl enable --now docker

# --- log rotation -----------------------------------------------------------
# 60 GB of disk and JSON logs that grow forever is a predictable outage.
log "docker log rotation"
cat > /etc/docker/daemon.json <<'DOCKERD'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
DOCKERD
systemctl restart docker

# --- unattended upgrades ----------------------------------------------------
log "unattended-upgrades"
apt-get install -y -qq unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades

# --- weekly image prune -----------------------------------------------------
# Every deploy leaves the previous image behind — which is deliberate, it is the
# rollback target — but not forever.
log "weekly docker prune"
cat > /etc/cron.weekly/cidaplus-docker-prune <<'CRON'
#!/bin/sh
docker system prune -af --filter "until=168h" >/dev/null 2>&1
CRON
chmod +x /etc/cron.weekly/cidaplus-docker-prune

# --- app directory ----------------------------------------------------------
log "app directory"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR" "$APP_DIR/certs"
chmod 700 "$APP_DIR/certs"

cat <<DONE

Provisioning complete.

Still to do by hand — see docs/RUNBOOK.md:
  1. Copy docker-compose.yml, Caddyfile and scripts/ into $APP_DIR
  2. Write $APP_DIR/.env (chmod 600) — never commit it
  3. Install the Cloudflare Origin Certificate as $APP_DIR/certs/origin.pem and origin.key (chmod 600)
  4. Restrict ports 80/443 to Cloudflare ranges — ufw here allows the world
  5. Run scripts/deploy.sh
DONE

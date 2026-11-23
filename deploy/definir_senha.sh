#!/usr/bin/env bash
# Cria ou troca a senha de um usuário do sistema.
# Uso: sudo bash deploy/definir_senha.sh <usuario>
set -euo pipefail
ENV_FILE=/etc/gestao-cursos/gestao.env
U=$(echo "${1:-}" | tr 'A-Z' 'a-z')
[ "$(id -u)" -eq 0 ] || { echo "Execute com sudo."; exit 1; }
[[ "$U" =~ ^[a-z0-9._-]+$ ]] || { echo "Uso: sudo bash deploy/definir_senha.sh <usuario>"; exit 1; }
HASH=$(cd /opt/gestao-cursos/backend && /opt/gestao-cursos/venv/bin/python -m app.auth)
ATUAL=$(grep '^APP_USUARIOS=' "$ENV_FILE" | cut -d= -f2-)
NOVO=$(printf '%s' "$ATUAL" | tr ';' '\n' | grep -v "^$U:" | grep -v '^$' | tr '\n' ';' || true)
NOVO="${NOVO}${U}:${HASH}"
sed -i "s|^APP_USUARIOS=.*|APP_USUARIOS=${NOVO}|" "$ENV_FILE"
rm -f /etc/gestao-cursos/credenciais-iniciais.txt
systemctl restart gestao-cursos
echo "Senha de '$U' definida."

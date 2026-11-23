#!/usr/bin/env bash
# Cria um usuário do sistema ou troca a senha/perfil de um existente.
#
# Uso: sudo bash deploy/definir_senha.sh <usuario> [padrao|apresentacao] [--gerar]
#   padrao        uso normal da secretaria (padrão)
#   apresentacao  também vê o Console SQL, notas técnicas e a tela de arquitetura
#   --gerar       gera uma senha aleatória e a grava em /etc/gestao-cursos/credenciais-<usuario>.txt
#                 (sem --gerar, a senha é pedida no terminal)
set -euo pipefail
ENV_DIR=/etc/gestao-cursos
ENV_FILE=$ENV_DIR/gestao.env
APP_DIR=/opt/gestao-cursos

[ "$(id -u)" -eq 0 ] || { echo "Execute com sudo."; exit 1; }
U=$(echo "${1:-}" | tr 'A-Z' 'a-z'); shift || true
[[ "$U" =~ ^[a-z0-9._-]+$ ]] || { echo "Uso: sudo bash deploy/definir_senha.sh <usuario> [padrao|apresentacao] [--gerar]"; exit 1; }
PERFIL=""; GERAR=0
for a in "$@"; do
  case "$a" in
    padrao|apresentacao) PERFIL=$a ;;
    --gerar) GERAR=1 ;;
    *) echo "Parâmetro desconhecido: $a"; exit 1 ;;
  esac
done

ATUAL=$(grep '^APP_USUARIOS=' "$ENV_FILE" | cut -d= -f2- || true)
# Perfil atual do usuário (mantido se não for informado)
if [ -z "$PERFIL" ]; then
  LINHA=$(printf '%s' "$ATUAL" | tr ';' '\n' | grep "^$U:" || true)
  if [ "$(printf '%s' "$LINHA" | awk -F: '{print NF}')" = "3" ]; then PERFIL=$(printf '%s' "$LINHA" | cut -d: -f2); else PERFIL=padrao; fi
fi

if [ "$GERAR" = 1 ]; then
  SENHA=$(openssl rand -base64 12 | tr -d '/+=' | cut -c1-14)
  HASH=$(cd "$APP_DIR/backend" && "$APP_DIR/venv/bin/python" -c "import sys; from app.auth import gerar_hash; print(gerar_hash(sys.argv[1]))" "$SENHA")
  install -m 600 /dev/null "$ENV_DIR/credenciais-$U.txt"
  printf 'Usuário: %s\nPerfil:  %s\nSenha:   %s\n(troque com: sudo bash deploy/definir_senha.sh %s)\n' "$U" "$PERFIL" "$SENHA" "$U" > "$ENV_DIR/credenciais-$U.txt"
else
  HASH=$(cd "$APP_DIR/backend" && "$APP_DIR/venv/bin/python" -m app.auth)
  rm -f "$ENV_DIR/credenciais-$U.txt"
fi

OUTROS=$(printf '%s' "$ATUAL" | tr ';' '\n' | grep -v "^$U:" | grep -v '^$' | tr '\n' ';' || true)
NOVO="${OUTROS}${U}:${PERFIL}:${HASH}"
if grep -q '^APP_USUARIOS=' "$ENV_FILE"; then
  sed -i "s|^APP_USUARIOS=.*|APP_USUARIOS=${NOVO}|" "$ENV_FILE"
else
  echo "APP_USUARIOS=${NOVO}" >> "$ENV_FILE"
fi
systemctl restart gestao-cursos 2>/dev/null || true
if [ "$GERAR" = 1 ]; then
  echo "Usuário '$U' ($PERFIL) com senha gerada. Veja com: sudo cat $ENV_DIR/credenciais-$U.txt"
else
  echo "Senha de '$U' ($PERFIL) definida."
fi

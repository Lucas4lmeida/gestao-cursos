#!/usr/bin/env bash
# =============================================================================
# Instalação / atualização do Sistema de Gestão de Cursos na VM (Ubuntu).
# Back-end (FastAPI) e front-end (build React) rodam no mesmo serviço,
# na mesma VM do PostgreSQL. Reexecutável: use também para atualizar.
#
# Uso (na raiz do projeto, dentro da VM):
#   sudo bash deploy/install.sh
# Variáveis opcionais: DB_NAME (padrão tp3), DOMINIO (padrão <ip-com-hifens>.sslip.io)
# =============================================================================
set -euo pipefail

APP_DIR=/opt/gestao-cursos
ENV_DIR=/etc/gestao-cursos
ENV_FILE=$ENV_DIR/gestao.env
DB_NAME=${DB_NAME:-tp3}
IP_PUBLICO=${IP_PUBLICO:-}
DOMINIO=${DOMINIO:-${IP_PUBLICO//./-}.sslip.io}
SRC=$(cd "$(dirname "$0")/.." && pwd)

[ "$(id -u)" -eq 0 ] || { echo "Execute com sudo."; exit 1; }
[ -n "$IP_PUBLICO" ] || { echo "Não identifiquei o IP público. Rode com: sudo IP_PUBLICO=x.x.x.x bash deploy/install.sh"; exit 1; }
echo "==> Origem: $SRC  |  Banco: $DB_NAME  |  Domínio HTTPS: $DOMINIO"

# 1. Dependências do sistema ---------------------------------------------------
if ! python3 -c "import ensurepip" 2>/dev/null; then
  echo "==> Instalando python3-venv"
  apt-get update -qq && apt-get install -y -qq python3-venv
fi
command -v caddy >/dev/null || { echo "==> Instalando Caddy (proxy HTTPS)"; apt-get install -y -qq caddy; }
command -v psql >/dev/null || { echo "PostgreSQL não encontrado nesta VM."; exit 1; }

# 2. Usuário de sistema e arquivos da aplicação --------------------------------
id gestao >/dev/null 2>&1 || useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin gestao
install -d -m 755 "$APP_DIR" "$APP_DIR/backend"
rm -rf "$APP_DIR/backend/app" "$APP_DIR/database"
cp -r "$SRC/backend/app" "$APP_DIR/backend/app"
cp "$SRC/backend/requirements.txt" "$APP_DIR/backend/"
cp -r "$SRC/database" "$APP_DIR/database"
find "$APP_DIR" -name "__pycache__" -prune -exec rm -rf {} +

echo "==> Ambiente Python"
[ -x "$APP_DIR/venv/bin/python" ] || python3 -m venv "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install -q --upgrade pip
"$APP_DIR/venv/bin/pip" install -q -r "$APP_DIR/backend/requirements.txt"
chown -R root:root "$APP_DIR"

# 3. Banco de dados -------------------------------------------------------------
PSQL="runuser -u postgres -- psql -v ON_ERROR_STOP=1 -q"
if ! runuser -u postgres -- psql -Atc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
  echo "==> Banco $DB_NAME não existe: criando e carregando scripts do TP3"
  runuser -u postgres -- createdb "$DB_NAME"
  for f in 01_create.sql 02_insert.sql 03_objects.sql; do
    (cd /tmp && $PSQL -d "$DB_NAME" -f "$APP_DIR/database/$f")
  done
fi

install -d -m 750 -o root -g gestao "$ENV_DIR"
ler_env() { [ -f "$ENV_FILE" ] && grep "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- || true; }
APP_PW=$(ler_env DB_PASSWORD);            [ -n "$APP_PW" ] || APP_PW=$(openssl rand -hex 24)
SESSION_SECRET=$(ler_env SESSION_SECRET); [ -n "$SESSION_SECRET" ] || SESSION_SECRET=$(openssl rand -hex 32)
APP_USUARIOS=$(ler_env APP_USUARIOS)
if [ -z "$APP_USUARIOS" ]; then
  # Primeiro acesso: usuário "secretaria" com senha aleatória, legível só pelo root.
  SENHA_INICIAL=$(openssl rand -base64 12 | tr -d '/+=' | cut -c1-14)
  HASH=$(cd "$APP_DIR/backend" && "$APP_DIR/venv/bin/python" -c "import sys; from app.auth import gerar_hash; print(gerar_hash(sys.argv[1]))" "$SENHA_INICIAL")
  APP_USUARIOS="secretaria:padrao:$HASH"
  install -m 600 /dev/null "$ENV_DIR/credenciais-secretaria.txt"
  printf 'Usuário: secretaria\nPerfil:  padrao\nSenha:   %s\n(troque com: sudo bash deploy/definir_senha.sh secretaria)\n' "$SENHA_INICIAL" > "$ENV_DIR/credenciais-secretaria.txt"
  echo "==> Usuário inicial criado. Veja com: sudo cat $ENV_DIR/credenciais-secretaria.txt"
fi
cat > "$ENV_FILE" <<FIM
# Gerado por deploy/install.sh
DB_PASSWORD=$APP_PW
DATABASE_URL=postgresql://gestao_app:$APP_PW@127.0.0.1:5432/$DB_NAME
DB_POOL_MAX=5
SESSION_SECRET=$SESSION_SECRET
APP_USUARIOS=$APP_USUARIOS
FIM
chown root:gestao "$ENV_FILE"; chmod 640 "$ENV_FILE"
if [ -f "$ENV_DIR/credenciais-iniciais.txt" ]; then mv "$ENV_DIR/credenciais-iniciais.txt" "$ENV_DIR/credenciais-secretaria.txt"; fi

# Usuário de apresentação (perfil com Console SQL e notas técnicas), criado uma única vez.
if ! printf '%s' "$APP_USUARIOS" | tr ';' '\n' | grep -q '^[^:]*:apresentacao:'; then
  echo "==> Criando o usuário de apresentação"
  bash "$SRC/deploy/definir_senha.sh" apresentacao apresentacao --gerar >/dev/null
  echo "==> Veja a senha com: sudo cat $ENV_DIR/credenciais-apresentacao.txt"
fi

echo "==> Ajustes do PF (role gestao_app com privilégio mínimo)"
(cd /tmp && $PSQL -d "$DB_NAME" -v app_password="$APP_PW" -f "$APP_DIR/database/05_ajustes_pf.sql" >/dev/null)

# 4. Serviço systemd da API (somente 127.0.0.1:8000) --------------------------
cp "$SRC/deploy/gestao-cursos.service" /etc/systemd/system/gestao-cursos.service
systemctl daemon-reload
systemctl enable -q gestao-cursos
systemctl restart gestao-cursos

# 5. Caddy (HTTP na porta 80 e HTTPS na 443) e firewall local ------------------
sed "s/__DOMINIO__/$DOMINIO/g" "$SRC/deploy/Caddyfile" > /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
systemctl enable -q caddy
systemctl reload caddy 2>/dev/null || systemctl restart caddy
for P in 80 443; do
  if ! iptables -C INPUT -p tcp --dport "$P" -m conntrack --ctstate NEW -j ACCEPT 2>/dev/null; then
    echo "==> Liberando a porta $P no iptables"
    iptables -I INPUT -p tcp --dport "$P" -m conntrack --ctstate NEW -j ACCEPT
  fi
done
command -v netfilter-persistent >/dev/null && netfilter-persistent save >/dev/null 2>&1 || true

# 6. Verificação ------------------------------------------------------------------
for i in $(seq 1 20); do
  [[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/api/auth/sessao)" =~ ^(200|401)$ ]] && break
  sleep 1
done
# A API responde 401 sem login: isso indica que está no ar (502 seria o Caddy sem a API).
if [[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/api/auth/sessao)" =~ ^(200|401)$ ]]; then
  echo "==> OK: http://$IP_PUBLICO/  e  https://$DOMINIO/"
else
  echo "Falha ao iniciar. Veja: journalctl -u gestao-cursos -n 50"; exit 1
fi

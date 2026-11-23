#!/usr/bin/env bash
# =============================================================================
# Instalação / atualização do Sistema de Gestão de Cursos na VM (Ubuntu).
# Back-end (FastAPI) e front-end (build React) rodam no mesmo serviço,
# na mesma VM do PostgreSQL. Reexecutável: use também para atualizar.
#
# Uso (na raiz do projeto, dentro da VM):
#   sudo bash deploy/install.sh
# Variáveis opcionais: DB_NAME (padrão tp3), PORT (padrão 80)
# =============================================================================
set -euo pipefail

APP_DIR=/opt/gestao-cursos
ENV_DIR=/etc/gestao-cursos
ENV_FILE=$ENV_DIR/gestao.env
DB_NAME=${DB_NAME:-tp3}
PORT=${PORT:-80}
SRC=$(cd "$(dirname "$0")/.." && pwd)

[ "$(id -u)" -eq 0 ] || { echo "Execute com sudo."; exit 1; }
echo "==> Origem: $SRC  |  Banco: $DB_NAME  |  Porta: $PORT"

# 1. Dependências do sistema ---------------------------------------------------
if ! python3 -c "import ensurepip" 2>/dev/null; then
  echo "==> Instalando python3-venv"
  apt-get update -qq && apt-get install -y -qq python3-venv
fi
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
if [ -f "$ENV_FILE" ]; then
  APP_PW=$(grep '^DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
else
  APP_PW=$(openssl rand -hex 24)
fi
cat > "$ENV_FILE" <<EOF
# Gerado por deploy/install.sh
DB_PASSWORD=$APP_PW
DATABASE_URL=postgresql://gestao_app:$APP_PW@127.0.0.1:5432/$DB_NAME
DB_POOL_MAX=5
EOF
chown root:gestao "$ENV_FILE"; chmod 640 "$ENV_FILE"

echo "==> Ajustes do PF (role gestao_app com privilégio mínimo)"
(cd /tmp && $PSQL -d "$DB_NAME" -v app_password="$APP_PW" -f "$APP_DIR/database/05_ajustes_pf.sql" >/dev/null)

# 4. Serviço systemd ------------------------------------------------------------
sed "s/__PORT__/$PORT/g" "$SRC/deploy/gestao-cursos.service" > /etc/systemd/system/gestao-cursos.service
systemctl daemon-reload
systemctl enable -q gestao-cursos
systemctl restart gestao-cursos

# 5. Firewall local (as imagens Oracle bloqueiam portas além da 22) -------------
if command -v iptables >/dev/null && ! iptables -C INPUT -p tcp --dport "$PORT" -m conntrack --ctstate NEW -j ACCEPT 2>/dev/null; then
  echo "==> Liberando a porta $PORT no iptables"
  iptables -I INPUT -p tcp --dport "$PORT" -m conntrack --ctstate NEW -j ACCEPT
  command -v netfilter-persistent >/dev/null && netfilter-persistent save >/dev/null 2>&1 || true
fi

# 6. Verificação ------------------------------------------------------------------
for i in $(seq 1 20); do
  curl -fs "http://127.0.0.1:$PORT/api/saude" >/dev/null && break
  sleep 1
done
if curl -fs "http://127.0.0.1:$PORT/api/saude" >/dev/null; then
  echo "==> OK: aplicação no ar em http://<IP-da-VM>:$PORT"
else
  echo "Falha ao iniciar. Veja: journalctl -u gestao-cursos -n 50"; exit 1
fi

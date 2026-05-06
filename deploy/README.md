# Deploy Docker na tailnet

Este deploy roda o Focus Dock em uma maquina Ubuntu dentro da tailnet, mantendo o Home Assistant privado.

## Fluxo

```text
push na main -> GitHub Actions -> GHCR -> Watchtower -> Ubuntu
```

Imagem publicada:

```text
ghcr.io/ftenorioinkluziva/smart-desk-dock-ui:main
```

## 1. Instalar Docker no Ubuntu

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Permitir Docker sem `sudo`:

```bash
sudo usermod -aG docker $USER
exit
```

Entre novamente via SSH e valide:

```bash
docker version
docker compose version
```

## 2. Criar diretorio de deploy

```bash
sudo mkdir -p /opt/smart-desk-dock
sudo chown -R $USER:$USER /opt/smart-desk-dock
cd /opt/smart-desk-dock
```

Copie `deploy/docker-compose.yml` deste repositorio para:

```text
/opt/smart-desk-dock/docker-compose.yml
```

## 3. Criar arquivo de ambiente

```bash
nano /opt/smart-desk-dock/.env
```

Exemplo:

```env
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REFRESH_TOKEN=

WEATHER_LAT=-15.886953
WEATHER_LON=-47.813873
WEATHER_TIMEZONE=America/Sao_Paulo
WEATHER_LOCATION=Brasilia

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_CALENDAR_ID=primary
GOOGLE_CALENDAR_TIMEZONE=America/Sao_Paulo

HOME_ASSISTANT_URL=http://127.0.0.1:8123
HOME_ASSISTANT_TOKEN=
HOME_ASSISTANT_ENTITIES=light.abajur,switch.luz_escritorio_switch_1,cover.teto_sala_door_1
```

Use `HOME_ASSISTANT_URL=http://127.0.0.1:8123` quando o Home Assistant rodar na mesma maquina do app.

## 4. Login no GHCR

Crie um Personal Access Token no GitHub com permissao `read:packages`.

```bash
docker login ghcr.io -u ftenorioinkluziva
```

Cole o token como senha.

O `docker-compose.yml` monta `/root/.docker/config.json` no Watchtower porque os comandos de deploy usam `sudo docker compose`. Por isso o login tambem deve ser feito com `sudo docker login`.

## 5. Subir o app

```bash
cd /opt/smart-desk-dock
docker compose pull
docker compose up -d
```

Logs:

```bash
docker compose logs -f smart-desk-dock
```

Testes:

```bash
curl http://localhost:3000
curl http://localhost:3000/api/home-assistant/entities
```

Acesso pelo iPhone/iPad na tailnet:

```text
http://100.118.97.101:3000
```

## 6. Atualizacao automatica

Depois de cada push na `main`, o GitHub Actions publica uma nova imagem `main`.

O Watchtower no Ubuntu verifica a cada 60 segundos, baixa a nova imagem e reinicia o container automaticamente.

## Comandos uteis

```bash
docker ps
docker compose logs -f
docker compose restart smart-desk-dock
docker compose pull && docker compose up -d
docker compose down
```

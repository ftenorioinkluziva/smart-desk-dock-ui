# Configuration to User Profile Mapping

## Objetivo

Migrar o Focus Dock de uma configuracao unica por servidor para um modelo com login Google e configuracoes especificas por usuario.

Este documento mapeia o que hoje esta em `.env`, `localStorage` ou hardcoded, e define onde cada valor deve morar depois da criacao de perfis.

## Principio de Separacao

- Configuracao da aplicacao fica em `.env`.
- Preferencia do usuario fica em `user_profiles`.
- Credencial ou endpoint privado do usuario fica criptografado em `user_integration_secrets`.
- OAuth de terceiros deve ser por usuario quando a conta acessada pertence ao usuario.
- Segredos nunca devem voltar para o browser; a UI mostra apenas status configurado, permite substituir e permite limpar.

## Variaveis que Continuam Globais

| Chave atual | Uso atual | Destino | Observacao |
| --- | --- | --- | --- |
| `GOOGLE_CLIENT_ID` | OAuth Google/Calendar | `.env` | Credencial do app, nao do usuario. |
| `GOOGLE_CLIENT_SECRET` | OAuth Google/Calendar | `.env` | Credencial do app, nao do usuario. |
| `BETTER_AUTH_URL` | Novo auth | `.env` | Necessario para Better Auth. |
| `BETTER_AUTH_SECRET` | Novo auth | `.env` | Segredo global de sessao. |
| `DATABASE_URL` | Novo banco | `.env` | Banco para auth, perfis e segredos. |
| `APP_ENCRYPTION_KEY` | Novo cofre de segredos | `.env` | Usar para criptografar credenciais de integracoes. |
| `OPENAI_REALTIME_MODEL` | Realtime voice agent | `.env`, inicialmente | Pode virar preferencia admin/global no futuro. |
| `OPENAI_REALTIME_VOICE` | Realtime voice agent | `.env`, inicialmente | Pode virar preferencia de usuario se fizer sentido no produto. |
| `OPENAI_REALTIME_REASONING_EFFORT` | Realtime voice agent | `.env`, inicialmente | Configuracao operacional do app. |

## Variaveis que Viram Perfil do Usuario

Campos nao sensiveis, persistidos em `user_profiles`.

| Chave atual | Uso atual | Campo sugerido | Default atual |
| --- | --- | --- | --- |
| `WEATHER_LAT` | `/api/weather` | `weatherLat` | `-15.886953` |
| `WEATHER_LON` | `/api/weather` | `weatherLon` | `-47.813873` |
| `WEATHER_TIMEZONE` | `/api/weather` e calendario | `weatherTimezone` | `America/Sao_Paulo` |
| `WEATHER_LOCATION` | Label no clima | `weatherLocation` | `Brasilia` / `Brasília` |
| `GOOGLE_CALENDAR_ID` | Agenda default global | `googleCalendarIds` | `primary` |
| `GOOGLE_CALENDAR_TIMEZONE` | Normalizacao de datas | `googleCalendarTimezone` | `WEATHER_TIMEZONE` ou `America/Sao_Paulo` |
| `HOME_ASSISTANT_ENTITIES` | Favoritos do Home Assistant | `homeAssistantEntityIds` ou profile setting | vazio, lista automatica por dominio |

## Variaveis que Viram Segredo do Usuario

Persistir em `user_integration_secrets`, criptografado por `APP_ENCRYPTION_KEY`.

| Chave atual | Uso atual | Provider | Key sugerida | Observacao |
| --- | --- | --- | --- | --- |
| `HOME_ASSISTANT_URL` | API server-side do HA | `home_assistant` | `url` | Pode revelar rede privada; tratar como sensivel. |
| `HOME_ASSISTANT_TOKEN` | Bearer token do HA | `home_assistant` | `token` | Nunca enviar de volta ao browser. |
| `OPENAI_API_KEY` | Realtime voice agent | `openai` | `api_key` | Chave pessoal do usuario; nunca enviar de volta ao browser. |
| `FINANCE_API_URL` | Proxy para paridade-risco-mobile | `.env` ou `finance` | `api_url` | Pode continuar global se todos usam a mesma API. So vira segredo por usuario se cada usuario puder apontar para uma API diferente. |
| `FINANCE_API_TOKEN` | Token upstream, se voltar a ser usado | `finance` | `access_token` | O login Finance e separado do Gmail; salvar o token criptografado por usuario do Focus Dock. |
| `FINANCE_API_USER_ID` | Usuario upstream confiavel, se usado | `finance` | `user_id` | Evitar para multiusuario se puder usar token real do login Finance. |

## OAuth por Usuario

### Google Login e Calendar

O login com Gmail deve ser o ponto de entrada. `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` continuam globais, mas o acesso ao calendario deve usar o OAuth account do usuario logado.

O fluxo alvo:

1. Usuario entra com Google.
2. Usuario autoriza escopo de calendario.
3. Backend usa o token OAuth daquele usuario.
4. Usuario escolhe quais agendas aparecem no dock.
5. Se o token for revogado, a UI mostra "Reconectar calendario".

Remover `GOOGLE_REFRESH_TOKEN` do fluxo de calendario depois da migracao.

### Spotify

| Chave atual | Uso atual | Destino recomendado |
| --- | --- | --- |
| `SPOTIFY_CLIENT_ID` | OAuth Spotify app | `.env`, por enquanto |
| `SPOTIFY_CLIENT_SECRET` | OAuth Spotify app | `.env`, por enquanto |
| `SPOTIFY_REFRESH_TOKEN` | Conta Spotify compartilhada | removido; usar OAuth Spotify por usuario |

Spotify usa OAuth por usuario. O app mantem Client ID/Secret globais e salva o refresh token criptografado por `userId`.

## Finance com Login Separado

O login Finance nao deve ser unificado com o login Gmail.

Separacao correta:

- Gmail autentica o usuario no Focus Dock e libera acesso ao app.
- Finance autentica o usuario na API `paridade-risco-mobile`.
- O token Finance fica associado ao `userId` do usuario logado no Focus Dock.
- O app nao cria nem assume equivalencia entre email Gmail e email Finance.
- Se a API Finance retornar `401`, apagar o token financeiro salvo e pedir novo login Finance.

Fluxo alvo:

1. Usuario entra no Focus Dock com Gmail.
2. O painel Finance verifica se existe token financeiro criptografado para esse `userId`.
3. Se nao existir, mostra o formulario de login Finance.
4. O backend chama `POST {FINANCE_API_URL}/api/auth/login` com email/senha Finance.
5. O backend salva o token retornado em `user_integration_secrets`.
6. `/api/finance/summary` usa o token salvo no servidor, nao um token em `localStorage`.
7. A UI nunca recebe o token salvo; recebe apenas dados de carteira ou estado de login necessario.

## Preferencias Hoje em localStorage

Migrar gradualmente para `user_profiles`, mantendo fallback temporario para nao quebrar usuarios existentes.

| Storage key | Arquivo | Campo sugerido |
| --- | --- | --- |
| `focus-dock-calendar-ids-v1` | `lib/calendar-settings.ts` | `googleCalendarIds` |
| `focus-dock-night-mode-settings-v1` | `lib/dock-settings.ts` | `nightModeEnabled`, `nightModeStart`, `nightModeEnd` |
| `focus-dock-productivity-alert-settings-v1` | `lib/productivity-settings.ts` | `productivityAlertPreference`, `productivityNotificationEnabled` |
| `focus-dock-pomodoro-durations-v1` | `lib/productivity-settings.ts` | `pomodoroFocusSeconds`, `pomodoroShortBreakSeconds`, `pomodoroLongBreakSeconds` |
| `focus-dock-finance-auth` | `lib/finance-auth.ts` | migrar para token Finance criptografado server-side, mantendo login Finance separado do Gmail |

## Valores Hardcoded Relevantes

| Valor | Arquivo | Destino recomendado |
| --- | --- | --- |
| Brasilia weather fallback | `app/api/weather/route.ts` | defaults de perfil anonimo ou sem configuracao |
| Forecast fallback mock | `app/api/weather/route.ts` | manter como fallback tecnico |
| Home Assistant dominios permitidos | `lib/home-assistant.ts` | manter como regra de produto |
| Home Assistant limite de 12 entidades | `lib/home-assistant.ts` | pode virar preferencia futura, nao precisa no MVP |
| Pomodoro 25/5/15 | `lib/productivity-settings.ts` | perfil do usuario |
| Modo noturno 22:00-06:00 | `lib/dock-settings.ts` | perfil do usuario |
| Finance mock portfolio | `lib/finance.ts` | manter como estado demo quando nao configurado |

## Modelo de Dados Sugerido

```text
user_profiles
- userId
- weatherLat
- weatherLon
- weatherTimezone
- weatherLocation
- googleCalendarIds
- googleCalendarTimezone
- nightModeEnabled
- nightModeStart
- nightModeEnd
- productivityAlertPreference
- productivityNotificationEnabled
- pomodoroFocusSeconds
- pomodoroShortBreakSeconds
- pomodoroLongBreakSeconds
- createdAt
- updatedAt
```

```text
user_integration_secrets
- userId
- provider
- key
- encryptedValue
- createdAt
- updatedAt
```

O schema e as migrations dessas tabelas, junto com as tabelas do Better Auth, sao gerenciados por Drizzle.

## Ordem Recomendada de Implementacao

1. Adicionar Better Auth com login Google.
2. Criar banco/tabelas de perfil e segredos.
3. Criar API de perfil com defaults atuais.
4. Migrar configuracoes de dock/produtividade de `localStorage` para perfil, com fallback.
5. Migrar Google Calendar para OAuth do usuario logado e remover `GOOGLE_REFRESH_TOKEN`.
6. Migrar clima para perfil do usuario.
7. Migrar Home Assistant para segredos criptografados por usuario.
8. Migrar Finance para login financeiro separado com token criptografado por usuario do Focus Dock.
9. Migrar Spotify para OAuth por usuario.

## Primeiro MVP Recomendado

Para liberar o app com login Gmail sem explodir o escopo:

- Login Google obrigatorio para acessar o dock.
- Perfil persistido com clima, calendario selecionado, modo noturno e Pomodoro.
- Google Calendar usando OAuth do usuario logado.
- Home Assistant opcional, ja com segredos criptografados por usuario.
- Finance opcional com login proprio; token salvo criptografado por usuario do Focus Dock.
- Spotify OAuth por usuario.
- OpenAI API key por usuario.

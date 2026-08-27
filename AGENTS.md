# AGENTS.md — Focus Dock Central AI Constitution

> **STATUS**: MANDATÓRIO & NORMATIVO  
> **TARGET AUDIENCE**: Antigravity / AI Coding Assistants & Core Engineers  
> **SCOPE**: Arquitetura, Modelos de Banco de Dados, Stack Tecnológica, Decisões de Negócio, Parâmetros e Proibições Categóricas.

---

## 1. Papel do Agente e Diretrizes de Comportamento

Este documento constitui a **Constituição Central** e a principal fonte de verdade arquitetural do **Focus Dock**. Qualquer inteligência artificial que opere nesta base de código deve seguir estritamente as regras, restrições e padrões estabelecidos aqui.

### 1.1 Princípios de Engenharia do Agente
1. **Nunca faça suposições perigosas:** Consulte o código e este documento antes de alterar contratos, bancos de dados ou interfaces de segurança.
2. **Ports and Adapters (Arquitetura Limpa):** A lógica de domínio e use-cases reside em `lib/operations/`, desacoplada de frameworks HTTP ou WebRTC. As rotas HTTP (`app/api/`) e o Voice Agent Realtime são meros adaptadores que consomem os mesmos contratos.
3. **Validação Estrita em Tempo de Execução:** Toda entrada e saída de dados na fronteira do sistema deve ser validada com esquemas **Zod** canônicos.
4. **Isolamento Criptográfico de Segredos:** Credenciais externas (OpenAI, Spotify, Home Assistant, Finance) **nunca** transitam em texto plano no banco e **jamais** são expostas ao frontend.
5. **Portão de Qualidade Obrigatório:** Toda alteração deve passar pelo comando de verificação unificado:
   ```bash
   pnpm check  # executa eslint, tsc --noEmit e vitest
   ```

---

## 2. Visão Geral do Produto e Decisões Chave de Negócio

### 2.1 Propósito do Produto
O **Focus Dock** é um dashboard de produtividade minimalista projetado para funcionar em um smartphone acoplado em modo **paisagem (landscape, 667 × 375 px baseline)** ao lado do monitor de trabalho (Desk Dock Companion).

### 2.2 North Star Criativo: *"The Cockpit"*
- **Glanceable (< 1 segundo):** Leitura instantânea a uma distância de um braço. Números grandes, alto contraste por luminância, zero ruído visual.
- **Ações Sem Fricção (1 a 2 toques):** Ações rápidas (play/pause, pular faixa, disparar timer, alternar luz do escritório) sem quebrar o fluxo de concentração do usuário.
- **Tecnologia Calma (Ambient Awareness):** Sem animações espalhafatosas, sem pop-ups invasivos, sem auto-reprodução estridente. A interface recua; a informação essencial persiste.
- **Zero Scroll Interno nos Painéis:** Cada painel do carrossel ocupa exatamente a área útil do viewport (`100vw` × `100vh` dock). Não há rolagem vertical dentro de painéis.

---

## 3. Pilha Tecnológica (Tech Stack)

| Camada | Tecnologia / Biblioteca | Versão | Propósito / Papel |
|---|---|---|---|
| **Framework Web** | [Next.js](https://nextjs.org/) (App Router) | `16.1.6` | Monólito modular, SSR/RSC, API Routes |
| **Biblioteca UI** | [React](https://react.dev/) | `19.2.4` | Renderização reativa, hooks modernos |
| **Estilização** | [Tailwind CSS](https://tailwindcss.com/) v4 | `4.2.0` | Design tokens inline (`@theme`), cores OKLCH |
| **Tipagem** | [TypeScript](https://www.typescript.org/) | `5.7.3` | Tipagem estática estrita (`strict: true`) |
| **Autenticação** | [Better Auth](https://better-auth.com/) | `1.6.13` | Sessões PostgreSQL, OAuth Google |
| **Banco de Dados & ORM** | [PostgreSQL](https://www.postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/) | `0.45.2` | Esquema tipado, migrações e persistência relacional |
| **Driver de Conexão** | `pg` (node-postgres) | `8.21.0` | Pool compartilhado de conexões PostgreSQL |
| **Agente de Voz** | OpenAI Realtime API (WebRTC) | - | Agente de voz bidirecional ultra-rápido com tool calling |
| **Validação de Esquemas** | [Zod](https://zod.dev/) | `4.4.3` | Contratos de operação e validação de payloads |
| **Componentes Base** | Radix UI + shadcn/ui | - | Primitivas acessíveis (Drawer Vaul, Dialog, Popover) |
| **Testes** | [Vitest](https://vitest.dev/) | `3.2.4` | Testes unitários e de integração determinísticos |
| **Gerenciador de Pacotes** | [pnpm](https://pnpm.io/) | `10.13.1` | Gestão determinística de dependências |

---

## 4. Arquitetura do Sistema e Fluxo de Dados

```text
               +-------------------------------------------+
               |         Frontend Interfaces               |
               |  - Landscape React Carousel (9 painéis)   |
               |  - Persistent SpotifyBar                  |
               |  - Settings Drawer (Vaul)                 |
               +--------------------+----------------------+
                                    |
            +-----------------------+-----------------------+
            | HTTP Fetch / Actions                          | WebRTC Audio / Tool Calling
            v                                               v
   +--------------------+                          +--------------------+
   | Next.js API Routes |                          | Realtime WebRTC    |
   |   (app/api/*)      |                          | (OpenAI Session)   |
   +---------+----------+                          +---------+----------+
             |                                               |
             +----------------------+------------------------+
                                    |
                                    v
            +-----------------------------------------------+
            |           Operations Core (Shared)            |
            | - Canonical Zod Schemas                       |
            | - Unified OperationError Contract             |
            | - Business Use Cases & Policies               |
            +-----------------------+-----------------------+
                                    |
          +-------------------------+-------------------------+
          |                         |                         |
          v                         v                         v
+-------------------+     +--------------------+    +--------------------+
| Database Gateway  |     | Encryption Gateway |    | External Gateways  |
| - Drizzle ORM     |     | - AES-256-GCM      |    | - Google Calendar  |
| - PostgreSQL Pool |     | - lib/crypto.ts    |    | - Home Assistant   |
+-------------------+     +--------------------+    | - Open-Meteo       |
                                                    | - Finance API      |
                                                    | - Spotify Web API  |
                                                    +--------------------+
```

### 4.1 Organização do Carrossel de Painéis (`app/page.tsx`)
O carrossel principal é horizontal com snap-scroll (`snap-x snap-mandatory`), contendo **9 painéis**:

1. **`TodayPanel`**: Relógio display, frase de contexto do dia, próximo compromisso da agenda, resumo meteorológico e botão de configurações.
2. **`VoiceAgentPanel`**: Interface interativa de voz com OpenAI Realtime via WebRTC (ondas dinâmicas, logs de ferramentas executadas).
3. **`NightDock`**: Modo noturno de brilho ultra-baixo com proteção contra burn-in em telas OLED (deslocamento sutil de pixels a cada 5 min).
4. **`WeatherForecast`**: Clima detalhado atual, sensação térmica, umidade, vento e previsão horária/semanal via Open-Meteo.
5. **`ProductivityHub`**: Hub de produtividade com abas para Pomodoro, Timer regressivo e Cronômetro (com avisos sonoros e pulsos visuais).
6. **`CalendarPage` (`Agenda`)**: Visualização mensal integrada ao Google Calendar do usuário autenticado.
7. **`HomeAssistantPanel`**: Painel de controle de dispositivos inteligentes favoritos (luzes, interruptores, cortinas, cenas, scripts).
8. **`FinancePanel`**: Resumo da carteira de investimentos sincronizado via API `paridade-risco-mobile`.
9. **`SpotifyExpandedPanel`**: Reprodutor musical expandido com seletor de dispositivos ativos, controle contínuo de volume e playlists.

**Barra Fixa Inferior:** `SpotifyBar` permanece fixada na base da tela fora do contexto de rolagem, sincronizada a cada 7 segundos com feedback otimista instantâneo.

---

## 5. Modelo de Dados (PostgreSQL / Drizzle Schema)

O esquema está centralizado em `db/schema.ts` e gerencia as tabelas de autenticação (Better Auth) e as tabelas de domínio do aplicativo:

```text
+-------------------+       1:N       +-------------------+
|       user        | <-------------> |      session      |
+-------------------+                 +-------------------+
| id (PK)           |
| name              |       1:N       +-------------------+
| email (Unique)    | <-------------> |      account      |
| emailVerified     |                 +-------------------+
| image             |
| createdAt         |       1:1       +-------------------+
| updatedAt         | <-------------> |   user_profiles   |
+-------------------+                 +-------------------+
          |
          |                 1:N       +----------------------------+
          +-------------------------> |  user_integration_secrets  |
                                      +----------------------------+
```

### 5.1 Definição Detalhada das Tabelas

#### 1. `user` (Better Auth Core)
Armazena a identidade do usuário autenticado.
- `id` (`text`, PK): Identificador único do usuário.
- `name` (`text`, NOT NULL): Nome completo ou apelido.
- `email` (`text`, NOT NULL, UNIQUE): E-mail do usuário.
- `emailVerified` (`boolean`, NOT NULL): Status de verificação de e-mail.
- `image` (`text`, NULL): URL do avatar do usuário.
- `createdAt` (`timestamp with time zone`, NOT NULL)
- `updatedAt` (`timestamp with time zone`, NOT NULL)

#### 2. `session` (Better Auth Sessions)
- `id` (`text`, PK): ID da sessão ativa.
- `expiresAt` (`timestamp with time zone`, NOT NULL): Expiração da sessão.
- `token` (`text`, NOT NULL, UNIQUE): Token de autenticação da sessão.
- `ipAddress` (`text`, NULL): IP de origem.
- `userAgent` (`text`, NULL): Dados do navegador/dispositivo.
- `userId` (`text`, NOT NULL, FK -> `user.id` ON DELETE CASCADE)
- `createdAt` / `updatedAt` (`timestamp with time zone`, NOT NULL)

#### 3. `account` (Better Auth OAuth Accounts)
Armazena contas vinculadas de provedores OAuth (ex: Google).
- `id` (`text`, PK)
- `accountId` (`text`, NOT NULL): ID do usuário no provedor externo.
- `providerId` (`text`, NOT NULL): Ex: `"google"`.
- `userId` (`text`, NOT NULL, FK -> `user.id` ON DELETE CASCADE)
- `accessToken` (`text`, NULL)
- `refreshToken` (`text`, NULL)
- `idToken` (`text`, NULL)
- `accessTokenExpiresAt` / `refreshTokenExpiresAt` (`timestamp with time zone`, NULL)
- `scope` (`text`, NULL)
- `password` (`text`, NULL)
- `createdAt` / `updatedAt` (`timestamp with time zone`, NOT NULL)

#### 4. `verification` (Better Auth Tokens)
- `id` (`text`, PK)
- `identifier` (`text`, NOT NULL)
- `value` (`text`, NOT NULL)
- `expiresAt` (`timestamp with time zone`, NOT NULL)
- `createdAt` / `updatedAt` (`timestamp with time zone`, NULL)

#### 5. `user_profiles` (App Domain Preferences)
Configurações e preferências persistidas por usuário do Focus Dock.
- `userId` (`text`, PK, references `user.id`)
- `weatherLat` (`double precision`, NULL): Latitude para previsão meteorológica.
- `weatherLon` (`double precision`, NULL): Longitude para previsão meteorológica.
- `weatherTimezone` (`text`, NULL): Fuso horário IANA (ex: `"America/Sao_Paulo"`).
- `weatherLocation` (`text`, NULL): Nome amigável da cidade (ex: `"Brasília"`).
- `googleCalendarIds` (`jsonb` - `$type<string[]>`, NULL): IDs das agendas selecionadas.
- `googleCalendarTimezone` (`text`, NULL): Fuso horário da agenda.
- `homeAssistantEntityIds` (`jsonb` - `$type<string[]>`, NULL): Lista de entidades favoritas no Home Assistant.
- `nightModeEnabled` (`boolean`, NULL): Agendamento automático do modo noturno ativo.
- `nightModeStart` (`text`, NULL): Horário de início do modo noturno (formato `"HH:mm"`).
- `nightModeEnd` (`text`, NULL): Horário de término do modo noturno (formato `"HH:mm"`).
- `productivityAlertPreference` (`text`, NULL): Tipo de alerta (`"sound"`, `"visual"`, `"both"`, `"none"`).
- `productivityNotificationEnabled` (`boolean`, NULL): Notificações do navegador para o Pomodoro.
- `pomodoroFocusSeconds` (`integer`, NULL): Tempo de foco (padrão: 1500s = 25m).
- `pomodoroShortBreakSeconds` (`integer`, NULL): Pausa curta (padrão: 300s = 5m).
- `pomodoroLongBreakSeconds` (`integer`, NULL): Pausa longa (padrão: 900s = 15m).
- `themePreset` (`text`, NULL): Preset de tema (`"cockpit"`, `"blue-hour"`, `"warm-desk"`, `"paper-light"`).
- `accentPreset` (`text`, NULL): Acento cromático (`"green"`, `"cyan"`, `"blue"`, `"amber"`, `"magenta"`).
- `createdAt` / `updatedAt` (`timestamp with time zone`, NOT NULL, default `NOW()`)

#### 6. `user_integration_secrets` (Encrypted Secrets Vault)
Cofre seguro para armazenamento de tokens e URLs privadas de integrações de terceiros.
- `userId` (`text`, NOT NULL)
- `provider` (`text`, NOT NULL): Ex: `"home_assistant"`, `"openai"`, `"finance"`, `"spotify"`.
- `key` (`text`, NOT NULL): Ex: `"token"`, `"url"`, `"refresh_token"`, `"api_key"`.
- `encryptedValue` (`text`, NOT NULL): Valor criptografado no formato `v1:iv:authTag:cipherText`.
- `createdAt` / `updatedAt` (`timestamp with time zone`, NOT NULL, default `NOW()`)
- **Primary Key Composta:** `(userId, provider, key)`

---

## 6. Variáveis de Ambiente e Parâmetros de Configuração

As variáveis devem ser configuradas no arquivo `/.env.local` na raiz do projeto.

### 6.1 Variáveis Obrigatórias (Core & Segurança)

| Variável | Exemplo / Formato | Descrição |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/dock` | String de conexão para o banco de dados PostgreSQL. |
| `BETTER_AUTH_SECRET` | String aleatória segura de 32+ bytes | Chave mestre de assinatura de sessões do Better Auth. |
| `BETTER_AUTH_URL` | `http://localhost:3001` (dev) ou URL de prod | URL base da aplicação para validação de callbacks. |
| `APP_ENCRYPTION_KEY` | String aleatória de 32+ bytes | Chave mestre para criptografia AES-256-GCM de credenciais no banco. |

### 6.2 Variáveis de Autenticação OAuth (Google & Spotify)

| Variável | Obrigatoriedade | Descrição |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Recomendado | ID do cliente OAuth Google (Google Calendar e Login). |
| `GOOGLE_CLIENT_SECRET` | Recomendado | Segredo do cliente OAuth Google. |
| `SPOTIFY_CLIENT_ID` | Recomendado | ID do aplicativo registrado no Spotify Developer Dashboard. |
| `SPOTIFY_CLIENT_SECRET` | Recomendado | Segredo do aplicativo Spotify. |
| `SPOTIFY_REDIRECT_ORIGIN` | Opcional | Origem para redirecionamento OAuth do Spotify (padrão: `http://127.0.0.1:3001`). |

### 6.3 Variáveis de Rede, Integrações & Serviços

| Variável | Padrão | Descrição |
|---|---|---|
| `HOME_ASSISTANT_ALLOWED_HOSTS` | Vazio (permite qualquer) | Lista de domínios/IPs autorizados para conexões com o Home Assistant (separados por vírgula). |
| `FINANCE_API_URL` | `https://paridade-risco-mobile-api.vercel.app` | URL base do backend de portfólio de investimentos. |
| `WEATHER_LAT` | `-15.886953` (Brasília) | Latitude padrão de fallback quando o perfil não define. |
| `WEATHER_LON` | `-47.813873` (Brasília) | Longitude padrão de fallback quando o perfil não define. |
| `WEATHER_LOCATION` | `"Brasília"` | Nome da cidade padrão de fallback. |
| `WEATHER_TIMEZONE` | `"America/Sao_Paulo"` | Fuso horário padrão de fallback. |
| `OPENAI_REALTIME_MODEL` | `gpt-realtime-mini` | Modelo padrão para conversação de voz OpenAI Realtime. |
| `OPENAI_REALTIME_VOICE` | `marin` | Voz síntese padrão para o agente Realtime. |
| `OPENAI_REALTIME_REASONING_EFFORT` | `low` | Esforço de raciocínio quando utilizado com `gpt-realtime-2`. |

---

## 7. Contrato Canônico de Erros e Efeitos Operacionais

Todas as operações de negócio retornam um contrato tipado `OperationResult<T>` e falhas estruturadas via `OperationError`:

```typescript
export interface OperationError {
  code: string
  category: "validation" | "authorization" | "conflict" | "rate_limit" | "upstream" | "internal"
  message: string
  hint?: string
  retryable: boolean
  invalidFields?: string[]
}
```

### 7.1 Matriz de Operações e Efeitos

| Operação | Tipo de Efeito | Confirmação | Idempotência / Retry | Interfaces |
|---|---|---|---|---|
| **Leitura (Clima, Agenda, Spotify, Casa, Finanças)** | Leitura pura (`read`) | Nenhuma | Retry transitório permitido | UI, Realtime Agent |
| **Atualizar Perfil / Configurações** | Escrita reversível (`write`) | Ação explícita em Settings | Upsert no banco de dados | UI |
| **Controle de Playback Spotify (Play/Pause/Skip)** | Escrita externa de baixo risco | Comando explícito do usuário | Sem retry automático; deduplicado por call ID | UI, Realtime Agent |
| **Ajuste de Volume / Dispositivo Spotify** | Escrita externa de baixo risco | Ação explícita na UI | Sem retry automático | UI |
| **Ações Pomodoro / Timer / Stopwatch** | Escrita local reversível | Comando explícito | Deduplicado por call ID | UI, Realtime Agent |
| **Serviço Home Assistant (Luzes, Cenas)** | Escrita externa em hardware | Toque explícito no card | Sem retry automático; restrito a entidades autorizadas | UI |
| **Login no Módulo Financeiro** | Escrita de autenticação | Envio de formulário | Sem retry automático | UI |
| **Desconectar Integração / Limpar Credencial** | Escrita destrutiva reversível | Ação explícita em Settings | Operação delete idempotente | UI |

---

## 8. Regras de Design e Ergonomia de Interface (Design System)

### 8.1 Escala de Luminância (The Luminance Ladder)
A profundidade visual é gerada **exclusivamente por degraus de luminância**, sem sombras:
- `Cockpit Void` (`oklch(0.07 0 0)`): Fundo base absoluto da aplicação.
- `Panel Surface` (`oklch(0.13 0 0)`): Superfície de cards, popovers e gaveta de configurações.
- `Gauge Housing` (`oklch(0.20 0 0)`): Botões secundários, inputs, trilhas de slider e abas inativas.
- `Frame Line` (`oklch(0.22 0 0)`): Bordas sutis (1px) e divisores entre elementos.
- `Dim Readout` (`oklch(0.55 0 0)`): Textos secundários, metadados e ícones em repouso.
- `Instrument White` (`oklch(0.95 0 0)`): Textos primários de alta ênfase e valores numéricos ativos.

### 8.2 Regra do Sinal Único (Single Signal Rule)
- Em qualquer viewport em repouso, **apenas 1 elemento** possui a cor de destaque (Action Accent).
- O accent indica **estado ativo ou em andamento** (ex: timer rodando, aba selecionada).
- Exceções permanentes: `Alert Red` para ações destrutivas / erros críticos; `Signal Green` exclusivo da marca Spotify.

### 8.3 Monopólio do Display (Display Monopoly Rule)
- A tipografia **Display** (`JetBrains Mono`, peso 200, `clamp(3.2rem, 12vw, 7.5rem)`) pertence **exclusivamente ao Relógio Principal (`TodayPanel`) e ao `NightDock`**.
- Todos os demais números grandes (Timer, Finanças, Clima) utilizam peso Headline (`Inter` 600 ou `JetBrains Mono` 500), nunca o tamanho Display.

---

## 9. PROIBIÇÕES CATEGÓRICAS (Regras Rígidas para a IA)

Estas regras são invioláveis. Qualquer sugestão ou alteração de código que viole estes pontos deve ser rejeitada:

1. 🚫 **PROIBIDO Expor Segredos ao Cliente:** Nunca envie chaves de API, segredos de criptografia, tokens do Home Assistant ou credenciais bancárias para o navegador. O cliente recebe apenas dados processados ou tokens efémeros de sessão Realtime emitidos pelo backend.
2. 🚫 **PROIBIDO Adicionar Rolagem Vertical nos Painéis do Dock:** A interface foi construída para caber estritamente no viewport paisagem de 667 × 375 px. O único eixo de rolagem permitido é o carrossel horizontal principal. Se o conteúdo não cabe, a hierarquia visual deve ser condensada com `clamp()`.
3. 🚫 **PROIBIDO Usar Sombras Decorativas em Repouso:** A elevação é definida estritamente pela Escala de Luminância (`void -> panel -> housing -> frame -> white`). Sombras (`drop-shadow`) são proibidas em cards ou painéis estáticos.
4. 🚫 **PROIBIDO Misturar Múltiplos Acentos de Destaque:** Não utilize botões coloridos de cores distintas na mesma tela para fins decorativos. Siga a *Single Signal Rule*.
5. 🚫 **PROIBIDO Hardcodar IDs de Usuário ou Dados de Teste em Produção:** Toda operação deve resolver o usuário autenticado através do contexto da sessão do Better Auth (`getCurrentUser()`).
6. 🚫 **PROIBIDO Fazer Requisições para Hosts Não Autorizados:** Chamadas de saída para o Home Assistant devem validar o protocolo (`http`/`https`), rejeitar metadados locais de nuvem (169.254.169.254) e respeitar `HOME_ASSISTANT_ALLOWED_HOSTS`.
7. 🚫 **PROIBIDO Modificar o Banco sem Migrações Drizzle:** Toda e qualquer alteração no esquema `db/schema.ts` exige a geração de arquivos de migração via `pnpm db:generate`.
8. 🚫 **PROIBIDO Supor Recursos de Hardware Móvel sem Fallback:** Navegadores móveis (especialmente Safari/iOS) bloqueiam vibração (`navigator.vibrate`) e áudio sem toque prévio. Todo alerta sonoro/háptico deve possuir feedback visual equivalente.
9. 🚫 **PROIBIDO Quebrar a Tipagem ou Ignorar Erros do Lint:** Nenhum código deve ser entregue com `any` indiscriminado ou ignorando os checks de `pnpm check`.

---

## 10. Fluxo de Trabalho e Padrões de Implementação

Ao implementar ou estender funcionalidades no Focus Dock, o assistente deve:
1. **Adicionar/Modificar Contratos de Domínio:** Atualizar ou criar o esquema Zod em `lib/operations/contracts.ts` e implementar a lógica pura em `lib/operations/`.
2. **Implementar o Adaptador HTTP:** Criar ou atualizar a rota em `app/api/<rota>/route.ts` utilizando o helper `handleOperationResponse` de `lib/http/operation-response.ts`.
3. **Persistência de Dados & Segredos:** Usar `db/schema.ts`, `lib/drizzle.ts` e `lib/integration-secrets.ts` para leitura e escrita criptografada (`encryptSecret` / `decryptSecret`).
4. **Interface Visual:** Construir componentes modulares em `components/`, aplicando tokens do Tailwind 4, classes utilitárias fluidas com `clamp()`, `font-mono tabular-nums` para dados numéricos e `active:scale-[0.96]` para feedback tátil.
5. **Validação Automática:** Executar a suíte de testes e tipagem via `pnpm check`.

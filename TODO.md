# Focus Dock TODO

Backlog para evoluir o Focus Dock como um painel de mesa discreto, com foco em utilidade imediata, baixa distracao e boa experiencia em iPhone/iPad em modo paisagem.

## Principios de produto

- O dock deve ser legivel a distancia e exigir pouca interacao.
- Alertas devem ser majoritariamente visuais e tacteis, preservando a musica de fundo.
- Recursos dependentes de audio/notificacoes devem ter fallback visual, especialmente em dispositivos Apple.
- Configuracoes sensiveis continuam no servidor; preferencias de uso podem ficar em `localStorage`.
- A tela principal deve priorizar "o que importa agora": hora, proximo evento, foco atual e clima.

## P0 - Agenda real mais util

- [x] Destacar no calendario os dias que possuem eventos.
  - Mostrar um ponto/barra discreta nos dias com eventos.
  - Usar indicadores diferentes para eventos de dia todo e eventos com horario, se couber sem poluir.
  - Manter bom contraste no dia selecionado e no dia atual.

- [x] Mostrar proximo evento do dia.
  - Exibir o proximo compromisso no painel da agenda.
  - Mostrar contagem regressiva simples quando faltar menos de 2 horas.
  - Destacar evento em andamento.

- [x] Separar eventos de dia todo dos eventos com horario.
  - Eventos com horario devem aparecer ordenados por inicio.
  - Eventos de dia todo devem ficar em uma secao compacta.

- [x] Atualizar eventos automaticamente.
  - Revalidar a agenda a cada 5 minutos.
  - Preservar a data selecionada durante atualizacoes.
  - Exibir estado discreto de erro quando a API falhar.

## P1 - Pomodoro e Timer sem quebrar a musica

- [x] Adicionar vibracao opcional para Pomodoro e Timer.
  - Usar `navigator.vibrate()` quando disponivel.
  - Ter padroes diferentes para Pomodoro e Timer.
  - Nao depender de vibracao para comunicar o fim; manter alerta visual forte.
  - Considerar que iOS Safari pode nao suportar Vibration API.

- [x] Melhorar alerta visual de conclusao.
  - Usar animacao mais clara no estado concluido.
  - Evitar piscadas agressivas demais em ambiente escuro.
  - Manter controles grandes: proxima fase, dispensar, reiniciar.

- [x] Adicionar configuracao de alerta.
  - Opcoes: visual apenas, visual + vibracao, visual + som.
  - Padrao recomendado: visual + vibracao quando suportado.
  - Salvar preferencia em `localStorage`.

- [ ] Avaliar notificacoes do navegador/PWA.
  - Solicitar permissao apenas a partir de acao explicita do usuario.
  - Usar como opcional, nao como dependencia.
  - Documentar limitacoes em iOS/iPadOS.

## P1 - Painel Hoje

- [x] Criar uma tela "Hoje".
  - Mostrar hora, clima compacto, proximo evento e status do Pomodoro.
  - Servir como primeira tela quando houver eventos proximos.
  - Spotify deixou de ser fixo no rodape depois da criacao do painel dedicado de Midia.

- [x] Exibir "agora" de forma inteligente.
  - Se houver Pomodoro rodando, dar prioridade ao foco atual.
  - Se houver reuniao em menos de 15 minutos, dar prioridade ao evento.
  - Se for noite, reduzir densidade visual.

## P2 - Configuracoes no app

- [x] Escolher multiplas agendas do Google Calendar para exibir no dock.
  - Listar agendas conectadas pela API do Google Calendar.
  - Permitir selecao multipla no app.
  - Aplicar selecao ao Painel Hoje e ao calendario mensal.

- [ ] Criar painel de configuracoes.
  - Duracoes do Pomodoro.
  - Preferencia de alerta.
  - Tema/brilho.
  - Cidade exibida do clima.
  - Agenda padrao, quando houver multiplas agendas.
  - [x] Mostrar a engrenagem de configuracoes somente na primeira tela.

- [ ] Persistir preferencias locais.
  - Usar chaves versionadas em `localStorage`.
  - Ter fallback seguro se dados antigos estiverem invalidos.

## P2 - Controle de casa inteligente

- [x] Criar painel Home Assistant.
  - Usar Home Assistant como unica integracao inicial para casa inteligente.
  - Controlar dispositivos Smart Life/Tuya somente se estiverem expostos no Home Assistant.
  - [x] Usar `HOME_ASSISTANT_URL` e `HOME_ASSISTANT_TOKEN` no servidor.
  - [x] Comecar com entidades favoritas configuradas por env, ex.: `HOME_ASSISTANT_ENTITIES=light.sala,switch.tomada_mesa,scene.movie_mode`.
  - [x] Criar rota server-side para listar estados sem expor token no client.
  - [x] Criar rota server-side para chamar servicos do Home Assistant.
  - [x] Exibir luzes, tomadas, scripts e cenas em controles compactos.
  - [x] Exibir teto retratil/cover com acoes de abrir, parar e fechar.
  - [x] Permitir acoes rapidas: ligar/desligar, acionar cena/script e ajustar brilho quando suportado.
  - [x] Mostrar estados `unavailable`/erro de forma discreta.
  - [x] Atualizar estados automaticamente sem poluir a UI.
  - [x] Manter layout otimizado para dock em landscape.
  - [x] Testar com token real do Home Assistant.

## P2 - Financeiro rapido

- [x] Criar painel de carteira de investimentos.
  - [x] Integrar com a aplicacao local em `C:\projetos\paridade-risco-mobile`.
  - [x] Identificar se a integracao sera por API existente, arquivo exportado ou novo endpoint.
    - Integracao por API existente: `/api/portfolio/summary`.
    - API de producao configurada via `FINANCE_API_URL=https://paridade-risco-mobile-api.vercel.app`.
  - [x] Mostrar patrimonio atual, variacao do dia e alocacao resumida.
    - Mostrar patrimonio atual, resultado aberto, desvio da cesta, caixa e total investido.
    - Mostrar lista vertical de alocacao por ativo com quantidade, percentual, alvo, valor atual e ganho/perda.
    - Mostrar ticker inferior automatico com ultima cotacao e variacao diaria (`dailyChangePercentage`).
  - [x] Evitar dados sensiveis em excesso na tela do dock.
    - Exibir apenas resumo da carteira e ativos da cesta; nao listar transacoes nem detalhes pessoais.
  - [x] Atualizar em intervalo conservador para nao gerar ruido.

## P2 - Inbox Zero / Pendencias

- [ ] Criar painel de pendencias.
  - Avaliar integracoes com Gmail, Notion, Todoist e Linear.
  - Comecar com no maximo 3 a 5 itens realmente acionaveis.
  - Separar "precisa resposta", "vence hoje" e "aguardando".
  - Evitar transformar o dock em lista longa de tarefas.
  - Permitir esconder itens sensiveis ou pessoais.

## P2 - Agente de voz realtime

- [x] Criar painel de conversa por voz.
  - Inspiracao de interface: painel compacto estilo voice chat, com botao central grande para iniciar/encerrar conversa.
  - Inserir como novo painel do carousel, preferencialmente apos `TodayPanel` ou antes de `SpotifyExpandedPanel`.
  - Manter foco em uso hands-free no dock: toque explicito para iniciar, estado visual claro e transcricao curta.
  - Estados minimos: parado, conectando, ouvindo, processando, falando e erro.
  - Exibir fallback visual quando microfone, permissao ou audio falhar.

- [x] Implementar arquitetura OpenAI Realtime via WebRTC.
  - [x] Criar rota server-side `app/api/realtime/session/route.ts` para gerar sessao efemera.
  - [x] Nunca expor `OPENAI_API_KEY` para o navegador.
  - [x] Criar `hooks/use-realtime-agent.ts` para gerenciar microfone, WebRTC, data channel, eventos e cleanup.
  - [x] Criar `lib/realtime-agent.ts` para centralizar instrucoes do agente, modelo padrao e definicoes de ferramentas.
  - [x] Preferir `gpt-realtime-mini` no MVP por custo/latencia.
  - [ ] Avaliar `gpt-realtime-2` para a versao com ferramentas e raciocinio mais forte.
  - [ ] Reservar `gpt-realtime-translate` para um modo futuro de traducao, nao para o agente principal.

- [x] Adicionar configuracao por ambiente.
  - [x] `OPENAI_API_KEY=`
  - [x] `OPENAI_REALTIME_MODEL=gpt-realtime-mini`
  - [x] `OPENAI_REALTIME_VOICE=`
  - [x] `OPENAI_REALTIME_REASONING_EFFORT=low` usado com `gpt-realtime-2`
  - [x] Ter estado mock/configuracao quando `OPENAI_API_KEY` nao estiver presente.

- [x] Definir comportamento do agente.
  - [x] Responder em portugues por padrao.
  - [x] Ser breve e adequado para uma tela de dock.
  - [x] Usar contexto do Focus Dock: clima, agenda, Spotify, Home Assistant, financeiro e timers.
  - [x] Nao narrar dados sensiveis em excesso, especialmente financeiro.
  - [x] Pedir confirmacao antes de qualquer acao que altere estado externo.

- [x] Comecar com ferramentas read-only.
  - [x] Resumo do clima atual.
  - [x] Proximo evento e eventos de hoje.
  - [x] Estado atual do Spotify.
  - [x] Resumo compacto da carteira.
  - [x] Estado resumido das entidades favoritas do Home Assistant.

- [ ] Adicionar acoes mutaveis somente apos confirmacao.
  - [x] Spotify: play/pause, proxima, anterior.
  - [ ] Spotify: playlist.
  - Home Assistant: ligar/desligar, cena/script, brilho quando suportado.
  - [x] Produtividade: iniciar, pausar e reiniciar Pomodoro, timer e cronometro.
  - Agenda: criar lembrete/evento simples, se a integracao permitir.
  - [x] Executar comandos simples de Spotify sem confirmacao extra quando o pedido for explicito.
  - [x] Executar comandos simples de produtividade sem confirmacao extra quando o pedido for explicito.
  - [ ] Exigir confirmacao para pedidos ambiguos ou acoes de maior impacto.

- [ ] Validar comportamento em Apple/iOS.
  - Garantir que captura de microfone nasce de gesto explicito do usuario.
  - Testar audio de resposta em Safari e PWA instalado.
  - Validar WebRTC em iPhone/iPad real em modo paisagem.
  - Manter botao de encerrar sempre acessivel.

## P2 - Midia expandida

- [x] Criar painel Spotify expandido.
  - [x] Mostrar capa maior, faixa, artista, album e dispositivo ativo.
  - [x] Exibir controles grandes para play/pause, anterior, proxima e shuffle/repeat.
  - [x] Adicionar controle de volume e troca de dispositivo via Spotify Connect.
  - [x] Listar playlists do usuario sem exibir as faixas.
  - [x] Iniciar reproducao de uma playlist usando `context_uri`.
  - [x] Atualizar escopos Spotify para incluir `playlist-read-private`.
  - [x] Reemitir refresh token Spotify com acesso a playlists.
  - [x] Remover barra compacta persistente do rodape.
  - [x] Reorganizar layout do painel para dock landscape, sem sobreposicao com playlists.
  - [x] Consolidar informacao de dispositivo ativo para evitar duplicacao visual.
  - [x] Mostrar estado mock/configuracao quando Spotify nao estiver configurado.

## P2 - Modo dock / Apple

- [x] Modo noturno.
  - Reduzir brilho visual depois de um horario configuravel.
  - Mostrar relogio minimalista quando inativo.
  - Retornar ao modo normal ao tocar na tela.
  - Ativar automaticamente a tela noturna no horario configurado.

- [x] Prevenir burn-in visual.
  - Mover elementos principais alguns pixels ao longo do tempo.
  - Evitar mudancas perceptiveis ou distrativas.

- [ ] Revisar comportamento PWA em iOS.
  - [x] Conferir manifest e icons.
  - [x] Validar safe areas em landscape no codigo.
  - [ ] Testar tela cheia adicionada a Home Screen em iPhone/iPad real.

## P3 - Organizacao tecnica

- [x] Preparar deploy Docker na tailnet.
  - [x] Adicionar `Dockerfile` com build standalone do Next.js.
  - [x] Publicar imagem no GHCR a cada push na `main`.
  - [x] Adicionar `docker-compose.yml` com Watchtower para atualizacao automatica.
  - [x] Documentar deploy no Ubuntu dentro da tailnet.

- [x] Extrair helper `lib/google-calendar.ts`.
  - [x] Centralizar OAuth e normalizacao de eventos.
  - [x] Manter a rota `app/api/calendar-events/route.ts` fina.

- [x] Atualizar documentacao.
  - [x] Corrigir `CLAUDE.md` para refletir a implementacao atual.
  - [x] Documentar variaveis `GOOGLE_*`.
  - [x] Documentar limitacoes de Apple para PWA/Home Screen.

- [ ] Adicionar verificacoes basicas.
  - [x] Testar normalizacao de eventos do Google Calendar.
  - [ ] Rodar `pnpm lint`.
  - [x] Rodar `pnpm exec tsc --noEmit`.
  - [x] Rodar `pnpm build`.

## P3 - Segurança operacional

- [ ] Rotacionar segredos expostos durante configuracao.
  - Rotacionar `GOOGLE_CLIENT_SECRET`.
  - Revogar refresh token exposto em prints.
  - Gerar novo `GOOGLE_REFRESH_TOKEN`.
  - Evitar compartilhar telas com tokens visiveis.

- [ ] Revisar `.env.local`.
  - Garantir que `.env.local` nao esta versionado.
  - Manter `GOOGLE_REFRESH_TOKEN` e credenciais Spotify somente localmente.

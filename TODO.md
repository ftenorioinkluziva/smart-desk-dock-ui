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

- [ ] Adicionar vibracao opcional para Pomodoro e Timer.
  - Usar `navigator.vibrate()` quando disponivel.
  - Ter padroes diferentes para Pomodoro e Timer.
  - Nao depender de vibracao para comunicar o fim; manter alerta visual forte.
  - Considerar que iOS Safari pode nao suportar Vibration API.

- [ ] Melhorar alerta visual de conclusao.
  - Usar animacao mais clara no estado concluido.
  - Evitar piscadas agressivas demais em ambiente escuro.
  - Manter controles grandes: proxima fase, dispensar, reiniciar.

- [ ] Adicionar configuracao de alerta.
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
  - Manter Spotify fixo no rodape.

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

- [ ] Criar painel de carteira de investimentos.
  - Integrar com a aplicacao local em `C:\projetos\paridade-risco-mobile`.
  - Identificar se a integracao sera por API existente, arquivo exportado ou novo endpoint.
  - Mostrar patrimonio atual, variacao do dia/mes e alocacao resumida.
  - Destacar apenas alertas acionaveis: desvio de alvo, caixa baixo, queda/alta relevante.
  - Evitar dados sensiveis em excesso na tela do dock.
  - Atualizar em intervalo conservador para nao gerar ruido.

## P2 - Inbox Zero / Pendencias

- [ ] Criar painel de pendencias.
  - Avaliar integracoes com Gmail, Notion, Todoist e Linear.
  - Comecar com no maximo 3 a 5 itens realmente acionaveis.
  - Separar "precisa resposta", "vence hoje" e "aguardando".
  - Evitar transformar o dock em lista longa de tarefas.
  - Permitir esconder itens sensiveis ou pessoais.

## P2 - Midia expandida

- [ ] Criar painel Spotify expandido.
  - Mostrar capa maior, faixa, artista, album e dispositivo ativo.
  - Exibir controles grandes para play/pause, anterior, proxima e shuffle/repeat.
  - Avaliar controle de volume e troca de dispositivo se a API permitir.
  - Mostrar estado mock/configuracao quando Spotify nao estiver configurado.
  - Manter a barra compacta persistente no rodape.

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

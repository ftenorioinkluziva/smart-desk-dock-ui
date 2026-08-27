# Gate de Viabilidade — Tuya Cloud / Smart Life

> Status: alternativa Tuya encerrada no momento; manter Home Assistant
> Data da avaliação documental: 2026-08-25
> Escopo: confirmar se o Focus Dock pode substituir o Home Assistant por uma integração server-side com a conta Smart Life.

## Objetivo

Validar a viabilidade comercial, regional e técnica da Tuya Cloud antes de alterar a arquitetura, o banco de dados ou a interface do Focus Dock.

Este documento é um gate de decisão. Ele não autoriza a remoção do Home Assistant nem transforma a especificação atual de Rotinas em contrato de implementação.

## Decisão atual

Após a tentativa de vinculação direta por QR Code, a verificação do data center e o teste de OAuth 2.0, a alternativa Tuya Cloud não será implementada neste momento. O OAuth disponível no projeto exige OEM App e não atende diretamente à conta pública Smart Life. O Home Assistant permanece como integração oficial do Focus Dock.

O próximo trabalho de integração deverá concentrar-se em reduzir a fragilidade do Home Assistant, preservando a configuração atual, os favoritos e os comandos existentes até que uma substituição seja validada por um POC completo.

## O que já foi confirmado na documentação pública

- A Tuya possui APIs Cloud server-side para listar dispositivos, consultar especificações, consultar estado e enviar comandos.
- Uma conta Tuya/Smart Life pode ser vinculada a um Cloud Project por autorização via QR Code/OAuth.
- O projeto precisa autorizar os serviços Cloud adequados. O IoT Core é o serviço central para controle e consulta de dispositivos.
- A disponibilidade depende de região/data center, serviços autorizados, recurso/plano válido e limites de frequência.

Referências oficiais:

- [Criar projeto e vincular uma conta Smart Life](https://developer.tuya.com/en/docs/developer/apply-cloud-api-key?id=Kff30z8sv62ah)
- [Configuração de projeto Smart Home](https://developer.tuya.com/en/docs/iot/Platform_Configuration_smarthome?_source=a0f6ee040faff98e83cb618ae836b75e&id=Kamcgamwoevrx)
- [Planos e recursos do IoT Core](https://developer.tuya.com/en/docs/iot/membership-service?_source=5e53a597a94394c1cf2c91a662d48339&id=K9m8k45jwvg9j)
- [Autorização de serviços de API](https://developer.tuya.com/en/docs/iot/applying-for-api-group-permissions?_source=d007e95073138de25cb1f08f96d96125&id=Ka6vf012u6q76)
- [APIs de conexão e controle de dispositivos](https://developer.tuya.com/en/docs/cloud/device-connection-service?id=Kb0b8geg6o761)
- [Limites de frequência da API](https://developer.tuya.com/en/docs/iot/frequency-control?id=Kcojz2r2dg1f6)

## Validação necessária na conta Tuya

Não registrar neste arquivo Client Secret, tokens, códigos de autorização, QR Codes ou qualquer outra credencial.

## Resultado da verificação no navegador — 2026-08-25

- A conta Tuya está autenticada na plataforma.
- **My Cloud Projects:** `No projects found`.
- O menu **Cloud Services** e **API Explorer** aparece na navegação, mas não foi possível validar serviços ou APIs porque não existe um projeto selecionado.
- O formulário de criação exige `Project Name`, `Description`, `Industry`, `Development Method` e `Data Center`.
- O método **Smart Home** está disponível e descreve exatamente o uso de vincular um aplicativo de casa inteligente e desenvolver com APIs Smart Home.
- Os data centers oferecidos no formulário são: China, Central Europe, India, Western America, Western Europe, Eastern America e Singapore.
- A página da Tuya para o IoT Core apresenta uma opção **Trial Edition**, com indicação pública de 1 data center, até 50 dispositivos, até 10 dispositivos controláveis, 26.000 chamadas de API/mês e 68.000 mensagens/mês por 1 mês. A elegibilidade efetiva da conta ainda precisa ser confirmada no fluxo autenticado.
- O Cloud Project `Focus Dock` foi criado com método **Smart Home** e **Eastern America Data Center**, conforme o mapeamento atual da Tuya para o Brasil.
- Após a criação, o assistente pré-selecionou cinco serviços: `IoT Core` com `Free Basic Resource Pack`, `Authorization Token Management`, `Smart Home Basic Service`, `Data Dashboard Service` e `[Deprecate] Smart Home Scene Linkage`.
- Foram ativados em trial e autorizados no projeto somente `IoT Core`, `Authorization Token Management` e `Smart Home Basic Service`.
- `Data Dashboard Service` e `[Deprecate] Smart Home Scene Linkage` não foram ativados.
- Na aba **Devices**, o projeto está no Eastern America Data Center e exibe `0` contas vinculadas e `0` dispositivos.
- O próximo fluxo disponível é **Add App Account**, que inicia a vinculação da conta Tuya/Smart Life por autorização do aplicativo. Esse fluxo ainda não foi iniciado.
- Após a confirmação do usuário de que a vinculação foi feita, a aba **Link App Account** foi recarregada e continuou exibindo `0` contas adicionadas e `0` dispositivos vinculados; a aba **All Devices** também retornou `No data found`.
- Não foi observado erro de API relacionado à vinculação no console; houve apenas um aviso isolado do script de segurança da plataforma.
- A tentativa de vinculação exibiu a mensagem **“Data centers inconsistency. App account cannot be linked.”**. O projeto estava selecionado em `Eastern America Data Center`.
- A documentação atual da Tuya mapeia o código de país `55` (Brasil) para o Eastern America Data Center, mas a mensagem indica que a conta Smart Life usada possui uma alocação efetiva diferente ou uma configuração/regra histórica. O data center do projeto não deve ser trocado por tentativa.
- O usuário confirmou que a região da conta é Brasil e que a alocação esperada é Eastern America; como o projeto já está nesse data center, permanece uma divergência entre a alocação declarada e a alocação reconhecida pela plataforma no fluxo de vinculação.
- Com autorização do usuário, o código informado foi pesquisado no campo `UID/User Account` do projeto em Eastern America; o resultado foi `No data found`.
- A captura do aplicativo Smart Life identifica o valor informado como **Código do Usuário**, não como `UID`/`Account ID` técnico. Portanto, o resultado `No data found` não prova que a conta não existe nem deve ser usado para decidir o data center.
- No mesmo fluxo, o seletor `Select an app` exibiu `No Data`. A localização da conta foi confirmada como Brasil; o projeto em Eastern America permanece a escolha correta, e a mensagem de inconsistência aponta para a alocação/fluxo de vinculação reconhecido pela Tuya.
- A documentação oficial de **Link Devices** confirma que o método correto para uma conta SmartLife é `Add App Account` → QR Code → confirmar login no aplicativo → escolher o método de associação dos dispositivos → `OK`.
- A mesma documentação exige que a conta SmartLife esteja associada a pelo menos um dispositivo e recomenda, quando o dispositivo não aparece, verificar o data center ou desvincular a conta de outros Cloud Projects.
- O `Código do Usuário` informado não substitui esse fluxo QR e não foi considerado evidência de UID técnico.
- Foi aberta a edição do projeto para testar `Western America Data Center`, mas a plataforma bloqueou a seleção porque a conta atingiu a cota do `IoT Core Trial Edition` de 1 data center. O menu informou que seria necessário fazer upgrade ou liberar a cota alterando a configuração de um projeto. Nenhuma alteração foi salva; o projeto permanece em `Eastern America Data Center`.
- A opção **Configure OAuth 2.0 Authorization** foi aberta para teste. A própria tela informa que OAuth aceita somente **OEM Apps**; a seção `Apps for Login Authorization` do projeto Focus Dock está vazia (`No Data`). Portanto, esse fluxo não está disponível para autorizar diretamente a conta pública do Smart Life neste projeto. Nenhuma configuração OAuth, callback ou autorização foi salva.
- Nenhum upgrade pago foi realizado.

### 1. Projeto e serviços

- [ ] Existe ou pode ser criado um projeto com método **Smart Home**.
- [ ] A região/data center do projeto é compatível com a região da conta Smart Life.
- [ ] **IoT Core** está disponível e autorizado para o projeto.
- [ ] **Smart Home Basic Service** está disponível e autorizado, quando solicitado pelo projeto.
- [ ] **Device Status Notification** está disponível, caso seja necessário receber mudanças de estado sem polling agressivo.
- [ ] O projeto possui trial ou plano com recurso básico válido.
- [ ] A franquia e os limites suportam o uso esperado pelo Focus Dock.

### 2. Conta e dispositivos

- [ ] A conta Smart Life foi vinculada pelo fluxo oficial de autorização.
- [ ] O projeto lista os dispositivos esperados.
- [ ] Pelo menos uma luz foi identificada para teste.
- [ ] Pelo menos um interruptor/tomada ou cortina foi identificado, se existir na conta.
- [ ] Para cada dispositivo de teste, a API retorna modelo, funções, comandos e estado.

### 3. Teste funcional mínimo

Executar no API Explorer, sem expor os valores secretos:

| Teste | Critério de aprovação |
|---|---|
| Listar dispositivos | Os dispositivos Smart Life esperados aparecem com identificador estável |
| Ler funções/especificação | O projeto identifica corretamente as capacidades do dispositivo |
| Ler estado | O estado retornado corresponde ao estado observado no aplicativo Smart Life |
| Comando seguro | Uma luz ou tomada pode ser ligada/desligada pelo Cloud API |
| Read-after-write | Uma nova leitura confirma o resultado do comando |
| Repetição controlada | O mesmo teste pode ser repetido sem erro de autorização ou limite |

## Critério de decisão

### Aprovar POC Tuya

Somente se todos os itens abaixo forem verdadeiros:

1. O IoT Core está disponível, autorizado e com recurso válido.
2. A conta Smart Life foi vinculada com sucesso.
3. Os dispositivos reais aparecem no projeto.
4. Leitura de estado e comando seguro funcionam no API Explorer.
5. A região/data center e a franquia são compatíveis com o uso previsto.

### Manter Home Assistant

Se qualquer um dos itens críticos acima falhar, a migração não deve começar. Nesse caso, o próximo trabalho será diagnosticar a disponibilidade do Home Assistant e reduzir sua fragilidade, sem apagar a integração existente.

### Aprovação condicionada

Se o controle funcionar, mas notificações, plano ou franquia não forem suficientes, a Tuya poderá ser usada inicialmente com estado em cache e atualização sob demanda. O polling atual do Home Assistant a cada 10 segundos não deve ser copiado automaticamente para a Tuya.

## Evidências que precisam ser retornadas

É suficiente informar ou capturar uma tela sem dados secretos contendo:

- nome/status dos serviços Cloud autorizados;
- região/data center do projeto;
- nome do trial ou plano e limites relevantes;
- quantidade de dispositivos vinculados;
- resultado dos testes de listar, ler estado, enviar comando e confirmar estado.

## Escopo do POC após aprovação

O POC será server-side e usará dois dispositivos reais:

- um dispositivo de iluminação;
- um interruptor/tomada ou cortina, conforme disponibilidade.

O POC deverá medir autorização, latência, erro transitório, read-after-write, limites de chamadas e comportamento durante indisponibilidade da Internet. As credenciais ficarão exclusivamente no backend e serão armazenadas no cofre criptografado existente.

Somente depois do POC aprovado serão revisados:

- o contrato provider-neutral de Smart Home;
- o painel e as configurações;
- os comandos do agente de voz;
- os favoritos persistidos hoje como entidades Home Assistant;
- a nova especificação de Rotinas, sem dependência de `entityId` do Home Assistant.

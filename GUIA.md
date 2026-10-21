# QChef — guia de configuração e publicação

PWA de receitas com IA: a pessoa diz o que tem em casa e o app monta a receita com passo a passo, cronômetro e foto.

- **App:** https://appnovidades.com.br/qchef/ (pasta `app/`)
- **Servidor de receitas:** https://appnovidades.com.br/api/qchef/ (pasta `servidor/vps/`)
- **Firebase:** projeto `qchef-app` (conta serginholsantos5@gmail.com), plano gratuito Spark — login e Firestore
- **VPS:** a mesma do Dieta Fácil (Hostinger, Docker + Traefik). O app vai junto com os sites do `C:\projetos\low_ticket`.

Sem o arquivo `app/.env`, o app roda em **modo demonstração** (login simulado e receitas do livro, sem IA).

---

## 1. Rodar no computador

```bash
cd app
npm install
npm run dev -- --port 5180      # http://localhost:5180
```

`app/.env.development.local` (só no `npm run dev`) faz o login usar `qchef-app.firebaseapp.com`, porque o
domínio de produção só funciona em appnovidades.com.br.

Testar a geração de receitas direto, sem app nem login:

```bash
cd servidor/functions
npm install
npm run teste                        # 6 casos de teste
node --env-file=.env.local teste-local.js Cenoura "Farinha de trigo" Fermento
```

Precisa de `servidor/functions/.env.local` com `QCHEF_GEMINI_KEY=...` (e `ANTHROPIC_API_KEY=...` para o Claude).

---

## 2. Publicar

```bash
sh servidor/vps/publicar.sh     # servidor de receitas (container qchef-api na VPS)
sh app/deploy/publicar.sh       # app: build → low_ticket/sites/qchef → low_ticket/deploy/publicar.sh
```

O servidor precisa de dois arquivos que **não vão para o git**:

- `servidor/vps/.env` — `QCHEF_GEMINI_KEY`, `QCHEF_IA`, `KIWIFY_TOKEN`, `KIWIFY_PRODUTO_PRO` (e `ANTHROPIC_API_KEY` quando usar o Claude)
- `servidor/vps/service-account.json` — Firebase › Configurações do projeto › Contas de serviço › Gerar nova chave privada

Se o SSH pelo IPv4 não conectar (aconteceu em 21/10/2026), publique pelo IPv6:

```bash
SSH_OPTS="-6" SERVER=root@srv1899434.hstgr.cloud sh servidor/vps/publicar.sh
SSH_OPTS="-6" SERVER=root@srv1899434.hstgr.cloud sh app/deploy/publicar.sh
```

O app instalado no celular atualiza sozinho; para forçar, feche e abra o app duas vezes.

---

## 3. IA das receitas

Hoje roda no **Gemini gratuito** (`QCHEF_IA=gemini`). Cada modelo tem uma cota diária própria; o servidor tenta
`gemini-3.8-flash` e, se estiver sem cota ou lento, os reservas (3.7 Flash, 3.5 Flash, 3.1 Flash-Lite,
3.5 Flash-Lite). A cota renova por volta das 4h–5h (horário de Brasília). Se nenhum responder em 50 s,
o app mostra a receita mais parecida do **livro de receitas** (`app/src/data/livro.js`) com um aviso —
essas **não contam** no limite do mês.

**Quando o app começar a faturar, trocar para o Claude** (mais rápido e barato: ~US$ 0,70 a cada 1.000 receitas):

1. Colocar créditos em https://platform.claude.com/settings/billing (a chave `qchef-servidor` já existe).
2. Em `servidor/vps/.env`: `QCHEF_IA=claude` e `ANTHROPIC_API_KEY=` com a chave (está em `servidor/functions/.env.local`).
3. `sh servidor/vps/publicar.sh`

Com o Claude como principal, o Gemini continua de reserva automaticamente.

---

## 4. Acesso e Kiwify

- O acesso é por e-mail: documento `acessos/{email}` no Firestore com `ativo: true` (e `pro: true` para 150 receitas/mês; sem Pro são 20).
- Liberar alguém à mão: Firestore › `acessos` › novo documento com o e-mail como ID e o campo `ativo` (boolean) = `true`.
- Contagem do mês: `usos/{uid}` (gravado só pelo servidor).

**Período de teste sem cobrança:** `QCHEF_ACESSO_LIVRE=1` em `servidor/vps/.env` e `VITE_ACESSO_LIVRE=1` em `app/.env` liberam qualquer conta logada (limite de 20 receitas/mês). Para voltar a exigir a compra, ponha `0` nos dois e publique o servidor e o app.

**Ligar a Kiwify** (pendente):

1. Kiwify › Apps › Webhooks › Criar webhook
   - URL: `https://appnovidades.com.br/api/qchef/kiwify`
   - Eventos: Compra aprovada, Compra reembolsada, Chargeback (e Assinatura cancelada, se virar assinatura)
2. Copiar o token do webhook para `KIWIFY_TOKEN` em `servidor/vps/.env`. Se houver produto Pro, colocar o `product_id` em `KIWIFY_PRODUTO_PRO`.
3. Colocar os links de checkout em `app/.env` (`VITE_LINK_COMPRA`, `VITE_LINK_PRO`) e o WhatsApp de suporte.
4. Publicar o servidor e o app. Usar o botão de teste da Kiwify e conferir `acessos/<email-do-teste>` no Firestore.

Oriente quem compra a **entrar com o mesmo e-mail usado na compra**.

---

## 5. Login com Google no domínio

O `authDomain` do app é `appnovidades.com.br`. O nginx do low_ticket (`low_ticket/deploy/nginx.conf`) repassa
`/__/` para o Firebase certo pela `apiKey` (QChef → `qchef-app`, o resto → Dieta Fácil). Já configurado:

- Firebase › Authentication › Domínios autorizados: `appnovidades.com.br`
- Google Cloud › Credenciais › cliente OAuth Web: origem `https://appnovidades.com.br` e redirecionamento `https://appnovidades.com.br/__/auth/handler`

DNS do domínio: **Registro.br** (registros A e AAAA de `@` e `www` apontando para a VPS).

---

## 6. Onde mudar o conteúdo

| O quê | Arquivo |
|---|---|
| Regras e texto da IA | `servidor/functions/receita.js` (constante `SISTEMA`) |
| Livro de receitas (sem IA) | `app/src/data/livro.js` |
| Fotos (WebP 800×600) e catálogo | `app/public/fotos/` e `app/src/data/fotos.json` |
| Atalhos, aparelhos, filtros, alergias | `app/src/data/opcoes.js` |
| Cores e layout | `app/src/styles.css` |

O banco de imagens original (prompts, fotos em alta e scripts de tratamento) fica em `banco-imagens/`, fora do git.

---

## Alternativas guardadas

- `servidor/functions/` — Firebase Functions (precisa do plano Blaze; não está em uso)
- `servidor/worker/` — Cloudflare Workers (`qchef-api.qchef-worker.workers.dev`), usado no teste local

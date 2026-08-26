# Meu drive

Drive virtual com cadastro aberto: o usuário cria conta, entra e começa a subir
arquivos arrastando para qualquer lugar da tela. Pastas aninhadas, e link
público opcional por arquivo.

Não há página pública: a raiz desvia para `/entrar` quem não tem sessão, e para
`/drive` quem tem. O cadastro fica a um clique, pelo link no formulário de login.

## Stack

- **Next.js 16** (App Router, React 19) + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui**
- **Postgres 17** via `pg` — metadados
- Volume Docker — os bytes dos arquivos
- **argon2id** (`@node-rs/argon2`) para as senhas
- Deploy em container (**Docker Compose**) na Cloudez

## Decisões que valem explicar

### Os arquivos nunca são servidos inline

Um drive guarda os bytes como vieram — diferente de um upload de imagem, que dá
para reprocessar. Se o site devolvesse um `.html` enviado por alguém como
`text/html`, o script dele rodaria no domínio da aplicação, com acesso ao cookie
de sessão de quem abrisse: XSS armazenado.

Por isso `lib/download.ts` responde **sempre** `application/octet-stream` com
`Content-Disposition: attachment`, `X-Content-Type-Options: nosniff` e uma CSP
`default-src 'none'; sandbox` — mesmo quando o tipo real é conhecido.

### O upload não passa por multipart

`POST /api/upload` recebe o arquivo como **corpo cru**, com nome e tipo em
headers codificados. Isso permite gravar em streaming direto no disco, contando
os bytes no caminho e abortando ao estourar o limite. Bufferizar um upload de
50 MB para depois conferir o tamanho gastaria justamente a memória que se quer
limitar — e o servidor tem 1 vCPU e 2 GB.

O cliente usa `XMLHttpRequest` e não `fetch` por um motivo só: apenas ele expõe
progresso de upload.

### Autenticação

Senha em argon2id. A sessão é um token de 256 bits no cookie `httpOnly`; o banco
guarda só o SHA-256 dele, então vazamento de leitura no banco não entrega sessão
utilizável. Login responde a mesma mensagem para senha errada e e-mail
inexistente — distingui-las transformaria o formulário num verificador de quem
tem conta aqui.

### Limites

| | |
|---|---|
| Cota por usuário | 1 GB (`COTA_BYTES` em `lib/drive.ts`) |
| Tamanho por arquivo | 50 MB |

Os 50 MB **não são escolha do código**: é o `upload_maxsize` do nginx da Cloudez.
Requisição maior não chega à aplicação. Para aumentar, mude no painel da Cloudez
e ajuste `TAMANHO_MAXIMO` em `lib/storage.ts`.

## Rodando

### Tudo em container

```bash
docker compose up -d --build
```

### Dev com hot reload

O overlay de dev expõe o Postgres e permite outra porta:

```bash
APP_PORT=3010 POSTGRES_PORT=5433 docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
cp .env.example .env.local && npm install && npm run dev
```

Ajuste `DATABASE_URL` no `.env.local` para a porta que você escolheu.

## Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | Conexão completa — usada só no dev fora de container |
| `PGHOST` / `PGUSER` / `PGDATABASE` | Partes da conexão, usadas quando não há `DATABASE_URL` |
| `PGPASSWORD_FILE` | Caminho do arquivo com a senha (produção) |
| `UPLOAD_DIR` | Onde os arquivos são gravados |
| `SITE_NOME` | Nome da instância no título da aba (default `claudesite01`) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credenciais do container do banco em dev |
| `APP_PORT` / `POSTGRES_PORT` | Portas publicadas no host em dev |

### A senha do Postgres em produção

Não está no repositório, nem no compose, nem em variável de ambiente. Ela fica em
`~/claudesite01.afurlan.org/segredos/pg_password` no servidor — **fora do
diretório da release**, que é recriado a cada deploy — com modo `600`, e é
montada só-leitura em `/run/segredos` nos dois containers.

O `docker-compose.cloudez.yml` aponta `POSTGRES_PASSWORD_FILE` (que a imagem do
Postgres entende nativamente) e `PGPASSWORD_FILE` (que `lib/db.ts` lê). Arquivo em
vez de variável porque variável de ambiente aparece em `docker inspect` e em
qualquer `env` rodado dentro do container.

Para trocar a senha: escreva a nova no arquivo, rode
`ALTER USER mural WITH PASSWORD '…'` no banco, e recrie os containers.

## O que não tem

- **Mover arquivo entre pastas.** Cria, navega, renomeia e exclui — mover ficou fora.
- **Soltar uma pasta inteira** na tela. Só arquivos; a leitura recursiva de
  diretório no drop não foi implementada.
- **Recuperação de senha.** Exigiria servidor de e-mail.
- **Confirmação de e-mail.** Qualquer endereço digitado é aceito.
- **Lixeira.** Excluir apaga na hora, inclusive os bytes no volume.

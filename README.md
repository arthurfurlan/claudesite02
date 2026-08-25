# Mural de recados

Página única onde qualquer pessoa deixa um recado, opcionalmente com uma foto
anexada. Sem login: o autor digita o próprio nome.

## Stack

- **Next.js 16** (App Router, React 19) + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (preset Nova, base Radix)
- **Postgres 17** via `pg`
- **sharp** para reprocessar as imagens enviadas
- Deploy em container (**Docker Compose**)

## Como funciona

Publicar um recado é uma **Server Action** (`app/actions.ts`). Ela valida os
campos com zod, aplica um limite de frequência por IP, processa a foto e grava
no banco — nessa ordem, para que entrada inválida nunca chegue ao disco.

As fotos **não são gravadas como vieram**. `lib/storage.ts` decodifica o arquivo
com sharp, aplica a orientação do EXIF, limita a 1600px de largura, converte
para WebP e descarta todos os metadados. Isso normaliza o tamanho, remove
coordenadas de GPS do EXIF e faz um arquivo que só finge ser imagem falhar no
decode, antes de qualquer escrita.

O arquivo final fica num volume (`/data/uploads`), fora do bundle, e é servido
por `app/api/media/[id]/route.ts`. Essa rota só aceita ids no formato UUID que
nós mesmos geramos, o que fecha a porta para path traversal.

O schema é criado por uma migração idempotente na primeira query
(`lib/db.ts`), e não por um script em `docker-entrypoint-initdb.d` — aquele só
roda com o volume vazio e não sobreviveria ao segundo deploy.

## Rodando

### Tudo em container

```bash
docker compose up -d --build
```

A app sobe em http://localhost:3000. Para usar outra porta: `APP_PORT=3010 docker compose up -d`.

### Dev com hot reload

O Postgres do compose não expõe porta por padrão. O overlay de dev expõe:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
```

Depois:

```bash
cp .env.example .env.local && npm install && npm run dev
```

## Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | Conexão com o Postgres |
| `UPLOAD_DIR` | Onde as fotos processadas são gravadas |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credenciais do container do banco |
| `APP_PORT` | Porta publicada no host |

## Limites conhecidos

- O rate limit é **em memória**: reinicia com o container e não é compartilhado
  entre réplicas. Segura spam casual; para tráfego hostil, use um limite no proxy.
- Sem moderação e sem edição/remoção — qualquer pessoa publica com qualquer nome.
  É a consequência de não ter login, decidida no escopo.
- Sem tema escuro. Os tokens do shadcn já estão no CSS; falta só o `next-themes`
  e um botão de alternância.

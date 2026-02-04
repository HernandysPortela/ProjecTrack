# Deploy no Vercel - Projectrak

Este guia descreve como fazer o deploy da aplicação Projectrak no Vercel.

## Pré-requisitos

- Node.js instalado (v18 ou superior)
- Conta no Vercel (https://vercel.com)
- Conta no Convex com deployment configurado
- Repositório GitHub com o código

## Instalação do Vercel CLI

```bash
npm install -g vercel
```

## Processo de Deploy

### 1. Login no Vercel

```bash
vercel login
```

Siga as instruções para autenticar via navegador.

### 2. Deploy Inicial (Preview)

Na raiz do projeto, execute:

```bash
vercel
```

Este comando irá:
- Detectar automaticamente o framework (Vite)
- Fazer upload do código
- Criar um deployment de preview
- Fornecer uma URL temporária

### 3. Configurar Variáveis de Ambiente

Você pode configurar as variáveis de ambiente de duas formas:

#### Opção A: Via Dashboard do Vercel

1. Acesse https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Adicione as seguintes variáveis:

```
VITE_CONVEX_URL=https://descriptive-salmon-961.convex.cloud
CONVEX_DEPLOYMENT=dev:descriptive-salmon-961
JWT_PRIVATE_KEY=<sua-chave-privada>
JWKS=<seu-jwks>
GMAIL_USER=projectrak3@gmail.com
GMAIL_PASS=<sua-senha>
RESEND_API_KEY=<sua-api-key>
SITE_URL=<url-do-vercel>
VLY_APP_NAME=ProjecTrak
```

#### Opção B: Via CLI

```bash
vercel env add VITE_CONVEX_URL
# Cole o valor quando solicitado
# Repita para cada variável
```

### 4. Deploy de Produção

Após configurar as variáveis de ambiente:

```bash
vercel --prod
```

Este comando irá:
- Fazer build da aplicação
- Criar deployment de produção
- Fornecer a URL final de produção

## Configuração Automática com GitHub

Para habilitar deploys automáticos:

1. No dashboard do Vercel, vá em **Settings** → **Git**
2. Conecte seu repositório GitHub
3. Configure:
   - **Production Branch:** `main`
   - **Preview Deployments:** Habilitado para todas as branches

Agora, cada push para `main` criará um deploy de produção automaticamente.

## Variáveis de Ambiente Necessárias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_CONVEX_URL` | URL do Convex deployment | `https://xxx.convex.cloud` |
| `CONVEX_DEPLOYMENT` | ID do deployment Convex | `dev:xxx` ou `prod:xxx` |
| `JWT_PRIVATE_KEY` | Chave privada JWT | `-----BEGIN PRIVATE KEY-----...` |
| `JWKS` | JSON Web Key Set | `{"keys":[...]}` |
| `GMAIL_USER` | Email para notificações | `email@gmail.com` |
| `GMAIL_PASS` | Senha do email | `senha-app` |
| `RESEND_API_KEY` | API key do Resend | `re_xxx` |
| `SITE_URL` | URL do site em produção | `https://seu-app.vercel.app` |
| `VLY_APP_NAME` | Nome da aplicação | `ProjecTrak` |

> **⚠️ Importante:** Variáveis que começam com `VITE_` são expostas no frontend. Não coloque informações sensíveis nelas.

## Convex: Desenvolvimento vs Produção

### Usando Deployment de Desenvolvimento (Atual)

Se quiser usar o deployment atual (`dev:descriptive-salmon-961`):

```bash
CONVEX_DEPLOYMENT=dev:descriptive-salmon-961
VITE_CONVEX_URL=https://descriptive-salmon-961.convex.cloud
```

### Criando Deployment de Produção (Recomendado)

Para criar um deployment de produção no Convex:

```bash
npx convex deploy --prod
```

Isso criará um novo deployment de produção. Use as credenciais fornecidas nas variáveis de ambiente.

## Atualizar SITE_URL

Após o primeiro deploy, atualize a variável `SITE_URL` com a URL real do Vercel:

```bash
vercel env add SITE_URL production
# Cole a URL fornecida pelo Vercel (ex: https://projectrak.vercel.app)
```

Depois, faça um novo deploy:

```bash
vercel --prod
```

## Verificação Pós-Deploy

1. **Teste a URL de produção** - Acesse a URL fornecida pelo Vercel
2. **Verifique o console** - Abra DevTools e verifique se não há erros
3. **Teste funcionalidades** - Teste login, criação de projetos, etc.
4. **Verifique Convex** - Confirme que a aplicação está conectada ao Convex

## Comandos Úteis

```bash
# Ver lista de deployments
vercel ls

# Ver logs do último deployment
vercel logs

# Remover um deployment
vercel remove [deployment-url]

# Ver informações do projeto
vercel inspect

# Abrir dashboard do projeto
vercel open
```

## Troubleshooting

### Erro: "Module not found"

- Verifique se todas as dependências estão no `package.json`
- Execute `npm install` localmente para verificar

### Erro: "Build failed"

- Teste o build localmente: `npm run build`
- Verifique os logs no dashboard do Vercel

### Erro: "Cannot connect to Convex"

- Verifique se `VITE_CONVEX_URL` está configurado corretamente
- Confirme que o deployment do Convex está ativo

### Erro 404 em rotas

- Verifique se o arquivo `vercel.json` está configurado corretamente
- Confirme que os rewrites estão funcionando

## Domínio Customizado (Opcional)

Para adicionar um domínio customizado:

1. Vá em **Settings** → **Domains**
2. Adicione seu domínio
3. Configure os registros DNS conforme instruído
4. Aguarde propagação (pode levar até 48h)

## Recursos

- [Documentação do Vercel](https://vercel.com/docs)
- [Documentação do Convex](https://docs.convex.dev)
- [Vite + Vercel](https://vercel.com/docs/frameworks/vite)

# 🚀 Guia de Deploy no Render

## Passo 1: Preparar o Repositório Git

```bash
cd projectrak-original
git add .
git commit -m "Deploy para Render"
git push origin main
```

## Passo 2: Criar Conta no Render

1. Acesse https://render.com
2. Faça login com sua conta GitHub
3. Clique em "New +"

## Passo 3: Conectar o Repositório

1. Selecione "Web Service"
2. Conecte seu repositório GitHub
3. Selecione o branch "main" (ou o branch que você usa)

## Passo 4: Configurar Variáveis de Ambiente

Na aba "Environment", adicione:

### Variáveis Necessárias:

1. **VITE_CONVEX_URL**
   - Valor: `https://[seu-deployment].convex.cloud`
   - Obtenha em: Dashboard Convex → Projeto → URL

2. **NODE_ENV**
   - Valor: `production`

## Passo 5: Configurações de Build

- **Build Command**: `pnpm install && pnpm run build`
- **Start Command**: `npm install -g serve && serve -s dist`
- **Node Version**: 20 (recomendado)

## Passo 6: Deploy

1. Clique em "Create Web Service"
2. Aguarde o build completar (5-10 minutos)
3. Acesse seu site em: `https://[seu-app].onrender.com`

## ⚠️ Considerações Importantes

### Backend (Convex)

O Convex já está em produção no endereço:
- **Dashboard**: https://dashboard.convex.dev
- **Deployment**: `dev:accomplished-antelope-290`

### Variáveis de Ambiente

Certifique-se de que:

1. JWT_PRIVATE_KEY está configurado no Convex Dashboard
2. CONVEX_SITE_URL aponta para sua URL do Render
3. Email/Auth estão configurados no Convex

### Monitoramento

- **Render Dashboard**: Monitore logs e métricas
- **Convex Dashboard**: Verifique funções e queries
- **Console do Browser**: Abra DevTools para verificar erros

## Troubleshooting

Se o deploy falhar:

1. Verifique o build log no Render Dashboard
2. Confirme que `dist/index.html` existe localmente
3. Verifique se as variáveis de ambiente estão corretas
4. Verifique a conexão com Convex em Console

## Próximos Passos

- [ ] Configurar domínio customizado no Render
- [ ] Configurar SSL/TLS (automático com Render)
- [ ] Configurar CI/CD para deploys automáticos
- [ ] Monitorar performance e logs

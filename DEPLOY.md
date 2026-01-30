# Guia de Implantação (Deploy) - ProjecTrak

Este guia detalhado auxilia na configuração, instalação e implantação do projeto ProjecTrak. O projeto utiliza **React (Vite)** para o frontend e **Convex** para o backend e banco de dados em tempo real.

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter:

1.  **Node.js**: Versão **18.0.0** ou superior (Recomendado: v20 LTS ou v22)
    *   Verifique com: `node -v`
2.  **Gerenciador de Pacotes**: `npm` (vem com Node) ou `pnpm` (recomendado)
    *   Para instalar pnpm: `npm install -g pnpm`
3.  **Git**: Para clonar o repositório
4.  **Conta Vercel**: Crie uma conta gratuita em [vercel.com](https://vercel.com)
5.  **Conta Convex**: Crie uma conta gratuita em [convex.dev](https://convex.dev)

---

## 🚀 Deploy para Produção (Vercel)

### Passo 1: Preparar o Repositório Git

1.  **Se ainda não tem o código no Git**, inicialize um repositório:
    

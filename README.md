# Elementar

Um cliente Matrix moderno e completo para React Native, com suporte a mensagens, murais, categorias e muito mais.

## 🚀 Recursos

### 💬 Mensagens
- Chat em tempo real com suporte a texto, imagens, vídeos e áudio
- Player de áudio moderno com visualização de forma de onda
- Edição e exclusão de mensagens
- Indicadores de digitação
- Status de entrega de mensagens
- Navegação por swipe entre categorias

### 🖼️ Murais
- Criação de murais (espaços) para compartilhamento de mídia
- Suporte a imagens e vídeos
- Sistema de comentários em posts
- Visualização em grade de posts

### 🏷️ Organização
- Categorias personalizadas para organizar conversas
- Tags de sala customizáveis
- Navegação por swipe entre categorias
- Filtros inteligentes

### 🎨 Interface
- Tema claro e escuro
- Design moderno e responsivo
- Animações suaves
- Componentes otimizados para performance

## 🛠️ Tecnologias

- **React Native** - Framework mobile
- **Expo** - Plataforma de desenvolvimento
- **Matrix JS SDK** - Protocolo de comunicação descentralizado
- **TypeScript** - Tipagem estática
- **Expo Router** - Navegação baseada em arquivos

## 📦 Instalação

```bash
# Clone o repositório
git clone https://github.com/welton89/elementar.git

# Entre no diretório
cd elementar

# Instale as dependências
npm install

# Inicie o projeto
npx expo start
```

## 🔧 Configuração

1. Configure seu servidor Matrix em `app/src/contexts/AuthContext.tsx`
2. Ajuste as configurações de tema em `app/src/contexts/ThemeContext.tsx`

## 📱 Executando

```bash
# Android
npx expo run:android

# iOS
npx expo run:ios

# Web
npx expo start --web
```

## 🏗️ Estrutura do Projeto

```
elementar/
├── app/                    # Código da aplicação
│   ├── (auth)/            # Telas de autenticação
│   ├── (tabs)/            # Telas principais (tabs)
│   ├── room/              # Telas de salas e posts
│   └── src/
│       ├── components/    # Componentes reutilizáveis
│       ├── contexts/      # Contextos React
│       └── types/         # Definições TypeScript
├── assets/                # Recursos estáticos
└── package.json
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## 📄 Licença

Este projeto está sob a licença MIT.

## 👨‍💻 Autor

Desenvolvido por Welton89

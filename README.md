# AutoSnake 3D - PWA

Uma versão 3D autônoma do clássico jogo Snake, desenvolvida como Progressive Web App (PWA).

## Características

- **Movimento Autônomo**: A cobra se move automaticamente usando algoritmo de pathfinding (BFS) para encontrar a comida
- **Gráficos 3D**: Renderizado com Three.js
- **Crescimento Infinito**: A cobra cresce ao comer comida até não haver mais espaço
- **Reinício Automático**: Quando a cobra não consegue mais se mover, o jogo reinicia automaticamente
- **PWA**: Instalável como aplicativo nativo com suporte offline

## Como Usar

1. Abra o arquivo `index.html` em um navegador moderno
2. A cobra começará a se mover automaticamente
3. Observe enquanto ela busca comida e cresce
4. Quando não houver mais espaço, o jogo reinicia automaticamente

## Gerar Ícones

Para gerar os ícones necessários para o PWA:

1. Abra o arquivo `generate-icons.html` no navegador
2. Clique no botão "Generate Icons"
3. Os arquivos `icon-192.png` e `icon-512.png` serão baixados
4. Coloque-os na mesma pasta dos outros arquivos

## Estrutura do Projeto

- `index.html` - Estrutura HTML principal
- `style.css` - Estilos da interface
- `game.js` - Lógica do jogo com Three.js
- `manifest.json` - Manifesto do PWA
- `sw.js` - Service Worker para suporte offline
- `generate-icons.html` - Gerador de ícones

## Tecnologias

- Three.js para renderização 3D
- Service Worker API para PWA
- Algoritmo BFS para pathfinding autônomo
- CSS moderno para interface

## Notas

- O jogo funciona melhor em desktop devido ao tamanho da grade
- Para instalação como PWA, é necessário servir os arquivos via HTTPS (ou localhost)
- Os ícones precisam ser gerados antes da instalação completa como PWA

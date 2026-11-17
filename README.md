# PROTEUS

**Platform for Real-time Observation & Telemetry of Eutrophication in Urban Streams**  
Plataforma de Observação em Tempo Real e Telemetria de Eutrofização em Rios Urbanos.

Desenvolvido no Instituto Federal de Educação, Ciência e Tecnologia de São Paulo (IFSP) — Campus Birigui.

---

## Sobre o Projeto

O **PROTEUS** é um sistema experimental de telemetria hídrica projetado para monitorar a dinâmica físico-química da água em corpos hídricos sob impacto urbano, com aplicação piloto no Rio Tietê (município de Barbosa-SP e reservatórios adjacentes do Baixo Tietê).

A plataforma simula e processa leituras de estações baseadas em microcontroladores ESP32 acoplados a sondas submersas, calculando em tempo real o **Índice de Risco de Eutrofização (IRE)** para identificar precocemente condições propícias à proliferação desordenada de microalgas e cianobactérias.

---

## Modelo Matemático: Índice IRE

O algoritmo do IRE sintetiza os parâmetros físico-químicos em uma pontuação normalizada de 0 a 100, adotando como referência técnica os critérios da **Resolução CONAMA nº 357/2005 para Águas Doces de Classe 2**.

### Formulação Tri-paramétrica

$$IRE = \min\left(100, \, \max\left(0, \, \frac{0.60 \times S_{\text{turb}} + 0.40 \times S_{\text{pH}}}{F_{\text{temp}}}\right)\right)$$

### Parâmetros e Ponderação

| Parâmetro | Unidade | Referência CONAMA Classe 2 | Ponderação no Modelo |
| :--- | :---: | :---: | :---: |
| **Turbidez ($S_{\text{turb}}$)** | NTU | Até 100 NTU | **60%** (peso 0.60) |
| **pH ($S_{\text{pH}}$)** | Adimensional | 6.0 a 9.0 (ideal: 6.5 a 8.0) | **40%** (peso 0.40) |
| **Temperatura ($F_{\text{temp}}$)** | °C | Máxima 30 °C (elevação < 3 °C) | $F_{\text{temp}} = 1.2$ ($T \ge 25^\circ\text{C}$) / $1.0$ ($T < 25^\circ\text{C}$) |

### Faixas de Diagnóstico

- **80 a 100 (Ótimo / Bom):** Parâmetros em pleno equilíbrio e conformidade ambiental.
- **60 a 79 (Atenção):** Pequenas variações de turbidez ou temperatura; nível preventivo.
- **40 a 59 (Alerta):** Desvios significativos que favorecem floração de algas; vigilância reforçada.
- **0 a 39 (Crítico):** Severa degradação físico-química com alto risco para a ictiofauna.

---

## Funcionalidades da Plataforma

A aplicação web é dividida em três módulos interativos principais:

1. **Monitoramento em Tempo Real (`index.html`):**
   - Mapa espacial interativo (Leaflet.js) com seleção de estações no Rio Tietê (`BRB-04 · Barbosa-SP`, `PNP-02 · Penápolis-SP`, `ARÇ-01 · Araçatuba-SP`).
   - Painel flutuante com pontuação do Índice IRE e leitura instantânea de pH, Turbidez e Temperatura.
   - Cenários rápidos de teste (*Água Boa*, *Água Regular*, *Água Crítica*) e simulação contínua em tempo real.
   - Gráfico de tendência temporal (Chart.js) e histórico analítico completo com filtros por período/estação e **exportação para CSV**.
2. **Simulador Físico-Químico (`simulador.html`):**
   - Controles deslizantes interativos para testar diferentes combinações de pH, Turbidez (NTU) e Temperatura (°C).
   - Representação visual dinâmica do comportamento e transparência da água em tempo real.
3. **Metodologia & Modelagem IRE (`metodologia.html`):**
   - Visão geral didática do funcionamento do sistema e detalhamento técnico-regulatório baseado na Resolução CONAMA nº 357/2005.

---

## Estrutura de Diretórios

```text
proteus/
├── assets/                   # Logotipos vetoriais e favicon
├── css/
│   └── style.css             # Estilos globais e design system (Glassmorphism Light)
├── js/
│   ├── shared.js             # Gerenciamento de estado local e navegação
│   ├── ire_engine.js         # Motor matemático de cálculo e diagnóstico do IRE
│   ├── dashboard.js          # Controlador do mapa, gráficos, simulação e histórico CSV
│   └── simulator.js          # Controlador do simulador interativo de parâmetros
├── index.html                # Tela principal de monitoramento espacial em tempo real
├── simulador.html            # Simulador interativo de parâmetros físico-químicos
├── metodologia.html          # Documentação metodológica e modelagem matemática
└── README.md
```

---

## Como Executar

O projeto é 100% estático (HTML5, CSS3/Tailwind CSS e JavaScript ES6+), pronto para hospedagem direta no **GitHub Pages** sem necessidade de servidor backend:

- **Acesso Online:** Basta acessar o link do GitHub Pages do repositório.
- **Execução Local:** Abra o arquivo `index.html` diretamente no navegador ou utilize uma extensão como o *Live Server* no VS Code.

---

## Equipe e Créditos

- **Cauã Cristal Lemes** — Pesquisa & Desenvolvimento
- **João Henrique Servellati Bitencourt Lemos** — Pesquisa & Desenvolvimento
- **Dr. Rogério Pinto Alexandre** — Professor Orientador

**Instituição:** Instituto Federal de Educação, Ciência e Tecnologia de São Paulo (IFSP) — Campus Birigui.

---

## Licença

Projeto acadêmico e de pesquisa científica sob licença MIT.

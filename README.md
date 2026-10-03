# PROTEUS

**Platform for Real-time Observation & Telemetry of Eutrophication in Urban Streams**  
Plataforma de Observação em Tempo Real e Telemetria de Eutrofização em Rios Urbanos.

Desenvolvido no Instituto Federal de Educação, Ciência e Tecnologia de São Paulo (IFSP) — Campus Birigui.

---

## Sobre o Projeto

O **PROTEUS** é um sistema experimental de telemetria hídrica projetado para monitorar a dinâmica físico-química da água em corpos hídricos sob impacto urbano, com aplicação piloto no Rio Tietê (município de Barbosa-SP).

A plataforma utiliza estações baseadas em microcontroladores ESP32 acoplados a sondas submersas para transmitir leituras contínuas diretamente a um servidor central, calculando em tempo real o **Índice de Risco de Eutrofização (IRE)** para identificar precocemente condições propícias à proliferação desordenada de microalgas e cianobactérias.

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

## Arquitetura da Solução

O projeto é estruturado em três camadas independentes:

- **Frontend (`frontend/`):** Interface web responsiva em HTML5, JavaScript ES6+ e Tailwind CSS. Inclui mapas espaciais interativos (Leaflet.js), gráficos de tendência temporal (Chart.js), simulador de parâmetros em tempo real, documentação metodológica e painel restrito de administração.
- **Backend (`backend/`):** API REST construída em Node.js com Express, CORS, autenticação via JWT e conexão com banco de dados relacional.
- **Banco de Dados (`database/`):** Modelo relacional em PostgreSQL para armazenamento de estações de monitoramento, registros históricos de telemetria e controle de usuários.
- **Hardware IoT:** Unidade microcontroladora ESP32 com Wi-Fi integrada a sensor analógico de pH, sensor óptico de turbidez nefelométrica (IR 850 nm) e sensor digital blindado de temperatura Dallas DS18B20.

---

## Estrutura de Diretórios

```text
tietech-v1/
├── backend/                  # Servidor Node.js e rotas REST da API
│   ├── routes/               # Endpoints (/api/estacoes, /api/telemetria, /api/auth)
│   ├── db.js                 # Conexão com PostgreSQL via pool
│   ├── server.js             # Ponto de entrada HTTP e arquivos estáticos
│   └── package.json          # Dependências do servidor
├── database/                 # Scripts SQL de schema e dados iniciais
│   └── schema.sql            # Definição de tabelas e índices
├── frontend/                 # Interface web do usuário
│   ├── assets/               # Vetores, logotipo e favicon
│   ├── css/                  # Estilos globais e tokens de design
│   ├── js/                   # Mecanismo do IRE, dashboard e simulador
│   ├── admin/                # Painel de gestão restrita
│   ├── index.html            # Monitoramento espacial ao vivo
│   ├── simulador.html        # Simulador interativo de parâmetros
│   └── metodologia.html      # Fundamentação técnica e modelo IRE
└── README.md
```

---

## Como Executar Localmente

### Pré-requisitos

- Node.js (versão 18 ou superior)
- PostgreSQL (local ou em nuvem)

### 1. Configurar o Banco de Dados

Crie a base de dados no PostgreSQL e execute o script de criação:

```bash
psql -U postgres -d proteus_db -f database/schema.sql
```

### 2. Configurar Variáveis de Ambiente

Crie o arquivo `backend/.env` com as seguintes credenciais:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui
DB_NAME=proteus_db
JWT_SECRET=chave_secreta_jwt_proteus
```

### 3. Iniciar o Servidor

```bash
cd backend
npm install
npm run dev
```

A plataforma estará acessível em: `http://localhost:3000`

---

## Equipe e Créditos

- **Cauã Cristal Lemes** — Pesquisa & Desenvolvimento
- **João Henrique Servellati Bitencourt Lemos** — Pesquisa & Desenvolvimento
- **Dr. Rogério Pinto Alexandre** — Professor Orientador

**Instituição:** Instituto Federal de Educação, Ciência e Tecnologia de São Paulo (IFSP) — Campus Birigui.

---

## Licença

Projeto acadêmico e de pesquisa científica sob licença MIT.

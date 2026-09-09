# 🔱 P.R.O.T.E.U.S. - API Backend

**Plataforma de Observação em Tempo Real e Telemetria de Eutrofização em Cursos d'Água Urbanos**  
*Backend em Node.js, Express & MariaDB / MySQL*

---

## 📌 Sobre a API

API RESTful para gerenciar as estações de monitoramento de qualidade da água e persistir leituras contínuas de telemetria IoT (pH, Turbidez, Oxigênio Dissolvido, Temperatura e cálculo do Índice de Risco de Eutrofização - IRE).

---

## 🛠️ Tecnologias

- **Node.js** (v26.x)
- **Express.js** (Framework HTTP)
- **mysql2** (Driver com pool de conexões e Promises)
- **CORS** & **dotenv**

---

## 🚀 Como Executar

### 1. Instalar Dependências
```bash
cd backend
npm install
```

### 2. Configurar Variáveis de Ambiente (`.env`)
Edite o arquivo `backend/.env` se a sua senha do MariaDB/MySQL for diferente:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=proteus
```

### 3. Iniciar a API
```bash
# Modo de Produção
npm start

# Modo de Desenvolvimento (Hot reload com nodemon)
npm run dev
```

---

## 📡 Endpoints da API REST

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| **GET** | `/api/health` | Status de operação do servidor API |
| **GET** | `/api/estacoes` | Lista todas as estações com as coordenadas e últimas leituras |
| **GET** | `/api/estacoes/:id` | Busca detalhes de uma estação específica por código (`BRB-04`) ou ID |
| **POST** | `/api/estacoes` | Cadastra uma nova estação de monitoramento |
| **DELETE**| `/api/estacoes/:id` | Exclui uma estação cadastrada |
| **GET** | `/api/telemetria/historico` | Retorna o histórico de leituras (`?estacao_id=BRB-04&limit=50`) |
| **POST** | `/api/telemetria` | Registra nova leitura recebida (ESP32 / Simulador) e calcula o IRE |
| **GET** | `/api/telemetria/resumo` | Estatísticas gerais (total de leituras, média do IRE) |

---

## 🔬 Exemplo de Envio de Telemetria IoT (`POST /api/telemetria`)

```json
{
  "estacao_codigo": "BRB-04",
  "ph": 7.50,
  "turb": 12.00,
  "od": 6.20,
  "temp": 24.00,
  "cenario_tag": "ÁGUA LIMPA - LEITURA ESP32"
}
```

---

## 🎓 Equipe & Créditos

- **Cauã Cristal Lemes** & **João Henrique Servellati Bitencourt Lemos**
- Orientation: **Dr. Rogério Pinto Alexandre**
- **IFSP Campus Birigui**

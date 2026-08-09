# 🔱 P.R.O.T.E.U.S.

**Platform for Real-time Observation & Telemetry of Eutrophication in Urban Streams**  
*Plataforma de Observação em Tempo Real e Telemetria de Eutrofização*

[![Live Demo](https://img.shields.io/badge/Demo-Acessar%20Plataforma-0284c7?style=for-the-badge&logo=github)](https://caualemes.github.io/proteus/)
[![Institution](https://img.shields.io/badge/IFSP-Campus%20Birigui-emerald?style=for-the-badge)](https://bri.ifsp.edu.br/)
[![CONAMA](https://img.shields.io/badge/CONAMA-N%C2%BA%20357%2F2005-purple?style=for-the-badge)](https://www.ibama.gov.br/)

---

## 🌐 Demonstração Online (Live Test)

Acesse a aplicação funcionando em tempo real através do GitHub Pages:  
👉 **[https://caualemes.github.io/proteus/](https://caualemes.github.io/proteus/)**

---

## 📌 Sobre o Projeto

O **P.R.O.T.E.U.S.** é um protótipo de aplicação web interativa desenvolvido como **Trabalho de Conclusão de Curso (TCC)** no **IFSP Campus Birigui**. 

A motivação do projeto nasceu da vivência direta do aluno **Cauã Cristal Lemes** no município de **Barbosa-SP**, afetado recorrentemente pelos impactos socioambientais da **eutrofização (fenômeno da "Água Verde") no Rio Tietê**. O desequilíbrio causado pelo excesso de nutrientes e insolação gera a proliferação acelerada de cianobactérias, levando ao colapso do Oxigênio Dissolvido (anoxia), mortandade de peixes e graves prejuízos para pescadores locais, turismo e saúde pública.

Em parceria com **João Henrique Servellati Bitencourt Lemos** e sob orientação do **Dr. Rogério Pinto Alexandre**, a dupla desenvolveu a plataforma como uma alternativa acessível e de baixo custo para o monitoramento remoto e diagnóstico precoce da qualidade da água.

### 🏛️ Origem do Nome
- **Acrônimo Técnico**: *Platform for Real-time Observation & Telemetry of Eutrophication in Urban Streams*.
- **Mitologia Grega**: Inspirado em **Proteu (Proteus)**, divindade mítica marinha da metamorfose e transformação constante das águas.

---

## ⚙️ Parâmetros Monitorados e Algoritmo IRE

A plataforma calcula continuamente o **Índice de Risco de Eutrofização (IRE)**, uma pontuação de 0 a 100 baseada na Resolução **CONAMA Nº 357/2005 (Classe 2)**:

| Parâmetro | Unidade | Faixa Ideal | Peso no IRE |
| :--- | :---: | :---: | :---: |
| **Turbidez** | NTU | $\le 10\text{ NTU}$ | **40%** ($x0.40$) |
| **Oxigênio Dissolvido (OD)** | mg/L | $\ge 5.0\text{ mg/L}$ | **35%** ($x0.35$) |
| **Potencial Hidrogeniônico (pH)** | - | $6.5 \text{ a } 8.0$ | **25%** ($x0.25$) |
| **Temperatura da Água** | °C | $< 25.0^\circ\text{C}$ | Divisor $F_{temp} = 1.2$ ($\ge 25^\circ\text{C}$) |

### 🧮 Equação do Índice IRE
$$\text{IRE} = \frac{(0.40 \cdot S_{turb}) + (0.35 \cdot S_{OD}) + (0.25 \cdot S_{pH})}{F_{temp}}$$

---

## 🚀 Funcionalidades da Aplicação

1. **📊 Monitoramento ao Vivo (`index.html`)**:
   - Transmissão automática de telemetria IoT simulada a cada 3 segundos.
   - Diagnóstico em tempo real com parecer técnico automatizado.
   - Gráfico de linha temporal dinâmico (Chart.js) acompanhando a evolução do IRE e Oxigênio Dissolvido.
   - Feed de Log de leituras atualizado ao vivo.
   - Botão para pausar ou atualizar a telemetria instantaneamente.

2. **🎛️ Simulador de Cenários (`simulador.html`)**:
   - Laboratório virtual com controles deslizantes (sliders) para ajuste fino manual dos parâmetros.
   - 4 Cenários de Teste Pré-Configurados:
     - 🟢 **Cenário 1 (Água Limpa)**: Condições de equilíbrio ecológico.
     - 🟡 **Cenário 2 (Enxurrada)**: Aumento de turbidez por escoamento superficial.
     - 🟠 **Cenário 3 (Água Verde)**: Floração ativa de algas e pH alcalino elevado ($>8.5$).
     - 🔴 **Cenário 4 (Anoxia)**: Colapso respiratório do oxigênio ($<2.0\text{ mg/L}$).
   - Tabela demonstrativa dos sub-índices em tempo real.

3. **📘 Metodologia & Equações (`metodologia.html`)**:
   - Fundamentação matemática completa e equações de normalização dos sub-índices.
   - Explicação das dinâmicas limnológicas da floração algal no Rio Tietê.

4. **ℹ️ Sobre o Projeto (`sobre.html`)**:
   - História socioambiental no trecho do Baixo Tietê em Barbosa-SP.
   - Apresentação da equipe de desenvolvimento do IFSP Campus Birigui.
   - Espaços reservados para galeria de fotos do rio, protótipo ESP32 e equipe.

---

## 🛠️ Tecnologias Utilizadas

- **Estrutura & Lógica**: HTML5 Semantic, JavaScript ES6+ (Pure Client-side).
- **Estilização**: Tailwind CSS (via CDN) & Custom Vanilla CSS (Dark Theme).
- **Visualização de Dados**: [Chart.js](https://www.chartjs.org/) (Gráficos Temporais).
- **Iconografia**: [Lucide Icons](https://lucide.dev/).

---

## 👥 Equipe & Créditos

- 👨‍💻 **Cauã Cristal Lemes** — Idealizador & Desenvolvedor ([LinkedIn](https://www.linkedin.com/in/caualemes/))
- 👨‍💻 **João Henrique Servellati Bitencourt Lemos** — Idealizador & Desenvolvedor ([LinkedIn](https://www.linkedin.com/in/joaohenriqueser/))
- 🎓 **Dr. Rogério Pinto Alexandre** — Professor Orientador ([LinkedIn](https://www.linkedin.com/in/rogerioalexandre/))

**Instituição**: Instituto Federal de Educação, Ciência e Tecnologia de São Paulo — **IFSP Campus Birigui**

---

## 📄 Licença

Este projeto é desenvolvido para fins acadêmicos e de pesquisa científica. Sinta-se à vontade para contribuir ou utilizar como referência sob a licença MIT.

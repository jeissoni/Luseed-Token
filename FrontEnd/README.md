# VLP Hybrid DAO LLC — Frontend

SPA para interactuar con los contratos de **VLP Hybrid DAO LLC** en Sepolia. Los activos subyacentes están en Colombia; la interfaz muestra montos en **pesos colombianos (COP)** con liquidación on-chain en USDC.

📖 **Guía para usuarios finales:** [GUIA_USUARIO.md](./GUIA_USUARIO.md)

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | React 19 + Vite 6 + TypeScript |
| Blockchain | **viem** (lectura/escritura) |
| Account Abstraction | **permissionless.js** (Pimlico) — preparado, pendiente activar con API key |
| Estilos | Tailwind CSS 3 |
| Routing | React Router 6 |

## Vistas

| Ruta | Descripción |
|------|------------|
| `/inversor/resumen` | **Inversor** — resumen de cartera y estado del fondo |
| `/inversor/invertir` | **Inversor** — nueva inversión en notas |
| `/inversor/cartera` | **Inversor** — inversiones activas, reclamar y redimir |
| `/managers` | **Socios** — compra de tokens de gobernanza (LST) |
| `/gobernanza` | **Gobernanza** — delegar votos, propuestas, votación |
| `/operaciones` | **Operaciones** — panel del operador (solo wallets autorizadas en `.env`) |

## Configuración

```bash
cp .env.example .env
```

Editar `.env` con las direcciones de los contratos desplegados y las API keys:

```
VITE_PIMLICO_API_KEY=...
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...
VITE_PROMISSORY_NOTE_ADDRESS=0x...
VITE_LUSEED_TOKEN_ADDRESS=0x...
VITE_LUSEED_DAO_ADDRESS=0x...
VITE_USDC_ADDRESS=0x...
VITE_USD_TO_COP_RATE=4200
```

`VITE_USD_TO_COP_RATE` define la tasa de referencia USD→COP para mostrar inversiones en pesos. Los contratos siguen operando en USDC.

## Contratos desplegados (Sepolia)

| Contrato | Dirección | Etherscan |
|----------|-----------|-----------|
| MockUSDC | `0x42E6F10410Ed135FED12BE3E9535713f10435209` | [Ver](https://sepolia.etherscan.io/address/0x42E6F10410Ed135FED12BE3E9535713f10435209) |
| LuseedToken | `0x4E0a7b6A9E4cBAa5556C811783a7be47623950b9` | [Ver](https://sepolia.etherscan.io/address/0x4E0a7b6A9E4cBAa5556C811783a7be47623950b9) |
| LuseedDAO | `0x235e2941d66306cEa5b185B7225Acf266B7C79D7` | [Ver](https://sepolia.etherscan.io/address/0x235e2941d66306cEa5b185B7225Acf266B7C79D7) |
| LuseedPromissoryNote | `0xFc1862292E624c38B3211D0Ab07AFe394131619b` | [Ver](https://sepolia.etherscan.io/address/0xFc1862292E624c38B3211D0Ab07AFe394131619b) |
| LuseedInvestment | `0x6900f27EB32bC699639629813c54a7481dA11bB1` | [Ver](https://sepolia.etherscan.io/address/0x6900f27EB32bC699639629813c54a7481dA11bB1) |

## Desarrollo

```bash
cd FrontEnd
npm install --legacy-peer-deps
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Estructura

```
FrontEnd/
├── src/
│   ├── config/
│   │   ├── branding.ts       # Nombre de marca y tasa COP
│   │   ├── client.ts         # viem publicClient + writeContract helper
│   │   └── contracts.ts      # ABIs (human-readable) + direcciones
│   ├── hooks/
│   │   ├── useWallet.ts      # conexión MetaMask
│   │   └── useContractReads.ts # lectura de estado del protocolo y notas
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Card.tsx
│   │   ├── MoneyAmount.tsx
│   │   └── StatusBadge.tsx
│   ├── pages/
│   │   ├── Investor.tsx
│   │   ├── Admin.tsx
│   │   └── Governance.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## Pendiente

- Activar flujo de Account Abstraction con API key de Pimlico
- Listado dinámico de propuestas de gobernanza (evento indexing / subgraph)
- Notificaciones de eventos on-chain (WebSocket / polling mejorado)
- Responsive / mobile optimizations
- Tests E2E

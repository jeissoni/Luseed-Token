# Luseed Energy DAO

Repositorio del DAO de energía Luseed: token de gobernanza (LST), venta de tokens por USDC y gobernanza.

## Contexto (modelo operativo)

- **Estructura legal**: Luseed opera bajo una **LLC**. Los **Managers** (socios) administran la LLC y operan la **DAO**.
- **Inversionistas**: no forman parte de la DAO (gobernanza). Su relación económica se representa en un **contrato/posición de inversión (staking)** administrado por la DAO (ver “Pendiente”).
- **Rampa/infra**: los inversionistas compran/operan USDC a través de **4 Rivers** (backend + KYC). En el FE se valida el usuario contra una cuenta de 4 Rivers.
- **Distribución de retornos**: idealmente **automática**: el contrato de inversión dispersa USDC a la cuenta/wallet del usuario (visible en el FE; subyacente 4 Rivers) según tasas/retornos pactados (promissory note).
- **Cierre del proyecto**: al finalizar la vida útil o liquidar capital, se liquida el contrato de inversión y se retorna USDC a los inversionistas.

## Token (LST) y participación

- **Transferibilidad**: idealmente transferible **entre usuarios con KYC** (cuentas autorizadas).
- **Participación**: un token representa una fracción proporcional del total de activos/posición. Ejemplo: si hay \(1{,}000{,}000\) dividido en \(1{,}000\) tokens, cada token representa \(1/1000\) del total.
- **Burn / fin de vida**: el diseño actual prioriza **liquidación y retorno en USDC** vía el contrato de inversión. La quema/burn del token de gobernanza no es parte del flujo económico principal; puede definirse como política adicional si aplica.

## Gobernanza (on-chain)

- **Votos vinculantes**: para los Managers de la DAO, la intención es que las decisiones sean **vinculantes** (ejecutan acciones/cambios en contratos cuando se aprueban propuestas).
- **Parámetros típicos a votar**:
  - Managing fees, carried interest.
  - Negociación de comisiones y fees de operación.
  - Revisión de desempeño de las plantas.
  - Acciones ante incumplimientos contractuales.

## Contratos

| Contrato            | Descripción |
|---------------------|-------------|
| **LuseedToken**    | ERC20 LST con votos (ERC20Votes), permit (ERC20Permit) y transferencias solo entre cuentas autorizadas. Supply inicial: 1M LST. |
| **LuseedInvestment**| Venta de LST por USDC: 10 000 USDC = 1 000 LST. Tope de venta 100 000 LST. USDC va a tesorería; owner puede retirar LST pendientes. |
| **LuseedDAO**       | Gobernador (Governor) basado en LST (ERC20Votes): propuestas, votación y ejecución on-chain. |

## Implementado

- **LuseedToken (LST)**
  - Supply inicial 1M tokens (18 decimales), minteado al owner en el deploy.
  - Transferencias solo entre direcciones autorizadas (`setAuthorized` por owner). Esto modela “solo KYC”.
  - ERC20Votes (delegación, votos pasados), ERC20Permit, Ownable.
- **LuseedInvestment**
  - Compra de LST con USDC (tasa fija; tope en tokens).
  - Tesorería configurable; USDC de cada compra va directo a tesorería.
  - ReentrancyGuard y patrón checks-effects-interactions.
  - Owner: `setTreasury`, `withdrawUsdc`, `withdrawLst` (LST pendientes de vender).
- **LuseedDAO**
  - Governor + Settings + QuorumFraction + CountingSimple usando LST (ERC20Votes) como fuente de votos.
- **Tests**
  - Suite de pruebas unitarias para:
    - `LuseedInvestment` (cobertura 100% del contrato).
    - `LuseedToken` (cobertura 100% del contrato).
    - `LuseedDAO` (flujo básico: propose → vote → execute, y casos de threshold/quorum).
- **Tooling**
  - Foundry (Forge), OpenZeppelin Contracts v5.

## Pendiente

- [ ] **Scripts de deploy**: script(s) Forge para desplegar LuseedToken, LuseedInvestment (y en el futuro LuseedDAO) en testnet/mainnet.
- [ ] **Contrato de inversión / staking (promissory note)**: contrato que represente la inversión del usuario y disperse rendimientos en USDC (idealmente automático por periodos).
- [ ] **Cascada de pagos (Waterfall)**: ejecución automática de dispersión de USDC y lógica de retornos/periodicidad (bimestral, según el producto).
- [ ] **Integración 4 Rivers (backend/FE)**: KYC, cuentas autorizadas, y flujo de depósitos/retiros hacia cuentas locales/extranjeras.
- [ ] **Mercado secundario / liquidez**: mecanismo operativo donde el inversionista ofrece sus tokens a la DAO; la DAO administra recompra/colocación (emisión en secundario o búsqueda de nuevos inversionistas) para dar liquidez y ajustar su participación.
- [ ] **Auditoría / revisión**: revisión de seguridad antes de mainnet (opcional pero recomendado).
- [ ] **Documentación**: documentación de usuario o de integración (frontend, parámetros de red, direcciones).

## Uso

### Requisitos

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (Forge, Cast, Anvil).

### Build

```bash
forge build
```

### Tests

```bash
forge test
```

Solo tests de LuseedInvestment:

```bash
forge test --match-path test/LuseedInvestment.t.sol
```

Solo tests de LuseedToken:

```bash
forge test --match-path test/LuseedToken.t.sol
```

Solo tests de LuseedDAO (governor):

```bash
forge test --match-path test/LuseedDAO.t.sol
```

### Cobertura

```bash
forge coverage --match-path test/LuseedInvestment.t.sol
```

Cobertura del token:

```bash
forge coverage --match-path test/LuseedToken.t.sol
```

Cobertura del governor:

```bash
forge coverage --match-path test/LuseedDAO.t.sol
```

### Formato

```bash
forge fmt
```

## Estructura

```
src/
  LuseedToken.sol      # Token LST
  LuseedInvestment.sol # Venta LST/USDC
  LuseedDAO.sol        # Governor (gobernanza)
test/
  LuseedInvestment.t.sol
  LuseedToken.t.sol
  LuseedDAO.t.sol
script/                # (pendiente scripts de deploy)
lib/
  forge-std
  openzeppelin-contracts
```

## Licencia

MIT (ver cabeceras en los contratos).

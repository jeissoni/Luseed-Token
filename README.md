# Luseed Energy DAO

Repositorio del DAO de energía Luseed: token de gobernanza (LST), venta de tokens por USDC y gobernanza.

## Contratos

| Contrato            | Descripción |
|---------------------|-------------|
| **LuseedToken**    | ERC20 LST con votos (ERC20Votes), permit (ERC20Permit) y transferencias solo entre cuentas autorizadas. Supply inicial: 1M LST. |
| **LuseedInvestment**| Venta de LST por USDC: 10 000 USDC = 1 000 LST. Tope de venta 100 000 LST. USDC va a tesorería; owner puede retirar LST pendientes. |
| **LuseedDAO**       | *(pendiente)* Gobernanza del DAO. |

## Implementado

- **LuseedToken (LST)**
  - Supply inicial 1M tokens (18 decimales), minteado al owner en el deploy.
  - Transferencias solo entre direcciones autorizadas (`setAuthorized` por owner).
  - ERC20Votes (delegación, votos pasados), ERC20Permit, Ownable.
- **LuseedInvestment**
  - Compra de LST con USDC (tasa fija; tope en tokens).
  - Tesorería configurable; USDC de cada compra va directo a tesorería.
  - ReentrancyGuard y patrón checks-effects-interactions.
  - Owner: `setTreasury`, `withdrawUsdc`, `withdrawLst` (LST pendientes de vender).
- **Tests**
  - Suite de pruebas unitarias para `LuseedInvestment` (20 tests, cobertura 100% del contrato).
- **Tooling**
  - Foundry (Forge), OpenZeppelin Contracts v5.

## Pendiente

- [ ] **LuseedDAO**: diseño e implementación del contrato de gobernanza (propuestas, votación con LST).
- [ ] **Scripts de deploy**: script(s) Forge para desplegar LuseedToken, LuseedInvestment (y en el futuro LuseedDAO) en testnet/mainnet.
- [ ] **Tests LuseedToken**: pruebas unitarias propias para `LuseedToken` (autorizaciones, transferencias, delegación).
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

### Cobertura

```bash
forge coverage --match-path test/LuseedInvestment.t.sol
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
  LuseedDAO.sol        # (vacío, pendiente)
test/
  LuseedInvestment.t.sol
script/                # (pendiente scripts de deploy)
lib/
  forge-std
  openzeppelin-contracts
```

## Licencia

MIT (ver cabeceras en los contratos).

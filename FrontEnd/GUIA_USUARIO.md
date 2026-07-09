# Guía de usuario — VLP Hybrid DAO LLC

Esta guía explica **paso a paso** cómo usar la aplicación web de **VLP Hybrid DAO LLC** para invertir, participar como socio o administrar el protocolo.

**URL pública (testnet):** [https://jeissoni.github.io/Luseed-Token/](https://jeissoni.github.io/Luseed-Token/)

---

## ¿Qué es esta aplicación?

Es el portal web para interactuar con los contratos del fondo. Los **activos subyacentes están en Colombia**, por eso los montos se muestran en **pesos colombianos (COP)**. La liquidación on-chain se hace en **USDC**.

Actualmente la app está conectada a la red de prueba **Ethereum Sepolia**. No uses dinero real de mainnet hasta que el proyecto migre a producción.

---

## Paso a paso — Inicio rápido (todos los usuarios)

### Paso 1: Instala una wallet

1. Descarga e instala **MetaMask**: [https://metamask.io](https://metamask.io)
2. Crea o importa tu wallet.
3. **Nunca** compartas tu frase semilla ni tu clave privada.

### Paso 2: Configura la red Sepolia

1. Abre MetaMask.
2. Haz clic en el **selector de redes** (arriba).
3. Elige **Sepolia** (o agrégala como red de prueba si no aparece).

### Paso 3: Abre la aplicación

1. Entra a la URL oficial del proyecto.
2. Verás la pantalla de bienvenida o serás redirigido según tu rol.

### Paso 4: Conecta tu wallet

1. Haz clic en **Conectar wallet** (esquina superior derecha).
2. Elige **MetaMask**.
3. Aprueba la conexión en el popup.
4. Verás tu dirección abreviada (ej. `0x9A8D...6d4a`).

> **Importante:** MetaMask debe estar en **Sepolia** antes de firmar cualquier transacción.

### Paso 5: La app detecta tu rol

Después de conectar, la aplicación verifica automáticamente qué permisos tiene tu wallet:

| Rol | Cómo se detecta | Menú que verás |
|-----|-----------------|----------------|
| **Inversor** | Estás en la whitelist del contrato de notas **o** tienes inversiones activas | **Inversiones** |
| **Socio** | Tu wallet está autorizada (KYC) en el token LST | **Socios** y **Gobernanza** |
| **Operador** | Tu wallet está configurada como operador del protocolo | **Operaciones** |

- Si tienes **varios roles**, verás todos los menús correspondientes y etiquetas con tus roles (ej. *INVERSOR*, *SOCIO*).
- Si **no tienes ningún rol**, verás la página **Sin acceso** con instrucciones para solicitar KYC.
- Al entrar a la raíz (`/`), la app te redirige al portal de tu rol principal.

### Paso 6: Obtén USDC de prueba

En **Sepolia** el USDC es un **MockUSDC** (token de prueba sin valor real). Cualquier wallet puede imprimir tokens.

1. Conecta tu wallet.
2. En **Inversiones** o en **Sin acceso**, busca el banner **USDC de prueba**.
3. Haz clic en **Obtener 100.000 USDC**.
4. Confirma la transacción en MetaMask.
5. El saldo aparece de inmediato en el banner.

> Si el botón falla, el MockUSDC desplegado puede ser la versión antigua (solo owner). Redespliega con `make deploy-usdc` y actualiza `VITE_USDC_ADDRESS` en el frontend.

### Paso 7: Completa el KYC (si aún no tienes rol)

Contacta al operador del fondo y envía tu dirección de wallet (`0x...`):

- Para **invertir** → whitelist en el contrato de notas.
- Para ser **socio** → autorización KYC en el token LST.
- Para **operar el protocolo** → solo el equipo técnico configura wallets de operador.

Cuando te autoricen, **recarga la página** o espera unos segundos: los permisos se actualizan solos.

---

## Paso a paso — Inversor

### Requisitos previos

- [ ] Wallet conectada en Sepolia
- [ ] Rol **Inversor** activo (whitelist o inversiones previas)
- [ ] USDC de prueba en tu wallet
- [ ] Ventana de inversión **abierta** (badge verde)

### A. Ver tu resumen

1. En el menú superior, haz clic en **Inversiones**.
2. Abre la pestaña **Resumen** (`/inversor/resumen`).
3. Revisa:
   - Tu saldo disponible (COP)
   - Capital invertido y rendimiento pendiente
   - Número de inversiones activas
   - Tasa del fondo, plazo y total invertido
   - Indicador **Ventana abierta** / **Ventana cerrada**

### B. Hacer una nueva inversión

1. Ve a la pestaña **Invertir** (`/inversor/invertir`).
2. Confirma que la ventana esté **abierta**.
3. Ingresa el monto en **COP** (respeta el mínimo indicado).
4. Haz clic en **Invertir**.
5. En MetaMask:
   - **Paso 1:** Aprueba el uso de USDC → **Aprobar**
   - **Paso 2:** Confirma la inversión → **Confirmar**
6. Espera a que la transacción se confirme en Sepolia.
7. Ve a **Mis inversiones** para ver tu nueva nota.

Cada inversión genera una **nota digital** (posición única con un número de ID).

### C. Gestionar tus inversiones

1. Ve a la pestaña **Mis inversiones** (`/inversor/cartera`).
2. Para cada inversión verás:

   | Campo | Significado |
   |-------|-------------|
   | **Capital** | Monto principal invertido |
   | **Rendimiento pendiente** | Intereses acumulados que puedes reclamar |
   | **Vencimiento** | Fecha en que termina el plazo |

3. **Reclamar rendimiento:**
   - Haz clic en **Reclamar rendimiento**
   - Confirma en MetaMask
   - Los USDC llegan a tu wallet

4. **Redimir capital** (solo cuando la inversión está **vencida**):
   - Haz clic en **Redimir capital**
   - Confirma en MetaMask
   - Recuperas el principal en USDC

### D. (Opcional) Transferir una inversión

1. En **Mis inversiones**, abre la sección **Avanzado: transferir una inversión a otra wallet**.
2. Ingresa el **número de inversión**, la **wallet destino** (debe tener KYC) y el **monto**.
3. Confirma en MetaMask.

---

## Paso a paso — Socio / Manager

### Requisitos previos

- [ ] Wallet conectada en Sepolia
- [ ] Rol **Socio** activo (autorizado en token LST)
- [ ] USDC de prueba si vas a comprar LST

### A. Comprar tokens de gobernanza (LST)

1. En el menú superior, haz clic en **Socios** (`/managers`).
2. Verifica que **Estado KYC** diga **Autorizado**.
3. Revisa el **cupo restante** de LST disponible.
4. Ingresa el monto en **COP**.
5. Haz clic en **Comprar LST**.
6. En MetaMask:
   - Aprueba USDC
   - Confirma la compra
7. Al terminar, tus tokens LST quedan en tu wallet.

Relación de referencia: **10.000 USDC ≈ 1.000 LST** (sujeto al cupo del contrato).

### B. Participar en gobernanza

1. En el menú superior, haz clic en **Gobernanza** (`/gobernanza`).
2. Haz clic en **Actualizar** para ver tu **Saldo LST** y **Poder de voto**.

#### Delegar votos (antes de votar o proponer)

1. En el campo de delegación, escribe una dirección **o déjalo vacío** para delegarte a ti mismo.
2. Haz clic en **Delegar**.
3. Confirma en MetaMask.

> Se requieren al menos **1.000 LST** delegados para crear propuestas.

#### Crear una propuesta

1. Completa los campos de la propuesta (contrato destino, descripción, etc.).
2. Haz clic en **Crear propuesta**.
3. Confirma en MetaMask.
4. **Guarda el ID de propuesta** desde [Sepolia Etherscan](https://sepolia.etherscan.io).

#### Votar en una propuesta

1. Espera a que la propuesta esté en estado **Activa**.
2. Ingresa el **ID de propuesta**.
3. Elige tu voto (A favor / En contra / Abstención).
4. Haz clic en **Votar** y confirma en MetaMask.

#### Ejecutar una propuesta aprobada

1. Verifica que la propuesta esté **Aprobada** o **Succeeded**.
2. Ingresa el **ID de propuesta**.
3. Haz clic en **Ejecutar** y confirma en MetaMask.

#### Consultar estado de una propuesta

1. En **Consultar estado de propuesta**, ingresa el ID.
2. Verás si está Pendiente, Activa, Aprobada, Ejecutada, etc.

---

## Paso a paso — Operador

### Requisitos previos

- [ ] Wallet conectada en Sepolia
- [ ] Rol **Operador** activo (wallet configurada por el equipo técnico)

### A. Acceder al panel

1. En el menú superior, haz clic en **Operaciones** (`/operaciones`).
2. Si no ves este menú, tu wallet no está autorizada como operador.

### B. Gestionar la ventana de inversión

1. En el panel de operaciones, localiza el control de **ventana de inversión**.
2. Haz clic en **Abrir** o **Cerrar** según corresponda.
3. Confirma en MetaMask.

### C. Ajustar parámetros del fondo

1. **Tasa de interés:** ingresa la nueva tasa (bps) y la fecha efectiva → confirma.
2. **Plazo:** ingresa la nueva duración en días → confirma.

### D. Acreditar USDC a otra wallet (opcional)

Los usuarios ya pueden imprimir USDC solos. Si necesitas acreditar a otra dirección:

1. En **Acreditar USDC de prueba**, ingresa la wallet destino.
2. Define el monto y confirma en MetaMask.

### E. Gestionar lista blanca KYC (inversores)

1. Ingresa la dirección de wallet del inversor.
2. Elige **Agregar** o **Remover**.
3. Haz clic en el botón correspondiente y confirma en MetaMask.

### F. Fondear pagos de rendimientos

1. Ingresa el monto en COP a depositar.
2. Haz clic en **Depositar fondos para rendimientos**.
3. En MetaMask: aprueba USDC y confirma el depósito.

### G. Retirar fondos excedentes

1. Ingresa la dirección destino y el monto.
2. Haz clic en **Retirar** y confirma en MetaMask.

---

## Montos en COP vs USDC

| Lo que ves | Lo que ocurre on-chain |
|------------|------------------------|
| Montos en **COP** en pantalla | Conversión de referencia para usuarios en Colombia |
| Liquidación real | **USDC** en Sepolia |
| Tasa usada | Configurada en el despliegue (ej. 1 USD = 4.200 COP) |

La tasa es **referencial** para la interfaz; no es la TRM en tiempo real del mercado.

---

## Flujos resumidos

### Inversor nuevo

```
1. Instalar MetaMask → Red Sepolia
2. Abrir la app → Conectar wallet
3. Completar KYC → operador agrega tu wallet a whitelist
4. Obtener USDC de prueba
5. Inversiones → Invertir → ingresar COP → confirmar en MetaMask
6. Inversiones → Mis inversiones → reclamar rendimientos
7. Al vencimiento → Redimir capital
```

### Socio nuevo

```
1. Instalar MetaMask → Red Sepolia
2. Abrir la app → Conectar wallet
3. Solicitar KYC de socio → operador autoriza en token LST
4. Socios → Comprar LST → confirmar en MetaMask
5. Gobernanza → Delegar votos → Votar / Proponer
```

### Operador

```
1. Wallet configurada como operador
2. Operaciones → Abrir ventana de inversión
3. Operaciones → Agregar inversores/socio a whitelist
4. Operaciones → Depositar fondos para rendimientos
5. Operaciones → Ajustar tasa y plazo cuando corresponda
```

---

## Problemas frecuentes

| Problema | Qué hacer |
|----------|-----------|
| MetaMask no aparece | Instala la extensión y recarga la página |
| Transacción falla por red | Cambia MetaMask a **Sepolia** |
| Página **Sin acceso** | Tu wallet no tiene rol; contacta al operador para KYC |
| **Acceso restringido** en un portal | No tienes el rol necesario para esa sección |
| “No autorizado” / KYC | Pide al operador que agregue tu wallet a la whitelist |
| Ventana cerrada | No se aceptan inversiones hasta que el operador la abra |
| Saldo USDC insuficiente | Usa **Obtener USDC de prueba** en el banner de Inversiones |
| Error al imprimir USDC | Redespliega MockUSDC y actualiza `VITE_USDC_ADDRESS` |
| No veo “Operaciones” | Es normal; solo operadores autorizados la ven |
| No veo “Inversiones” ni “Socios” | Tu wallet aún no tiene roles asignados |
| Error al votar | La propuesta debe estar en estado **Activa** y dentro del plazo |
| Monto mínimo | Respeta el mínimo mostrado en el formulario de invertir |
| Los menús no cambian tras KYC | Recarga la página o espera ~30 segundos |

---

## Seguridad — buenas prácticas

- Verifica que la URL sea la oficial del proyecto.
- Revisa cada transacción en MetaMask antes de confirmar.
- No compartas tu **frase semilla** ni tu clave privada con nadie.
- En testnet (Sepolia) los fondos son de prueba; en mainnet serían reales.

---

## Soporte

Para KYC, autorización de wallet, USDC de prueba o dudas sobre el fondo, contacta al equipo operador de **VLP Hybrid DAO LLC**.

Para incidencias técnicas del contrato o la interfaz, reporta al repositorio del proyecto en GitHub.

---

## Glosario breve

| Término | Significado |
|---------|-------------|
| **Wallet** | Billetera digital (ej. MetaMask) con tu dirección `0x...` |
| **USDC** | Stablecoin usada para invertir y cobrar rendimientos |
| **COP** | Pesos colombianos (solo visualización en la app) |
| **LST** | Token de gobernanza para socios del DAO |
| **Nota / Inversión #** | Tu posición individual en el fondo |
| **Rendimiento** | Intereses generados sobre tu capital |
| **DAO** | Organización descentralizada; decisiones por votación |
| **KYC** | Verificación de identidad; requisito para invertir o ser socio |
| **Whitelist** | Lista blanca de wallets autorizadas en el contrato |
| **Sepolia** | Red de prueba de Ethereum (sin dinero real) |

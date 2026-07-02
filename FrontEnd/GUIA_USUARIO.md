# Guía de usuario — VLP Hybrid DAO LLC

Esta guía explica cómo usar la aplicación web de **VLP Hybrid DAO LLC** para invertir, participar como socio o administrar el protocolo.

**URL pública (testnet):** [https://jeissoni.github.io/Luseed-Token/inversor/resumen](https://jeissoni.github.io/Luseed-Token/inversor/resumen)

---

## ¿Qué es esta aplicación?

Es el portal web para interactuar con los contratos del fondo. Los **activos subyacentes están en Colombia**, por eso los montos se muestran en **pesos colombianos (COP)**. La liquidación on-chain se hace en **USDC** (moneda estable, equivalente aproximado al dólar).

Actualmente la app está conectada a la red de prueba **Ethereum Sepolia**. No uses dinero real de mainnet hasta que el proyecto migre a producción.

---

## Antes de empezar

### 1. Instala una wallet

Se recomienda **MetaMask** (extensión de navegador o app móvil):

- [https://metamask.io](https://metamask.io)

### 2. Configura la red Sepolia

En MetaMask:

1. Abre el selector de redes.
2. Activa **Sepolia** (o agrégala como red de prueba si no aparece).

### 3. Ten USDC de prueba en Sepolia

Para invertir o comprar tokens necesitas **USDC en Sepolia** en tu wallet. En testnet ese USDC es un token de prueba (no tiene valor real). El operador del protocolo o un faucet de desarrollo pueden proporcionártelo.

### 4. KYC (verificación de identidad)

Para **invertir** y para **recibir tokens de gobernanza (LST)**, tu dirección de wallet debe estar en la **lista blanca (whitelist)** del contrato. Si no estás autorizado, verás “No autorizado” o la transacción fallará. Contacta al operador del fondo para completar el KYC.

---

## Conectar tu wallet

1. Abre la aplicación en el navegador.
2. Haz clic en **Conectar wallet** (esquina superior derecha).
3. Elige MetaMask y aprueba la conexión.
4. Verás tu dirección abreviada (ej. `0x9A8D...6d4a`).
5. Para salir, usa **Desconectar**.

> **Importante:** MetaMask debe estar en la red **Sepolia** antes de firmar transacciones.

---

## ¿Qué tipo de usuario eres?

La aplicación tiene tres portales según tu rol:

| Rol | Menú | Para quién |
|-----|------|------------|
| **Inversor** | Inversiones | Personas que depositan en el fondo y reciben rendimientos |
| **Socio / Manager** | Socios + Gobernanza | Socios con tokens LST que participan en decisiones del DAO |
| **Operador** | Operaciones | Equipo autorizado que administra el protocolo on-chain |

La mayoría de usuarios solo necesitan el portal **Inversiones**.

---

## Portal del inversor (Inversiones)

Menú superior: **Inversiones**. Tres pestañas internas:

### Resumen (`/inversor/resumen`)

Vista general sin necesidad de operar:

- Tu saldo disponible (en COP).
- Capital invertido y rendimiento pendiente.
- Número de inversiones activas.
- Tasa del fondo, plazo y total invertido en el protocolo.
- Indicador **Ventana abierta** / **Ventana cerrada** (si se aceptan nuevas inversiones).

### Invertir (`/inversor/invertir`)

Pasos para una nueva inversión:

1. Conecta tu wallet.
2. Confirma que la ventana esté **abierta** (badge verde arriba).
3. Ve a la pestaña **Invertir**.
4. Ingresa el monto en **COP** (respeta el mínimo indicado).
5. Clic en **Invertir**.
6. En MetaMask:
   - Primero aprueba el uso de USDC (**Aprobar**).
   - Luego confirma la inversión (**Confirmar**).
7. Al terminar, revisa tu inversión en **Mis inversiones**.

Cada inversión genera una **nota digital** (posición única identificada por un número).

### Mis inversiones (`/inversor/cartera`)

Aquí ves cada inversión con:

| Campo | Significado |
|-------|-------------|
| **Capital** | Monto principal invertido |
| **Rendimiento pendiente** | Intereses acumulados que puedes reclamar |
| **Vencimiento** | Fecha en que termina el plazo |

**Acciones disponibles:**

- **Reclamar rendimiento** — cobra los intereses acumulados a tu wallet (en USDC).
- **Redimir capital** — solo cuando la inversión está **vencida**; devuelve el principal.

#### Avanzado: transferir una inversión

Al final de la pestaña hay una sección colapsable **“Avanzado: transferir una inversión a otra wallet”**. Úsala solo si debes ceder tu posición a otra dirección autorizada (KYC). Necesitas el número de inversión, la wallet destino y el monto.

---

## Portal de socios (Socios)

Menú: **Socios** → `/managers`

Para **managers y socios** que compran **tokens de gobernanza (LST)**, no para el inversor típico.

1. Conecta tu wallet.
2. Verifica que **Estado KYC** sea **Autorizado**.
3. Revisa el **cupo restante** de LST disponible.
4. Ingresa el monto en COP y haz clic en **Comprar LST**.
5. Aprueba USDC y confirma la compra en MetaMask.

Relación de referencia: **10.000 USDC ≈ 1.000 LST** (sujeto al cupo del contrato).

Desde aquí puedes ir a **Gobernanza** con el enlace superior.

---

## Gobernanza (`/gobernanza`)

Para socios con tokens **LST** que participan en el **DAO**.

### Tu poder de voto

- **Saldo LST** — tokens que tienes.
- **Poder de voto (delegado)** — votos efectivos (debes delegar para votar).

Clic en **Actualizar** para refrescar los datos.

### Delegar votos

Antes de votar o proponer, delega tus votos (a ti mismo o a otra dirección):

1. Escribe la dirección (o déjala vacía para delegarte a ti mismo).
2. Clic en **Delegar** y confirma en MetaMask.

Se requieren al menos **1.000 LST** delegados para crear propuestas.

### Crear, votar y ejecutar propuestas

Flujo típico del DAO:

1. **Crear propuesta** — define acción on-chain (ej. abrir ventana de inversión).
2. Esperar el periodo de votación (varios días en Sepolia).
3. **Votar** — necesitas el **ID de propuesta** (lo obtienes del explorador de bloques o del historial de transacciones).
4. Si se aprueba, **Ejecutar propuesta** para aplicar el cambio.

> En esta versión debes ingresar el ID de propuesta manualmente. Guárdalo al crear la propuesta desde el explorador [Sepolia Etherscan](https://sepolia.etherscan.io).

### Consultar estado

En **Consultar estado de propuesta** ingresa el ID y verás si está Pendiente, Activa, Aprobada, Ejecutada, etc.

---

## Portal de operaciones (`/operaciones`)

Solo visible si tu wallet está **autorizada como operador**. No es para inversores ni socios generales.

Funciones principales:

- Abrir o cerrar la **ventana de inversión**.
- Cambiar **tasa de interés** y **plazo** de nuevas notas.
- Gestionar **lista blanca KYC**.
- Depositar fondos para pagar rendimientos.
- Retirar fondos excedentes del contrato.

---

## Montos en COP vs USDC

| Lo que ves | Lo que ocurre on-chain |
|------------|------------------------|
| Montos en **COP** en pantalla | Conversión de referencia para usuarios en Colombia |
| Liquidación real | **USDC** en Sepolia |
| Tasa usada | Configurada en el despliegue (ej. 1 USD = 4.200 COP) |

La tasa es **referencial** para la interfaz; no es la TRM en tiempo real del mercado.

---

## Flujo resumido para un inversor nuevo

```
1. Instalar MetaMask → Red Sepolia
2. Obtener USDC de prueba + completar KYC
3. Conectar wallet en la app
4. Inversiones → Invertir → ingresar COP → confirmar en MetaMask
5. Inversiones → Mis inversiones → reclamar rendimientos cuando haya
6. Al vencimiento → Redimir capital
```

---

## Problemas frecuentes

| Problema | Qué hacer |
|----------|-----------|
| MetaMask no aparece | Instala la extensión y recarga la página |
| Transacción falla por red | Cambia MetaMask a **Sepolia** |
| “No autorizado” / KYC | Pide al operador que agregue tu wallet a la whitelist |
| Ventana cerrada | No se aceptan inversiones hasta que el DAO/operador la abra |
| Saldo USDC insuficiente | Necesitas más USDC de prueba en Sepolia |
| No veo “Operaciones” | Es normal; solo operadores autorizados la ven |
| Error al votar | La propuesta debe estar en estado **Activa** y dentro del plazo de votación |
| Monto mínimo | Respeta el mínimo mostrado en el formulario de invertir |

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
| **Sepolia** | Red de prueba de Ethereum (sin dinero real) |

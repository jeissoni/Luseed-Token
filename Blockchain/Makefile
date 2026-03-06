-include .env

# ─── Variables ───────────────────────────────────────────────────────
RPC          := $(BLOCKCHAIN_RPC_URL)
PK           := $(BLOCKCHAIN_PRIVATE_KEY)
DEPLOYER     := $(DEPLOYER_ADDRESS)
USDC         := $(USDC_ADDRESS)
TREASURY     := $(TREASURY_ADDRESS)
CHAIN_ID     := $(BLOCKCHAIN_CHAIN_ID)
ETHERSCAN    := $(ETHERSCAN_API_KEY)

FORGE_FLAGS  := --rpc-url $(RPC) -vvv
VERIFY_FLAGS := --chain $(CHAIN_ID) --etherscan-api-key $(ETHERSCAN)

# Si hay API key, agregar --verify y --etherscan-api-key al deploy
ifneq ($(ETHERSCAN),)
  BROADCAST_FLAGS := --broadcast --slow --verify --etherscan-api-key $(ETHERSCAN)
else
  BROADCAST_FLAGS := --broadcast --slow
endif
SCRIPT_DIR   := script

# Variables opcionales con defaults
VOTING_DELAY       ?= 86400
VOTING_PERIOD      ?= 604800
PROPOSAL_THRESHOLD ?= 1000000000000000000000
QUORUM_FRACTION    ?= 4
TERM_DURATION      ?= 31536000
INITIAL_RATE_BPS   ?= 800

MOCK_USDC_MINT ?= 10000000000000

export BLOCKCHAIN_PRIVATE_KEY DEPLOYER_ADDRESS USDC_ADDRESS TREASURY_ADDRESS
export MOCK_USDC_MINT
export VOTING_DELAY VOTING_PERIOD PROPOSAL_THRESHOLD QUORUM_FRACTION
export TERM_DURATION INITIAL_RATE_BPS

# ─── Build & Test ────────────────────────────────────────────────────
.PHONY: build test coverage clean

build:
	forge build

test:
	forge test -vvv

coverage:
	forge coverage

clean:
	forge clean

# ─── MockUSDC (solo testnet) ─────────────────────────────────────────
.PHONY: simulate-usdc deploy-usdc

simulate-usdc:
	forge script $(SCRIPT_DIR)/DeployMockUSDC.s.sol $(FORGE_FLAGS)

deploy-usdc:
	forge script $(SCRIPT_DIR)/DeployMockUSDC.s.sol $(FORGE_FLAGS) $(BROADCAST_FLAGS)

# ─── Simulación (sin broadcast) ─────────────────────────────────────
.PHONY: simulate-all simulate-token simulate-dao simulate-pn simulate-investment

simulate-all:
	forge script $(SCRIPT_DIR)/DeployAll.s.sol $(FORGE_FLAGS)

simulate-token:
	forge script $(SCRIPT_DIR)/DeployToken.s.sol $(FORGE_FLAGS)

simulate-dao:
	LUSEED_TOKEN_ADDRESS=$(LUSEED_TOKEN_ADDRESS) \
	forge script $(SCRIPT_DIR)/DeployDAO.s.sol $(FORGE_FLAGS)

simulate-pn:
	forge script $(SCRIPT_DIR)/DeployPromissoryNote.s.sol $(FORGE_FLAGS)

simulate-investment:
	LUSEED_TOKEN_ADDRESS=$(LUSEED_TOKEN_ADDRESS) \
	forge script $(SCRIPT_DIR)/DeployInvestment.s.sol $(FORGE_FLAGS)

# ─── Deploy (broadcast real) ────────────────────────────────────────
.PHONY: deploy-all deploy-token deploy-dao deploy-pn deploy-investment

deploy-all:
	forge script $(SCRIPT_DIR)/DeployAll.s.sol $(FORGE_FLAGS) $(BROADCAST_FLAGS)

deploy-token:
	forge script $(SCRIPT_DIR)/DeployToken.s.sol $(FORGE_FLAGS) $(BROADCAST_FLAGS)

deploy-dao:
	LUSEED_TOKEN_ADDRESS=$(LUSEED_TOKEN_ADDRESS) \
	forge script $(SCRIPT_DIR)/DeployDAO.s.sol $(FORGE_FLAGS) $(BROADCAST_FLAGS)

deploy-pn:
	forge script $(SCRIPT_DIR)/DeployPromissoryNote.s.sol $(FORGE_FLAGS) $(BROADCAST_FLAGS)

deploy-investment:
	LUSEED_TOKEN_ADDRESS=$(LUSEED_TOKEN_ADDRESS) \
	forge script $(SCRIPT_DIR)/DeployInvestment.s.sol $(FORGE_FLAGS) $(BROADCAST_FLAGS)

# ─── Verificación en Etherscan ───────────────────────────────────────
.PHONY: verify-usdc verify-token verify-dao verify-pn verify-investment verify-all

verify-usdc:
	forge verify-contract $(USDC_ADDRESS) src/mocks/MockUSDC.sol:MockUSDC \
		$(VERIFY_FLAGS) --constructor-args $$(cast abi-encode "constructor(address)" $(DEPLOYER))

verify-token:
	forge verify-contract $(LUSEED_TOKEN_ADDRESS) src/LuseedToken.sol:LuseedToken \
		$(VERIFY_FLAGS) --constructor-args $$(cast abi-encode "constructor(address)" $(DEPLOYER))

verify-dao:
	forge verify-contract $(LUSEED_DAO_ADDRESS) src/LuseedDAO.sol:LuseedDAO \
		$(VERIFY_FLAGS) --constructor-args $$(cast abi-encode "constructor(address,uint256,uint256,uint256,uint256)" \
		$(LUSEED_TOKEN_ADDRESS) $(VOTING_DELAY) $(VOTING_PERIOD) $(PROPOSAL_THRESHOLD) $(QUORUM_FRACTION))

verify-pn:
	forge verify-contract $(LUSEED_PN_ADDRESS) src/LuseedPromissoryNote.sol:LuseedPromissoryNote \
		$(VERIFY_FLAGS) --constructor-args $$(cast abi-encode "constructor(address,address,uint256,uint256)" \
		$(DEPLOYER) $(USDC) $(TERM_DURATION) $(INITIAL_RATE_BPS))

verify-investment:
	forge verify-contract $(LUSEED_INVESTMENT_ADDRESS) src/LuseedInvestment.sol:LuseedInvestment \
		$(VERIFY_FLAGS) --constructor-args $$(cast abi-encode "constructor(address,address,address,address)" \
		$(DEPLOYER) $(LUSEED_TOKEN_ADDRESS) $(USDC) $(TREASURY))

verify-all: verify-usdc verify-token verify-dao verify-pn verify-investment

# ─── Utilidades ──────────────────────────────────────────────────────
.PHONY: wallet-info gas-estimate help

wallet-info:
	@echo "Deployer: $(DEPLOYER)"
	@echo "Chain ID: $(CHAIN_ID)"
	@echo "RPC:      $(RPC)"
	@cast balance $(DEPLOYER) --rpc-url $(RPC) --ether
	@echo ""

gas-estimate: simulate-all

help:
	@echo ""
	@echo "  Luseed Energy DAO — Makefile"
	@echo "  ════════════════════════════"
	@echo ""
	@echo "  Build & Test"
	@echo "    make build              Compilar contratos"
	@echo "    make test               Correr tests"
	@echo "    make coverage           Reporte de cobertura"
	@echo "    make clean              Limpiar artefactos"
	@echo ""
	@echo "  Simulación (sin gastar gas)"
	@echo "    make simulate-all       Simular deploy completo"
	@echo "    make simulate-token     Simular solo Token"
	@echo "    make simulate-dao       Simular solo DAO     (requiere LUSEED_TOKEN_ADDRESS)"
	@echo "    make simulate-pn        Simular solo PromissoryNote"
	@echo "    make simulate-investment Simular solo Investment (requiere LUSEED_TOKEN_ADDRESS)"
	@echo ""
	@echo "  MockUSDC (solo testnet)"
	@echo "    make simulate-usdc      Simular deploy de MockUSDC"
	@echo "    make deploy-usdc        Desplegar MockUSDC (mintea 10M al deployer)"
	@echo ""
	@echo "  Deploy (broadcast real)"
	@echo "    make deploy-all         Desplegar todo"
	@echo "    make deploy-token       Desplegar solo Token"
	@echo "    make deploy-dao         Desplegar solo DAO     (requiere LUSEED_TOKEN_ADDRESS)"
	@echo "    make deploy-pn          Desplegar solo PromissoryNote"
	@echo "    make deploy-investment  Desplegar solo Investment (requiere LUSEED_TOKEN_ADDRESS)"
	@echo ""
	@echo "  Verificacion Etherscan (requiere ETHERSCAN_API_KEY)"
	@echo "    make verify-usdc        Verificar MockUSDC     (requiere USDC_ADDRESS)"
	@echo "    make verify-token       Verificar Token        (requiere LUSEED_TOKEN_ADDRESS)"
	@echo "    make verify-dao         Verificar DAO          (requiere LUSEED_DAO_ADDRESS)"
	@echo "    make verify-pn          Verificar PromissoryNote (requiere LUSEED_PN_ADDRESS)"
	@echo "    make verify-investment  Verificar Investment    (requiere LUSEED_INVESTMENT_ADDRESS)"
	@echo "    make verify-all         Verificar todos"
	@echo ""
	@echo "  Utilidades"
	@echo "    make wallet-info        Ver balance del deployer"
	@echo "    make gas-estimate       Estimar gas del deploy completo"
	@echo "    make help               Este menú"
	@echo ""

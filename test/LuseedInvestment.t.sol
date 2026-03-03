// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {LuseedInvestment} from "../src/LuseedInvestment.sol";
import {LuseedToken} from "../src/LuseedToken.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock de USDC con 6 decimales y función de mint para facilitar las pruebas.
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @notice Pruebas unitarias para el contrato LuseedInvestment.
contract LuseedInvestmentTest is Test {
    LuseedToken public token;
    MockUSDC public usdc;
    LuseedInvestment public investment;

    address public owner;
    address public treasury;
    address public buyer;

    uint256 constant USDC_10K = 10_000 * 10 ** 6;
    uint256 constant LST_1K = 1_000 * 10 ** 18;

    /// @notice Configura el escenario base con token, USDC, contrato de inversión y cuentas.
    function setUp() public {
        owner = makeAddr("owner");
        treasury = makeAddr("treasury");
        buyer = makeAddr("buyer");

        vm.startPrank(owner);

        token = new LuseedToken(owner);
        usdc = new MockUSDC();
        investment = new LuseedInvestment(owner, address(token), address(usdc), treasury);

        // Autorizar al contrato de inversión para enviar LST a compradores
        token.setAuthorized(address(investment), true);
        // Autorizar compradores para recibir LST
        token.setAuthorized(buyer, true);

        // Enviar LST al contrato de inversión (para la venta)
        assertTrue(token.transfer(address(investment), 150_000 * 10 ** 18));

        vm.stopPrank();

        usdc.mint(buyer, 2_000_000 * 10 ** 6); // 2M USDC para comprar
    }

    /// @notice Verifica que la conversión USDC → LST respete la tasa fija (10k USDC = 1k LST).
    function test_QuoteLstForUsdc() public view {
        assertEq(investment.quoteLstForUsdc(USDC_10K), LST_1K);
        assertEq(investment.quoteLstForUsdc(20_000 * 10 ** 6), 2_000 * 10 ** 18);
    }

    /// @notice Verifica una compra exitosa: el comprador recibe LST y la tesorería recibe USDC.
    function test_Buy_Success() public {
        vm.startPrank(buyer);
        usdc.approve(address(investment), USDC_10K);

        uint256 buyerLstBefore = token.balanceOf(buyer);
        uint256 treasuryUsdcBefore = usdc.balanceOf(treasury);

        investment.buy(USDC_10K);

        assertEq(token.balanceOf(buyer), buyerLstBefore + LST_1K);
        assertEq(usdc.balanceOf(treasury), treasuryUsdcBefore + USDC_10K);
        assertEq(investment.totalLstSold(), LST_1K);
        vm.stopPrank();
    }

    /// @notice Verifica que la compra emita el evento Bought con los parámetros correctos.
    function test_Buy_EmitsBought() public {
        vm.startPrank(buyer);
        usdc.approve(address(investment), USDC_10K);

        vm.expectEmit(true, true, true, true);
        emit LuseedInvestment.Bought(buyer, USDC_10K, LST_1K);
        investment.buy(USDC_10K);

        vm.stopPrank();
    }

    /// @notice Verifica que comprar con monto USDC igual a cero revierte con ZeroAmount.
    function test_Buy_ZeroAmount_Reverts() public {
        vm.startPrank(buyer);
        vm.expectRevert(LuseedInvestment.ZeroAmount.selector);
        investment.buy(0);
        vm.stopPrank();
    }

    /// @notice Verifica que remainingCap() disminuye correctamente después de una compra.
    function test_RemainingCap() public {
        assertEq(investment.remainingCap(), 100_000 * 10 ** 18);

        vm.startPrank(buyer);
        usdc.approve(address(investment), USDC_10K);
        investment.buy(USDC_10K);
        vm.stopPrank();

        assertEq(investment.remainingCap(), 100_000 * 10 ** 18 - LST_1K);
    }

    /// @notice Verifica que capReached() solo sea true cuando se llena el CAP_LST.
    function test_CapReached_FalseUntilCap() public {
        assertFalse(investment.capReached());

        vm.startPrank(buyer);
        usdc.approve(address(investment), 1_100_000 * 10 ** 6); // 100 compras × 10k USDC = 1M USDC
        for (uint256 i = 0; i < 100; i++) {
            investment.buy(USDC_10K);
        }
        vm.stopPrank();

        assertTrue(investment.capReached());
        assertEq(investment.totalLstSold(), 100_000 * 10 ** 18);
        assertEq(investment.remainingCap(), 0);
    }

    /// @notice Verifica que, una vez alcanzado el tope de tokens vendidos, nuevas compras revierten.
    function test_Buy_WhenCapReached_Reverts() public {
        vm.startPrank(buyer);
        usdc.approve(address(investment), 1_100_000 * 10 ** 6); // 1M + margen para 100 compras
        for (uint256 i = 0; i < 100; i++) {
            investment.buy(USDC_10K);
        }

        vm.expectRevert(LuseedInvestment.CapReached.selector);
        investment.buy(USDC_10K);
        vm.stopPrank();
    }

    /// @notice Verifica que solo el owner pueda cambiar la cuenta de tesorería.
    function test_SetTreasury_OnlyOwner() public {
        address newTreasury = makeAddr("newTreasury");
        vm.prank(buyer);
        vm.expectRevert();
        investment.setTreasury(newTreasury);

        vm.prank(owner);
        investment.setTreasury(newTreasury);
        assertEq(investment.treasury(), newTreasury);
    }

    /// @notice Verifica que setTreasury(address(0)) revierte con TreasuryZeroAddress.
    function test_SetTreasury_ZeroAddress_Reverts() public {
        vm.prank(owner);
        vm.expectRevert(LuseedInvestment.TreasuryZeroAddress.selector);
        investment.setTreasury(address(0));
    }

    /// @notice Verifica que setTreasury emite el evento TreasuryUpdated.
    function test_SetTreasury_EmitsTreasuryUpdated() public {
        address newTreasury = makeAddr("newTreasury");
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit LuseedInvestment.TreasuryUpdated(treasury, newTreasury);
        investment.setTreasury(newTreasury);
    }

    /// @notice Verifica que el constructor revierte si la tesorería inicial es la dirección cero.
    function test_Constructor_TreasuryZeroAddress_Reverts() public {
        vm.prank(owner);
        vm.expectRevert(LuseedInvestment.TreasuryZeroAddress.selector);
        new LuseedInvestment(owner, address(token), address(usdc), address(0));
    }

    /// @notice Verifica que la compra revierte si el contrato no tiene suficientes LST para vender.
    function test_Buy_InsufficientLstBalance_Reverts() public {
        // Contrato con poco LST: solo 500 LST
        vm.startPrank(owner);
        LuseedInvestment smallSale = new LuseedInvestment(owner, address(token), address(usdc), treasury);
        token.setAuthorized(address(smallSale), true);
        token.setAuthorized(buyer, true);
        assertTrue(token.transfer(address(smallSale), 500 * 10 ** 18));
        vm.stopPrank();

        usdc.mint(buyer, USDC_10K);
        vm.startPrank(buyer);
        usdc.approve(address(smallSale), USDC_10K);
        // 10k USDC = 1000 LST, pero el contrato solo tiene 500 LST
        vm.expectRevert(LuseedInvestment.InsufficientLstBalance.selector);
        smallSale.buy(USDC_10K);
        vm.stopPrank();
    }

    /// @notice Verifica que, si se pide más de lo que queda en el cap, se haga una compra parcial al límite.
    function test_Buy_PartialFill_WhenRequestExceedsRemainingCap() public {
        // Vender hasta que queden solo 500 LST
        vm.startPrank(buyer);
        usdc.approve(address(investment), 1_100_000 * 10 ** 6);
        for (uint256 i = 0; i < 99; i++) {
            investment.buy(USDC_10K);
        }
        // remaining = 100_000 - 99_000 = 1_000 LST
        assertEq(investment.remainingCap(), 1_000 * 10 ** 18);

        uint256 buyerLstBefore = token.balanceOf(buyer);
        uint256 treasuryBefore = usdc.balanceOf(treasury);

        // Pedir 20k USDC (2000 LST) pero solo quedan 1000 LST → recibe 1000 LST, paga 10k USDC
        investment.buy(20_000 * 10 ** 6);

        assertEq(token.balanceOf(buyer), buyerLstBefore + 1_000 * 10 ** 18);
        assertEq(usdc.balanceOf(treasury), treasuryBefore + 10_000 * 10 ** 6);
        assertEq(investment.totalLstSold(), 100_000 * 10 ** 18);
        assertTrue(investment.capReached());
        vm.stopPrank();
    }

    /// @notice Verifica que withdrawUsdc no revierte cuando el contrato no tiene saldo en USDC.
    function test_WithdrawUsdc_WhenBalanceZero_NoRevert() public {
        assertEq(usdc.balanceOf(address(investment)), 0);
        vm.prank(owner);
        investment.withdrawUsdc(treasury); // no revert
        assertEq(usdc.balanceOf(treasury), 0);
    }

    /// @notice Verifica que withdrawUsdc emite el evento UsdcWithdrawn con los parámetros correctos.
    function test_WithdrawUsdc_EmitsUsdcWithdrawn() public {
        vm.prank(buyer);
        assertTrue(usdc.transfer(address(investment), 500 * 10 ** 6));

        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit LuseedInvestment.UsdcWithdrawn(treasury, 500 * 10 ** 6);
        investment.withdrawUsdc(treasury);
    }

    /// @notice Verifica que solo el owner puede retirar USDC del contrato de inversión.
    function test_WithdrawUsdc_OnlyOwner() public {
        // Enviar USDC por error al contrato
        vm.prank(buyer);
        assertTrue(usdc.transfer(address(investment), 1000 * 10 ** 6));

        vm.prank(buyer);
        vm.expectRevert();
        investment.withdrawUsdc(treasury);

        uint256 treasuryBefore = usdc.balanceOf(treasury);
        vm.prank(owner);
        investment.withdrawUsdc(treasury);
        assertEq(usdc.balanceOf(treasury), treasuryBefore + 1000 * 10 ** 6);
        assertEq(usdc.balanceOf(address(investment)), 0);
    }

    // ─── withdrawLst ─────────────────────────────────────────────────────────

    /// @notice Verifica que solo el owner puede retirar LST pendientes del contrato.
    function test_WithdrawLst_OnlyOwner() public {
        vm.prank(buyer);
        vm.expectRevert();
        investment.withdrawLst(owner);

        uint256 ownerLstBefore = token.balanceOf(owner);
        vm.prank(owner);
        investment.withdrawLst(owner);
        assertEq(token.balanceOf(owner), ownerLstBefore + 150_000 * 10 ** 18);
        assertEq(token.balanceOf(address(investment)), 0);
    }

    /// @notice Verifica que withdrawLst transfiere los LST pendientes al destino.
    function test_WithdrawLst_TransfersPendingTokens() public {
        vm.startPrank(buyer);
        usdc.approve(address(investment), USDC_10K);
        investment.buy(USDC_10K);
        vm.stopPrank();

        uint256 pending = token.balanceOf(address(investment)); // 150k - 1k = 149k
        assertEq(pending, 149_000 * 10 ** 18);

        vm.prank(owner);
        token.setAuthorized(treasury, true);
        uint256 treasuryLstBefore = token.balanceOf(treasury);
        vm.prank(owner);
        investment.withdrawLst(treasury);
        assertEq(token.balanceOf(treasury), treasuryLstBefore + pending);
        assertEq(token.balanceOf(address(investment)), 0);
    }

    /// @notice Verifica que withdrawLst no revierte cuando el contrato no tiene LST.
    function test_WithdrawLst_WhenBalanceZero_NoRevert() public {
        vm.prank(owner);
        investment.withdrawLst(owner); // vacía el contrato
        vm.prank(owner);
        investment.withdrawLst(owner); // segunda llamada con balance 0: no revert
    }

    /// @notice Verifica que withdrawLst emite el evento LstWithdrawn.
    function test_WithdrawLst_EmitsLstWithdrawn() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit LuseedInvestment.LstWithdrawn(owner, 150_000 * 10 ** 18);
        investment.withdrawLst(owner);
    }
}

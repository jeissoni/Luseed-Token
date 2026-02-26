// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LuseedInvestment
 * @notice Venta de LST: 1000 LST por cada 10000 USDC. Tope de venta en tokens (LST).
 */
contract LuseedInvestment is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable LUSEED_TOKEN;
    IERC20 public immutable USDC;

    /// @notice Cuenta que recibe el USDC de cada compra
    address public treasury;

    /// @notice 10000 USDC (6 decimals) dan derecho a 1000 LST (18 decimals)
    uint256 public constant USDC_PER_OFFER = 10_000 * 10 ** 6;   // 10_000 USDC
    uint256 public constant LST_PER_OFFER = 1_000 * 10 ** 18;    // 1_000 LST

    /// @notice Tope de venta: máximo LST a vender (100k tokens = 1M USDC equivalente)
    uint256 public constant CAP_LST = 100_000 * 10 ** 18;

    uint256 public totalLstSold;

    event Bought(address indexed buyer, uint256 usdcAmount, uint256 lstAmount);
    event UsdcWithdrawn(address indexed to, uint256 amount);
    event LstWithdrawn(address indexed to, uint256 amount);
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);

    error CapReached();
    error TreasuryZeroAddress();
    error InsufficientLstBalance();
    error ZeroAmount();

    constructor(address _owner, address _luseedToken, address _usdc, address _treasury)
        Ownable(_owner)
    {
        if (_treasury == address(0)) revert TreasuryZeroAddress();
        LUSEED_TOKEN = IERC20(_luseedToken);
        USDC = IERC20(_usdc);
        treasury = _treasury;
    }

    /**
     * @notice Compra LST con USDC. 10000 USDC = 1000 LST.
     * @param usdcAmount Cantidad de USDC a pagar (en unidades de 6 decimales).
     */
    function buy(uint256 usdcAmount) external nonReentrant {
        if (usdcAmount == 0) revert ZeroAmount();
        if (totalLstSold >= CAP_LST) revert CapReached();

        uint256 lstAmount = _usdcToLst(usdcAmount);
        uint256 usdcToTake = usdcAmount;

        // No exceder el cap en tokens: limitar a lo que falta por vender
        uint256 remainingLst = CAP_LST - totalLstSold;
        if (lstAmount > remainingLst) {
            lstAmount = remainingLst;
            usdcToTake = _lstToUsdc(remainingLst);
        }

        if (LUSEED_TOKEN.balanceOf(address(this)) < lstAmount) revert InsufficientLstBalance();

        totalLstSold += lstAmount;

        USDC.safeTransferFrom(msg.sender, treasury, usdcToTake);
        LUSEED_TOKEN.safeTransfer(msg.sender, lstAmount);

        emit Bought(msg.sender, usdcToTake, lstAmount);
    }

    /**
     * @notice Convierte USDC (6 decimals) a LST (18 decimals). 10000 USDC -> 1000 LST.
     */
    function _usdcToLst(uint256 usdcAmount) internal pure returns (uint256) {
        return (usdcAmount * LST_PER_OFFER) / USDC_PER_OFFER;
    }

    /**
     * @notice Convierte LST (18 decimals) a USDC (6 decimals). 1000 LST -> 10000 USDC.
     */
    function _lstToUsdc(uint256 lstAmount) internal pure returns (uint256) {
        return (lstAmount * USDC_PER_OFFER) / LST_PER_OFFER;
    }

    /**
     * @notice Cuántos LST recibiría por una cantidad de USDC (sin ejecutar la compra).
     */
    function quoteLstForUsdc(uint256 usdcAmount) external pure returns (uint256) {
        return _usdcToLst(usdcAmount);
    }

    /**
     * @notice Actualiza la cuenta de tesorería. Solo owner.
     */
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert TreasuryZeroAddress();
        address previous = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(previous, _treasury);
    }

    /**
     * @notice Retira los LST pendientes de vender (saldo en el contrato). Solo owner.
     * @param to Destino de los tokens. Debe estar autorizado en LuseedToken para recibir.
     */
    function withdrawLst(address to) external onlyOwner nonReentrant {
        uint256 amount = LUSEED_TOKEN.balanceOf(address(this));
        if (amount > 0) {
            LUSEED_TOKEN.safeTransfer(to, amount);
            emit LstWithdrawn(to, amount);
        }
    }

    /**
     * @notice Retira USDC que haya quedado en el contrato (p. ej. envíos erróneos). Solo owner.
     */
    function withdrawUsdc(address to) external onlyOwner nonReentrant {
        uint256 amount = USDC.balanceOf(address(this));
        if (amount > 0) {
            USDC.safeTransfer(to, amount);
            emit UsdcWithdrawn(to, amount);
        }
    }

    /**
     * @notice LST restante por vender hasta el tope.
     */
    function remainingCap() external view returns (uint256) {
        if (totalLstSold >= CAP_LST) return 0;
        return CAP_LST - totalLstSold;
    }

    /**
     * @notice Si la venta ya alcanzó el tope de tokens (CAP_LST).
     */
    function capReached() external view returns (bool) {
        return totalLstSold >= CAP_LST;
    }
}

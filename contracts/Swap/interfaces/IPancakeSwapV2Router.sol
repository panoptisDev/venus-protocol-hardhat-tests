pragma solidity 0.8.13;

interface IPancakeSwapV2Router {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactTokensForTokensAtSupportingFee(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256 swapAmount);

    function swapExactBNBForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    function swapExactBNBForTokensAtSupportingFee(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256 swapAmount);

    function swapExactTokensForBNB(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactTokensForBNBAtSupportingFee(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256 swapAmount);

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapBNBForExactTokens(
        uint256 amountOut,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    function swapTokensForExactBNB(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactTokensForTokensAndSupply(
        address vTokenAddress,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external;

    function swapExactTokensForTokensAndSupplyAtSupportingFee(
        address vTokenAddress,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external;

    function swapExactBNBForTokensAndSupply(
        address vTokenAddress,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external payable;

    function swapBNBAndSupplyAtSupportingFee(
        address vTokenAddress,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external payable;

    function swapTokensForExactTokensAndSupply(
        address vTokenAddress,
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        uint256 deadline
    ) external;

    function swapBNBForExactTokensAndSupply(
        address vTokenAddress,
        uint256 amountOut,
        address[] calldata path,
        uint256 deadline
    ) external payable;

    function swapAndRepay(
        address vTokenAddress,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external;

    function swapAndRepayAtSupportingFee(
        address vTokenAddress,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external;

    function swapBNBAndRepay(
        address vTokenAddress,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external payable;

    function swapBNBAndRepayAtSupportingFee(
        address vTokenAddress,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external payable;

    function swapTokensForExactTokensAndRepay(
        address vTokenAddress,
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        uint256 deadline
    ) external;

    function swapTokensForFullTokenDebtAndRepay(
        address vTokenAddress,
        uint256 amountInMax,
        address[] calldata path,
        uint256 deadline
    ) external;

    function swapBNBForExactTokensAndRepay(
        address vTokenAddress,
        uint256 amountOut,
        address[] calldata path,
        uint256 deadline
    ) external payable;

    function swapExactTokensForBNBAndRepay(
        address vTokenAddress,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external payable;

    function swapExactTokensForBNBAndRepayAtSupportingFee(
        address vTokenAddress,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external payable;

    function swapTokensForExactBNBAndRepay(
        address vTokenAddress,
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        uint256 deadline
    ) external payable;

    function swapTokensForFullBNBDebtAndRepay(
        address vBNBAddress,
        uint256 amountInMax,
        address[] calldata path,
        uint256 deadline
    ) external payable;
}

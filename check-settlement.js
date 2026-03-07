const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
    const OP_RPC = "https://sepolia.optimism.io";
    const BASE_RPC = "https://sepolia.base.org";

    const opProvider = new ethers.JsonRpcProvider(OP_RPC);
    const baseProvider = new ethers.JsonRpcProvider(BASE_RPC);

    // USDC addresses
    const USDC_OP = "0x5fd84259d66Cd46123540766Be93DFE6D43130D7";
    const USDC_BASE = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

    // The Blue Solver
    const SOLVER_ADDR = "0x6214e4E81a075c7CA6F4B5725eCd943D1C6b642C";

    const abi = ["function balanceOf(address) view returns (uint256)"];

    const opContract = new ethers.Contract(USDC_OP, abi, opProvider);
    const baseContract = new ethers.Contract(USDC_BASE, abi, baseProvider);

    const balOp = await opContract.balanceOf(SOLVER_ADDR);
    const balBase = await baseContract.balanceOf(SOLVER_ADDR);

    console.log("=== SOLVER SETTLEMENT BALANCES ===");
    console.log("USDC on OP Sepolia:  ", ethers.formatUnits(balOp, 6));
    console.log("USDC on Base Sepolia:", ethers.formatUnits(balBase, 6));
}

main().catch(console.error);

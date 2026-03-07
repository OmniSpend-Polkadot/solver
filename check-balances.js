const { ethers } = require("ethers");
require("dotenv").config();

async function checkBalances() {
    // Polkadot Paseo RPC
    const provider = new ethers.JsonRpcProvider("https://services.polkadothub-rpc.com/testnet");

    // Get Wallet Addres from .env
    if (!process.env.PRIVATE_KEY) {
        console.error("❌ ERROR: PRIVATE_KEY is not defined in .env");
        return;
    }
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const address = wallet.address;

    // Token Addresses
    const usdhAddr = "0x0Dc440CF87830f0aF564eB8b62b454B7e0c68a4b";
    const usdcAddr = "0x9Dd96D4BC333A4A3Bbe1238C03f28Bf4a9c8aCAb";

    // Standard ERC20 ABI
    const abi = ["function balanceOf(address account) view returns (uint256)"];

    const usdh = new ethers.Contract(usdhAddr, abi, provider);
    const usdc = new ethers.Contract(usdcAddr, abi, provider);

    console.log(`\n🔍 Checking balances on Polkadot Paseo Testnet`);
    console.log(`===============================================`);
    console.log(`🧑‍💻 Wallet Address: ${address}\n`);

    try {
        // Native PAS Balance
        const nativeBalance = await provider.getBalance(address);
        console.log(`🪙  Native PAS: ${ethers.formatUnits(nativeBalance, 18)} PAS`);

        // USD.h Balance (18 Decimals)
        const usdhBalance = await usdh.balanceOf(address);
        console.log(`🌉  Bridge Fee (USD.h): ${ethers.formatUnits(usdhBalance, 18)} USD.h`);

        // Mock USDC Balance (6 Decimals)
        const usdcBalance = await usdc.balanceOf(address);
        console.log(`💵  Mock USDC (mUSDC): ${ethers.formatUnits(usdcBalance, 6)} USDC`);

        console.log(`===============================================\n`);
    } catch (err) {
        console.error("❌ Error fetching balances:", err.message);
    }
}

checkBalances();

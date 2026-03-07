import { ethers, Wallet, JsonRpcProvider, Contract } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const PASEO_RPC = "https://services.polkadothub-rpc.com/testnet";
const FEE_TOKEN_PASEO = "0x0Dc440CF87830f0aF564eB8b62b454B7e0c68a4b";
const USDC_PASEO = "0x9Dd96D4BC333A4A3Bbe1238C03f28Bf4a9c8aCAb";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
    if (!PRIVATE_KEY) {
        console.error("❌ No PRIVATE_KEY found in .env");
        return;
    }

    const provider = new JsonRpcProvider(PASEO_RPC);
    const wallet = new Wallet(PRIVATE_KEY, provider);

    console.log(`Using wallet: ${wallet.address}`);

    const feeToken = new Contract(FEE_TOKEN_PASEO, [
        "function faucet() external",
        "function mint(address,uint256) external",
        "function symbol() view returns (string)",
        "function balanceOf(address) view returns (uint256)"
    ], wallet);

    const usdcToken = new Contract(USDC_PASEO, [
        "function mint(address,uint256) external",
        "function symbol() view returns (string)",
        "function balanceOf(address) view returns (uint256)"
    ], wallet);

    try {
        console.log("\n--- Obtaining FEE_TOKEN (USD.h) ---");
        try {
            console.log("Attempting to call faucet()...");
            const tx = await feeToken.faucet();
            await tx.wait();
            console.log("✅ Faucet successful!");
        } catch (e) {
            console.log("Standard faucet() failed, trying mint()...");
            const tx = await feeToken.mint(wallet.address, ethers.parseUnits("100", 18));
            await tx.wait();
            console.log("✅ Minting successful!");
        }
    } catch (e: any) {
        console.error("❌ Failed to get USD.h:", e.message);
    }

    try {
        console.log("\n--- Obtaining MockUSDC (mUSDC) ---");
        console.log("Attempting to call mint()...");
        const tx = await usdcToken.mint(wallet.address, ethers.parseUnits("1000", 6));
        await tx.wait();
        console.log("✅ mUSDC Minting successful!");
    } catch (e: any) {
        console.error("❌ Failed to get mUSDC:", e.message);
    }

    const balFee = await feeToken.balanceOf(wallet.address);
    const balUsdc = await usdcToken.balanceOf(wallet.address);
    console.log(`\nFinal Balances on Paseo:`);
    console.log(`- USD.h: ${ethers.formatUnits(balFee, 18)}`);
    console.log(`- mUSDC: ${ethers.formatUnits(balUsdc, 6)}`);
}

main().catch(console.error);

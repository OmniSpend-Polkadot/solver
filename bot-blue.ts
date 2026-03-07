/**
 * 🔵 Solver Bot BLUE — "The Aggressive"
 * Connects to OmniSpend Auctioneer and bids fee = 0.3 USDC.
 * Now executes REAL smart contract transactions using ethers.js!
 */
import { io } from "socket.io-client";
import { ethers, Contract, Wallet, JsonRpcProvider } from "ethers";
import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const AUCTIONEER_URL = process.env.AUCTIONEER_URL || "http://localhost:3001";
const SOLVER_NAME = "🔵 Bot BLUE (On-Chain Executor)";
const SOLVER_ADDRESS = process.env.SOLVER_ADDRESS || "0x6214e4E81a075c7CA6F4B5725eCd943D1C6b642C";
const PRIVATE_KEY = process.env.PRIVATE_KEY; // <-- Using the same .env setup
const BID_FEE = "0.3"; // USDC

// Networks Configurations
const OP_RPC = "https://sepolia.optimism.io";
const BASE_RPC = "https://sepolia.base.org";
const PASEO_RPC = "https://services.polkadothub-rpc.com/testnet";

// Contract Addresses form DEPLOYED_ADDRESSES.md
const ORIGIN_SETTLER_OP = "0xd2839302132984bE900Fbd769F043721A7d8Bb7C";
const ORIGIN_SETTLER_BASE = "0xDc38039f0FB91BF79b4AF1cD83220D1f65b50AaC";
const DEST_SETTLER_PASEO = "0x6E7A84a8Cc51391538a68058E1A7B065A3c23b3C";
const USDC_PASEO = "0x9Dd96D4BC333A4A3Bbe1238C03f28Bf4a9c8aCAb";
const FEE_TOKEN_PASEO = "0x0Dc440CF87830f0aF564eB8b62b454B7e0c68a4b";
const ISMP_HOST_PASEO = "0xbb26e04a71e7c12093e82b83ba310163eac186fa";

// Minimal ABIs
const OriginSettlerABI = [
    "function openFor(tuple(address originSettler, address user, uint256 nonce, uint256 originChainId, uint32 openDeadline, uint32 fillDeadline, bytes32 orderDataType, bytes orderData, address exclusiveSolver) order, bytes signature, bytes originFillerData) external"
];

const DestSettlerABI = [
    "function fillAggregated(tuple(bytes32 aggregatedId, address user, uint256 destinationChainId, uint256 totalOutputAmount, address target, bytes callData, tuple(uint256 originChainId, bytes32 orderId, uint256 amount)[] legs, uint256 solverFee, address exclusiveSolver) intent, bytes[] originSettlers, bytes[] sourceChains) external payable"
];

const IERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)"
];

console.log(`\n${SOLVER_NAME} starting...`);

let opSigner: Wallet | null = null;
let baseSigner: Wallet | null = null;
let paseoSigner: Wallet | null = null;

if (PRIVATE_KEY) {
    const opProvider = new JsonRpcProvider(OP_RPC);
    const baseProvider = new JsonRpcProvider(BASE_RPC);
    const paseoProvider = new JsonRpcProvider(PASEO_RPC);

    opSigner = new Wallet(PRIVATE_KEY, opProvider);
    baseSigner = new Wallet(PRIVATE_KEY, baseProvider);
    paseoSigner = new Wallet(PRIVATE_KEY, paseoProvider);

    console.log(`✅ Loaded REAL wallet for execution! Address: ${opSigner.address}`);
} else {
    console.log(`⚠️ No PRIVATE_KEY found in .env. Running in DRY-RUN simulation mode.`);
}

console.log(`🔗 Connecting to Auctioneer: ${AUCTIONEER_URL}/solver\n`);

const socket = io(`${AUCTIONEER_URL}/solver`, {
    query: {
        name: SOLVER_NAME,
        address: SOLVER_ADDRESS,
    },
});

// Cache RFQs locally to access them when executing an order
const activeRfqs = new Map<string, any>();

socket.on("connect", () => {
    console.log(`✅ ${SOLVER_NAME} connected! Waiting for RFQs...\n`);
});

socket.on("rfq", (rfq: any) => {
    console.log(`📨 RFQ received!`);
    console.log(`   Request: ${rfq.requestId}`);
    console.log(`   User: ${rfq.user}`);
    console.log(`   Output: ${rfq.totalOutputAmount} USDC → ${rfq.destination.chain}`);

    activeRfqs.set(rfq.requestId, rfq);

    // Simulate "thinking time" (30-80ms) — Blue is very fast
    const thinkTime = Math.floor(Math.random() * 50) + 30;

    setTimeout(() => {
        const bid = {
            solverAddress: SOLVER_ADDRESS,
            solverName: SOLVER_NAME,
            fee: BID_FEE,
            requestId: rfq.requestId,
        };

        socket.emit("bid", bid);
        console.log(`   💸 Bid submitted: fee=${BID_FEE} USDC (took ${thinkTime}ms)\n`);
    }, thinkTime);
});

socket.on("execute_order", async (payload: any) => {
    console.log(`\n🎉🎉🎉 I WON THE AUCTION! 🎉🎉🎉`);
    console.log(`   Request: ${payload.requestId}`);

    if (!opSigner || !baseSigner || !paseoSigner) {
        console.log(`   [DRY-RUN] OriginSettler.openFor() & DestinationSettler.fillAggregated() mocked!`);
        return;
    }

    try {
        const rfq = activeRfqs.get(payload.requestId);
        if (!rfq) throw new Error("RFQ details not found in cache");

        const isBatch = payload.signedPayload.isBatch;
        const payloadsToProcess = isBatch ? payload.signedPayload.payloads : [payload.signedPayload];

        const aggregatedLegs: any[] = [];
        const originSettlers: string[] = [];
        const sourceChains: Uint8Array[] = [];

        for (let i = 0; i < payloadsToProcess.length; i++) {
            const p = payloadsToProcess[i];
            const signature = p.signature;
            const order = p.order;

            const originChainIdStr = order.originChainId.toString();
            let targetSigner: Wallet;
            let targetOriginSettler: string;
            let sourceChainIdBytes: Uint8Array;

            if (originChainIdStr === "11155420") {
                targetSigner = opSigner;
                targetOriginSettler = ORIGIN_SETTLER_OP;
                sourceChainIdBytes = ethers.toUtf8Bytes("EVM-11155420");
                console.log(`\n⏳ [1/2] Executing OriginSettler.openFor() on OP Sepolia (Leg ${i + 1}/${payloadsToProcess.length})...`);
            } else if (originChainIdStr === "84532") {
                targetSigner = baseSigner;
                targetOriginSettler = ORIGIN_SETTLER_BASE;
                sourceChainIdBytes = ethers.toUtf8Bytes("EVM-84532");
                console.log(`\n⏳ [1/2] Executing OriginSettler.openFor() on BASE Sepolia (Leg ${i + 1}/${payloadsToProcess.length})...`);
            } else {
                throw new Error(`Unsupported Origin Chain: ${originChainIdStr}`);
            }

            const originContract = new Contract(targetOriginSettler, OriginSettlerABI, targetSigner);

            const originTx = await originContract.openFor(order, signature, "0x");
            console.log(`   Tx Hash (Origin): ${originTx.hash}`);
            await originTx.wait();
            console.log(`   ✅ Escrow secured on Origin!`);

            // Generate OrderId to match OriginSettler storage
            const orderIdBytes32 = ethers.keccak256(
                ethers.AbiCoder.defaultAbiCoder().encode(
                    ["uint256", "address", "uint256", "uint32", "bytes"],
                    [Number(order.originChainId), order.user, order.nonce, order.fillDeadline, order.orderData]
                )
            );

            // Extract the original amount (amountOut is identical to amountIn in our simplified intent)
            const decodedOrderData = ethers.AbiCoder.defaultAbiCoder().decode(
                ["uint256", "bytes32", "uint256", "uint256", "uint256", "address"],
                order.orderData
            );
            const amountForLeg = decodedOrderData[2]; // amountOut

            aggregatedLegs.push({
                originChainId: Number(order.originChainId),
                orderId: orderIdBytes32,
                amount: amountForLeg
            });

            originSettlers.push(targetOriginSettler);
            sourceChains.push(sourceChainIdBytes);
        }

        console.log(`\n⏳ [2/2] Executing DestinationSettler.fillAggregated() on Polkadot Paseo...`);
        const destContract = new Contract(DEST_SETTLER_PASEO, DestSettlerABI, paseoSigner);
        const usdcContract = new Contract(USDC_PASEO, IERC20_ABI, paseoSigner);
        const feeTokenContract = new Contract(FEE_TOKEN_PASEO, IERC20_ABI, paseoSigner);

        const totalOutputAmountWei = ethers.parseUnits(rfq.totalOutputAmount.toString(), 6);

        // Check & Approve USDC for the DestSettler
        const allowance = await usdcContract.allowance(paseoSigner.address, DEST_SETTLER_PASEO);
        if (allowance < totalOutputAmountWei) {
            console.log(`   Approving ${rfq.totalOutputAmount} USDC for DestinationSettler...`);
            const approveTx = await usdcContract.approve(DEST_SETTLER_PASEO, ethers.MaxUint256);
            await approveTx.wait();
            console.log(`   ✅ USDC Approved.`);
        }

        // Check & Approve Fee Token for ISMP Dispatch
        const feeAllowance = await feeTokenContract.allowance(paseoSigner.address, DEST_SETTLER_PASEO);
        if (feeAllowance < ethers.parseUnits("50", 18)) {
            console.log(`   Approving Relayer Fee Token for DestinationSettler...`);
            const approveFeeTx = await feeTokenContract.approve(DEST_SETTLER_PASEO, ethers.MaxUint256);
            await approveFeeTx.wait();
            console.log(`   ✅ Fee Token Approved.`);
        }

        // Use the exclusiveSolver from the first order (or fallback to solver address)
        const exclusiveSolverAddress = payloadsToProcess[0]?.order?.exclusiveSolver || SOLVER_ADDRESS;

        // Construct AggregatedIntent
        const intent = {
            aggregatedId: ethers.id(payload.requestId),
            user: rfq.user, // Trust RFQ user as they signed the payloads
            destinationChainId: 420420417,
            totalOutputAmount: totalOutputAmountWei,
            target: rfq.target || ethers.ZeroAddress,
            callData: rfq.callData || "0x",
            legs: aggregatedLegs,
            solverFee: ethers.parseUnits(BID_FEE, 6),
            exclusiveSolver: exclusiveSolverAddress
        };

        // Submit to Destination (No msg.value, contract pulls USD.h automatically)
        const destTx = await destContract.fillAggregated(intent, originSettlers, sourceChains);
        console.log(`   Tx Hash (Paseo): ${destTx.hash}`);
        await destTx.wait();
        console.log(`   🚀 ✅ INTENT FULFILLED SUCCESSFULLY ON POLKADOT PASEO!`);

        activeRfqs.delete(payload.requestId);

    } catch (err: any) {
        console.error(`   ❌ Execution failed:`, err);
    }
});

socket.on("error", (err: any) => {
    console.error(`❌ Error: ${err.message}`);
});

socket.on("disconnect", () => {
    console.log(`${SOLVER_NAME} disconnected.`);
});

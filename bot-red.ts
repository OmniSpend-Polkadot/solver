/**
 * 🔴 Solver Bot RED — "The Conservative"
 * Connects to OmniSpend Auctioneer and bids fee = 0.5 USDC
 */
import { io } from "socket.io-client";

const AUCTIONEER_URL = process.env.AUCTIONEER_URL || "http://localhost:3001";
const SOLVER_NAME = "🔴 Bot RED";
const SOLVER_ADDRESS = "0x00000000000000000000000000004ED000000001";
const BID_FEE = "0.5"; // USDC

console.log(`\n${SOLVER_NAME} starting...`);
console.log(`Connecting to Auctioneer: ${AUCTIONEER_URL}/solver\n`);

const socket = io(`${AUCTIONEER_URL}/solver`, {
    query: {
        name: SOLVER_NAME,
        address: SOLVER_ADDRESS,
    },
});

socket.on("connect", () => {
    console.log(`✅ ${SOLVER_NAME} connected! Waiting for RFQs...\n`);
});

socket.on("rfq", (rfq: any) => {
    console.log(`📨 RFQ received!`);
    console.log(`   Request: ${rfq.requestId}`);
    console.log(`   User: ${rfq.user}`);
    console.log(`   Output: ${rfq.totalOutputAmount} USDC → ${rfq.destination.chain}`);

    // Simulate "thinking time" (50-200ms)
    const thinkTime = Math.floor(Math.random() * 150) + 50;

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

socket.on("execute_order", (order: any) => {
    console.log(`\n🎉🎉🎉 I WON THE AUCTION! 🎉🎉🎉`);
    console.log(`   Request: ${order.requestId}`);
    console.log(`   Executing on-chain with signed payload...`);
    console.log(`   [In production: call OriginSettler.openFor() + DestinationSettler.fillAggregated()]\n`);
});

socket.on("error", (err: any) => {
    console.error(`❌ Error: ${err.message}`);
});

socket.on("disconnect", () => {
    console.log(`${SOLVER_NAME} disconnected.`);
});

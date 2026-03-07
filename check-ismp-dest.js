const { ethers } = require("ethers");
async function main() {
    const rpc = "https://services.polkadothub-rpc.com/testnet";
    const provider = new ethers.JsonRpcProvider(rpc);
    const hostAddr = "0xbb26e04a71e7c12093e82b83ba310163eac186fa"; 
    
    // Using IDispatcher interface
    const abi = ["function perByteFee(bytes memory dest) external view returns (uint256)"];
    const host = new ethers.Contract(hostAddr, abi, provider);
    
    try {
        const opDest = ethers.toUtf8Bytes("EVM-11155420");
        const feeOp = await host.perByteFee(opDest);
        console.log("PerByteFee for OP (EVM-11155420):", feeOp.toString());
    } catch(e) { console.log("Error OP:", e.message); }
    
    try {
        const baseDest = ethers.toUtf8Bytes("EVM-84532");
        const feeBase = await host.perByteFee(baseDest);
        console.log("PerByteFee for Base (EVM-84532):", feeBase.toString());
    } catch(e) { console.log("Error Base:", e.message); }
}
main().catch(console.error);

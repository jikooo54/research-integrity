import { defineChain } from "viem";
export const GENLAYER_CHAIN_ID = 61999;
export const GENLAYER_RPC_URL = "https://studio.genlayer.com/api";
export const CONTRACT_ADDRESS = "0xD6032B5c9cBE29d40c51812898deF43C5Ac622f0" as const;
export const genLayerStudionet = defineChain({ id: GENLAYER_CHAIN_ID, name: "GenLayer Studionet", nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 }, rpcUrls: { default: { http: [GENLAYER_RPC_URL] }, public: { http: [GENLAYER_RPC_URL] } }, testnet: true });

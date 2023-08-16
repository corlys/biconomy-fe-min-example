import { configureChains, createConfig, } from 'wagmi';
import {
  getDefaultWallets,

} from '@rainbow-me/rainbowkit';
import { type Chain } from 'wagmi';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';

const astarchain: Chain = {
  id: 592,
  name: "Astar Network",
  network: "astar",
  nativeCurrency: {
    decimals: 18,
    name: "ASTAR",
    symbol: "ASTR",
  },
  rpcUrls: {
    default: {
      http: ["https://astar.public.blastapi.io"]
    },
    public: {
      http: ["https://1rpc.io/astr"]
    },
  },
  blockExplorers: {
    default: { name: "Subscan", url: "https://astar.subscan.io" },
    etherscan: { name: "Blockscout", url: "https://blockscout.com/astar" },
  },
  testnet: false,
};

const { chains, publicClient } = configureChains(
  [astarchain],
  [
    jsonRpcProvider({
      rpc: () => {
        return {
          http: 'https://1rpc.io/astr',
        }
      }
    })
  ]
);

const { connectors } = getDefaultWallets({
  appName: 'are you a participant',
  projectId: '6ec64314490e78bc6baec6bfcb4bbc71',
  chains
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient
})

export {
  wagmiConfig, chains
}

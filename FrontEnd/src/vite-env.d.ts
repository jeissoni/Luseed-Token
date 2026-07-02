/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PIMLICO_API_KEY: string;
  readonly VITE_RPC_URL: string;
  readonly VITE_PROMISSORY_NOTE_ADDRESS: string;
  readonly VITE_LUSEED_TOKEN_ADDRESS: string;
  readonly VITE_LUSEED_DAO_ADDRESS: string;
  readonly VITE_LUSEED_INVESTMENT_ADDRESS: string;
  readonly VITE_USDC_ADDRESS: string;
  readonly VITE_USD_TO_COP_RATE: string;
  readonly VITE_OPERATOR_ADDRESSES: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

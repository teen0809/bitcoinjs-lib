import { type Network } from '../';
import { testnet } from '../src/networks';

export interface IBrc20 {
  availableBalance: number;
  overallBalance: number;
  ticker: string;
  transferableBalance: number;
}

export interface IBrc20Transferable {
  inscriptionId: string;
  inscriptionNumber: number;
  amount: number;
  ticker: string;
}

export const getBrc20s = async (
  address: string,
  network: Network,
): Promise<IBrc20[]> => {
  const url = `https://unisat.io/${
    network === testnet ? 'testnet' : ''
  }/wallet-api-v4/brc20/tokens?address=${address}&cursor=0&size=100
    `;
  const headers = {
    'X-Address': address,
    'X-Channel': 'store',
    'X-Client': 'UniSat Wallet',
    'X-Udid': '1SRcnclB8Ck3',
    'X-Version': '1.1.21',
  };

  const res = await fetch(url, { headers });
  const brc20Datas = await res.json();

  const brc20s: IBrc20[] = [];
  brc20Datas.result.list.forEach((brc20Data: any) => {
    brc20s.push({
      availableBalance: brc20Data.availableBalance,
      overallBalance: brc20Data.overallBalance,
      ticker: brc20Data.ticker,
      transferableBalance: brc20Data.transferableBalance,
    });
  });

  return brc20s;
};

export const getBrc20TransferableList = async (
  address: string,
  ticker: string,
  network: Network,
): Promise<IBrc20Transferable[]> => {
  const url = `https://unisat.io/${
    network === testnet ? 'testnet' : ''
  }/wallet-api-v4/brc20/token-summary?address=${address}&ticker=${ticker}`;
  const headers = {
    'X-Address': address,
    'X-Channel': 'store',
    'X-Client': 'UniSat Wallet',
    'X-Udid': '1SRcnclB8Ck3',
    'X-Version': '1.1.21',
  };

  const res = await fetch(url, { headers });
  const brc20Datas = await res.json();

  return brc20Datas.result.transferableList.map((item: any) => ({
    ...item,
    inscriptionNumber: Number(item.inscriptionNumber),
    amount: Number(item.amount),
  }));
};

import { type Network } from '../';
import Bitcoin from './bitcoin';
import { getInscriptions } from './inscription';

interface IUtxo {
  txid: string;
  vout: number;
  value: number;
}

export const getUtxos = async (
  address: string,
  network: Network,
): Promise<IUtxo[]> => {
  const url = `https://mempool.space/${
    network === Bitcoin.networks.testnet ? 'testnet' : ''
  }/api/address/${address}/utxo`;

  const res = await fetch(url);
  const utxoDatas = await res.json();
  const utxos: IUtxo[] = [];
  utxoDatas.forEach((utxoData: any) => {
    utxos.push({
      txid: utxoData.txid,
      vout: utxoData.vout,
      value: utxoData.value,
    });
  });
  return utxos;
};

export const getTransferableUtxos = async (
  address: string,
  network: Network,
): Promise<IUtxo[]> => {
  const transferableUtxos: IUtxo[] = [];
  const utxos = await getUtxos(address, network);
  const inscriptions = await getInscriptions(address, network);

  utxos.forEach(utxo => {
    const inscriptionUtxo = inscriptions.find(inscription => {
      return inscription.output.includes(utxo.txid);
    });
    if (!inscriptionUtxo) transferableUtxos.push(utxo);
  });

  return transferableUtxos;
};

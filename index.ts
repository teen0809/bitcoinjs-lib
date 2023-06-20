import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
// import { regtestUtils } from './test/integration/_regtest';
import * as bitcoin from './';
import { Taptree } from './src/types';
import { toXOnly } from './src/psbt/bip371';
import { getInscriptions } from './utils/inscription';
import Bitcoin from './utils/bitcoin';
import { getTransferableUtxos } from './utils/utxo';

// const rng = require('randombytes');
// const regtest = regtestUtils.network;
const regtest = bitcoin.networks.testnet;
bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);

const main = async () => {
  const str =
    'e562d86fcc758bedf9b8300e9f0c7582400f128c05f9aa6800241fd26b75cf1c43732daaf21f827deaf27d4b96010f03025ce315e3c1e7a9a78f0a6f4418e64b';
  const buffer = Buffer.from(str, 'hex');

  const internalKey = bip32.fromSeed(buffer, regtest);

  // const seeds = [
  //   '8a46b2f16aeecb460dda28f8a2818ca4ef27c6977c6293a73632c5976d8451b2ecf6493560e8ff5581ae455be76acbfe01935a8fe85abe85e2429ba88efb0fcb',
  //   '349e0692acd685281201538361d5622cdfc237bf8969b971381f3841b8df98f80f2c8d5859eb0fecbe25d271067901ab7bb7745557c47bfdd92bc079242eece2',
  //   '641da014f8c502a0a32648bb3478f0bdc03df21c9625243d56301f717d84826616cc94b5bb1f868f1eaf702f119f4b7c102a5584e30f5e81f22d640893c00e00',
  // ];

  // const leafKeys: BIP32Interface[] = [];
  const leafPubkeys: string[] = [
    '0365782b64ecf0be74c6fb00563959a3e5943a3988a2bb7c4c5b548ca189711247',
    '02d078e82067713308613a2761bed619c4ba64b9ecf2f418388d5576af6dc61b68',
    '025044abd323350c2724afe38bec6b9b5284b65a23b71eaf0f89489fd47e1a4bd3',
  ];
  // for (let i = 0; i < 3; i++) {
  //   const leafKey = bip32.fromSeed(Buffer.from(seeds[i], 'hex'), regtest);
  //   leafKeys.push(leafKey);
  //   console.log(leafKey.publicKey.toString('hex'));
  //   leafPubkeys.push(toXOnly(leafKey.publicKey).toString('hex'));
  // }

  const leafScriptAsm = `${leafPubkeys[2]} OP_CHECKSIG ${leafPubkeys[1]} OP_CHECKSIGADD ${leafPubkeys[0]} OP_CHECKSIGADD OP_3 OP_NUMEQUAL`;

  console.log('leafScriptAsm', leafScriptAsm);

  const leafScript = bitcoin.script.fromASM(leafScriptAsm);

  const scriptTree: Taptree = [
    {
      output: bitcoin.script.fromASM(
        '50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0 OP_CHECKSIG',
      ),
    },
    [
      {
        output: bitcoin.script.fromASM(
          '50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0 OP_CHECKSIG',
        ),
      },
      {
        output: leafScript,
      },
    ],
  ];
  const redeem = {
    output: leafScript,
    redeemVersion: 192,
  };

  const { output, address, witness } = bitcoin.payments.p2tr({
    internalPubkey: toXOnly(internalKey.publicKey),
    scriptTree,
    redeem,
    network: regtest,
  });

  console.log('internalKey.publicKey', internalKey.publicKey);
  console.log('internalKey.privateKey', internalKey.privateKey);
  console.log('output', output);
  console.log('address', address);
  console.log('witness', witness);

  // amount from faucet
  const amount = 10000;
  // amount to send
  const sendAmount = 10000 - 1000;
  // get faucet
  // const unspent = await regtestUtils.faucetComplex(output!, amount);

  const psbt = new bitcoin.Psbt({ network: regtest });
  psbt.addInputs([
    {
      hash: '0cf0fc5f71bef93e6875d657b1b26dc556bf5868f0358a0062f21902ef3cc6fc',
      index: 0,
      witnessUtxo: { value: amount, script: output! },
      tapLeafScript: [
        {
          leafVersion: redeem.redeemVersion,
          script: redeem.output,
          controlBlock: witness![witness!.length - 1],
        },
      ],
    },
  ]);

  psbt.addOutput({
    value: sendAmount,
    address: 'tb1pgfu6rz0x4halm7qyeknxdg2hlnlg020cd6x8zpvny7utgldwevjq9hp5vd',
  });

  const psbtHex = psbt.toHex();

  console.log('psbtHex', psbtHex);

  // const psbt1 = bitcoin.Psbt.fromBase64(
  //   '70736274ff01005e0200000001d11b89ab21a9412ae30d5681bfcd8a9adbf19e333c270778050d3c84b811ebb10000000000ffffffff0128230000000000002251204279a189e6adfbfdf804cda666a157fcfe87a9f86e8c71059327b8b47daecb24000000000001012b102700000000000022512062a58adae6990c9654e8fba16f7554f3f9db46915339bdceaca50c9fb48257786215c059bf165f428ba9f838a0cebc758213717ae09a962777abab809d6851dd020a2c1a529c9fb3cd7e776d61b6225b6c610e8906fb8faa6c59ac5c3e95b5f82d29d61a529c9fb3cd7e776d61b6225b6c610e8906fb8faa6c59ac5c3e95b5f82d29d66c2103be05e4d8d4b1cc1bae38ce1e6d29df399124c43c723a3c3b0d10f72acd373b57ac21022412f45db91883e8da4cf3f456f539e0ef44b34b30ca92347ab6af1176a673fdba21029fd928065e713d0b55e473caf23056000ea59ab4c44cd03e1899669ecec822bdba539cc00000',
  // );
  // const psbt2 = bitcoin.Psbt.fromBase64(
  //   '70736274ff01005e0200000001d11b89ab21a9412ae30d5681bfcd8a9adbf19e333c270778050d3c84b811ebb10000000000ffffffff0128230000000000002251204279a189e6adfbfdf804cda666a157fcfe87a9f86e8c71059327b8b47daecb24000000000001012b102700000000000022512062a58adae6990c9654e8fba16f7554f3f9db46915339bdceaca50c9fb48257786215c059bf165f428ba9f838a0cebc758213717ae09a962777abab809d6851dd020a2c1a529c9fb3cd7e776d61b6225b6c610e8906fb8faa6c59ac5c3e95b5f82d29d61a529c9fb3cd7e776d61b6225b6c610e8906fb8faa6c59ac5c3e95b5f82d29d66c2103be05e4d8d4b1cc1bae38ce1e6d29df399124c43c723a3c3b0d10f72acd373b57ac21022412f45db91883e8da4cf3f456f539e0ef44b34b30ca92347ab6af1176a673fdba21029fd928065e713d0b55e473caf23056000ea59ab4c44cd03e1899669ecec822bdba539cc00000',
  // );
  // const psbt0 = bitcoin.Psbt.fromBase64(psbtText);

  // // random order for signers
  // psbt0.signInput(0, leafKeys[0]);
  // psbt1.signInput(0, leafKeys[1]);
  // psbt2.signInput(0, leafKeys[2]);

  // psbt0.validateSignaturesOfInput(0, () => true);
  // psbt1.validateSignaturesOfInput(0, () => true);
  // psbt2.validateSignaturesOfInput(0, () => true);

  // psbt.combine(psbt0, psbt1, psbt2);

  // psbt.finalizeAllInputs();

  // const tx = psbt.extractTransaction();
  // const rawTx = tx.toBuffer();
  // const hex = rawTx.toString('hex');

  // console.log(hex);

  // await regtestUtils.broadcast(hex);
  // await regtestUtils.verify({
  //   txId: tx.getId(),
  //   address: 'tb1pn952y2hrpzf9gfnmsg0zht2smhn2lrzxz569vtpt23aj8wqgndmsc4g58d',
  //   vout: 0,
  //   value: sendAmount,
  // });
};

main();

const sendInscription = async (
  address: string,
  insriptionId: string,
  redeem: {
    output: Buffer;
    redeemVersion: number;
  },
  witness: Buffer[],
  output: Buffer,
  receiver: string,
): Promise<Bitcoin.Psbt> => {
  const testnet = bitcoin.networks.testnet;
  const inscriptionUtxos = await getInscriptions(address, testnet);
  const inscriptionUtxo = inscriptionUtxos.find(
    utxo => utxo.inscriptionId === insriptionId,
  );

  // check if the inscription is owned of admin wallet
  if (!inscriptionUtxo) throw new Error('Can not find that inscription');

  const [inscriptionHash, inscriptionIndex] = inscriptionUtxo.output.split(
    ':',
  ) as [string, string];

  // check it has fee
  const utxos = await getTransferableUtxos(address as string, testnet);
  const feeUTXO = utxos.find(utxo => utxo.value > 1000);
  if (!feeUTXO) throw new Error("You don't have enough fees");

  const psbt = new Bitcoin.Psbt({ network: testnet });

  psbt.addInputs([
    {
      hash: '0cf0fc5f71bef93e6875d657b1b26dc556bf5868f0358a0062f21902ef3cc6fc',
      index: 0,
      witnessUtxo: { value: inscriptionUtxo.outputValue, script: output! },
      tapLeafScript: [
        {
          leafVersion: redeem.redeemVersion,
          script: redeem.output,
          controlBlock: witness![witness!.length - 1],
        },
      ],
    },
  ]);

  return psbt;
};

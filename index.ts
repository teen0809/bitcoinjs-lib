import BIP32Factory, { BIP32Interface } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { regtestUtils } from './test/integration/_regtest';
import * as bitcoin from './';
import { Taptree } from './src/types';
import { toXOnly } from './src/psbt/bip371';

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

  console.log('internalKey', internalKey);

  const seeds = [
    '8a46b2f16aeecb460dda28f8a2818ca4ef27c6977c6293a73632c5976d8451b2ecf6493560e8ff5581ae455be76acbfe01935a8fe85abe85e2429ba88efb0fcb',
    '349e0692acd685281201538361d5622cdfc237bf8969b971381f3841b8df98f80f2c8d5859eb0fecbe25d271067901ab7bb7745557c47bfdd92bc079242eece2',
    '641da014f8c502a0a32648bb3478f0bdc03df21c9625243d56301f717d84826616cc94b5bb1f868f1eaf702f119f4b7c102a5584e30f5e81f22d640893c00e00',
  ];

  const leafKeys: BIP32Interface[] = [];
  const leafPubkeys: string[] = [];
  for (let i = 0; i < 3; i++) {
    const leafKey = bip32.fromSeed(Buffer.from(seeds[i], 'hex'), regtest);
    leafKeys.push(leafKey);
    leafPubkeys.push(toXOnly(leafKey.publicKey).toString('hex'));
  }

  const leafScriptAsm = `${leafPubkeys[2]} OP_CHECKSIG ${leafPubkeys[1]} OP_CHECKSIGADD ${leafPubkeys[0]} OP_CHECKSIGADD OP_3 OP_NUMEQUAL`;

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
  const amount = 1000000;
  // amount to send
  const sendAmount = 1000000 - 10000;
  // get faucet
  // const unspent = await regtestUtils.faucetComplex(output!, amount);

  // console.log('unspent', unspent);
  const psbt = new bitcoin.Psbt({ network: regtest });
  psbt.addInputs([
    {
      hash: 'b805a3bff7d6b6729adae4637376136d64c48b2542682c201204118453cf4029',
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
    // {
    //   hash: '212729bef72904b4466ca60d6ffd403782f4959a1627272963f493b279954870',
    //   index: 0,
    //   witnessUtxo: { value: amount, script: output! },
    //   tapLeafScript: [
    //     {
    //       leafVersion: redeem.redeemVersion,
    //       script: redeem.output,
    //       controlBlock: witness![witness!.length - 1],
    //     },
    //   ],
    // },
  ]);

  psbt.addOutput({
    value: sendAmount,
    address: 'tb1pgfu6rz0x4halm7qyeknxdg2hlnlg020cd6x8zpvny7utgldwevjq9hp5vd',
  });

  const psbtText = psbt.toBase64();

  const psbt1 = bitcoin.Psbt.fromBase64(psbtText);
  const psbt2 = bitcoin.Psbt.fromBase64(psbtText);
  const psbt0 = bitcoin.Psbt.fromBase64(psbtText);

  // random order for signers
  psbt0.signInput(0, leafKeys[0]);
  psbt1.signInput(0, leafKeys[1]);
  psbt2.signInput(0, leafKeys[2]);

  psbt0.validateSignaturesOfInput(0, () => true);
  psbt1.validateSignaturesOfInput(0, () => true);
  psbt2.validateSignaturesOfInput(0, () => true);

  psbt.combine(psbt0, psbt1, psbt2);

  psbt.finalizeAllInputs();

  const tx = psbt.extractTransaction();
  const rawTx = tx.toBuffer();
  const hex = rawTx.toString('hex');

  console.log(hex);

  await regtestUtils.broadcast(hex);
  await regtestUtils.verify({
    txId: tx.getId(),
    address: 'tb1pn952y2hrpzf9gfnmsg0zht2smhn2lrzxz569vtpt23aj8wqgndmsc4g58d',
    vout: 0,
    value: sendAmount,
  });
};

main();

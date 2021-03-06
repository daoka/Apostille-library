import * as nemSDK from 'nem-sdk';
import { Account, Deadline, ModifyMultisigAccountTransaction, MultisigCosignatoryModification, MultisigCosignatoryModificationType, NetworkType, PublicAccount, SignedTransaction } from 'nem2-sdk';
import { SHA256 } from '../../hash/sha256';
import { ApostillePublicAccount } from './ApostillePublicAccount';

const nem = nemSDK.default;
const fixPrivateKey = (privateKey) => {
  return ('0000000000000000000000000000000000000000000000000000000000000000' + privateKey.replace(/^00/, ''))
    .slice(-64);
};

/**
 * @description the private apostille class
 * @class Apostille
 */
export class Apostille {

  /**
   * @description init apostille
   * @static
   * @param {string} seed
   * @param {Account} generatorAccount
   * @returns {Apostille}
   * @memberof Apostille
   */
  public static init(
    seed: string,
    generatorAccount: Account): Apostille {
    const networkType = generatorAccount.address.networkType;
    // hash the seed for the apostille account
    const hashSeed = SHA256.hash(seed);
    let privateKey: string;
    // sign the hashed seed to get the private key
    if (networkType === NetworkType.MAIN_NET || networkType === NetworkType.TEST_NET) {
      const keyPair = nem.crypto.keyPair.create(generatorAccount.privateKey);
      privateKey = fixPrivateKey(keyPair.sign(hashSeed).toString());
    } else {
      privateKey = fixPrivateKey(generatorAccount.signData(hashSeed));
    }
    // create the HD acccount (appostille)
    const hdAccount = Account.createFromPrivateKey(privateKey, networkType);
    return new Apostille(hdAccount);
  }

  private publicAccount;

  /**
   * Creates an instance of Apostille.
   * @param {Account} hdAccount - the apostille account (HD account)
   * @param {Account} generatorAccount - the account used to sign the hash to generate the HD account private key
   * @memberof Apostille
   */
  public constructor(
    public readonly HDAccount: Account,
  ) {
    this.publicAccount =  new ApostillePublicAccount(this.HDAccount.publicAccount);
  }

  /**
   *
   * @description - create a multisig contract to own the apostille account
   * @param {PublicAccount[]} owners- array of public account that will become owners
   * @param {number} quorum - the minimum number of owners necessary to agree on the apostille account activities
   * @param {number} minRemoval - minimum number of owners necessary to agree to remove one or some owners
   * @returns {SignedTransaction}
   * @memberof Apostille
   */
  public associate(owners: PublicAccount[], quorum: number, minRemoval: number): SignedTransaction {
    const modifications: MultisigCosignatoryModification[] = [];
    owners.forEach((cosignatory) => {
      modifications.push(
        new MultisigCosignatoryModification(
          MultisigCosignatoryModificationType.Add,
          cosignatory));
    });
    const modifyMultisigTransaction = ModifyMultisigAccountTransaction.create(
      Deadline.create(),
      quorum,
      minRemoval,
      modifications,
      this.HDAccount.address.networkType,
    );

    const signedTransaction = this.HDAccount.sign(modifyMultisigTransaction);

    return signedTransaction;
  }

  get apostillePublicAccount(): ApostillePublicAccount {
    return this.publicAccount;
  }

}

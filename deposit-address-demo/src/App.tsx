import logo from "./axelar-logo-horizontal-white.svg";
import "./App.css";
import { AxelarAPI } from "./AxelarApi";
import { ethers } from "ethers";
import {
  AssetInfo,
  AssetInfoWithTrace,
  AssetTransferObject,
  Chain,
  ChainInfo,
  ChainList,
} from "@axelar-network/axelarjs-sdk";
import { useCallback, useEffect, useState } from "react";
import bs58 from 'bs58';

import {
  SignBytesFailed,
  SignBytesResult,
  Timeout,
  useConnectedWallet,
  UserDenied,
  verifyBytes,
  useWallet, WalletStatus
} from '@terra-money/wallet-provider';

// import {
//   NetworkInfo,
//   WalletProvider,
//   WalletStatus,
//   getChainOptions,
// } from '@terra-money/wallet-provider';

import { LCDClient, MsgSend, RawKey, MnemonicKey, isTxError } from '@terra-money/terra.js';

const terra = new LCDClient({
  URL: 'https://broken-hidden-dream.terra-testnet.quiknode.pro/2288fd4b3a4b727acc322c1802575d8730cac6fb/',
  chainID: 'bombay-12',
});

const ogKey = Buffer.from([161, 19, 133, 115, 209, 82, 216, 216, 178, 163, 238, 3, 224, 112, 141, 4, 11, 28, 119, 24, 10, 89, 99, 42, 247, 23, 242, 196, 144, 92, 209, 95, 243, 211, 145, 65, 119, 142, 196, 109, 253, 14, 53, 226, 9, 65, 253, 55, 23, 60, 91, 109, 186, 61, 29, 32, 210, 212, 151, 245, 160, 55, 77, 114].slice(0, 32));
const amanKey = new RawKey(ogKey);

const wallet = terra.wallet(amanKey);
const amanAddress1 = wallet.key.accAddress;
console.log("AMAN ADDRESS")
console.log(amanAddress1);


const api = new AxelarAPI("testnet");
// const provider = new ethers.providers.Web3Provider(
//   (window as any).ethereum,
//   "any"
// ); //2nd param is network type

// const signerAuthority = provider.getSigner();

var sig = ""; 
function App() {
  const {
    status,
    network,
    wallets,
    availableConnectTypes,
    availableInstallTypes,
    availableConnections,
    supportFeatures,
    connect,
    install,
    disconnect,
  } = useWallet();



  const [depositAddr, setDepositAddr] = useState("");
  const [txResult, setTxResult] = useState<SignBytesResult | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const connectedWallet = useConnectedWallet();
  console.log("WALLET")
  console.log(connectedWallet);

  useEffect(() => {
    (window as any)?.ethereum?.enable();
  });

  const send = useCallback(async () => {
    if (!connectedWallet) {
      console.log("NO CONNECTED WALLET")
      return;
    }

    console.log("IN THE SEND FUNCTION")

    setTxResult(null);
    setTxError(null);
    setVerifyResult(null);



    console.log("WALLET")
    console.log(connectedWallet);

    const { validationMsg, otc } = await getNoncedMessageToSign();

    const TEST_BYTES = Buffer.from(validationMsg);

    connectedWallet
      .signBytes(TEST_BYTES)
      .then(async(nextSignBytesResult: SignBytesResult) => {
        console.log("RESULTS");
        console.log(nextSignBytesResult);
        console.log(nextSignBytesResult.result.signature);

        var test = Buffer.from(nextSignBytesResult.result.signature);
        var hex = test.toString('hex');
        var base58Sig = bs58.encode(test);
        console.log(test)
        console.log("CONVERTED TO BS58");
        

        console.log(bs58.encode(test));

        console.log("CONVERTED TO HEX");
        console.log(hex);

        sig = hex;

        setTxResult(nextSignBytesResult);
        setTxError(null);

        const result = verifyBytes(TEST_BYTES, nextSignBytesResult.result);
        
        console.log("VERIFY");
        console.log(result);

        setVerifyResult(result ? 'Verify OK' : 'Verify failed');
        await getDepositAddress()
      })
      .catch((error) => {
        setTxResult(null);
        setVerifyResult(null);

        if (error instanceof UserDenied) {
          setTxError('User Denied');
        } else if (error instanceof Timeout) {
          setTxError('Timeout');
        } else if (error instanceof SignBytesFailed) {
          setTxError('Sign Bytes Failed');
        } else {
          setTxError(
            'Unknown Error: ' +
              (error instanceof Error ? error.message : String(error)),
          );
        }
      });
  }, [connectedWallet]);

  const getNoncedMessageToSign = useCallback(async () => {
    // const signerAuthorityAddress = await signerAuthority.getAddress();
    // console.log("AUTHORITY ADDRESS IS")
    // console.log(signerAuthorityAddress);
    const { validationMsg, otc } = await api.getOneTimeMessageToSign(
         amanAddress1
      //  signerAuthorityAddress
    );

    return { validationMsg, otc };
  }, []);

  const promptUserToSignMessage = useCallback(async () => {
    console.log("PROMPTING USER");

    // await send();

    const { validationMsg, otc } = await getNoncedMessageToSign();
    console.log(validationMsg);
    console.log(otc);
    // const signature = await signerAuthority.signMessage(validationMsg);

  //   const send = new MsgSend(
  //     amanAddress1, 
  //     amanAddress1,
  //     { uluna: 1 }
  // );

  await send();

  //   const signedTx : any = await wallet.createAndSignTx({
  //     msgs: [send],
  //     memo: validationMsg
  // });

  //  console.log(signedTx);
    return {
      otc,
      publicAddr: amanAddress1,
      // await signerAuthority.getAddress(),
      signature: sig //signature
      //  signedTx.signatures[0],
    };
  }, [getNoncedMessageToSign]);

  const getDepositAddress = useCallback(
    async (destinationAddress?: string) => {
      console.log("DESTINATIONADDRESS");
      console.log(destinationAddress);
      const { otc, publicAddr, signature } = await promptUserToSignMessage();
      const parameters: AssetTransferObject = getParameters(
        destinationAddress || publicAddr
      ); // wherever you specify for the destination address on the destination chain
      parameters.otc = otc;
      parameters.publicAddr = publicAddr;
      parameters.signature = signature;

      console.log("PARAMS");
      console.log(parameters);
      const linkAddressInfo: AssetInfoWithTrace = await api.getDepositAddress(
        parameters
      );

      console.log(linkAddressInfo)
      if (linkAddressInfo?.assetInfo?.assetAddress)
        setDepositAddr(linkAddressInfo?.assetInfo?.assetAddress);
    },
    [promptUserToSignMessage]
  );

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <div style={{ cursor: `pointer` }} onClick={() => getDepositAddress()}>
          Click here to generate a link address for a transaction to initiate the transfer of AXL testnet tokens from Axelar to Avalanche network.
        </div>
        <button onClick={async() => {
       await connect()
       await send()
       
        }}>CONNECT</button>
        {depositAddr && (
          <div style={{ fontSize: `0.8em` }}>
            <br />
            <div>ONE TIME DEPOSIT ADDRESS GENERATED: </div>
            <div>{depositAddr}</div>
            <br />
            <div>
              Tell your users they will have to make a deposit of AXL tokens into this
              one-time address.
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

const getParameters = (
  destinationAddress: string,
  sourceChainName: string = "ethereum",
  destinationChainName: string = "terra",
  asset_common_key: string = "uusd"
) => {
  /*
	info for sourceChainInfo and destinationChainInfo fetched from the ChainList module. 
	* */
  const chainInfoList: ChainInfo[] = ChainList.map(
    (chain: Chain) => chain.chainInfo
  );
  const terraChain: ChainInfo = chainInfoList.find(
    (chainInfo: ChainInfo) =>
      chainInfo.chainName.toLowerCase() === sourceChainName.toLowerCase()
  ) as ChainInfo;
  const avalancheChain: ChainInfo = chainInfoList.find(
    (chainInfo: ChainInfo) =>
      chainInfo.chainName.toLowerCase() === destinationChainName.toLowerCase()
  ) as ChainInfo;

  console.log("PRINTING CHAINS");
  console.log(terraChain.assets);
  console.log(chainInfoList);

  const assetObj = terraChain.assets?.find(
    (asset: AssetInfo) => asset.common_key === asset_common_key
  ) as AssetInfo;

  let requestPayload: AssetTransferObject = {
    sourceChainInfo: terraChain,
    destinationChainInfo: avalancheChain,
    selectedSourceAsset: assetObj,
    selectedDestinationAsset: {
      ...assetObj,
      assetAddress: destinationAddress, //address on the destination chain where you want the tokens to arrive
    },
    signature: "SIGNATURE_FROM_METAMASK_SIGN",
    otc: "OTC_RECEIVED_FROM_SERVER",
    publicAddr: "SIGNER_OF_SIGNATURE",
    transactionTraceId: "YOUR_OWN_UUID", //your own UUID, helpful for tracing purposes. optional.
  };

  return requestPayload;
};

export default App;

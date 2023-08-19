import Head from "next/head";
import { toast } from 'react-toastify'
import { useState, useEffect, useRef } from 'react'
import SocialLogin from "@biconomy/web3-auth"
import { ParticleProvider, ParticleAuthModule } from '@biconomy/particle-auth';
import { ChainId } from "@biconomy/core-types";
import { Bundler } from '@biconomy/bundler'
import { BiconomySmartAccount, type BiconomySmartAccountConfig, DEFAULT_ENTRYPOINT_ADDRESS } from "@biconomy/account"
import { BiconomyPaymaster, type IHybridPaymaster, SponsorUserOperationDto, PaymasterMode } from '@biconomy/paymaster'
import { ethers, BigNumber } from "ethers";

const bundler = new Bundler({
  bundlerUrl: 'https://bundler.biconomy.io/api/v2/80001/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44',
  chainId: ChainId.POLYGON_MUMBAI,
  entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
})

const paymaster = new BiconomyPaymaster({
  paymasterUrl: "https://paymaster.biconomy.io/api/v1/80001/4ES6g0ZzL.358e7a5b-7a00-4785-b959-db4216ce0a04"
})

const COUNTER_ADDRESS = "0x47fb1243526134eb413626a6f513811a452d817d"

const ABI = [{ "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "newCount", "type": "uint256" }], "name": "updateCount", "type": "event" }, { "inputs": [], "name": "count", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "incrementCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" }]

export default function Home() {

  const [smartAccount, setSmartAccount] = useState<BiconomySmartAccount | null>(null)
  const [loading, setLoading] = useState(false)
  const [interval, enableInterval] = useState(false)
  const sdkRef = useRef<SocialLogin | null>(null)
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null)
  const [scLoading, setScLoading] = useState(false)
  const [count, setCount] = useState(BigNumber.from('0'));

  useEffect(() => {
    if (interval) {
      const configureLogin = setInterval(() => {
        if (!!sdkRef.current?.provider) {
          void setupSmartAccount();
          clearInterval(configureLogin)
        }
      }, 1000)
    }
  }, [interval])

  useEffect(() => {

    if (provider) {
      void getCount()
    }

  }, [provider])


  async function setupSmartAccount() {
    if (!sdkRef?.current?.provider) return
    sdkRef.current.hideWallet()
    setLoading(true)
    const web3Provider = new ethers.providers.Web3Provider(
      sdkRef.current.provider
    )
    setProvider(web3Provider)

    try {
      const biconomySmartAccountConfig: BiconomySmartAccountConfig = {
        signer: web3Provider.getSigner(),
        chainId: ChainId.POLYGON_MUMBAI,
        bundler: bundler,
        paymaster: paymaster
      }
      let biconomySmartAccount = new BiconomySmartAccount(biconomySmartAccountConfig)
      biconomySmartAccount = await biconomySmartAccount.init()
      console.log("owner: ", biconomySmartAccount.owner)
      console.log("address: ", await biconomySmartAccount.getSmartAccountAddress())
      console.log("deployed: ", await biconomySmartAccount.isAccountDeployed(await biconomySmartAccount.getSmartAccountAddress()))

      setSmartAccount(biconomySmartAccount)
      setLoading(false)
    } catch (err) {
      console.log('error setting up smart account... ', err)
    }
  }

  async function login() {
    if (!sdkRef.current) {
      const socialLoginSDK = new SocialLogin()
      //const signature1 = await socialLoginSDK.whitelistUrl("http://127.0.0.1:3000/")
      const signature2 = await socialLoginSDK.whitelistUrl("https://biconomy-fe-min-example.vercel.app")
      await socialLoginSDK.init({
        chainId: ethers.utils.hexValue(ChainId.POLYGON_MUMBAI).toString(),
        network: "testnet",
        whitelistUrls: {
          //"http://127.0.0.1:3000/": signature1,
          "https://biconomy-fe-min-example.vercel.app": signature2
        }
      })
      sdkRef.current = socialLoginSDK
    }
    if (!sdkRef.current.provider) {
      sdkRef.current.showWallet()
      enableInterval(true)
    } else {
      await setupSmartAccount()
    }
  }

  const handleLogin = () => {
    void login();
  }

  const logout = async () => {
    if (!sdkRef.current) {
      console.error('Web3Modal not initialized.')
      return
    }
    await sdkRef.current.logout()
    sdkRef.current.hideWallet()
    setSmartAccount(null)
    enableInterval(false)
  }

  const handleLogout = () => {
    void logout();
  }

  function formatEthereumAddress(address: string) {
    if (address.startsWith("0x")) {
      address = address.slice(2); // Remove the "0x" prefix if it's already there
    }
    return "0x" + address.slice(0, 4) + "..." + address.slice(-4);
  }

  const incrementCount = async () => {
    const toastId = toast.loading('Processing count on the blockchain!', {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "dark",
    });
    try {
      console.log('Begin Increment Account')
      setScLoading(true)


      if (!smartAccount) throw Error('SmartAccount Cannot be null');

      console.log('passed smart account')

      const incrementTx = new ethers.utils.Interface(["function incrementCount()"]);
      const data = incrementTx.encodeFunctionData("incrementCount");

      const tx1 = {
        to: COUNTER_ADDRESS,
        data: data,
      };

      const partialUserOp = await smartAccount.buildUserOp([tx1]);

      const biconomyPaymaster = smartAccount.paymaster as IHybridPaymaster<SponsorUserOperationDto>;

      const paymasterServiceData: SponsorUserOperationDto = {
        mode: PaymasterMode.SPONSORED,
        // optional params...
      };

      try {
        const paymasterAndDataResponse = await biconomyPaymaster.getPaymasterAndData(partialUserOp, paymasterServiceData);
        partialUserOp.paymasterAndData = paymasterAndDataResponse.paymasterAndData;

        const userOpResponse = await smartAccount.sendUserOp(partialUserOp);
        const transactionDetails = await userOpResponse.wait();

        console.log("Transaction Details:", transactionDetails);
        console.log("Transaction Hash:", userOpResponse.userOpHash);

        toast.update(toastId, {
          render: `Transaction Hash: ${userOpResponse.userOpHash}`,
          type: 'success',
          isLoading: false,
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "dark",
        });

        setScLoading(false)

        await getCount()

        //getCount(true);
      } catch (e) {
        console.error("Error executing transaction:", e);
        // ... handle the error if needed ...
        setScLoading(false)
        toast.update(toastId, {
          render: 'Error occurred, check the console',
          type: "error",
          isLoading: false,
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "dark",
        });
      }
    } catch (error) {
      console.error("Error executing transaction:", error);
      toast.update(toastId, {
        render: 'Error occurred, check the console',
        type: "error",
        isLoading: false,
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });
      setScLoading(false)
    }
  };

  const handleIncrementCount = () => {
    void incrementCount();
  }

  const getCount = async () => {
    try {
      if (!provider) throw Error('Provider is null when reading count');
      const contract = new ethers.Contract(COUNTER_ADDRESS, ABI, provider)
      const count: BigNumber = await contract.count();
      setCount(count)
    } catch (error) {
      console.error("Error executing call:", error);
    }
  }

  // Exampl

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            Create <span className="text-[hsl(280,100%,70%)]">T3</span> App
          </h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
            <div
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white hover:bg-white/20"
            >

              {
                !smartAccount && !loading &&
                <>
                  <h3 className="text-2xl font-bold">Connect Your Wallet→</h3>
                  <div className="text-lg">
                    Connect Your Wallet Here
                  </div>
                  <button onClick={handleLogin} className="py-4 px-6 text-white bg-gray-800 border rounded-xl border-purple-700">Login</button>
                </>
              }
              {
                smartAccount && !loading &&
                <>
                  <h3 className="text-2xl font-bold">Hello Smart Account Owner {formatEthereumAddress(smartAccount.owner)}</h3>
                  <button onClick={handleLogout} className="py-4 px-6 text-white bg-gray-800 border rounded-xl border-purple-700">Logout</button>
                </>
              }
            </div>
            <div
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white hover:bg-white/20"
            >
              <h3 className="text-2xl font-bold">SmartContract→</h3>
              {
                smartAccount ?
                  <>
                    <h2>Count = {count.toString()}</h2>
                    <button onClick={handleIncrementCount} disabled={scLoading} className={`py-4 px-6 text-white ${scLoading ? "bg-gray-500 cursor-not-allowed" : "bg-gray-800"} border rounded-xl border-purple-700`}>Increment Count</button>
                  </>
                  :
                  <>
                    <div className="text-lg">
                      Please Login in order to read or write to the smartcontract
                    </div>
                  </>
              }
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

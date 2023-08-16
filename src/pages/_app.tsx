import { type AppType } from "next/dist/shared/lib/utils";
import "~/styles/globals.css";

import { ToastContainer, } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import "@biconomy/web3-auth/dist/src/style.css"

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <>
      <Component {...pageProps} />
      <ToastContainer />
    </>
  )
};

export default MyApp;

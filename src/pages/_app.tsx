import "../styles/globals.css";
import type { AppType } from "next/dist/shared/lib/utils";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <div className="bg-gray-100 dark:bg-gray-800">
      <Component {...pageProps} />
    </div>
  );
};

export default MyApp;

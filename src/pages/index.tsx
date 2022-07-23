import type { NextPage } from "next";
import Head from "next/head";

import { isChromium, isChrome, isOpera } from "react-device-detect";

import { CameraIcon, FolderIcon } from "@heroicons/react/solid"
import { useEffect, useState } from "react";

type TechnologyCardProps = {
  name: string;
  description: string;
  documentation: string;
};

const Home: NextPage = () => {
  const [isCompatible, setIsCompatible] = useState(false);

  useEffect(() => {
    setIsCompatible(isChromium || isChrome || isOpera);
  }, []);

  const handleClick = async () => {
    console.log("clicked");
    const dirHandle = await (window as any).showDirectoryPicker()
      .then(dirHandle => {
        console.log(dirHandle);
        //return dirHandle;
      })
      .catch(function (e) {
        console.log(e);
      });
    // for await (const entry of dirHandle.values()) {
    //   console.log(entry.kind, entry.name);
    // }
  }

  return (
    <>
      <Head>
        <title>nxshot</title>
        <meta name="description" content="Nintendo Switch screenshot organizer" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto flex flex-col items-center justify-center h-screen p-4">
        <div className="flex flex-row items-center justify-center">
          <CameraIcon className="w-10 h-10 mt-2 mr-1 md:w-16 md:h-16 md:mt-4 md:mr-2 text-gray-800 dark:text-gray-300" />
          <h1 className="text-5xl md:text-[5rem] leading-normal font-extrabold text-gray-800 dark:text-gray-300">
            <span className="text-red-600">nx</span>shot
          </h1>
        </div>

        <p className="text-2xl text-gray-800 dark:text-gray-300 text-center">
          Automatically organize and timestamp your Nintendo Switch captures
        </p>

        <div className="flex flex-col justify-items-center align-middle justify-center mt-8">
          {isCompatible
            ? <button onClick={handleClick} className="text-gray-100 font-bold bg-red-600 hover:bg-red-700 active:bg-red-800 focus:outline-none focus:ring focus:ring-red-400 py-2 px-4 drop-shadow-xl rounded-md inline-flex items-center">
              <FolderIcon className="w-6 h-6 mr-2" />
              <span>Select folder...</span>
            </button>
            : <p className="text-gray-600 text-center">
              Your browser is not supported. Please use a compatible browser.
            </p>}
        </div>

        {/* <form className="flex flex-col items-center align-middle justify-center space-y-6">
          <label className="block text-gray-100">
            <input type="file" className="block w-full dark:text-gray-100
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:font-bold
              file:bg-red-600 file:text-gray-100
              hover:file:bg-red-700 active:file:bg-red-800
              focus:file:outline-none focus:file:ring focus:file:ring-red-400"
            />
            test
          </label>
        </form> */}
      </main>
    </>
  );
};

const TechnologyCard = ({
  name,
  description,
  documentation,
}: TechnologyCardProps) => {
  return (
    <section className="flex flex-col justify-center p-6 duration-500 border-2 border-gray-500 rounded shadow-xl motion-safe:hover:scale-105">
      <h2 className="text-lg text-gray-700">{name}</h2>
      <p className="text-sm text-gray-600">{description}</p>
      <a
        className="mt-3 text-sm underline text-violet-500 decoration-dotted underline-offset-2"
        href={documentation}
        target="_blank"
        rel="noreferrer"
      >
        Documentation
      </a>
    </section>
  );
};

export default Home;

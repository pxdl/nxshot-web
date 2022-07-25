import type { NextPage } from "next";
import Head from "next/head";
import { useEffect, useState } from "react";
import gameids from "../data/gameids.json"

import { isChromium, isChrome, isOpera, isEdge, isEdgeChromium } from "react-device-detect";

import { CameraIcon, DocumentIcon, FolderDownloadIcon, FolderIcon } from "@heroicons/react/solid"

type ScreenshotProps = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  gameid: string;
  gamename: string;
}

interface ExtendedFile extends File {
  relativePath?: string[] | null;
}

interface FileWithHandle {
  file: ExtendedFile;
  handle: FileSystemFileHandle;
}

async function* getFilesRecursively(entry: FileSystemDirectoryHandle | FileSystemFileHandle, originalEntry: FileSystemDirectoryHandle): AsyncGenerator<FileWithHandle> {
  if (entry.kind === 'file') {
    const file: ExtendedFile = await entry.getFile();
    if (file !== null) {
      file.relativePath = await originalEntry.resolve(entry);
      const fileWithHandle: FileWithHandle = {
        file: file,
        handle: entry
      };
      yield fileWithHandle;
    }
  } else if (entry.kind === 'directory') {
    for await (const handle of entry.values()) {
      yield* getFilesRecursively(handle, originalEntry);
    }
  }
}

const Home: NextPage = () => {
  const [isCompatible, setIsCompatible] = useState(false);
  const [albumDirectory, setAlbumDirectory] = useState<FileSystemDirectoryHandle>();
  const [files, setFiles] = useState<FileWithHandle[]>([]);

  useEffect(() => {
    setIsCompatible(isChromium || isChrome || isOpera || isEdge || isEdgeChromium);
  }, []);

  const handleClick = async () => {
    const dirHandle = await window.showDirectoryPicker()
      .catch((e) => {
        if (e.name === "AbortError") return;
      });

    if (!dirHandle) return;

    setAlbumDirectory(dirHandle);

    let filesArray: FileWithHandle[] = [];

    for await (const fileHandle of getFilesRecursively(dirHandle, dirHandle)) {
      filesArray.push(fileHandle);
    }

    const picturesArray = filesArray.filter((file) => file.file.type?.includes("image/jpeg") && file.file.name.length == 53);
    const videosArray = filesArray.filter((file) => file.file.type?.includes("video/mp4") && file.file.name.length == 53);
    setFiles([...picturesArray, ...videosArray]);
    //console.log(picturesArray.concat(videosArray));
  }

  const handleSave = async () => {
    if (!albumDirectory) return;

    console.log("Saving album");

    const organizedDirectory = await albumDirectory.getDirectoryHandle('Organized', {
      create: true,
    });

    const gameidsString = JSON.stringify(gameids);
    const gameidsObject = JSON.parse(gameidsString);

    for await (const fileWithHandle of files) {
      const screenshot: ScreenshotProps = {
        year: +fileWithHandle.file.name.substring(0, 4),
        month: +fileWithHandle.file.name.substring(4, 6) - 1,
        day: +fileWithHandle.file.name.substring(6, 8),
        hour: +fileWithHandle.file.name.substring(8, 10),
        minute: +fileWithHandle.file.name.substring(10, 12),
        second: +fileWithHandle.file.name.substring(12, 14),
        gameid: fileWithHandle.file.name.substring(17, 49),
        gamename: gameidsObject[fileWithHandle.file.name.substring(17, 49)] ?? "Unknown",
      }

      const dateTime = new Date(
        screenshot.year,
        screenshot.month,
        screenshot.day,
        screenshot.hour,
        screenshot.minute,
        screenshot.second
      );

      const posix_timestamp = dateTime.getTime() / 1000;

      const gameDirectoryHandle = await organizedDirectory.getDirectoryHandle(screenshot.gamename, {
        create: true,
      });

      // No special API to create copies, but still possible to do so by using
      // available read and write APIs.
      const new_file = await gameDirectoryHandle.getFileHandle(fileWithHandle.file.name, { create: true });

      // const toBeModified = await new_file.getFile();
      // const modified = {...toBeModified}
      // modified.lastModified = posix_timestamp;

      const new_file_writer = await new_file.createWritable();
      await new_file_writer.write(await fileWithHandle.handle.getFile());
      await new_file_writer.close();
    }
  }

  return (
    <>
      <Head>
        <title>nxshot</title>
        <meta name="description" content="Nintendo Switch screenshot organizer" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4">
        <div className="flex flex-row items-center justify-center">
          <CameraIcon className="w-10 h-10 mt-2 mr-1 md:w-16 md:h-16 md:mt-4 md:mr-2 text-gray-800 dark:text-gray-300" />
          <h1 className="text-5xl md:text-[5rem] leading-normal font-extrabold text-gray-800 dark:text-gray-300">
            <span className="text-red-600">nx</span>shot
          </h1>
        </div>

        <p className="text-2xl text-gray-800 dark:text-gray-300 text-center">
          Automatically organize your Nintendo Switch captures
        </p>

        <div className="flex flex-col justify-items-center align-middle justify-center mt-8">
          {isCompatible
            ? <button onClick={handleClick} className="text-gray-900 font-bold bg-gray-300 hover:bg-gray-400 active:bg-gray-500 focus:outline-none focus:ring focus:ring-gray-100 py-2 px-4 drop-shadow-xl rounded-md inline-flex items-center">
              <FolderIcon className="w-6 h-6 mr-2" />
              <span>Select folder...</span>
            </button>
            : <p className="text-gray-600 text-center">
              Your browser is not supported. Please use a compatible browser.
            </p>}
        </div>

        {files.length > 0 && (
          <>
            {/* <div className="container flex flex-col justify-items-center align-middle justify-center mt-8"> */}
            {/* {files.map((file) => (
                <div key={file.file.relativePath?.join("/")} className="flex flex-row justify-items-center align-middle justify-center mt-4">
                  <FolderIcon className="w-6 h-6 mr-2 text-gray-100" />
                  <span className="text-gray-600">{file.file.relativePath?.join("/")}</span>
                </div>
              ))} */}
            <div className="flex flex-row justify-items-center align-middle justify-center mt-8">
              <DocumentIcon className="w-6 h-6 mr-2 text-gray-100" />
              <p className="text-gray-600 text-center">
                {files.length} files found
              </p>
            </div>
            {/* </div> */}

            <div className="flex flex-col justify-items-center align-middle justify-center mt-8">
              <button onClick={handleSave} className="text-gray-100 font-bold bg-red-600 hover:bg-red-700 active:bg-red-800 focus:outline-none focus:ring focus:ring-red-400 py-2 px-4 drop-shadow-xl rounded-md inline-flex items-center">
                <FolderDownloadIcon className="w-6 h-6 mr-2" />
                <span>Organize</span>
              </button>
            </div>
          </>
        )}

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
        <footer className="mt-8">
          <p className="text-gray-600 text-center">
            <span className="text-red-600">nx</span>shot is a work in progress.
          </p>
        </footer>
      </main>
    </>
  );
};

export default Home;

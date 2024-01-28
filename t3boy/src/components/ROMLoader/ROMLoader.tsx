import type { Dispatch, SetStateAction } from "react";

interface Props {
  setRomData: Dispatch<SetStateAction<ArrayBuffer | null>>;
}

export const ROMLoader: React.FC<Props> = ({ setRomData }) => {
  const handleROMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const romFile = e.target.files?.[0];
    void romFile?.arrayBuffer().then(arrayBuffer => {
      setRomData(arrayBuffer);
    });
  };
  
  return (
    <div>
      <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white" htmlFor="gameRom">Game ROM</label>
      <input type="file" onChange={handleROMChange} className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400" id="gameRom" />
    </div>
  )
};
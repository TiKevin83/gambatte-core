import type { Dispatch, SetStateAction } from "react";

interface Props {
  setBiosData: Dispatch<SetStateAction<ArrayBuffer | null>>;
}

export const BIOSLoader: React.FC<Props> = ({ setBiosData }) => {
  const handleROMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const biosFile = e.target.files?.[0];
    void biosFile?.arrayBuffer().then(arrayBuffer => {
        setBiosData(arrayBuffer);
    });
  };
  
  return (
    <div>
      <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white" htmlFor="gbcBios">GBC BIOS</label>
      <input type="file" onChange={handleROMChange} className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400" id="gbcBios" />
    </div>
  )
};
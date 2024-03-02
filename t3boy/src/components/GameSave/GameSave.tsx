import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "~/utils/api";

declare const Module: {
  cwrap: (
    name: string,
    returnType: string,
    argTypes?: string[],
  ) => (...args: unknown[]) => unknown;
  _malloc: (size: number) => number;
  _free: (pointer: number) => void;
  HEAPU8: Uint8Array;
};

interface Props {
  gbPointer: number | undefined;
  gameHash: string;
}

export const GameSave: React.FC<Props> = ({ gbPointer, gameHash }) => {
  const [saveGame, setSaveGame] = useState<
    ((...args: unknown[]) => unknown) | null
  >(null);
  const [loadGameSave, setLoadGameSave] = useState<
    ((...args: unknown[]) => unknown) | null
  >(null);
  const saveGameLength = useMemo(() => {
    const getSaveDataLength = Module.cwrap(
      "gambatte_getsavedatalength",
      "number",
      ["number"],
    );
    return getSaveDataLength(gbPointer) as number;
    // we need to recalculate this value additionally when the gameHash changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gbPointer, gameHash]);
  const [gameSavePointer, setGameSavePointer] = useState<number | null>(null);
  const existingGameSaveForGameAndUser = api.gameSave.getGameSave.useQuery({
    gameHash,
  });
  const updateGameSaveForGameAndUser = api.gameSave.setGameSave.useMutation();

  useEffect(() => {
    const gambatte_savesavedata = Module.cwrap(
      "gambatte_savesavedata",
      "number",
      ["number", "number"],
    );
    const gambatte_loadsavedata = Module.cwrap(
      "gambatte_loadsavedata",
      "number",
      ["number", "number"],
    );
    setSaveGame(() => gambatte_savesavedata);
    setLoadGameSave(() => gambatte_loadsavedata);
  }, []);

  const handleSaveGame = useCallback(async () => {
    if (!saveGame) return;
    const newGameSavePointer = Module._malloc(saveGameLength);
    setGameSavePointer(newGameSavePointer);
    saveGame(gbPointer, newGameSavePointer);
    const gameSaveUint8Array = Module.HEAPU8.subarray(
      newGameSavePointer,
      newGameSavePointer + saveGameLength,
    );
    await updateGameSaveForGameAndUser.mutateAsync({
      gameHash,
      gameSave: JSON.stringify(Array.from(gameSaveUint8Array)),
    });
    void existingGameSaveForGameAndUser.refetch();
    return () => {
      if (gameSavePointer === null) return;
      Module._free(gameSavePointer);
    };
  }, [
    existingGameSaveForGameAndUser,
    gameHash,
    gameSavePointer,
    gbPointer,
    saveGame,
    saveGameLength,
    updateGameSaveForGameAndUser,
  ]);

  const handleLoadGameSave = useCallback(() => {
    if (!saveGame || !loadGameSave) return;
    if (existingGameSaveForGameAndUser.data?.saveGame !== undefined) {
      const saveStateData = new Uint8Array(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        Array.from(JSON.parse(existingGameSaveForGameAndUser.data.saveGame)),
      );
      const newGameSavePointer =
        gameSavePointer ?? Module._malloc(saveGameLength);
      Module.HEAPU8.set(saveStateData, newGameSavePointer);
      loadGameSave(gbPointer, newGameSavePointer);
      setGameSavePointer(newGameSavePointer);
    }
  }, [
    existingGameSaveForGameAndUser.data?.saveGame,
    gameSavePointer,
    gbPointer,
    loadGameSave,
    saveGame,
    saveGameLength,
  ]);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleSaveGame}
        className="block w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:placeholder-gray-400"
      >
        Save Game to Cloud
      </button>
      {existingGameSaveForGameAndUser.data?.saveGame &&
        !updateGameSaveForGameAndUser.isLoading && (
          <button
            onClick={handleLoadGameSave}
            className="block w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-900 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:placeholder-gray-400"
          >
            Load Game Save from Cloud
          </button>
        )}
    </div>
  );
};

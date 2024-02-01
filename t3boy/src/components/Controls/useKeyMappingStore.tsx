import { create } from "zustand";
import { persist } from "zustand/middleware";

export enum GameBoyKey {
  up = "up",
  down = "down",
  left = "left",
  right = "right",
  a = "a",
  b = "b",
  start = "start",
  select = "select",
}

interface KeyMappingState {
  keyMapping: Record<GameBoyKey, string>;
  setKeyMapping: (key: GameBoyKey, value: string) => void;
}

export const useKeyMappingStore = create<KeyMappingState>()(
  persist(
    (set, get) => ({
      keyMapping: {
        up: "ArrowUp",
        down: "ArrowDown",
        left: "ArrowLeft",
        right: "ArrowRight",
        a: "KeyV",
        b: "KeyC",
        start: "KeyX",
        select: "KeyZ",
      },
      setKeyMapping: (key: GameBoyKey, value: string) => {
        set({ keyMapping: { ...get().keyMapping, [key]: value } });
      },
    }),
    {
      name: "key-mapping-storage",
    },
  ),
);

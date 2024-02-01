import { useCallback, useEffect, useRef, useState } from "react";
import { useKeyMappingStore } from "./useKeyMappingStore";

declare const Module: {
  cwrap: (
    name: "gambatte_setinputgetter",
    returnType: string,
    argTypes: string[],
  ) => (arg0: number, arg1: number, arg2: number) => undefined;
  addFunction: (func: () => number, signature: string) => number;
};

export const useControls = (initialized: boolean, gbPointer?: number) => {
  const [gambatteInputGetter, setGambatteInputGetter] = useState<
    ((arg0: number, arg1: number, arg2: number) => undefined) | null
  >(null);
  const [buttonsFunctionPointer, setButtonsFunctionPointer] = useState<
    number | null
  >(null);
  const buttons = useRef(0);
  const keyMapping = useKeyMappingStore((state) => state.keyMapping);

  const keyDownHandler = useCallback(
    (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }
      event.preventDefault();
      buttons.current |=
        (Number(event.code === keyMapping.a) * 0x01) |
        (Number(event.code === keyMapping.b) * 0x02) |
        (Number(event.code === keyMapping.select) * 0x04) |
        (Number(event.code === keyMapping.start) * 0x08) |
        (Number(event.code === keyMapping.right) * 0x10) |
        (Number(event.code === keyMapping.left) * 0x20) |
        (Number(event.code === keyMapping.up) * 0x40) |
        (Number(event.code === keyMapping.down) * 0x80);
    },
    [
      keyMapping.a,
      keyMapping.b,
      keyMapping.down,
      keyMapping.left,
      keyMapping.right,
      keyMapping.select,
      keyMapping.start,
      keyMapping.up,
    ],
  );

  const keyUpHandler = useCallback(
    (event: KeyboardEvent) => {
      event.preventDefault();
      buttons.current &=
        (Number(event.code !== keyMapping.a) * 0x01) |
        (Number(event.code !== keyMapping.b) * 0x02) |
        (Number(event.code !== keyMapping.select) * 0x04) |
        (Number(event.code !== keyMapping.start) * 0x08) |
        (Number(event.code !== keyMapping.right) * 0x10) |
        (Number(event.code !== keyMapping.left) * 0x20) |
        (Number(event.code !== keyMapping.up) * 0x40) |
        (Number(event.code !== keyMapping.down) * 0x80);
    },
    [
      keyMapping.a,
      keyMapping.b,
      keyMapping.down,
      keyMapping.left,
      keyMapping.right,
      keyMapping.select,
      keyMapping.start,
      keyMapping.up,
    ],
  );

  useEffect(() => {
    if (!initialized) {
      return;
    }
    setGambatteInputGetter(() =>
      Module.cwrap("gambatte_setinputgetter", "number", [
        "number",
        "number",
        "number",
      ]),
    );
    setButtonsFunctionPointer(Module.addFunction(() => buttons.current, "ii"));
  }, [initialized]);

  useEffect(() => {
    if (
      gbPointer === undefined ||
      buttonsFunctionPointer === null ||
      gambatteInputGetter === null
    ) {
      return;
    }
    gambatteInputGetter(gbPointer, buttonsFunctionPointer, 0);
  }, [buttonsFunctionPointer, gambatteInputGetter, gbPointer]);

  useEffect(() => {
    window.addEventListener("keydown", keyDownHandler);

    window.addEventListener("keyup", keyUpHandler);

    return () => {
      window.removeEventListener("keydown", keyDownHandler);

      window.removeEventListener("keyup", keyUpHandler);
    };
  }, [keyDownHandler, keyUpHandler]);
};

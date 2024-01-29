import { useCallback, useEffect, useRef, useState } from "react";

declare const Module: {
  cwrap: (
    name: "gambatte_setinputgetter",
    returnType: string,
    argTypes: string[],
  ) => (arg0: number, arg1: number, arg2: number) => undefined;
  addFunction: (func: () => number, signature: string) => number;
};

const left = "ArrowLeft";
const up = "ArrowUp";
const right = "ArrowRight";
const down = "ArrowDown";
const zForSelectButton = "KeyZ";
const xForStartButton = "KeyX";
const cForBButton = "KeyC";
const vForAButton = "KeyV";

export const useControls = (initialized: boolean, gbPointer?: number) => {
  const [gambatteInputGetter, setGambatteInputGetter] = useState<
    ((arg0: number, arg1: number, arg2: number) => undefined) | null
  >(null);
  const [buttonsFunctionPointer, setButtonsFunctionPointer] = useState<
    number | null
  >(null);
  const buttons = useRef(0);

  const keyDownHandler = useCallback((event: KeyboardEvent) => {
    if (event.repeat) {
      return;
    }
    event.preventDefault();
    buttons.current |=
      (Number(event.code === vForAButton) * 0x01) |
      (Number(event.code === cForBButton) * 0x02) |
      (Number(event.code === zForSelectButton) * 0x04) |
      (Number(event.code === xForStartButton) * 0x08) |
      (Number(event.code === right) * 0x10) |
      (Number(event.code === left) * 0x20) |
      (Number(event.code === up) * 0x40) |
      (Number(event.code === down) * 0x80);
  }, []);

  const keyUpHandler = useCallback((event: KeyboardEvent) => {
    event.preventDefault();
    buttons.current &=
      (Number(event.code !== vForAButton) * 0x01) |
      (Number(event.code !== cForBButton) * 0x02) |
      (Number(event.code !== zForSelectButton) * 0x04) |
      (Number(event.code !== xForStartButton) * 0x08) |
      (Number(event.code !== right) * 0x10) |
      (Number(event.code !== left) * 0x20) |
      (Number(event.code !== up) * 0x40) |
      (Number(event.code !== down) * 0x80);
  }, []);

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

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { AuthShowcase } from "~/components/AuthShowcase/AuthShowcase";
import gambatteModule from "../components/libgambatte/libgambatte.mjs"
import { ROMLoader } from "~/components/ROMLoader/ROMLoader";
import { BIOSLoader } from "~/components/BIOSLoader.tsx/BIOSLoader";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gambatte, setGambatte] = useState<any>(null);
  const [romData, setRomData] = useState<ArrayBuffer | null>(null);
  const [biosData, setBiosData] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    const initGambatte = async () => {
      const gambatteInstance = await gambatteModule();
      const gambatte_revision = gambatteInstance.cwrap('gambatte_revision', 'number');
      console.log('revision: ' + gambatte_revision());
      setGambatte(gambatteInstance);
    }
    void initGambatte();
  }, []);

  useEffect(() => {
    if (!gambatte || !romData || !biosData || !canvasRef.current) {
      return;
    };
    const gambatte_create = gambatte.cwrap('gambatte_create', 'number');
    const gambatte_loadbuf = gambatte.cwrap('gambatte_loadbuf', 'number', ['number', 'number', 'number', 'number']);
    const gambatte_loadbiosbuf = gambatte.cwrap('gambatte_loadbiosbuf', 'number', ['number', 'number', 'number']);
    const gambatte_runfor = gambatte.cwrap('gambatte_runfor', 'number', ['number', 'number', 'number', 'number', 'number']);

    const videoBufferPointer = gambatte._malloc(160 * 144 * 4);
    const audioBufferPointer = gambatte._malloc((35112 + 2064) * 4);
    const samplesEmittedPointer = gambatte._malloc(4);

    const romDataUint8 = new Uint8Array(romData);
    const biosDataUint8 = new Uint8Array(biosData);
    const gb = gambatte_create();

    const romDataPointer = gambatte._malloc(romData.byteLength);
    gambatte.HEAPU8.set(romDataUint8, romDataPointer);
    console.log('rom load: ' + gambatte_loadbuf(gb, romDataPointer, romData.byteLength, 3));
    gambatte._free(romDataPointer);

    const biosDataPointer = gambatte._malloc(romData.byteLength);
    gambatte.HEAPU8.set(biosDataUint8, biosDataPointer);
    console.log('bios load: ' + gambatte_loadbiosbuf(gb, biosDataPointer, biosData.byteLength));
    gambatte._free(biosDataPointer);

    const backbuffer = new ImageData(160, 144);

    const renderer = document.createElement('canvas');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const rendererContext = renderer.getContext('2d')!;
    renderer.width = backbuffer.width;
    renderer.height = backbuffer.height;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const presenterContext = canvasRef.current.getContext('2d')!;

    const sampleRate = 48000;

    const audioContext = new AudioContext({ sampleRate });

    // reduce volume
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.06; // 6 %
    gainNode.connect(audioContext.destination);

    const cyclesPerFrame = 35112;

    let time = 0;
    let lastBufferDuration = 0;
    let animationFrame = 0;

    const renderLoop = () => {
      if (!(audioContext.currentTime - time > 0.001 || time == 0)) {
        animationFrame = requestAnimationFrame(renderLoop);
        return;
      }
      gambatte.setValue(samplesEmittedPointer, cyclesPerFrame, 'i32');
      gambatte_runfor(gb, videoBufferPointer, 160, audioBufferPointer, samplesEmittedPointer);
      const bytesProduced = gambatte.getValue(samplesEmittedPointer, 'i32') * 4;

      // process audio output

      // divide by 2 channels, 2 bytes per 16 bit signed, and 4 to naively resample to 524k
      const audioSamples = audioContext.createBuffer(2, bytesProduced / 16, 2097152 / 4);
      const channel1Samples = audioSamples.getChannelData(0);
      const channel2Samples = audioSamples.getChannelData(1);
      for (let sample = 0; sample < channel1Samples.length; sample++) {
        // inverse of the division by 16 when creating the buffer size, same logic
        channel1Samples[sample] = (gambatte.getValue(audioBufferPointer + sample * 16, 'i16') / 32768.0);
        channel2Samples[sample] = (gambatte.getValue(audioBufferPointer + sample * 16 + 2, 'i16') / 32768.0);
      }

      // play audio
      const source = audioContext.createBufferSource();
      source.buffer = audioSamples;
      source.connect(gainNode);
      time = time == 0 ? audioContext.currentTime + 0.003 : time + lastBufferDuration;
      lastBufferDuration = source.buffer.duration;
      source.start(time);

      // process video output
      for (let i = 0; i < backbuffer.data.length; i += 4) {
        const pixel = gambatte.getValue(videoBufferPointer + i, 'i32');
        backbuffer.data[i + 0] = (pixel >> 16) & 0xff;
        backbuffer.data[i + 1] = (pixel >> 8) & 0xff;
        backbuffer.data[i + 2] = pixel & 0xff;
        backbuffer.data[i + 3] = 0xff;
      }

      // repeat render loop
      rendererContext.putImageData(backbuffer, 0, 0);
      presenterContext.drawImage(renderer, 0, 0);
      animationFrame = requestAnimationFrame(renderLoop);
    };

    const visibilityChangeHandler = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrame);
        void audioContext.suspend();
      } else {
        animationFrame = requestAnimationFrame(renderLoop);
        void audioContext.resume();
      }
    }

    document.addEventListener("visibilitychange", visibilityChangeHandler);

    animationFrame = requestAnimationFrame(renderLoop);

    return () => {
      gambatte._free(videoBufferPointer);
      gambatte._free(audioBufferPointer);
      gambatte._free(samplesEmittedPointer);
      cancelAnimationFrame(animationFrame);
      void audioContext.close();
      document.removeEventListener("visibilitychange", visibilityChangeHandler);
    }
  }, [gambatte, romData, biosData])

  return (
    <>
      <Head>
        <title>T3Boy</title>
        <meta name="description" content="A GB/GBC Emulator Web Frontend" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className=" flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            T3Boy
          </h1>
          <ROMLoader setRomData={setRomData} />
          <BIOSLoader setBiosData={setBiosData} />
          <div className="flex flex-col items-center gap-2">
            <canvas ref={canvasRef} id="gameboy" width="160" height="144"></canvas>
          </div>
          <div className="flex flex-col items-center gap-2">
            <AuthShowcase />
          </div>
        </div>
      </main>
    </>
  );
}

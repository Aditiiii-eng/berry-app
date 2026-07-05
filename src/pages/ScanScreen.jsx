import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Camera, Search, ScanBarcode, Keyboard, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store/useStore";
import { analyzeMeal, logBarcodeMeal, decodeBarcodeImage } from "../api/meals";
import { USE_MOCK_API } from "../api/client";
import toast from 'react-hot-toast';

const STAGES = [
  "Preprocessing image...",
  "Detecting foods...",
  "Checking confidence...",
  "Grounding nutrition...",
  "Finalizing results...",
];

const BARCODE_STAGES = [
  "Starting camera...",
  "Reading barcode...",
  "Fetching product nutrition...",
  "Building meal log...",
];

function cleanBarcode(value) {
  return String(value || "").replace(/[^0-9]/g, "").trim();
}

export function ScanScreen() {
  const { setScreen, setAnalysis } = useStore();

  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);

  const [mode, setMode] = useState("meal");
  const [manualBarcode, setManualBarcode] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanningRef = useRef(false);

  useEffect(() => {
    let interval;

    if (loading && USE_MOCK_API) {
      interval = setInterval(() => {
        setStageIndex((i) => (i < STAGES.length - 1 ? i + 1 : i));
      }, 500);
    }

    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    return () => stopBarcodeScanner();
  }, []);

  async function analyze(file) {
    if (!file && !USE_MOCK_API) return;

    stopBarcodeScanner();
    setLoading(true);
    setStageIndex(0);

    try {
      const result = await analyzeMeal(file);
      setAnalysis(result);
      setScreen("analysis");
    } catch (e) {
      toast.error(e.message || "Failed to analyze meal");
    } finally {
      setLoading(false);
    }
  }

  async function analyzeBarcode(barcodeValue) {
    const barcode = cleanBarcode(barcodeValue);

    if (!barcode) {
      toast.error("Enter or scan a valid barcode number.");
      return;
    }

    stopBarcodeScanner();
    setLoading(true);
    setStageIndex(2);

    try {
      const result = await logBarcodeMeal(barcode);
      setAnalysis({ ...result, barcode });
      setScreen("analysis");
    } catch (e) {
      toast.error(e.message || "Failed to fetch barcode nutrition");
    } finally {
      setLoading(false);
    }
  }

  async function handleBarcodeUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScannerError("");

    stopBarcodeScanner();
    setLoading(true);
    setStageIndex(1);

    try {
      const barcode = await decodeBarcodeImage(file);
      await analyzeBarcode(barcode);
    } catch (err) {
      setLoading(false);
      setScannerError(err?.message || "No barcode detected. Try a clearer, well-lit photo of the barcode.");
    }
    e.target.value = "";
  }

  function stopBarcodeScanner() {
    scanningRef.current = false;
    setScannerActive(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function startBarcodeScanner() {
    setScannerError("");

    if (!("BarcodeDetector" in window)) {
      setScannerError(
        "Camera barcode scanning is not supported in this browser. Type the barcode below instead."
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError("Camera access is not available. Type the barcode below instead.");
      return;
    }

    try {
      stopBarcodeScanner();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;
      scanningRef.current = true;
      setScannerActive(true);

      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();

      const detector = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"],
      });

      const scanLoop = async () => {
        if (!scanningRef.current) return;

        try {
          const codes = await detector.detect(video);
          const rawValue = codes?.[0]?.rawValue;

          if (rawValue) {
            await analyzeBarcode(rawValue);
            return;
          }
        } catch {
          setScannerError(
            "Could not read the barcode. Keep it inside the frame or type it manually."
          );
        }

        requestAnimationFrame(scanLoop);
      };

      scanLoop();
    } catch (e) {
      stopBarcodeScanner();
      setScannerError(e?.message || "Camera permission denied. Type the barcode below instead.");
    }
  }

  const stageText =
    mode === "barcode"
      ? BARCODE_STAGES[Math.min(stageIndex, BARCODE_STAGES.length - 1)]
      : STAGES[stageIndex];

  return (
    <div className="relative flex-1 overflow-hidden bg-slate-900">
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 grid place-items-center bg-slate-900/80 backdrop-blur-md"
          >
            <div className="text-center text-white">
              <div className="relative mx-auto h-20 w-20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-4 border-white/20 border-t-red-500"
                />
                <div className="absolute inset-0 grid place-items-center">
                  <Search size={24} className="animate-pulse text-white" />
                </div>
              </div>

              <motion.p
                key={stageText}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mt-6 text-sm font-bold uppercase tracking-widest text-red-400"
              >
                {stageText}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,.25),transparent_25%),linear-gradient(135deg,#cae8ab,#fcb1ad)]" />

      <div className="relative z-10 flex h-full flex-col px-5 pb-8 pt-3 text-white">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              stopBarcodeScanner();
              setScreen("home");
            }}
          >
            <ArrowLeft />
          </button>

          <b>Berry AI Scanner</b>

          {mode === "barcode" ? <ScanBarcode /> : <Camera />}
        </div>

        <div className="mt-7 grid grid-cols-2 gap-2 rounded-full bg-white/15 p-1 text-xs font-black backdrop-blur-sm">
          <button
            onClick={() => {
              stopBarcodeScanner();
              setMode("meal");
            }}
            className={`rounded-full px-4 py-3 transition ${
              mode === "meal" ? "bg-white text-red-500" : "text-white/80"
            }`}
          >
            Meal Photo
          </button>

          <button
            onClick={() => setMode("barcode")}
            className={`rounded-full px-4 py-3 transition ${
              mode === "barcode" ? "bg-white text-red-500" : "text-white/80"
            }`}
          >
            Barcode
          </button>
        </div>

        {mode === "meal" ? (
          <div className="mt-6 h-[470px] rounded-[32px] border-2 border-white/70 p-4 shadow-2xl flex flex-col">
            <div className="flex-1 grid place-items-center rounded-[26px] bg-white/10 p-4 text-center backdrop-blur-sm">
              <div>
                <div className="text-8xl">🥗</div>
                <p className="mt-4 text-sm font-semibold">Upload or snap your meal</p>
                <p className="mt-2 text-xs text-white/75">
                  Our AI analyzes ingredients, macros, and calories instantly.
                </p>

                <div className="mt-6 flex items-center justify-center gap-3 w-full max-w-[240px] mx-auto">
                  <label className="flex-1 cursor-pointer flex flex-col items-center gap-2 rounded-2xl bg-white/20 p-3 text-xs font-bold active:scale-95 transition-transform hover:bg-white/30">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        analyze(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    <Upload size={20} />
                    Upload
                  </label>

                  <label className="flex-1 cursor-pointer flex flex-col items-center gap-2 rounded-2xl bg-white/20 p-3 text-xs font-bold active:scale-95 transition-transform hover:bg-white/30">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        analyze(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    <Camera size={20} />
                    Camera
                  </label>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex h-[470px] flex-col rounded-[32px] border-2 border-white/70 p-4 shadow-2xl">
            <div className="relative flex-1 overflow-hidden rounded-[26px] bg-slate-950/55 backdrop-blur-sm">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                muted
                playsInline
              />

              {!scannerActive && (
                <div className="absolute inset-0 grid place-items-center p-6 text-center">
                  <div>
                    <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-white/15">
                      <ScanBarcode size={42} />
                    </div>

                    <p className="mt-4 text-sm font-bold">
                      Scan packaged food barcode
                    </p>

                    <p className="mt-2 text-xs text-white/70">
                      Point your camera at EAN/UPC barcode. Nutrition is fetched from Open Food Facts.
                    </p>
                  </div>
                </div>
              )}

              {scannerActive && (
                <div className="pointer-events-none absolute inset-x-10 top-1/2 h-28 -translate-y-1/2 rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(15,23,42,0.28)]" />
              )}
            </div>

            {scannerError && (
              <p className="mt-3 rounded-2xl bg-white/15 px-3 py-2 text-[11px] font-semibold text-white/85">
                {scannerError}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={scannerActive ? stopBarcodeScanner : startBarcodeScanner}
                className="flex-1 flex items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-xs font-black text-red-500 shadow-lg active:scale-95"
              >
                <Camera size={16} />
                {scannerActive ? "Stop scanner" : "Camera scan"}
              </button>

              <label className="flex-1 flex items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-xs font-black text-red-500 shadow-lg active:scale-95 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBarcodeUpload}
                />
                <Upload size={16} />
                Upload image
              </label>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-slate-700 shadow-lg">
              <Keyboard size={16} className="text-slate-400" />

              <input
                value={manualBarcode}
                inputMode="numeric"
                placeholder="Enter barcode number"
                onChange={(e) => setManualBarcode(cleanBarcode(e.target.value))}
                className="min-w-0 flex-1 bg-transparent text-xs font-bold outline-none"
              />

              <button
                onClick={() => analyzeBarcode(manualBarcode)}
                className="rounded-full bg-red-500 px-4 py-2 text-[11px] font-black text-white"
              >
                Log
              </button>
            </div>
          </div>
        )}

        {mode === "meal" && (
          <button
            onClick={() => analyze(null)}
            className="mt-auto rounded-full bg-white px-5 py-4 text-sm font-black text-red-500 shadow-lg transition-transform active:scale-95"
          >
            Analyze sample meal
          </button>
        )}
      </div>
    </div>
  );
}

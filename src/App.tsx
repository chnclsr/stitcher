import { useEffect, useMemo, useRef, useState } from "react";
import { captureImage } from "./platform/camera";
import { saveImage } from "./platform/save";
import { shareImage } from "./platform/share";
import { removeBackground } from "./services/cutoutApi";

type Screen = "capture" | "review" | "processing" | "result";
type OutputMode = "asset" | "sticker";

export default function App() {
  const [screen, setScreen] = useState<Screen>("capture");
  const [source, setSource] = useState<Blob | null>(null);
  const [cutout, setCutout] = useState<Blob | null>(null);
  const [mode, setMode] = useState<OutputMode>("asset");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [stickerPreviewUrl, setStickerPreviewUrl] = useState("");
  const sourceUrl = useMemo(() => source ? URL.createObjectURL(source) : "", [source]);
  const cutoutUrl = useMemo(() => cutout ? URL.createObjectURL(cutout) : "", [cutout]);

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (cutoutUrl) URL.revokeObjectURL(cutoutUrl);
  }, [sourceUrl, cutoutUrl]);

  useEffect(() => {
    if (!cutout || mode !== "sticker") {
      setStickerPreviewUrl("");
      return;
    }
    let previewUrl = "";
    let cancelled = false;
    void renderOutput(cutout, "sticker").then((image) => {
      if (cancelled) return;
      previewUrl = URL.createObjectURL(image);
      setStickerPreviewUrl(previewUrl);
    }).catch(() => {
      if (!cancelled) setError("Could not prepare sticker preview.");
    });
    return () => {
      cancelled = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [cutout, mode]);

  async function takePhoto() {
    setError("");
    try {
      const photo = await captureImage();
      if (photo) chooseImage(photo);
      else cameraInput.current?.click();
    } catch (reason) {
      setError(message(reason));
    }
  }

  function chooseImage(image: Blob) {
    setSource(image);
    setCutout(null);
    setError("");
    setScreen("review");
  }

  async function makeCutout() {
    if (!source || busy) return;
    setBusy(true);
    setError("");
    setElapsed(0);
    setScreen("processing");
    const started = performance.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((performance.now() - started) / 1000)), 250);
    try {
      setCutout(await removeBackground(source));
      setScreen("result");
    } catch (reason) {
      setError(message(reason));
      setScreen("review");
    } finally {
      window.clearInterval(timer);
      setBusy(false);
    }
  }

  async function save() {
    if (!cutout) return;
    try { await saveImage(await renderOutput(cutout, mode)); }
    catch (reason) { setError(message(reason)); }
  }

  async function share() {
    if (!cutout) return;
    try { await shareImage(await renderOutput(cutout, mode)); }
    catch (reason) { setError(message(reason)); }
  }

  function reset() {
    setSource(null);
    setCutout(null);
    setError("");
    setScreen("capture");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="wordmark" onClick={reset} aria-label="Stitcher home"><span className="brand-mark">s</span> stitcher</button>
        <span className="cloud-label"><i /> cloud cutout</span>
      </header>

      <section className="workspace">
        <div className="intro">
          <p className="eyebrow">MAKE THE EVERYDAY YOURS</p>
          <h1>{screen === "result" ? "Look what you found." : "Anything can be a sticker."}</h1>
          <p className="subhead">One photo. One clean cutout. Ready to share.</p>
        </div>

        {screen === "capture" && <div className="capture-card">
          <div className="camera-art" aria-hidden="true"><div className="sun" /><div className="spark spark-one">✳</div><div className="spark spark-two">✳</div><div className="frame-corners"><span /><span /><span /><span /></div><div className="object-sample"><div className="leaf" /><div className="pot" /></div><div className="camera-dot" /></div>
          <div className="capture-copy"><span className="step-pill">01 <span>CAPTURE</span></span><h2>Find something with a shape.</h2><p>A coffee cup, a favorite toy, the little thing on your desk.</p>
            <div className="capture-actions"><button className="button button-primary" onClick={takePhoto}><CameraIcon /> Open camera</button><input ref={cameraInput} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) chooseImage(file); event.currentTarget.value = ""; }} /><label className="button button-secondary">Choose a photo<input type="file" accept="image/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) chooseImage(file); event.currentTarget.value = ""; }} /></label></div>
            {error && <p className="error-message">{error}</p>}
          </div>
        </div>}

        {screen === "review" && sourceUrl && <div className="result-layout">
          <div className="preview-panel"><span className="preview-label">YOUR PHOTO</span><img className="photo-preview" src={sourceUrl} alt="Photo to turn into a sticker" /></div>
          <div className="result-controls"><span className="step-pill">02 <span>READY?</span></span><h2>Let’s clear the background.</h2><p>Your photo goes to fal for processing. Usually takes a few seconds.</p><button className="button button-primary full-button" onClick={makeCutout}><SparkleIcon /> Make my cutout</button><button className="text-button" onClick={reset}>Choose another photo</button>{error && <p className="error-message">{error}</p>}</div>
        </div>}

        {screen === "processing" && <div className="processing-card"><div className="processing-orbit"><div className="orbit-dot" /><span>✳</span></div><p className="eyebrow">A LITTLE MAGIC, IN PROGRESS</p><h2>Finding your object…</h2><p>Cleaning the edges and making the background disappear.</p><div className="progress-track"><span /></div><small>{elapsed}s · securely processed through our server</small></div>}

        {screen === "result" && cutoutUrl && <div className="result-layout">
          <div className="preview-panel preview-checker"><span className="preview-label">YOUR CUTOUT</span><div className="cutout-stage"><img src={mode === "sticker" && stickerPreviewUrl ? stickerPreviewUrl : cutoutUrl} alt="Transparent object cutout" /></div><div className="processing-time"><span className="green-dot" /> Background removed <span className="time-value">{elapsed}s</span></div></div>
          <div className="result-controls"><span className="step-pill">03 <span>MAKE IT YOURS</span></span><h2>One object, two ways.</h2><p>Choose a clean cutout or add a classic sticker edge.</p><div className="mode-switch" role="group" aria-label="Output style"><button className={mode === "asset" ? "selected" : ""} onClick={() => setMode("asset")}><span className="mode-icon asset-icon" />Asset<small>Transparent PNG</small></button><button className={mode === "sticker" ? "selected" : ""} onClick={() => setMode("sticker")}><span className="mode-icon sticker-icon" />Sticker<small>White outline</small></button></div><button className="button button-primary full-button" onClick={save}><DownloadIcon /> Save PNG</button><button className="button button-secondary full-button" onClick={share}><ShareIcon /> Share</button><button className="text-button" onClick={reset}>Make another</button>{error && <p className="error-message">{error}</p>}</div>
        </div>}

        <footer className="trust-row"><span><LockIcon /> Your photo is only used to make this cutout</span><span>Made for the things you love.</span></footer>
      </section>
    </main>
  );
}

async function renderOutput(input: Blob, mode: OutputMode): Promise<Blob> {
  if (mode === "asset") return input;
  const image = new Image();
  image.src = URL.createObjectURL(input);
  await image.decode();
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const radius = Math.min(18, Math.max(2, Math.round(width * 0.012)));
  const outline = document.createElement("canvas");
  outline.width = width + radius * 2;
  outline.height = height + radius * 2;
  const outlineContext = outline.getContext("2d");
  if (!outlineContext) throw new Error("Could not prepare sticker outline.");
  for (let step = 0; step < 20; step += 1) {
    const angle = (step / 20) * Math.PI * 2;
    outlineContext.drawImage(image, radius + Math.cos(angle) * radius, radius + Math.sin(angle) * radius);
  }
  outlineContext.globalCompositeOperation = "source-in";
  outlineContext.fillStyle = "#ffffff";
  outlineContext.fillRect(0, 0, outline.width, outline.height);

  const canvas = document.createElement("canvas");
  canvas.width = outline.width;
  canvas.height = outline.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare sticker image.");
  context.drawImage(outline, 0, 0);
  context.drawImage(image, radius, radius);
  URL.revokeObjectURL(image.src);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not export sticker PNG.")), "image/png"));
}

function message(error: unknown) { return error instanceof Error ? error.message : "Something went wrong. Try again."; }
function CameraIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3v12H4z" /><circle cx="12" cy="13" r="3.5" /></svg>; }
function SparkleIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></svg>; }
function DownloadIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 19h16" /></svg>; }
function ShareIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.3 10.8 7.4-4.6m-7.4 7 7.4 4.6" /></svg>; }
function LockIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>; }

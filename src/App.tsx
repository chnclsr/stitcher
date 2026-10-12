import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Camera, DownloadSimple, LockKey, Moon, Scissors, ShareNetwork, Sparkle, Sun } from "@phosphor-icons/react";
import { captureImage } from "./platform/camera";
import { saveImage } from "./platform/save";
import { shareImage } from "./platform/share";
import { removeBackground } from "./services/cutoutApi";

type Screen = "capture" | "review" | "processing" | "result";
type OutputMode = "asset" | "sticker";
type Theme = "light" | "dark";

const samplePhotos = [
  { name: "Coffee mug", src: new URL("../test-photos/01_coffee_mug.jpg", import.meta.url).href },
  { name: "Retro sneaker", src: new URL("../test-photos/02_retro_sneaker.jpg", import.meta.url).href },
  { name: "Plush bear", src: new URL("../test-photos/03_plush_bear.jpg", import.meta.url).href },
  { name: "Succulent", src: new URL("../test-photos/04_succulent_plant.jpg", import.meta.url).href },
  { name: "Vintage camera", src: new URL("../test-photos/05_vintage_camera.jpg", import.meta.url).href },
  { name: "Croissant", src: new URL("../test-photos/06_fresh_croissant.jpg", import.meta.url).href },
  { name: "Desk setup", src: new URL("../test-photos/07_desk_workspace_items.jpg", import.meta.url).href },
  { name: "Breakfast spread", src: new URL("../test-photos/08_breakfast_table_spread.jpg", import.meta.url).href },
  { name: "Shelf decor", src: new URL("../test-photos/09_shelf_decor_objects.jpg", import.meta.url).href },
  { name: "Craft table", src: new URL("../test-photos/10_craft_art_desk.jpg", import.meta.url).href },
  { name: "Picnic gear", src: new URL("../test-photos/11_picnic_summer_gear.jpg", import.meta.url).href },
  { name: "Everyday carry", src: new URL("../test-photos/12_edc_gear_tray.jpg", import.meta.url).href },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("capture");
  const [source, setSource] = useState<Blob | null>(null);
  const [cutout, setCutout] = useState<Blob | null>(null);
  const [mode, setMode] = useState<OutputMode>("asset");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [targetObject, setTargetObject] = useState("");
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("stick-ai-theme") ?? localStorage.getItem("stitcher-theme")) === "dark" ? "dark" : "light");
  const cameraInput = useRef<HTMLInputElement>(null);
  const [stickerPreviewUrl, setStickerPreviewUrl] = useState("");
  const sourceUrl = useMemo(() => source ? URL.createObjectURL(source) : "", [source]);
  const cutoutUrl = useMemo(() => cutout ? URL.createObjectURL(cutout) : "", [cutout]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#272322" : "#f5eee4");
    localStorage.setItem("stick-ai-theme", theme);
  }, [theme]);

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
    setTargetObject("");
    setError("");
    setScreen("review");
  }

  async function chooseSample(src: string) {
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error("Could not load sample photo.");
      chooseImage(await response.blob());
    } catch (reason) {
      setError(message(reason));
    }
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
      setCutout(await removeBackground(source, targetObject));
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
    setTargetObject("");
    setError("");
    setScreen("capture");
  }

  return (
    <main className="app-shell" data-theme={theme}>
      <header className="topbar">
        <button className="wordmark" onClick={reset} aria-label="stick.ai home"><span className="brand-mark">s</span><span>stick.ai</span></button>
        <div className="header-actions"><span className="cloud-label"><i /> cloud cutout</span><button className="theme-toggle" type="button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>{theme === "light" ? <Moon weight="bold" aria-hidden="true" /> : <Sun weight="bold" aria-hidden="true" />}<span>{theme === "light" ? "Dark" : "Light"} mode</span></button></div>
      </header>

      <section className="workspace">
        <div className="intro">
          <p className="eyebrow"><span className="eyebrow-dot" /> YOUR EVERYDAY, STICKERIFIED</p>
          <h1>{screen === "result" ? <>Look what <span className="headline-pop">you found.</span></> : <>Little things.<br />Big <span className="headline-pop">sticker energy.</span></>}</h1>
          <p className="subhead">Turn the things you love into little digital keepsakes.</p>
        </div>

        {screen === "capture" && <div className="capture-card">
          <div className="camera-art studio-board" aria-hidden="true">
            <div className="board-heading"><span>THE LITTLE THINGS CLUB</span><span>VOL. 01</span></div>
            <div className="photo-collage">
              <div className="collage-photo photo-back photo-plant"><img src={samplePhotos[3].src} alt="" /></div>
              <div className="collage-photo photo-back photo-croissant"><img src={samplePhotos[5].src} alt="" /></div>
              <div className="collage-photo photo-main"><img src={samplePhotos[0].src} alt="" /><span>my morning ritual</span></div>
              <div className="collage-seal"><Sparkle weight="fill" /><span>keep<br />the good<br />stuff</span></div>
            </div>
            <div className="process-rail"><span className="process-step process-photo"><Camera weight="bold" /> Photo</span><ArrowRight className="process-arrow" weight="bold" /><span className="process-step process-cutout"><Scissors weight="bold" /> Cut out</span><ArrowRight className="process-arrow" weight="bold" /><span className="process-step process-share"><ShareNetwork weight="bold" /> Share</span></div>
          </div>
          <div className="capture-copy"><span className="step-pill"><span>START WITH A PHOTO</span></span><h2>That thing deserves its own sticker.</h2><p>Your mug, your lucky shoes, that tiny plant you keep alive. Pick a photo and we’ll lift your favorite thing right out.</p>
            <div className="capture-actions"><button className="button button-primary" onClick={takePhoto}><Camera size={19} weight="bold" aria-hidden="true" /> Take a photo</button><input ref={cameraInput} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) chooseImage(file); event.currentTarget.value = ""; }} /><label className="button button-secondary">Choose from photos<input type="file" accept="image/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) chooseImage(file); event.currentTarget.value = ""; }} /></label></div>
            {error && <p className="error-message">{error}</p>}
          </div>
        </div>}

        {screen === "capture" && <section className="sample-gallery" aria-label="Sample photos to try">
          <div className="sample-heading"><h3>Or pick a little something</h3><span>{samplePhotos.length} photos, ready when you are</span></div>
          <div className="sample-list">{samplePhotos.map((photo) => <button className="sample-photo" type="button" key={photo.name} onClick={() => void chooseSample(photo.src)} aria-label={`Try sample photo: ${photo.name}`}><img src={photo.src} alt="" loading="lazy" /><span>{photo.name}</span></button>)}</div>
        </section>}

        {screen === "review" && sourceUrl && <div className="result-layout">
          <div className="preview-panel"><span className="preview-label">YOUR PHOTO</span><img className="photo-preview" src={sourceUrl} alt="Photo to turn into a sticker" /></div>
          <div className="result-controls"><span className="step-pill"><span>REVIEW</span></span><h2>Let’s clear the background.</h2><p>Your photo goes to fal for processing. Usually takes a few seconds.</p><label className="target-field-label" htmlFor="target-object">Describe the object to keep <span>Optional</span></label><input id="target-object" className="target-field" type="text" maxLength={120} value={targetObject} onChange={(event) => setTargetObject(event.target.value)} placeholder="e.g. the red apple near the juice" aria-describedby="target-object-hint target-object-cost" /><p id="target-object-hint" className="field-hint">Point out the exact item in a busy photo. Leave blank to remove the background from the main subject.</p><p id="target-object-cost" className="field-cost">With a prompt: $0.03/image · Standard cutout: $0.018/image.</p><button className="button button-primary full-button" onClick={makeCutout}><Sparkle size={19} weight="bold" aria-hidden="true" /> Make my cutout</button><button className="text-button" onClick={reset}>Choose another photo</button>{error && <p className="error-message" role="alert">{error}</p>}</div>
        </div>}

        {screen === "processing" && <div className="processing-card"><div className="processing-orbit"><div className="orbit-dot" /><span>✳</span></div><p className="eyebrow">A LITTLE MAGIC, IN PROGRESS</p><h2>Finding your object…</h2><p>Cleaning the edges and making the background disappear.</p><div className="progress-track"><span /></div><small>{elapsed}s · securely processed through our server</small></div>}

        {screen === "result" && cutoutUrl && <div className="result-layout">
          <div className="preview-panel preview-checker"><span className="preview-label">YOUR CUTOUT</span><div className="cutout-stage"><img src={mode === "sticker" && stickerPreviewUrl ? stickerPreviewUrl : cutoutUrl} alt="Transparent object cutout" /></div><div className="processing-time"><span className="green-dot" /> Background removed <span className="time-value">{elapsed}s</span></div></div>
          <div className="result-controls"><span className="step-pill"><span>MAKE IT YOURS</span></span><h2>One object, two ways.</h2><p>Choose a clean cutout or add a classic sticker edge.</p><div className="mode-switch" role="group" aria-label="Output style"><button className={mode === "asset" ? "selected" : ""} onClick={() => setMode("asset")}><span className="mode-icon asset-icon" />Asset<small>Transparent PNG</small></button><button className={mode === "sticker" ? "selected" : ""} onClick={() => setMode("sticker")}><span className="mode-icon sticker-icon" />Sticker<small>White outline</small></button></div><button className="button button-primary full-button" onClick={save}><DownloadSimple size={19} weight="bold" aria-hidden="true" /> Save PNG</button><button className="button button-secondary full-button" onClick={share}><ShareNetwork size={19} weight="bold" aria-hidden="true" /> Share</button><button className="text-button" onClick={reset}>Make another</button>{error && <p className="error-message">{error}</p>}</div>
        </div>}

        <footer className="trust-row"><span><LockKey size={15} weight="bold" aria-hidden="true" /> Your photo is only used to make this cutout</span><span>Made for the things you love.</span></footer>
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

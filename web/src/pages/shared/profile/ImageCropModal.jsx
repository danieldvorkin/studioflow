import { useCallback, useRef, useState } from "react";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

async function getCroppedBlob(image, crop, scale = 1) {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const pixelRatio = window.devicePixelRatio || 1;
  const cropWidthPx = crop.width * scaleX * scale;
  const cropHeightPx = crop.height * scaleY * scale;

  canvas.width = Math.floor(cropWidthPx * pixelRatio);
  canvas.height = Math.floor(cropHeightPx * pixelRatio);

  const ctx = canvas.getContext("2d");
  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = "high";

  const cropX = crop.x * scaleX * scale;
  const cropY = crop.y * scaleY * scale;

  ctx.drawImage(
    image,
    cropX,
    cropY,
    cropWidthPx,
    cropHeightPx,
    0,
    0,
    cropWidthPx,
    cropHeightPx,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas is empty"));
      },
      "image/jpeg",
      0.92,
    );
  });
}

export default function ImageCropModal({ src, onConfirm, onCancel }) {
  const imgRef = useRef(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [working, setWorking] = useState(false);

  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }, []);

  const handleConfirm = async () => {
    if (!completedCrop || !imgRef.current) return;
    setWorking(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      onConfirm(file);
    } catch (err) {
      console.error(err);
    } finally {
      setWorking(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">
            Adjust profile photo
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-200"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Drag to reposition. The selection will be cropped to a square and
          saved as your profile photo.
        </p>

        <div className="flex items-center justify-center overflow-hidden rounded-xl bg-slate-950">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={1}
            circularCrop
            className="max-h-[60vh]"
          >
            <img
              ref={imgRef}
              src={src}
              onLoad={onImageLoad}
              className="max-h-[60vh] w-auto object-contain"
              alt="Crop preview"
            />
          </ReactCrop>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!completedCrop || working}
            onClick={handleConfirm}
            className="inline-flex items-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-60"
          >
            {working ? "Applying…" : "Apply crop"}
          </button>
        </div>
      </div>
    </div>
  );
}

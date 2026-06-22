import { useEffect, useMemo, useState } from 'react';
import { Crop, Image as ImageIcon, Move, RotateCcw, ZoomIn } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

const PREVIEW_SIZE = 280;
const OUTPUT_SIZE = 720;

type AvatarFrame = 'circle' | 'rounded' | 'square';

const frameClassMap: Record<AvatarFrame, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-[2rem]',
  square: 'rounded-[1.1rem]',
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Selected image could not be loaded.'));
    image.src = src;
  });

const renderAvatarFile = async (
  file: File,
  {
    zoom,
    offsetX,
    offsetY,
  }: {
    zoom: number;
    offsetX: number;
    offsetY: number;
  },
) => {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Image editor could not initialize canvas rendering.');
    }

    const baseScale = Math.max(OUTPUT_SIZE / image.naturalWidth, OUTPUT_SIZE / image.naturalHeight);
    const scale = baseScale * zoom;
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const maxOffsetX = Math.max(0, (drawWidth - OUTPUT_SIZE) / 2);
    const maxOffsetY = Math.max(0, (drawHeight - OUTPUT_SIZE) / 2);
    const translateX = (offsetX / 100) * maxOffsetX;
    const translateY = (offsetY / 100) * maxOffsetY;
    const x = (OUTPUT_SIZE - drawWidth) / 2 + translateX;
    const y = (OUTPUT_SIZE - drawHeight) / 2 + translateY;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.drawImage(image, x, y, drawWidth, drawHeight);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
            return;
          }

          reject(new Error('Image editor could not generate the avatar file.'));
        },
        'image/png',
        0.92,
      );
    });

    return new File([blob], `avatar-${Date.now()}.png`, { type: 'image/png' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const AvatarEditorModal = ({
  file,
  busy = false,
  onClose,
  onApply,
}: {
  file: File;
  busy?: boolean;
  onClose: () => void;
  onApply: (file: File) => Promise<void>;
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [frame, setFrame] = useState<AvatarFrame>('circle');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setImageUrl(nextUrl);
    setImageSize(null);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setFrame('circle');
    setLocalError(null);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file]);

  useEffect(() => {
    if (!imageUrl) {
      return;
    }

    let cancelled = false;

    loadImage(imageUrl)
      .then((image) => {
        if (!cancelled) {
          setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setLocalError(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  const metrics = useMemo(() => {
    if (!imageSize) {
      return null;
    }

    const baseScale = Math.max(PREVIEW_SIZE / imageSize.width, PREVIEW_SIZE / imageSize.height);
    const scale = baseScale * zoom;
    const drawWidth = imageSize.width * scale;
    const drawHeight = imageSize.height * scale;
    const maxOffsetX = Math.max(0, (drawWidth - PREVIEW_SIZE) / 2);
    const maxOffsetY = Math.max(0, (drawHeight - PREVIEW_SIZE) / 2);

    return {
      drawWidth,
      drawHeight,
      translateX: (offsetX / 100) * maxOffsetX,
      translateY: (offsetY / 100) * maxOffsetY,
    };
  }, [imageSize, offsetX, offsetY, zoom]);

  const handleApply = async () => {
    setLocalError(null);

    try {
      const processedFile = await renderAvatarFile(file, { zoom, offsetX, offsetY });
      await onApply(processedFile);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Avatar could not be prepared.');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#090612]/85 px-4 py-6 backdrop-blur-sm">
      <Card interactive={false} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto border-white/12 bg-[#100b1d] p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-secondary">Avatar Editor</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Crop and adjust profile photo</h3>
            <p className="mt-2 text-sm text-white/58">Set the crop, zoom level, and framing before uploading the image.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" soundTone="none" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={handleApply} disabled={busy || !imageSize}>
              {busy ? 'Uploading...' : 'Apply photo'}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.035] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-white/42">Live Preview</p>
              <div className="mt-4 flex justify-center">
                <div className={cn('relative h-[280px] w-[280px] overflow-hidden border border-white/10 bg-[#090612]', frameClassMap[frame])}>
                  {imageUrl && metrics ? (
                    <img
                      src={imageUrl}
                      alt="Avatar preview"
                      className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                      style={{
                        width: metrics.drawWidth,
                        height: metrics.drawHeight,
                        transform: `translate(calc(-50% + ${metrics.translateX}px), calc(-50% + ${metrics.translateY}px))`,
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/40">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 border border-white/12" />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {(['circle', 'rounded', 'square'] as AvatarFrame[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFrame(option)}
                  className={cn(
                    'rounded-[1.2rem] border px-4 py-4 text-left transition',
                    frame === option ? 'border-primary/45 bg-primary/12 text-white' : 'border-white/10 bg-white/[0.03] text-white/68 hover:bg-white/6 hover:text-white',
                  )}
                >
                  <p className="text-sm font-medium capitalize">{option}</p>
                  <p className="mt-1 text-xs text-white/45">Preview framing</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.035] p-5">
              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-secondary">
                    <Crop className="h-4 w-4" />
                    <p className="text-sm font-medium text-white">Crop scale</p>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                    className="w-full accent-[#7F63F4]"
                  />
                  <p className="mt-2 text-xs text-white/45">Zoom {zoom.toFixed(2)}x</p>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-secondary">
                    <Move className="h-4 w-4" />
                    <p className="text-sm font-medium text-white">Horizontal position</p>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={offsetX}
                    onChange={(event) => setOffsetX(Number(event.target.value))}
                    className="w-full accent-[#7F63F4]"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-secondary">
                    <ZoomIn className="h-4 w-4" />
                    <p className="text-sm font-medium text-white">Vertical position</p>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={offsetY}
                    onChange={(event) => setOffsetY(Number(event.target.value))}
                    className="w-full accent-[#7F63F4]"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.035] p-5">
              <p className="text-sm font-medium text-white">Adjustments</p>
              <p className="mt-2 text-sm leading-6 text-white/55">Use the sliders to tighten the crop and position the subject correctly inside the avatar frame.</p>
              <Button
                type="button"
                variant="outline"
                soundTone="none"
                className="mt-4"
                onClick={() => {
                  setZoom(1);
                  setOffsetX(0);
                  setOffsetY(0);
                  setFrame('circle');
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset adjustments
              </Button>
            </div>

            {localError ? <p className="text-sm text-rose-300">{localError}</p> : null}
          </div>
        </div>
      </Card>
    </div>
  );
};

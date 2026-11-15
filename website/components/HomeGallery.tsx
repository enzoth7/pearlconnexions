'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { Icon } from '@/components/pc';
import type { Photo } from '@/lib/home-details';

/** Tile shown where a home does not have a photo yet. */
function PhotoPlaceholder({ className }: { className: string }) {
  return (
    <div className={`${className} pc-gallery-placeholder`}>
      <Icon name="home-navy" width={47} height={48} />
      <small>Photo coming soon</small>
    </div>
  );
}

/** One large photo and four small ones, with a dialog that shows them all. */
export function HomeGallery({ name, photos }: { name: string; photos: Photo[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [main, ...rest] = photos;
  const thumbs = rest.slice(0, 4);
  const missing = 4 - thumbs.length;

  return (
    <div className="pc-gallery">
      <div className="pc-gallery-grid">
        {main ? (
          <div className="pc-gallery-main">
            <Image
              className={main.illustrative ? 'pc-photo' : undefined}
              src={main.src}
              alt={main.alt}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 580px"
            />
          </div>
        ) : (
          <PhotoPlaceholder className="pc-gallery-main" />
        )}
        {thumbs.map((photo) => (
          <div className="pc-gallery-thumb" key={photo.src}>
            <Image
              className="pc-photo"
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(max-width: 900px) 25vw, 290px"
            />
          </div>
        ))}
        {Array.from({ length: missing }, (_, index) => (
          <PhotoPlaceholder className="pc-gallery-thumb" key={`placeholder-${index}`} />
        ))}
        {photos.length ? (
          <button
            type="button"
            className="pc-gallery-button"
            onClick={() => dialog.current?.showModal()}
          >
            Show all photos
          </button>
        ) : null}
      </div>
      <dialog
        ref={dialog}
        className="pc-gallery-dialog"
        aria-label={`Photos of ${name}`}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="pc-gallery-dialog-head">
          <h2>{name}</h2>
          <button type="button" onClick={() => dialog.current?.close()}>
            Close
          </button>
        </div>
        <div className="pc-gallery-dialog-grid">
          {photos.map((photo) => (
            <figure key={photo.src}>
              <Image
                className={photo.illustrative ? 'pc-photo' : undefined}
                src={photo.src}
                alt={photo.alt}
                width={1400}
                height={934}
                sizes="(max-width: 900px) 100vw, 900px"
              />
              {photo.illustrative ? <figcaption>Illustrative photograph</figcaption> : null}
            </figure>
          ))}
        </div>
      </dialog>
    </div>
  );
}

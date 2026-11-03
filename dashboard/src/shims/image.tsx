import type { ImgHTMLAttributes } from "react";
type Props = ImgHTMLAttributes<HTMLImageElement> & { preload?: boolean; priority?: boolean; fill?: boolean; quality?: number; unoptimized?: boolean };
export default function Image({preload: _preload, priority: _priority, fill: _fill, quality: _quality, unoptimized: _unoptimized, ...props}: Props) { return <img {...props} />; }

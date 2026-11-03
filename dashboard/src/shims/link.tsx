import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react";
import { navigate } from "./navigation";
type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean; replace?: boolean; scroll?: boolean };
const Link = forwardRef<HTMLAnchorElement, Props>(function Link({href, onClick, prefetch: _prefetch, replace, scroll: _scroll, ...props}, ref) {
  function click(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === "_blank" || !href.startsWith("/")) return;
    event.preventDefault(); navigate(href, replace);
  }
  return <a {...props} ref={ref} href={href} onClick={click}/>;
});
export default Link;

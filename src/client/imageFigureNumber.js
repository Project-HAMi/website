/**
 * Client module hook for route updates.
 * Figure numbering and captions are now handled natively via React MDX component
 * (@theme/MDXComponents/Img) and CSS counters, avoiding raw VDOM DOM mutations.
 */
export function onRouteDidUpdate() {
  // No imperative DOM mutation needed
}

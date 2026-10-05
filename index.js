/**
 * dsh-the-color Host half: an inert row. The visible change lives entirely in
 * the browser half (./client); this entry exists so the Loader mounts the row
 * and @deepseek-ai/dsh-client-modules can discover the package manifest.
 */
export const name = 'dsh-the-color'

/** No host-side behavior. */
export function apply() {}

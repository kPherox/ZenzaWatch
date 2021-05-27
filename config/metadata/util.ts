
import packageMetadata from './package';

export interface RequireExternals {
  [key: string]: string[] | string;
}

/**
 * Transform dependency name and path to jsdelivr url.
 * @param {string} name dependency name.
 * @param {string} version dependency version.
 * @param {string} path jsdelivr path.
 * @return {string[]} the metadata block as a string.
 */
function jsDeliver(name: string, version: string, path: string): string {
  return `https://cdn.jsdelivr.net/npm/${name}@${version}${path}`;
}

/**
 * Transform dependencies key-value to jsdelivr urls array
 * @param {RequireExternals} externals dependencies with jsdelivr path.
 * @return {string[]} the metadata block as a string.
 */
export function requireURLs(externals: RequireExternals): string[] {
  return Object.entries(externals)
      .reduce((res: string[], [name, paths]) => {
        const version = packageMetadata.dependencies?.[name];
        if (version == null) {
          return res;
        }
        if (!Array.isArray(paths)) {
          res.push(jsDeliver(name, version, paths));
          return res;
        }
        for (const path of paths) {
          res.push(jsDeliver(name, version, path));
        }
        return res;
      }, []);
}

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const iconTag = /<svg data-icon="([a-z0-9-]+)"><\/svg>/g;

export function inlineIcons(directory) {
    const iconsDir = resolve(directory);

    return {
        name: 'inline-icons',
        transformIndexHtml: {
            order: 'pre',
            async handler(html) {
                const names = [...new Set([...html.matchAll(iconTag)].map(match => match[1]))];
                const icons = new Map(await Promise.all(names.map(async name => [
                    name,
                    (await readFile(resolve(iconsDir, `${name}.svg`), 'utf8')).trim()
                ])));

                return html.replace(iconTag, (_, name) => icons.get(name));
            }
        },
        hotUpdate({ file }) {
            if (dirname(resolve(file)) === iconsDir && file.endsWith('.svg')) {
                this.environment.hot.send({ type: 'full-reload' });
                return [];
            }
        }
    };
}

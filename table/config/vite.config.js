import { cp, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const configDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(configDir, '..');
const outDir = resolve(rootDir, 'dist');

const staticEntries = [
    ['versions.json', 'versions.json'],
    ['content', 'content'],
    ['config/pages/_routes.json', '_routes.json'],
    ['config/pages/_headers', '_headers'],
    ['favicon.png', 'favicon.png'],
    ['../latest.json', 'latest.json', true]
];

async function copyIfExists(source, target, optional = false) {
    const sourcePath = resolve(rootDir, source);
    const targetPath = resolve(outDir, target);

    try {
        await stat(sourcePath);
    } catch (error) {
        if (optional && error?.code === 'ENOENT') return;
        throw error;
    }

    await mkdir(dirname(targetPath), { recursive: true });
    await cp(sourcePath, targetPath, { recursive: true });
}

function copyPagesStatic() {
    return {
        name: 'copy-pages-static',
        apply: 'build',
        async closeBundle() {
            await Promise.all(staticEntries.map(entry => copyIfExists(...entry)));
        }
    };
}

export default defineConfig({
    root: rootDir,
    base: '/',
    build: {
        outDir,
        emptyOutDir: true,
        assetsDir: 'assets',
        sourcemap: false,
        rollupOptions: {
            input: resolve(rootDir, 'index.html')
        }
    },
    plugins: [copyPagesStatic()]
});

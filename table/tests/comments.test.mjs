import assert from 'node:assert/strict';
import test from 'node:test';
import { getCommentCount, loadAllData } from '../js/data/api.js';

test('a complete snapshot clears removed discussions and takes precedence over an older response', async t => {
    const pending = [];
    t.mock.method(globalThis, 'fetch', () => new Promise(resolve => pending.push(resolve)));
    const key = 'spotify-version-1.3.3.264';
    const snapshot = comments => Response.json({ comments });

    const first = loadAllData(true, true);
    pending.shift()(snapshot([{ title: key, commentCount: 3 }]));
    await first;
    assert.equal(getCommentCount(key), 3);

    const older = loadAllData(true, true);
    const newer = loadAllData(true, true);
    pending.pop()(snapshot([]));
    await newer;
    assert.equal(getCommentCount(key), 0);

    pending.shift()(snapshot([{ title: key, commentCount: 4 }]));
    await older;
    assert.equal(getCommentCount(key), 0);
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'data-manager.js'), 'utf8');

function createManager({ values = {}, fetchImpl = async () => ({ ok: false, status: 404 }), failWrites = false } = {}) {
    const storage = new Map(Object.entries(values));
    const alerts = [];
    let writeCount = 0;
    const context = {
        window: { location: { protocol: 'http:', hostname: 'localhost' } },
        document: { getElementById: () => null },
        localStorage: {
            getItem: key => storage.has(key) ? storage.get(key) : null,
            setItem: (key, value) => {
                if (failWrites) throw new Error('quota exceeded');
                writeCount += 1;
                storage.set(key, value);
            }
        },
        fetch: fetchImpl,
        alert: message => alerts.push(message),
        console: { log() {}, info() {}, warn() {}, error() {} },
        Date,
        Error,
        JSON,
        Set
    };

    vm.runInNewContext(source, context);

    return {
        manager: new context.window.DataManager(),
        storage,
        alerts,
        get writeCount() {
            return writeCount;
        }
    };
}

function dataForDeck(id) {
    return JSON.stringify({ decks: [{ id, name: id, cards: [] }] });
}

test('prefers canonical browser data before fetching the seed file', async () => {
    let fetchCount = 0;
    const env = createManager({
        values: { cardToolsData: dataForDeck('canonical') },
        fetchImpl: async () => {
            fetchCount += 1;
            throw new Error('fetch should not run');
        }
    });
    const { manager } = env;

    await manager.loadData();

    assert.equal(manager.getDecks()[0].id, 'canonical');
    assert.equal(fetchCount, 0);

    manager.decks = [];
    manager.storageMode = 'web';
    await manager.loadData();
    assert.equal(manager.getDecks()[0].id, 'canonical');
    assert.equal(fetchCount, 0, 'web mode must use the same persisted source');
});

test('migrates legacy storage and keeps the original key', async () => {
    const env = createManager({
        values: { 'cardtools-data': dataForDeck('legacy') }
    });
    const { manager, storage } = env;

    await manager.loadData();

    assert.equal(manager.getDecks()[0].id, 'legacy');
    assert.equal(storage.get('cardtools-data'), dataForDeck('legacy'));
    assert.equal(JSON.parse(storage.get('cardToolsData')).decks[0].id, 'legacy');
    assert.match(manager.getStorageNotice(), /copia original se conserva/);
    assert.equal(env.writeCount, 1);
});

test('stops on conflicting current and legacy copies without overwriting either', async () => {
    const current = dataForDeck('current');
    const legacy = dataForDeck('legacy');
    const { manager, storage, writeCount } = createManager({
        values: { cardToolsData: current, 'cardtools-data': legacy }
    });

    await assert.rejects(manager.loadData(), /dos copias distintas/);

    assert.equal(storage.get('cardToolsData'), current);
    assert.equal(storage.get('cardtools-data'), legacy);
    assert.equal(writeCount, 0);
});

test('does not overwrite malformed saved data with the seed file', async () => {
    const malformed = '{invalid';
    let fetchCount = 0;
    const { manager, storage } = createManager({
        values: { cardToolsData: malformed },
        fetchImpl: async () => {
            fetchCount += 1;
            return { ok: true, json: async () => JSON.parse(dataForDeck('seed')) };
        }
    });

    await assert.rejects(manager.loadData(), /JSON inválido/);

    assert.equal(storage.get('cardToolsData'), malformed);
    assert.equal(fetchCount, 0);
});

test('loads the seed file only when no browser copy exists', async () => {
    const { manager, storage } = createManager({
        fetchImpl: async () => ({
            ok: true,
            json: async () => JSON.parse(dataForDeck('seed'))
        })
    });

    await manager.loadData();

    assert.equal(manager.getDecks()[0].id, 'seed');
    assert.equal(storage.size, 0);
});

test('rolls back an in-memory mutation when browser storage fails', () => {
    const { manager, alerts } = createManager({ failWrites: true });
    manager.decks = [{ id: 'kept', name: 'kept', cards: [] }];

    assert.throws(
        () => manager.addDeck({ id: 'not-saved', name: 'not-saved', cards: [] }),
        /quota exceeded/
    );

    assert.deepEqual(JSON.parse(JSON.stringify(manager.getDecks())).map(deck => deck.id), ['kept']);
    assert.equal(alerts.length, 1);
});

test('persists image changes in one batch and keeps empty decks visible without filters', () => {
    const env = createManager();
    const { manager } = env;
    manager.decks = [{
        id: 'deck',
        name: 'deck',
        cards: [
            { id: 'first', coverImage: 'old-1' },
            { id: 'second', coverImage: 'old-2' }
        ]
    }];

    assert.equal(manager.updateCardImages([
        { cardId: 'first', imageUrl: 'new-1' },
        { cardId: 'second', imageUrl: 'new-2' }
    ]), true);
    assert.equal(env.writeCount, 1);
    manager.addDeck({ id: 'empty', name: 'empty', cards: [] });
    assert.equal(manager.getFilteredDecks().length, 2);
    manager.setSearchQuery('no-match');
    assert.equal(manager.getFilteredDecks().length, 0);
});

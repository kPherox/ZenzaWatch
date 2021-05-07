
import {fail, deepStrictEqual, notStrictEqual, strictEqual} from 'assert';
import IndexedDBController from '@zenza/workers/indexed-db/controller';
import indexedDB from 'fake-indexeddb';

describe('IndexedDBController', () => {
  const controller = new IndexedDBController(indexedDB);

  it('IndexedDB not found datamase', async () => {
    try {
      await controller.open({name: 'test'});
    } catch (error) {
      strictEqual((error as Error).message, 'not found database');
    }
    strictEqual(Object.keys(controller.db).length, 0);
  });

  it('IndexedDB open', async () => {
    try {
      await controller.open({name: 'test', stores: [{name: 'test'}]});
    } catch (error) {
      fail(error);
    }
    deepStrictEqual(Object.keys(controller.db), ['test']);
  });

  it('IndexedDB close', async () => {
    try {
      await controller.open({name: 'test'});
    } catch (error) {
      fail(error);
    }
    notStrictEqual(Object.keys(controller.db).length, 0);
    controller.close({name: 'test'});
    strictEqual(Object.keys(controller.db).length, 0);
  });
});


/// <reference lib="webworker" />

export {};
declare const self: DedicatedWorkerGlobalScope;

import IndexedDBController, {
  GcFail,
  Command,
  ResultType,
} from './controller';

const waitFor = self.setInterval(() => {
  return;
}, 10000);

self.addEventListener('error', (ev) => {
  console.error('IndexedDB worker:', 'error:', ev.message);
  self.clearInterval(waitFor);
  self.close();
}, false);

self.addEventListener('messageerror', (ev) => {
  console.warn('IndexedDB worker:', 'message error:', ev);
}, false);

let controller: IndexedDBController;
const run = async (cmd: Command): Promise<ResultType> => {
  if (controller == null) {
    console.debug('initialize IndexedDBController');
    controller = new IndexedDBController(self.indexedDB);
  } else {
    console.debug(
        'already IndexedDBController, opened IndexedDB:',
        Object.keys(controller.db),
    );
  }
  switch (cmd.command) {
    case 'open': {
      try {
        await controller.open(cmd.params);
        return 'ok';
      } catch (error) {
        return Promise.reject(error);
      }
    }
    case 'close': {
      controller.close(cmd.params);
      return 'ok';
    }
    case 'put': {
      try {
        return await controller.put(cmd.params);
      } catch (error) {
        return Promise.reject(error);
      }
    }
    case 'get': {
      try {
        return await controller.get(cmd.params);
      } catch (error) {
        return Promise.reject(error);
      }
    }
    case 'updateTime': {
      try {
        return await controller.updateTime(cmd.params);
      } catch (error) {
        return Promise.reject(error);
      }
    }
    case 'delete': {
      try {
        return await controller.delete(cmd.params);
      } catch (error) {
        return Promise.reject(error);
      }
    }
    case 'gc': {
      try {
        return await controller.gc(cmd.params);
      } catch (error) {
        const {message, query} = error as GcFail;
        console.error('gc fail', query, message);
        return 'ok';
      }
    }
  }
  return Promise.reject(Error(`unknown command: ${JSON.stringify(cmd)}`));
};

self.addEventListener('message', (ev: MessageEvent<Command | string>) => {
  if (ev.data === 'ping') {
    self.postMessage('pong');
    return;
  }
  let cmd: Command;
  if (typeof ev.data === 'string') {
    try {
      cmd = JSON.parse(ev.data) as Command;
    } catch {
      return;
    }
  } else {
    cmd = ev.data;
  }
  if ('command' in cmd && 'params' in cmd) {
    run(cmd).then((data) => {
      self.postMessage({result: 'success', cmd, data});
    }).catch((error) => {
      const {name, message, stack} = error as Error;
      self.postMessage({
        result: 'failed',
        command: cmd,
        error: {name, message, stack},
      });
    });
  }
}, false);

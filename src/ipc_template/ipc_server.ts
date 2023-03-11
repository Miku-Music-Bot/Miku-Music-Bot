import ipc from 'node-ipc';

import { ipc_config } from '../constants/constants';
import Logger from '../logger/logger';
import { FunctionRequest } from './ipc_types';

/**
 * StartIPCServer() - Starts IPC server for a component
 * @param ipc_id - unique ipc id of component
 * @param run_function - function to convert ipc function call to actual function call, should return promise to result of function
 * @param logger - logger
 * @param ready - promise that resolves once process is ready to start
 */
export default function StartIPCServer<FunctionNames>(
  ipc_id: string,
  logger: Logger,
  ready: Promise<void>,
  run_function: (data: FunctionRequest<FunctionNames>) => Promise<string>
): typeof ipc {
  ready.catch((error) => {
    logger.fatal(`Error getting component with {id:${ipc_id}} ready`, error);
  });

  ipc.config.silent = ipc_config.silent;
  ipc.config.rawBuffer = ipc_config.rawBuffer;
  ipc.config.appspace = ipc_config.app_namespace;
  ipc.config.id = ipc_id;

  logger.debug(`Starting ipc server in {namespace:${ipc_config.app_namespace}} and {id:${ipc_id}}`);
  ipc.serve(() => {
    ipc.server.on('error', (error) => {
      logger.error('Error on ipc server', error);
    });

    ipc.server.on('socket.disconnected', (socket, destroyed_socket_id) => {
      logger.warn(`IPC socket with {id:${destroyed_socket_id}} disconnected`);
    });

    ipc.server.on('message', async (data: FunctionRequest<FunctionNames>, socket) => {
      try {
        const result = await run_function(data);
        ipc.server.emit(socket, 'message', { uid: data.uid, success: true, result });
      } catch (error) {
        ipc.server.emit(socket, 'message', { uid: data.uid, success: false, error: error.message });
      }
    });

    ready.then(() => {
      process.send('ready');
    });
  });

  ipc.server.start();
  return ipc;
}

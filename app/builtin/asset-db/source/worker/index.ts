'use strict';

import './messages/database';
import './messages/operation';
import './messages/query';

import { ipcSend } from './ipc';

// @ts-ignore
window.Manager = {
    AssetWorker: {},
};

ipcSend('asset-worker:startup');

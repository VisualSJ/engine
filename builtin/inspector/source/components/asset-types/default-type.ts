'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(join(__dirname, '../../../static/template/default-type.html'), 'utf8');

export const props: string[] = ['meta'];

export const methods = {};

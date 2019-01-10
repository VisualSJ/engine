'use strict';

if (process.platform === 'win32') {
    console.warn('Building a Windows version is not supported');
} else {
    require('./mac');
}

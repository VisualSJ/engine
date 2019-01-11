'use sitrct';

async function selector(panel, selector) {
    return await Editor.Ipc.requestToPackage(
        'tester', 'forwarding-to-window',
        panel, selector
    );
}

exports.selector = selector;

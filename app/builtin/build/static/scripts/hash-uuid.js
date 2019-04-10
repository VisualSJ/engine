
const XXH = require('xxhashjs');

// 因为我们计算的哈希值字符串长度不一定一样，所以在后面添加 ID 时要用分隔符隔开，
// 才能避免加了 ID 后又刚好和其它哈希值冲突
const UNIQUE_ID_SEP = '-';

function unique(array) {
    var counts = {};
    for (var i = 0; i < array.length; i++) {
        var hash = array[i];
        var count = counts[hash];
        if (typeof count === 'undefined') {
            counts[hash] = 1;
        } else {
            array[i] = hash + UNIQUE_ID_SEP + (count).toString(16);
            counts[hash] = count + 1;
        }
    }
}

/**
 * 传入多个 uuid 数组，计算出每个数组对应的哈希值（16进制字符串表示），保证每次返回的哈希值之间互不重复。
 * 如果指定了 hashName，保证不同的 hashName 返回的哈希值一定互不重复。
 * @param {String[][]} uuidGroups
 * @param {BuiltinHashType|String} hashName - 如果哈希值会用作文件名，要注意 hashName 不区分大小写并且不能包含非法字符
 * @return {String[][]} hashes
 */
module.exports.calculate = function(uuidGroups, hashName) {
    var H = XXH.h32();
    var hashes = [];
    for (var i = 0; i < uuidGroups.length; i++) {
        var uuids = uuidGroups[i];
        uuids = uuids.slice().sort();
        for (var j = 0; j < uuids.length; j++) {
            H.update(uuids[j]);
        }
        var hash = H.digest().toString(16).padEnd(8, '0');
        hashes.push(hash);
    }

    unique(hashes);

    // add prefix
    if (typeof hashName === 'string') {
        if (hashName.length < 2) {
            console.error('hashName string length must >= 2');
            return hashes;
        }
    } else {
        hashName = '0123456789abcdef'[hashName];
        if (!hashName) {
            console.error('Invalid hashName');
            return hashes;
        }
    }
    return hashes.map((x) => {
        return hashName + x;
    });
};

module.exports.BuiltinHashType = {
    PackedAssets: 0,
    AutoAtlasTexture: 1,
};

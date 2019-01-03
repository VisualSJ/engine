'use strict';

const $mask = document.createElement('div');
const $background = document.createElement('div');
const $info = document.createElement('div');

$mask.appendChild($background);
$mask.appendChild($info);

$mask.style.position = 'absolute';
$mask.style.top = '0';
$mask.style.left = '0';
$mask.style.width = '100%';
$mask.style.height = '100%';
$mask.style.zIndex = '100';
$mask.style.display = 'none';
$mask.style.alignItems = 'center';
$mask.style.justifyContent = 'center';

$background.style.position = 'absolute';
$background.style.background = '#222';
$background.style.top = '0';
$background.style.left = '0';
$background.style.width = '100%';
$background.style.height = '100%';
$background.style.opacity = '0.8';

$info.style.background = '#444';
$info.style.color = '#ccc';
$info.style.padding = '10px 20px';
$info.style.padding = '10px 20px';
$info.style.zIndex = '1';
$info.style.borderRadius = '4px';

document.body.appendChild($mask);

exports.show = function(title, describe) {
    if (title) {
        $info.innerHTML = title;
        $mask.style.display = 'flex';
    } else {
        $info.innerHTML = '';
        $mask.style.display = 'none';
    }
};

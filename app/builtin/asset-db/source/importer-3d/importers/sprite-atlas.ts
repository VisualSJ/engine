'use strict';

// const Path = require('fire-path');
// const SpriteMeta = require('./sprite-frame');
import { Asset, Importer, VirtualAsset } from '@editor/asset-db';
import { existsSync, readFile } from 'fs-extra';
import { basename, dirname, extname, join } from 'path';
import plist from 'plist';
import { makeDefaultSpriteFrameAssetUserDataFromImageUuid } from './sprite-frame';
import { SpriteFrameBaseAssetUserData } from './texture-base';
// const BRACE_REGEX = /[\{\}]/g;

export interface IAtlas {
  // @ts-ignore
  size: cc.Size;
  atlasTextureName: string;
  textureUuid: string | null;
  frames: SpriteFrameBaseAssetUserData[];
  uuid: string;
}

interface IMetadata {
  format: number;
  pixelFormat: string;
  premultiplyAlpha: boolean;
  realTextureFileName: string;
  size: string;
}

interface IFrame {
  spriteOffset: string;
  spriteSize: string;
  spriteSourceSize: string;
  textureRect: string;
  textureRotated: boolean;
}

export default class SpriteAtlasImporter extends Importer {
  // 版本号如果变更，则会强制重新导入
  get version() {
    return '1.0.2';
  }

  // importer 的名字，用于指定 importer as 等
  get name() {
    return 'sprite-atlas';
  }

  // 引擎内对应的类型
  get assetType() {
    return 'cc.SpriteAtlas';
  }

  public async import(asset: Asset) {
    let updated = false;

    const ext = extname(asset.source);

    if (!(await asset.existsInLibrary(ext))) {
      await asset.copyToLibrary(ext, asset.source);
    }

    // atlas 最外层 userData 包含大图的 size，图片名 atlasTextureName，以及图片的 uuid textureUuid
    // 图集贴图都放置在 submeta 下

    // 如果没有生成 json 文件，则重新生成
    if (!(await asset.existsInLibrary('.json'))) {
      // 数据 atlas 填充
      const userData = asset.userData as IAtlas;

      const file = await readFile(asset.source, 'utf8');
      const data = plist.parse(file);
      // @ts-ignore
      userData.atlasTextureName = data.metadata.realTextureFileName;
      // @ts-ignore
      userData.size = this._stringConvertSizeOrVec(data.metadata.size);
      userData.uuid = asset.uuid;

      // 标记依赖资源
      if (this.assetDB) {
        const textureBaseName = basename(userData.atlasTextureName);
        const texturePath = join(dirname(asset.source), textureBaseName);
        if (!existsSync(texturePath)) {
          console.error('Parse Error: Unable to find file Texture, the path: ' + texturePath);
        }
        asset.rely(texturePath);
        const uuid = this.assetDB.pathToUuid(texturePath);
        if (!uuid) {
          return false;
        }

        userData.textureUuid = uuid;
      }

      // 如果依赖的资源已经导入完成了，则生成对应的数据
      if (asset.userData.textureUuid && this.assetDB) {
        const ext_replacer = /\.[^.]+$/;
        let keyNoExt = '';

        // @ts-ignore
        const keys = Object.keys(data.frames);
        // @ts-ignore
        const spriteAtlas = new cc.SpriteAtlas();
        spriteAtlas.name = basename(asset.source, asset.extname);
        for (const key of keys) {
          keyNoExt = key.replace(ext_replacer, '');
          // 数据 atlas 内 spriteframe 填充
          // @ts-ignore
          const f = (data.frames[key]) as IFrame;
          const atlasSubAsset = await asset.createSubAsset(keyNoExt, 'sprite-frame');
          const frameData = this.fillFrameData(f, userData);
          // asset.userData.redirect = atlasSubAsset.uuid;
          atlasSubAsset.assignUserData(frameData, true);
          const arr = key.split('.');
          arr.pop();
          const format =  arr.join('.');
          // @ts-ignore
          spriteAtlas.spriteFrames[format] = Manager.serialize.asAsset(atlasSubAsset.uuid);
        }

        // @ts-ignore
        await asset.saveToLibrary('.json', Manager.serialize(spriteAtlas));
        updated = true;
      }
    }

    return updated;
  }

  private fillFrameData(frame: IFrame, userData: IAtlas) {
    const frameData = makeDefaultSpriteFrameAssetUserDataFromImageUuid(userData.textureUuid!, userData.uuid);
    frameData.rotated = frame.textureRotated;
    const orginSize = this._stringConvertSizeOrVec(frame.spriteSourceSize);
    frameData.rawWidth = orginSize.width;
    frameData.rawHeight = orginSize.height;
    const rect = this.stringConvertRect(frame.textureRect);
    frameData.trimX = rect.x;
    frameData.trimY = rect.y;
    frameData.width = rect.width;
    frameData.height = rect.height;
    const offset = this._stringConvertSizeOrVec(frame.spriteOffset, false);
    frameData.offsetX = offset.x;
    frameData.offsetY = offset.y;

    return frameData;
  }

  private _stringConvertSizeOrVec(value: string, isSize: boolean = true) {
    const content = value.replace(/\{|}/g, '');
    const sizeString = content.split(',');

    let size = null;
    if (isSize) {
      // @ts-ignore
      size = new cc.Size(parseFloat(sizeString[0]), parseFloat(sizeString[1]));
    } else {
      // @ts-ignore
      size = new cc.Vec2(parseFloat(sizeString[0]), parseFloat(sizeString[1]));
    }

    return size;
  }

  private stringConvertRect(value: string) {
    const content = value.replace(/\{|}/g, '');
    const sizeString = content.split(',');
    // @ts-ignore
    const size = new cc.Rect(
      parseFloat(sizeString[0]),
      parseFloat(sizeString[1]),
      parseFloat(sizeString[2]),
      parseFloat(sizeString[3])
    );
    return size;
  }
}

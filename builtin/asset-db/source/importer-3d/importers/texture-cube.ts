import { Asset, Importer, VirtualAsset } from 'asset-db';
import equirectToCubemapFaces from 'equirect-cubemap-faces-js';

interface ITextureCubeImporterSwapSpace {
    front: HTMLCanvasElement;
    back: HTMLCanvasElement;
    left: HTMLCanvasElement;
    right: HTMLCanvasElement;
    top: HTMLCanvasElement;
    bottom: HTMLCanvasElement;
}

export default class TextureCubeImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'texture-cube';
    }

    get assetType() {
        return 'cc.TextureCube';
    }

    /**
     * 判断是否允许使用当前的 importer 进行导入
     * @param asset
     */
    public async validate(asset: Asset) {
        return true;
    }

    /**
     * 实际导入流程
     * 需要自己控制是否生成、拷贝文件
     *
     * 返回是否更新的 boolean
     * 如果返回 true，则会更新依赖这个资源的所有资源
     * @param asset
     */
    public async import(asset: VirtualAsset) {
        let updated = false;

        if (!(await asset.existsInLibrary('.json'))) {
            const imageSource = asset.userData.imageSource as string;
            if (!imageSource) {
                return false;
            }

            const equirectImage = await new Promise((resolve: (equirectImage: HTMLImageElement) => void, reject) => {
                const equirectImage = document.createElement('img');
                equirectImage.onload = () => resolve(equirectImage);
                equirectImage.onerror = reject;
                equirectImage.src = imageSource;
            });

            const faceArray = equirectToCubemapFaces(equirectImage);
            if (faceArray.length !== 6) {
                throw new Error(`Failed to split cubemap faces.`);
            }

            const faces = {
                right: faceArray[0],
                left: faceArray[1],
                top: faceArray[2],
                bottom: faceArray[3],
                front: faceArray[4],
                back: faceArray[5],
            };

            const facesAssets = {};

            const swapSpace = { };
            for (const face of Object.getOwnPropertyNames(faces)) {
                const faceCanvas = (faces as any)[face] as HTMLCanvasElement;
                (swapSpace as any)[face] = faceCanvas;
                const faceAsset = await asset.createSubAsset(face, 'texture-cube-face');
                // @ts-ignore
                (facesAssets as any)[face] = Manager.serialize.asAsset(faceAsset.uuid);
            }
            (asset as any).swapSpace = swapSpace;

            // @ts-ignore
            const texture = new cc.TextureCube();
            texture._mipmaps = [ facesAssets ];

            // @ts-ignore
            asset.saveToLibrary('.json', Manager.serialize(texture));

            updated = true;
        }

        return updated;
    }
}

export class TextureCubeFaceImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'texture-cube-face';
    }

    /**
     * 判断是否允许使用当前的 importer 进行导入
     * @param asset
     */
    public async validate(asset: Asset) {
        return true;
    }

    /**
     * 实际导入流程
     * 需要自己控制是否生成、拷贝文件
     *
     * 返回是否更新的 boolean
     * 如果返回 true，则会更新依赖这个资源的所有资源
     * @param asset
     */
    public async import(asset: VirtualAsset) {
        if (!asset.parent) {
            return false;
        }

        const swapSpace: ITextureCubeImporterSwapSpace = (asset.parent as any).swapSpace;
        if (!swapSpace) {
            return false;
        }

        const assetNames = asset.uuid.split('@');
        if (assetNames.length === 0) {
            return false;
        }

        const myFaceName = assetNames[assetNames.length - 1];

        const canvas = (swapSpace as any)[myFaceName] as HTMLCanvasElement;
        if (!canvas) {
            return false;
        }

        await asset.saveToLibrary('.png', await this._getCanvasData(canvas));

        // @ts-ignore
        const image = new cc.ImageAsset();
        // @ts-ignore
        await asset.saveToLibrary('.json', Manager.serialize(image));

        return true;
    }

    private async _getCanvasData(canvas: HTMLCanvasElement): Promise<Buffer> {
        const blob = await new Promise((resolve: (blob: Blob) => void, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(blob);
                }
            });
        });
        const arrayBuffer = await new Response(blob).arrayBuffer();
        return new Buffer(arrayBuffer);
    }
}

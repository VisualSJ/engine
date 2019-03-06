
// Modified from https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/babel-core/index.d.ts .
// Fit @babel/core.
declare module '@babel/core' {
    // Type definitions for babel-core 6.25
    // Project: https://github.com/babel/babel/tree/master/packages/babel-core
    // Definitions by: Troy Gerwien <https://github.com/yortus>
    //                 Marvin Hagemeister <https://github.com/marvinhagemeister>
    // Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
    // TypeScript Version: 2.8

    import * as t from 'babel-types';
    export { t as types };
    export type Node = t.Node;
    export import template = require('babel-template');
    export const version: string;
    import traverse, { Visitor, NodePath } from 'babel-traverse';
    export { traverse, Visitor };
    import { BabylonOptions } from 'babylon';
    export { BabylonOptions };
    import { GeneratorOptions } from 'babel-generator';
    export { GeneratorOptions };

    /**
     * Given some code, parse it using Babel's standard behavior. Referenced presets and plugins will be loaded such that optional syntax plugins are automatically enabled.
     */
    export function parse(code: string, options?: Object, callback?: Function): Node;

    /**
     * Given some code, parse it using Babel's standard behavior. Referenced presets and plugins will be loaded such that optional syntax plugins are automatically enabled.
     * @returns An AST.
     */
    export function parseSync(code: string, options?: Object): Node;

    /**
     * Given some code, parse it using Babel's standard behavior. Referenced presets and plugins will be loaded such that optional syntax plugins are automatically enabled.
     * @returns A promise for an AST.
     */
    export function parseAsync(code: string, options?: Object): Promise<Node>;

    // A babel plugin is a simple function which must return an object matching
    // the following interface. Babel will throw if it finds unknown properties.
    // The list of allowed plugin keys is here:
    // https://github.com/babel/babel/blob/4e50b2d9d9c376cee7a2cbf56553fe5b982ea53c/packages/babel-core/src/config/option-manager.js#L71
    export interface Plugin<S = {}> {
        name?: string;
        manipulateOptions?(opts: any, parserOpts: any): void;
        pre?(this: S, state: any): void;
        visitor: Visitor<S>;
        post?(this: S, state: any): void;
        inherits?: any;
    }

    /**
     * Transforms the passed in `code`. Calling a callback with an object with the generated code, source map, and AST.
     */
    export function transform(code: string, options?: TransformOptions, callback?: (err: any, result: BabelFileResult) => void): BabelFileResult;

    /**
     * Transforms the passed in `code`. Returning an object with the generated code, source map, and AST.
     */
    export function transformSync(code: string, options?: TransformOptions): BabelFileResult;

    /**
     * Transforms the passed in `code`. Returning an promise for an object with the generated code, source map, and AST.
     */
    export function transformAsync(code: string, options?: TransformOptions): Promise<BabelFileResult>;

    /**
     * Asynchronously transforms the entire contents of a file.
     */
    export function transformFile(filename: string, options?: TransformOptions, callback?: (err: any, result: BabelFileResult) => void): BabelFileResult;

    /**
     * Synchronous version of `babel.transformFile`. Returns the transformed contents of the filename.
     */
    export function transformFileSync(filename: string, options?: TransformOptions): BabelFileResult;

    /**
     * Promise version of `babel.transformFile`. Returns a promise for the transformed contents of the filename.
     */
    export function transformFileSync(filename: string, options?: TransformOptions): Promise<BabelFileResult>;

    /**
     * Given an AST, transform it.
     */
    export function transformFromAst(ast: Node, code?: string, options?: TransformOptions): BabelFileResult;

    /**
     * Given an AST, transform it.
     */
    export function transformFromSync(ast: Node, code?: string, options?: TransformOptions): BabelFileResult;

    /**
     * Given an AST, transform it.
     */
    export function transformFromAsync(ast: Node, code?: string, options?: TransformOptions): Promise<BabelFileResult>;

    export interface TransformOptions {
        /**
         * Babel's default is to generate a string and a sourcemap, but in some contexts it can be useful to get the AST itself.
         * @default false
         * @note This option is not on by default because the majority of users won't need it and because we'd like to eventually add a caching layer to Babel. Having to cache the AST structure will take significantly more space.
         */
        ast?: boolean;

        /** Attach a comment after all non-user injected code. */
        auxiliaryCommentAfter?: string;

        /** Attach a comment before all non-user injected code. */
        auxiliaryCommentBefore?: string;

        /** Specify whether or not to use `.babelrc` and `.babelignore` files. Default: `true`. */
        babelrc?: boolean;

        /**
         * @default opts.root
         */
        babelrcRoots?: boolean | string | string[];

        /**
         * Utilities may pass a caller object to identify themselves to Babel and pass capability-related flags for use by configs, presets and plugins.
         */
        caller?: { name: string; };

        /**
         * Default: `true`.
         * Babel's default return value includes `code` and `map` properties with the resulting generated code. In some contexts where multiple calls to Babel are being made, it can be helpful to disable code generation and instead use `ast: true` to get the AST directly in order to avoid doing unnecessary work.
         */
        code?: boolean;

        /** write comments to generated output. Default: `true`. */
        comments?: boolean;

        /**
         * Do not include superfluous whitespace characters and line terminators. When set to `"auto"`, `compact` is set to
         * `true` on input sizes of >100KB.
         */
        compact?: boolean | "auto";

        /**
         * Defaults to searching for a default babel.config.js file, but can be passed the path of any JS or JSON5 config file.
         * @note This option does not affect loading of .babelrc files, so while it may be tempting to do configFile: "./foo/.babelrc", it is not recommended. If the given .babelrc is loaded via the standard file-relative logic, you'll end up loading the same config file twice, merging it with itself. If you are linking a specific config file, it is recommended to stick with a naming scheme that is independent of the "babelrc" name.
         * @default path.resolve(opts.root, "babel.config.js")
         */
        configFile?: string | boolean;

        /**
         * The working directory that all paths in the programmatic options will be resolved relative to. Default: process.cwd().
         */
        cwd?: string;

        /**
         * This is an object of keys that represent different environments. For example, you may have:
         * `{ env: { production: { / * specific options * / } } }`
         * which will use those options when the enviroment variable `BABEL_ENV` is set to `"production"`.
         * If `BABEL_ENV` isn't set then `NODE_ENV` will be used, if it's not set then it defaults to `"development"`.
         */
        env?: object;

        /**
         * The current active environment used during configuration loading. This value is used as the key when resolving "env" configs, and is also available inside configuration functions, plugins, and presets, via the api.env() function.
         * @default (process.env.BABEL_ENV || process.env.NODE_ENV || 'development')
         */
        envName?: string;

        /** A path to an .babelrc file to extend. */
        extends?: string;

        /**
         * The filename associated with the code currently being compiled, if there is one.
         * The filename is optional, but not all of Babel's functionality is available when the filename is unknown, because a subset of options rely on the filename for their functionality.
         * The three primary cases users could run into are:
         *     * The filename is exposed to plugins. Some plugins may require the presence of the filename.
         *     * Options like "test", "exclude", and "ignore" require the filename for string/RegExp matching.
         *     * .babelrc files are loaded relative to the file being compiled. If this option is omitted, Babel will behave as if babelrc: false has been set.
         */
        filename?: string;

        /**
         * Default: `path.relative(opts.cwd, opts.filename) (if "filename" was passed)`.
         * Used as the default value for Babel's sourceFileName option, and used as part of generation of filenames for the AMD / UMD / SystemJS module transforms.
         */
        filenameRelative?: string;

        /** An object containing the options to be passed down to the babel code generator, babel-generator. Default: `{}` */
        generatorOpts?: GeneratorOptions;

        /**
         * Specify a custom callback to generate a module id with. Called as `getModuleId(moduleName)`.
         * If falsy value is returned then the generated module id is used.
         */
        getModuleId?(moduleName: string): string;

        /** Enable/disable ANSI syntax highlighting of code frames. Default: `true`. */
        highlightCode?: boolean;

        /** list of glob paths to **not** compile. Opposite to the `only` option. */
        ignore?: string[];

        /** A source map object that the output source map will be based on. */
        inputSourceMap?: boolean | object;

        /** Should the output be minified. Default: `false` */
        minified?: boolean;

        /** Specify a custom name for module ids. */
        moduleId?: string;

        /**
         * If truthy, insert an explicit id for modules. By default, all modules are anonymous.
         * (Not available for `common` modules).
         */
        moduleIds?: boolean;

        /** Optional prefix for the AMD module formatter that will be prepend to the filename on module definitions. */
        moduleRoot?: string;

        /**
         * A glob, regex, or mixed array of both, matching paths to only compile. Can also be an array of arrays containing
         * paths to explicitly match. When attempting to compile a non-matching file it's returned verbatim.
         */
        only?: string | RegExp | Array<string | RegExp>;

        /** Babylon parser options. */
        parserOpts?: BabylonOptions;

        /** List of plugins to load and use. */
        plugins?: any[];

        /** List of presets (a set of plugins) to load and use. */
        presets?: any[];

        /** Retain line numbers - will result in really ugly code. Default: `false` */
        retainLines?: boolean;

        /**
         * @default opts.cwd
         * The initial path that will be processed based on the "rootMode" to determine the conceptual root folder for the current Babel project. This is used in two primary cases:
         *    * The base directory when checking for the default "configFile" value
         *    * The default value for "babelrcRoots".
         */
        root?: string;

        /**
         * @default 'root'
         * @version ^7.1.0
         * This option, combined with the "root" value, defines how Babel chooses its project root. The different modes define different ways that Babel can process the "root" value to get the final project root.
         *     * "root" - Passes the "root" value through as unchanged.
         *     * "upward" - Walks upward from the "root" directory, looking for a directory containing a babel.config.js file, and throws an error if a babel.config.js is not found.
         *     * "upward-optional" - Walk upward from the "root" directory, looking for a directory containing a babel.config.js file, and falls back to "root" if a babel.config.js is not found.
         * "root" is the default mode because it avoids the risk that Babel will accidentally load a babel.config.js that is entirely outside of the current project folder. If you use "upward-optional", be aware that it will walk up the directory structure all the way to the filesystem root, and it is always possible that someone will have a forgotten babel.config.js in their home directory, which could cause unexpected errors in your builds.
         * Users with monorepo project structures that run builds/tests on a per-package basis may well want to use "upward" since monorepos often have a babel.config.js in the project root. Running Babel in a monorepo subdirectory without "upward", will cause Babel to skip loading any babel.config.js files in the project root, which can lead to unexpected errors and compilation failure.
         */
        rootMode?: 'root' | 'upward' | 'upward-optional';

        /** Resolve a module source ie. import "SOURCE"; to a custom value. */
        resolveModuleSource?(source: string, filename: string): string;

        /**
         * An optional callback that controls whether a comment should be output or not. Called as
         * `shouldPrintComment(commentContents)`. **NOTE**: This overrides the `comments` option when used.
         */
        shouldPrintComment?(comment: string): boolean;

        /** Set `sources[0]` on returned source map. */
        sourceFileName?: string;

        /**
         * If truthy, adds a `map` property to returned output. If set to `"inline"`, a comment with a `sourceMappingURL`
         * directive is added to the bottom of the returned code. If set to `"both"` then a map property is returned as well
         * as a source map comment appended.
         */
        sourceMaps?: boolean | "inline" | "both";

        /** Set `file` on returned source map. */
        sourceMapTarget?: string;

        /** The root from which all sources are relative. */
        sourceRoot?: string;

        /** Indicate the mode the code should be parsed in. Can be either “script” or “module”. Default: "module" */
        sourceType?: "script" | "module";

        /**
         * An optional callback that can be used to wrap visitor methods.
         * NOTE: This is useful for things like introspection, and not really needed for implementing anything.
         */
        wrapPluginVisitorMethod?(pluginAlias: string, visitorType: 'enter' | 'exit', callback: (path: NodePath, state: any) => void): (path: NodePath, state: any) => void;
    }

    export interface BabelFileModulesMetadata {
        imports: object[];
        exports: {
            exported: object[],
            specifiers: object[]
        };
    }

    export interface BabelFileMetadata {
        usedHelpers: string[];
        marked: Array<{
            type: string;
            message: string;
            loc: object;
        }>;
        modules: BabelFileModulesMetadata;
    }

    export interface BabelFileResult {
        ast?: Node;
        code?: string;
        ignored?: boolean;
        map?: object;
        metadata?: BabelFileMetadata;
    }
}
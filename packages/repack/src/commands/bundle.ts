import { Config } from '@react-native-community/cli-types';
import fs from 'fs-extra';
import { stringifyStream } from '@discoveryjs/json-ext';
import webpack from 'webpack';
import { merge as mergeWebpackConfigs } from 'webpack-merge';
import ReactFlightWebpackPlugin from 'react-server-dom-webpack/plugin'; // ReactFlightWebpackPluginOptions,
import { Configuration } from 'webpack';
import { VERBOSE_ENV_KEY } from '../env';
import { BundleArguments, CliOptions } from '../types';
import { loadWebpackConfig } from '../webpack/loadWebpackConfig';
import { getWebpackEnvOptions } from '../webpack/utils';
import { getWebpackConfigPath } from './utils/getWebpackConfigPath';
import RSCAnalysisPlugin, {
  createAnalysisContext,
} from './rsc/RSCAnalysisPlugin';
import { getResolveOptions } from './../webpack/utils';

/**
 * Bundle command for React Native CLI.
 * It runs Webpack, builds bundle and saves it alongside any other assets and Source Map
 * to filesystem.
 *
 * @param _ Original, non-parsed arguments that were provided when running this command.
 * @param config React Native CLI configuration object.
 * @param args Parsed command line arguments.
 *
 * @internal
 * @category CLI command
 */
export async function bundle(
  _: string[],
  config: Config,
  args: BundleArguments
) {
  const webpackConfigPath = getWebpackConfigPath(
    config.root,
    args.webpackConfig
  );
  const cliOptions = {
    config: {
      root: config.root,
      reactNativePath: config.reactNativePath,
      webpackConfigPath,
    },
    command: 'bundle',
    arguments: {
      bundle: args,
    },
  } as CliOptions;

  if (args.verbose ?? process.argv.includes('--verbose')) {
    process.env[VERBOSE_ENV_KEY] = '1';
  }

  const webpackEnvOptions = getWebpackEnvOptions(cliOptions);
  const webpackConfig = await loadWebpackConfig(
    webpackConfigPath,
    webpackEnvOptions
  );

  const analysisCtx = createAnalysisContext();

  const analysisConfig: Configuration = {
    mode: 'development', // hehe be careful
    devtool: false,
    entry: {
      main: '/Users/szymonrybczak/callstack/repack/packages/TesterApp/index.js',
    },
    resolve: {
      ...getResolveOptions('ios'),
    },
    plugins: [new RSCAnalysisPlugin({ analysisCtx })],
    target: 'node16', // TODO does this matter?
    experiments: { layers: true },
    output: {
      // path: path.join(opts.server.destDir, '__analysis__'),
      path: '/Users/szymonrybczak/callstack/repack_output/__analysis__',
      clean: true,
    },
    module: {
      /**
       * This rule will process all React Native related dependencies with Babel.
       * If you have a 3rd-party dependency that you need to transpile, you can add it to the
       * `include` list.
       *
       * You can also enable persistent caching with `cacheDirectory` - please refer to:
       * https://github.com/babel/babel-loader#options
       */
      rules: [
        {
          test: /\.[jt]sx?$/,
          include: [
            /node_modules(.*[/\\])+react\//,
            /node_modules(.*[/\\])+react-native/,
            /node_modules(.*[/\\])+@react-native/,
            /node_modules(.*[/\\])+@react-navigation/,
            /node_modules(.*[/\\])+@react-native-community/,
            /node_modules(.*[/\\])+@expo/,
            /node_modules(.*[/\\])+pretty-format/,
            /node_modules(.*[/\\])+metro/,
            /node_modules(.*[/\\])+abort-controller/,
            /node_modules(.*[/\\])+@callstack\/repack/,
          ],
          use: 'babel-loader',
        },
        {
          test: /\.m?js/,
          type: 'javascript/auto',
          resolve: {
            fullySpecified: false,
          },
        },
        /**
         * Here you can adjust loader that will process your files.
         *
         * You can also enable persistent caching with `cacheDirectory` - please refer to:
         * https://github.com/babel/babel-loader#options
         */
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              /** Add React Refresh transform only when HMR is enabled. */
              plugins: ['module:react-refresh/babel'],
            },
          },
        },
        /**
         * This loader handles all static assets (images, video, audio and others), so that you can
         * use (reference) them inside your application.
         *
         * If you wan to handle specific asset type manually, filter out the extension
         * from `ASSET_EXTENSIONS`, for example:
         * ```
         * Repack.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
         * ```
         */
        // {
        //   test: Repack.getAssetExtensionsRegExp(Repack.ASSET_EXTENSIONS),
        //   use: {
        //     loader: '@callstack/repack/assets-loader',
        //     options: {
        //       platform: 'ios',
        //       devServerEnabled: Boolean(devServer),
        //       /**
        //        * Defines which assets are scalable - which assets can have
        //        * scale suffixes: `@1x`, `@2x` and so on.
        //        * By default all images are scalable.
        //        */
        //       scalableAssetExtensions: Repack.SCALABLE_ASSETS,
        //     },
        //   },
        // },
      ],
    },
    optimization: {
      // ...NO_TERSER, wtf
    },
  };
  console.log('1');
  await webpack(analysisConfig, () => {
    // console.log('CLIENT REFERENCES', analysisCtx.modules.client);
    const clientReferences: any = [...analysisCtx.modules.client.keys()];
    // console.log('CLIENT REFERENCES', clientReferences);

    const mergedConfig = mergeWebpackConfigs(webpackConfig, {
      plugins: [
        new ReactFlightWebpackPlugin({
          isServer: false,
          clientReferences, // sprawdzic format tego, porownac z janka i dlaczego dalej jest problem? moze dlatego ze w TesterApp nie ma tej depki?
        }),
      ],
    });
    console.log('hello!', mergedConfig);

    const compiler = webpack(mergedConfig);

    return new Promise<void>((resolve, reject) => {
      compiler.run((error, stats) => {
        if (error) {
          reject();
          console.error(error);
          process.exit(2);
        } else {
          if (stats?.hasErrors()) {
            reject();
            process.exit(2);
          }

          if (args.json && stats !== undefined) {
            console.log(`Writing compiler stats`);

            let statOptions: Parameters<typeof stats.toJson>[0];
            if (args.stats !== undefined) {
              statOptions = { preset: args.stats };
            } else if (typeof compiler.options.stats === 'boolean') {
              statOptions = compiler.options.stats
                ? { preset: 'normal' }
                : { preset: 'none' };
            } else {
              statOptions = compiler.options.stats;
            }

            const statsJson = stats.toJson(statOptions);
            // Stats can be fairly big at which point their JSON no longer fits into a single string.
            // Approach was copied from `webpack-cli`: https://github.com/webpack/webpack-cli/blob/c03fb03d0aa73d21f16bd9263fd3109efaf0cd28/packages/webpack-cli/src/webpack-cli.ts#L2471-L2482
            const outputStream = fs.createWriteStream(args.json);

            stringifyStream(statsJson)
              .on('error', (error) => {
                reject();
                console.error(error);
                process.exit(2);
              })
              .pipe(outputStream)
              .on('error', (error) => {
                reject();
                console.error(error);
                process.exit(2);
              })
              .on('close', () => {
                console.log(`Wrote compiler stats to ${args.json}`);
                resolve();
              });
          } else {
            resolve();
          }
        }
      });
    });
  });
  console.log('2');

  // const clientReferences: ReactFlightWebpackPluginOptions['clientReferences'] =
  //   [...analysisCtx.modules.client.keys()];
}

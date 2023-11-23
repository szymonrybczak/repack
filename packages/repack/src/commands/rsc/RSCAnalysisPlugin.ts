import Webpack, { Compiler, NormalModule, Module } from 'webpack';

// wtf is this
const tapParserJS = (
  nmf: /* Webpack.NormalModuleFactory */ any,
  name: string,
  onParse: (parser: Webpack.javascript.JavascriptParser) => void
) => {
  nmf.hooks.parser.for('javascript/auto').tap(name, onParse);
  nmf.hooks.parser.for('javascript/dynamic').tap(name, onParse);
  nmf.hooks.parser.for('javascript/esm').tap(name, onParse);
};

export const createAnalysisContext = () => ({
  modules: {
    client: new Map<string, NormalModule>(),
    server: new Map<string, NormalModule>(),
  },
  exports: {
    client: new Map<string, string[]>(),
    server: new Map<string, string[]>(),
  },
  getTypeForModule(mod: Module) {
    if (mod instanceof NormalModule) {
      return this.getTypeForResource(mod.resource);
    }
    return null;
  },
  getTypeForResource(resource: string) {
    if (this.modules.client.has(resource)) {
      return 'client' as const;
    }
    if (this.modules.server.has(resource)) {
      return 'server' as const;
    }
    return null;
  },
});

type RSCAnalysisCtx = ReturnType<typeof createAnalysisContext>;

type RSCAnalysisPluginOptions = {
  analysisCtx: RSCAnalysisCtx;
};

export default class RSCAnalysisPlugin {
  static pluginName = 'RSCAnalysisPlugin';
  constructor(public options: RSCAnalysisPluginOptions) {}

  apply(compiler: Compiler) {
    compiler.hooks.thisCompilation.tap(
      RSCAnalysisPlugin.pluginName,
      (compilation, { normalModuleFactory }) => {
        const onNormalModuleFactoryParser = (
          parser: Webpack.javascript.JavascriptParser
        ) => {
          parser.hooks.program.tap(RSCAnalysisPlugin.pluginName, (program) => {
            const isClientModule = program.body.some((node) => {
              return (
                node.type === 'ExpressionStatement' &&
                node.expression.type === 'Literal' &&
                node.expression.value === 'use client'
              );
            });
            const isServerModule = program.body.some((node) => {
              return (
                node.type === 'ExpressionStatement' &&
                node.expression.type === 'Literal' &&
                node.expression.value === 'use server'
              );
            });

            if (isServerModule && isClientModule) {
              throw new Error(
                "Cannot use both 'use server' and 'use client' in the same module " +
                  parser.state.module.resource
              );
            }

            if (!isServerModule && !isClientModule) {
              return;
            }

            if (isClientModule) {
              this.options.analysisCtx.modules.client.set(
                parser.state.module.resource,
                parser.state.module
              );
            } else {
              this.options.analysisCtx.modules.server.set(
                parser.state.module.resource,
                parser.state.module
              );
            }
          });
        };

        tapParserJS(
          normalModuleFactory,
          'HarmonyModulesPlugin',
          onNormalModuleFactoryParser
        );

        compilation.hooks.afterOptimizeModules.tap(
          RSCAnalysisPlugin.pluginName,
          (modules) => {
            for (const module of modules) {
              if (module instanceof NormalModule) {
                const type = this.options.analysisCtx.getTypeForModule(module);
                if (!type) continue;
                const exports = compilation.moduleGraph.getExportsInfo(module);
                this.options.analysisCtx.exports[type].set(
                  module.resource,
                  [...exports.orderedExports].map((exp) => exp.name)
                );
              }
            }
          }
        );
      }
    );
  }
}

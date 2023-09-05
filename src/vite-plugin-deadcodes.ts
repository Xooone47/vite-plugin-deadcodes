import path from 'path';
import fs from 'fs';
import glob from 'glob';
// @ts-ignore
import uniq from 'lodash.uniq';
import { minimatch } from 'minimatch';

const isDevMode = true;

const getProjectFiles = (dir: string) => {
  const parttern = path.join(dir, '**/*');
  const files = glob.sync(parttern, {
    nodir: true,
  });
  return files;
};

// remove query and uniq
const formatAndUniqLoadedFiles = (files: string[]) => {
  const formattedFiles = files.map(item => {
    const segments = item.split('?');
    return segments[0];
  });
  const result = uniq(formattedFiles);
  return result;
};

// NOTE 纯type类型（.ts）会被忽略， 无法解决，文档说明
// TODO src/style/*.less 文件会被忽略，因为无法解析less中的@import？
type GetUnusedFiles = (options: {
  allFiles: string[];
  loadedFiles: string[];
  excludes: string[];
}) => {
  rawUnusedFiles: string[];
  unusedFiles: string[];
};
const getUnusedFiles: GetUnusedFiles = ({ allFiles, loadedFiles, excludes }) => {
  const rawUnusedFiles = allFiles.filter((item) => !loadedFiles.some((loadedFile) => loadedFile.includes(item)));

  const unusedFiles = excludes.length
    ? rawUnusedFiles.filter((item) => !excludes.some((exclude) => minimatch(item, exclude)))
    : rawUnusedFiles;
  return { rawUnusedFiles, unusedFiles };
};

// const getTimestamp = () => new Date().valueOf();

interface PluginRawOptions {
  src?: string;
  emit?: boolean | string;
  excludes?: string[];
  console?: boolean;
}

interface PluginOptions {
  sourceDir: string;
  emit?: boolean | string;
  excludes: string[];
  console: boolean;
}

const generatePluginConfig = (rawOptions: PluginRawOptions = {}): PluginOptions => {
  const excludes = Array.isArray(rawOptions.excludes) ? rawOptions.excludes : [];
  const emit = rawOptions.emit === false ? false : (typeof rawOptions.emit === 'string' ? rawOptions.emit : undefined);

  return {
    sourceDir: rawOptions.src || path.join(process.cwd(), 'src'),
    console: rawOptions.console || false,
    emit, // type: false or string; default: deadcodes-{timestamp}.json
    excludes,
  };
};

export default function vitePluginDeadcodes(rawOptions: PluginRawOptions = {}) {
  const pluginOptions = generatePluginConfig(rawOptions);

  const loadedFiles: string[] = [];
  const filesInLoadHook: string[] = [];
  const filesInLoadTransform: string[] = [];

  return {
    name: 'vite-plugin-deadcodes',
    apply(config: any, { command }: any) {
      return command === 'build';
    },
    // config() {
    // },
    // https://rollupjs.org/plugin-development/#load
    load(id: string) {
      if (id.includes(pluginOptions.sourceDir)) {
        filesInLoadHook.push(id);
      }
    },
    // transform: {
    //   order: 'pre',
    //   handler(code, id) {
    //     if (id.includes('config.sku-id')) {
    //       console.log('transform', id, code);
    //     }
    //     if (id.includes(pluginOptions.sourceDir)) {
    //       filesInLoadTransform.push(id);
    //     }
    //   },
    // },
    transform(code: string, id: string) {
      if (id.includes(pluginOptions.sourceDir)) {
        filesInLoadTransform.push(id);
      }
    },
    moduleParsed(moduleInfo: any) {
      const id = moduleInfo.id;
      if (id.includes(pluginOptions.sourceDir)) {
        loadedFiles.push(id);
      }
    },
    writeBundle(options: any, bundle: any) {
      // console.log('vite-plugin-deadcodes writeBundle', options);
      const formattedLoadedFiles = formatAndUniqLoadedFiles(loadedFiles);
      const allFiles = getProjectFiles(pluginOptions.sourceDir);
      const { rawUnusedFiles, unusedFiles } = getUnusedFiles({
        allFiles: allFiles,
        loadedFiles: formattedLoadedFiles,
        excludes: pluginOptions.excludes,
      });
      const formattedFilesInLoadHook = formatAndUniqLoadedFiles(filesInLoadHook);
      const formattedFilesInLoadTransform = formatAndUniqLoadedFiles(filesInLoadTransform);

      const result = {
        unusedFiles: {
          total: unusedFiles.length,
          files: unusedFiles,
        },
        rawUnusedFiles: {
          total: rawUnusedFiles.length,
          files: rawUnusedFiles,
        },
        loadedFiles: {
          total: formattedLoadedFiles.length,
          files: formattedLoadedFiles,
        },
        filesInLoadHook: {
          total: formattedFilesInLoadHook.length,
          files: formattedFilesInLoadHook,
        },
        filesInLoadTransform: {
          total: formattedFilesInLoadTransform.length,
          files: formattedFilesInLoadTransform,
        },
        allFiles: {
          total: allFiles.length,
          files: allFiles,
        },
      };

      if (pluginOptions.console) {
        console.log('vite-plugin-deadcodes', result);
      }

      if (pluginOptions.emit !== false) {
        const emitFileName = typeof pluginOptions.emit === 'string'
          ? pluginOptions.emit
          : path.join(process.cwd(), 'deadcodes.json');

        fs.writeFileSync(
          emitFileName,
          JSON.stringify(result),
          { encoding: 'utf-8' },
        );
      }
    },
  };
}

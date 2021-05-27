/* global __dirname */
import {resolve} from 'path';
import {Configuration} from 'webpack';
import {merge} from 'webpack-merge';
import {TsconfigPathsPlugin} from 'tsconfig-paths-webpack-plugin';
import MetadataPlugin, {
  entry,
  metadata,
} from './config/metadata';

import devConfig from './config/webpack.dev.config';
import prodConfig from './config/webpack.prod.config';

const config: Configuration = {
  resolve: {
    extensions: ['.js', '.ts'],
    plugins: [
      new TsconfigPathsPlugin(),
    ],
  },
  optimization: {
    minimize: false,
    moduleIds: 'named',
  },
  entry,
  output: {
    path: resolve(__dirname, 'dist'),
    filename: '[name].user.js',
  },
  module: {
    rules: [
      {
        test: /(\.|\/)worker.ts$/,
        loader: 'worker-loader',
        options: {
          worker: 'Worker',
          inline: 'no-fallback',
        },
      },
      {
        test: /\.ts$/,
        loader: 'ts-loader',
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ],
      },
    ],
  },
  plugins: [
    new MetadataPlugin(metadata),
  ],
};

export default (env: {
  development?: boolean;
  production?: boolean;
}): Configuration => {
  if (env.development) {
    return merge<Configuration>(config, devConfig);
  }
  if (env.production) {
    return merge<Configuration>(config, prodConfig);
  }
  throw new Error('No matching configuration was found!');
};

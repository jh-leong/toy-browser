import HtmlWebpackPlugin from 'html-webpack-plugin';
import SFCLoader from './src/plugin/SFCLoader.js';

const isProduction = process.env.NODE_ENV == 'production';

const config = {
  entry: './src/main.js',
  devServer: {
    open: true,
    host: 'localhost',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'index.html',
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/i,
        loader: 'babel-loader',
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
        type: 'asset',
      },
      {
        test: /\.sfc$/i,
        use: {
          loader: './src/plugin/SFCLoader.js',
        },
      },
    ],
  },
  optimization: {
    minimize: false,
  },
};

export default () => {
  if (isProduction) {
    config.mode = 'production';
  } else {
    config.mode = 'development';
  }
  return config;
};

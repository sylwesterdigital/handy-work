const fs = require('fs');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',  
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.handpose$/,
        use: 'file-loader',
        include: [path.resolve(__dirname, 'node_modules/handy-work/poses')],
      },      
      {
          test: /\.wasm$/,
          type: "webassembly/async"
      },      
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.(glb|gltf)$/,
        use: {
          loader: '@loaders.gl/gltf',
          options: { type: 'arraybuffer' }
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Three.js with Webpack',
      template: './src/index.html',
    }),
/*    new CopyPlugin({
        patterns: [
            { from: 'src/models', to: 'models' }
        ],
    }),*/    
  ],
  devServer: {
      static: path.join(__dirname, 'dist'),
      https: {
        key: fs.readFileSync(path.resolve(__dirname, 'localhost-key.pem')),
        cert: fs.readFileSync(path.resolve(__dirname, 'localhost.pem')),
      },      
  },
   experiments: {
      asyncWebAssembly: true
  }, 
};


var path = require('path');
module.exports = {
    entry: './index.js',
    output: {
        path: path.resolve('build'),
        filename: "index.js",
		publicPath: './build'
    },
    devtool: 'source-map', // generate source file
    module: {
        loaders: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel',
            query: {
              presets: ['es2015', 'react']
            }
          }
        ]
    }
};
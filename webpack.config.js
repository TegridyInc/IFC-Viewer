const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    devServer: {
        static: {
            directory: path.join(__dirname, "public"),
        },
        compress: true,
        port: 9000,
    },
    entry: './src/index.tsx',
    mode: 'development',
    module: {
        rules: [
            {
                test: /\.(js|jsx|tsx|ts)$/,
                exclude: /node_modules/,
                loader: 'babel-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.*', '.js', '.jsx', '.tsx', '.ts', '.component.tsx'],
        alias: {
            '@ifc_viewer/components': path.resolve(__dirname, 'src/components'),
            '@ifc_viewer/assets': path.resolve(__dirname, 'src/assets'),
            '@ifc_viewer/models': path.resolve(__dirname, 'src/models'),
            '@ifc_viewer/store': path.resolve(__dirname, 'src/store'),
            '@ifc_viewer/helpers': path.resolve(__dirname, 'src/helpers'),
            '@ifc_viewer/index': path.resolve(__dirname, 'src/index.tsx'),
            
            fs: false,
            path: false
        }
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'dist' }
            ]
        })
    ],
};
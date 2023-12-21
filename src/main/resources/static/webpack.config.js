const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
module.exports = {
    mode: "development",
    entry: "./index.tsx",
    output: {
        filename: "bundle.js",
        path: path.join(__dirname, 'dist'),
    },
    devServer: {
        static: {
            directory: path.join(__dirname),
        },
        compress: false,
        port: 9000,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
        },
        proxy: [
            {
                context: ["/api", "/ecs", "/ami", "/task", "/session"],
                target: "http://localhost:8888"
            }
        ],
        watchFiles: {
            paths: ['./index.tsx', "./components/**/*.tsx"]
        }
    },

    // Enable sourcemaps for debugging webpack's output.
    devtool: "source-map",

    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json"],
        exportsFields: ['exports2'],
    },

    module: {
        rules: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            {
                test: /\.(jsx?|tsx?)$/,
                loader: "babel-loader",
                options: {
                    presets: ['@babel/env', '@babel/preset-react', '@babel/preset-flow']
                },
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: 'css-loader'
                    },
                ]
            },
            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            {enforce: "pre", test: /\.js$/, loader: "source-map-loader"}
        ]
    },

    // When importing a module whose path matches one of the following, just
    // assume a corresponding global variable exists and use that instead.
    // This is important because it allows us to avoid bundling all of our
    // dependencies, which allows browsers to cache those libraries between builds.
    externals: {
        "react": "React",
        "react-dom": "ReactDOM",
        "xterm": "XTerm"
    },
    plugins: [
        // new CopyPlugin({
        //     patterns: [
        //         {from: "./dist/", to: "../../../../../target/classes/static/dist/"}
        //     ],
        // }),
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
    ],
};

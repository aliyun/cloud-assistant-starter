module.exports = {
    presets: [
        '@babel/preset-env',
        ['@babel/preset-react', {
            runtime: 'automatic'
        }],
        '@babel/preset-typescript',
    ],
    env: {
        development: {
            presets: [
                ['minify', {builtIns: false}]
            ]
        },
        production: {
            presets: [
                ['minify', {builtIns: false}]
            ]
        }
    },
}

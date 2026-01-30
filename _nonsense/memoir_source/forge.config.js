module.exports = {
    packagerConfig: {
        name: 'Memoir',
        // Forge automatically appends .icns on macOS or .ico on Windows
        icon: './desktop/build/icon',
        executableName: 'memoir',
        appBundleId: 'ai.memoir.desktop',
        appCategoryType: 'public.app-category.productivity',
        appCopyright: 'Copyright © 2026 Memoir.ai',
    },
    rebuilders: [],
    makers: [
        {
            name: '@electron-forge/maker-dmg',
            config: {
                name: 'Memoir',
                icon: './desktop/build/icon.icns'
            },
        },
        {
            name: '@electron-forge/maker-zip',
            platforms: ['darwin'],
        },
        {
            name: '@electron-forge/maker-deb',
            config: {},
        },
        {
            name: '@electron-forge/maker-rpm',
            config: {},
        },
    ],
};

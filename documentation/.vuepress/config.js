module.exports = {
    title: 'JSON api shop',
    description: 'JSON api servers, services and database adapters',
    base: '/json-api-shop/',
    dest: 'docs',
    themeConfig: {
        nav: [
            {text: 'Documentation', link: '/about'},
            {text: 'Github', link: 'https://github.com/dbrekalo/json-api-shop'}
        ],
        sidebar: [
            ['/about', 'About'],
            ['/getting-started', 'Getting started'],
            ['/resource-schema', 'Resource schema'],
            ['/service-api', 'Service api'],
            ['/database-adapters', 'Database adapters'],
            ['/express-server', 'Express server'],
            ['/browser-server', 'Browser server']
        ]
    }
};
